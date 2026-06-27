import { createServiceClient } from './utils';
import { checkAvailability } from './agents/calendar-availability';
import { createCalendarEvent, deleteCalendarEvent } from './integrations/google-calendar';
import { placeRescheduleCall } from './integrations/vapi-outbound';

export interface RescheduleResult {
  success: boolean;
  old_date: string | null;
  new_date: string;
  new_time_frame: string;
  calendar_event_id: string | null;
  customer_notified: boolean;
  vapi_call_id: string | null;
}

export async function autoReschedule(
  bookingId: string,
  preferredDate?: string,
): Promise<RescheduleResult> {
  const supabase = createServiceClient();

  // 1. Look up booking + customer
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    throw new Error(`Booking ${bookingId} not found: ${bookingErr?.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = booking as any;
  const oldDate = b.start_time ? new Date(b.start_time).toISOString().split('T')[0] : null;
  const customerPhone = b.contact || b.phone || '';
  const customerName = b.name || b.customer_name || null;
  const oldCalendarEventId = b.calendar_event_id || null;

  // 2. Check availability
  const availability = await checkAvailability(14, preferredDate);
  if (!availability.slots.length) {
    throw new Error('No available slots in the next 14 days');
  }

  // Pick best slot (prefer user's preferred date, else first available)
  const newSlot = availability.next_available || availability.slots[0];

  // 3. Update booking in DB
  const startHour = newSlot.time_frame.includes('8') ? 8 : 12;
  const newStartTime = `${newSlot.date}T${String(startHour).padStart(2, '0')}:00:00`;

  await supabase
    .from('bookings')
    .update({
      start_time: newStartTime,
      status: 'scheduled',
    } as Record<string, unknown>)
    .eq('id', bookingId);

  // 4. Delete old Google Calendar event if exists
  if (oldCalendarEventId) {
    await deleteCalendarEvent(oldCalendarEventId).catch(() => {});
  }

  // 5. Create new Google Calendar event
  const calendarEventId = await createCalendarEvent({
    summary: `HVAC: ${b.service_type || 'Service'} — ${customerName || 'Customer'} (Rescheduled)`,
    description: `Rescheduled from ${oldDate || 'unknown'}\nService: ${b.service_type || 'N/A'}\nBooking ID: ${bookingId}`,
    startDate: newSlot.date,
    timeFrame: newSlot.time_frame,
    customerName: customerName || 'Unknown',
    customerPhone: customerPhone || 'Unknown',
  });

  // Store calendar event ID on booking
  if (calendarEventId) {
    await supabase
      .from('bookings')
      .update({ calendar_event_id: calendarEventId } as Record<string, unknown>)
      .eq('id', bookingId);
  }

  // 6. Notify customer via Vapi outbound call
  let customerNotified = false;
  let vapiCallId: string | null = null;

  if (customerPhone) {
    const callResult = await placeRescheduleCall(
      customerPhone, customerName, newSlot.date, newSlot.time_frame,
    );
    customerNotified = callResult.success;
    vapiCallId = callResult.vapi_call_id;
  }

  // 7. Discord notification
  if (process.env.DISCORD_BOT_TOKEN_DISPATCH && process.env.DISCORD_CHANNEL_DISPATCH) {
    fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_DISPATCH}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_DISPATCH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [{
          title: `Booking Rescheduled — ${customerName || 'Customer'}`,
          color: 0xf59e0b,
          fields: [
            { name: 'Old Date', value: oldDate || 'Unknown', inline: true },
            { name: 'New Date', value: `${newSlot.date} ${newSlot.time_frame}`, inline: true },
            { name: 'Customer Notified', value: customerNotified ? 'Yes (auto-call)' : 'No', inline: true },
            { name: 'Phone', value: customerPhone || 'Unknown', inline: true },
          ],
          footer: { text: `Booking: ${bookingId}` },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(err => console.error('[reschedule] Discord post failed:', err));
  }

  // 8. Log to agent_logs + customer_communications
  await supabase.from('agent_logs').insert({
    agent: 'csr_reschedule',
    action: 'auto_reschedule',
    request_id: null,
    details: {
      booking_id: bookingId,
      old_date: oldDate,
      new_date: newSlot.date,
      new_time_frame: newSlot.time_frame,
      customer_notified: customerNotified,
      vapi_call_id: vapiCallId,
      calendar_event_id: calendarEventId,
    },
  } as Record<string, unknown>);

  // Log customer communication if we have a customer_id
  if (b.customer_id) {
    await supabase.from('customer_communications').insert({
      customer_id: b.customer_id,
      type: 'phone_call',
      direction: 'outbound',
      subject: `Reschedule notification — moved to ${newSlot.date} ${newSlot.time_frame}`,
      body: `Appointment rescheduled from ${oldDate || 'unknown'} to ${newSlot.date} ${newSlot.time_frame}. Customer ${customerNotified ? 'was notified via automated call' : 'was NOT notified (no phone)'}`,
      metadata: { booking_id: bookingId, vapi_call_id: vapiCallId },
    } as Record<string, unknown>);
  }

  return {
    success: true,
    old_date: oldDate,
    new_date: newSlot.date,
    new_time_frame: newSlot.time_frame,
    calendar_event_id: calendarEventId,
    customer_notified: customerNotified,
    vapi_call_id: vapiCallId,
  };
}
