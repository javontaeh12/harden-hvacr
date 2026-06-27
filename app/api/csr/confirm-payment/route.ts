import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GROUP_ID = '6dc0a985-6074-4c89-bf08-099c5cdfab0c';
const OWNER_TECH_ID = '09309f84-6914-453a-ad85-9bb45817a342';
const FROM_EMAIL = 'Harden HVAC <noreply@hardenhvacr.com>';
const ADMIN_EMAIL = 'Javontaedharden@gmail.com';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/csr/confirm-payment
 * Body: { booking_id }
 *
 * Called when service fee is paid.
 * Creates: work order, Google Calendar event for admin + sends confirmation to customer
 */
export async function POST(request: NextRequest) {
  try {
    const { booking_id } = await request.json();
    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, customers(full_name, email, phone, address)')
      .eq('id', booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = booking as any;
    const customer = b.customers || {};
    const customerName = customer.full_name || b.name || 'Customer';
    const customerEmail = customer.email;
    const customerPhone = customer.phone || b.contact;

    // Update booking status to scheduled (payment confirmed)
    await supabase.from('bookings').update({ status: 'scheduled' } as Record<string, unknown>).eq('id', booking_id);

    // Create work order
    const priorityMap: Record<string, string> = { emergency: 'urgent', urgent: 'high' };
    const { data: workOrder } = await supabase
      .from('work_orders')
      .insert({
        booking_id,
        customer_id: b.customer_id,
        assigned_tech_id: OWNER_TECH_ID,
        status: 'assigned',
        priority: priorityMap[b.urgency] || 'normal',
        description: `${b.service_type || 'HVAC Service'}\n\nCustomer: ${customerName}\nPhone: ${customerPhone || 'N/A'}\nAddress: ${customer.address || 'N/A'}`,
        notes: `Service fee paid — ready for dispatch`,
        scheduled_date: b.start_time ? new Date(b.start_time).toISOString().split('T')[0] : null,
        group_id: GROUP_ID,
      } as Record<string, unknown>)
      .select('id')
      .single();

    // Create Google Calendar event
    let calendarEventId: string | null = null;
    try {
      const { createCalendarEvent } = await import('@/lib/csr/integrations/google-calendar');
      const startDate = b.start_time ? new Date(b.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const startHour = b.start_time ? new Date(b.start_time).getHours() : 8;
      const timeFrame = startHour < 12 ? '8 AM - 12 PM' : '12 PM - 5 PM';

      calendarEventId = await createCalendarEvent({
        summary: `HVAC: ${b.service_type || 'Service'} — ${customerName}`,
        description: `Service: ${b.service_type || 'HVAC Service'}\nPhone: ${customerPhone || 'N/A'}\nAddress: ${customer.address || 'N/A'}\n\nService fee paid — confirmed appointment`,
        startDate,
        timeFrame,
        customerName,
        customerPhone: customerPhone || 'Unknown',
      });

      if (calendarEventId) {
        await supabase.from('bookings').update({ google_event_id: calendarEventId } as Record<string, unknown>).eq('id', booking_id);
      }
    } catch (err) {
      console.error('[confirm-payment] Calendar event failed:', err);
    }

    // Send confirmation email to customer
    const scheduledDateFormatted = b.start_time
      ? new Date(b.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';
    const startHour = b.start_time ? new Date(b.start_time).getHours() : 8;
    const timeFrame = startHour < 12 ? '8 AM - 12 PM' : '12 PM - 5 PM';

    if (customerEmail && process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: customerEmail,
          subject: `Appointment Confirmed — ${scheduledDateFormatted} — Harden HVAC`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:20px;">Harden HVAC & Refrigeration</h1>
                <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">Appointment Confirmed</p>
              </div>
              <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p>Hi ${customerName},</p>
                <p>Your payment has been received and your appointment is confirmed!</p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0 0 8px;"><strong>Service:</strong> ${b.service_type || 'HVAC Service'}</p>
                  <p style="margin:0 0 8px;"><strong>Date:</strong> ${scheduledDateFormatted}</p>
                  <p style="margin:0 0 8px;"><strong>Time Window:</strong> ${timeFrame}</p>
                  ${customer.address ? `<p style="margin:0;"><strong>Location:</strong> ${customer.address}</p>` : ''}
                </div>
                <h3 style="color:#1e40af;margin:20px 0 12px;">What to Expect</h3>
                <ul style="color:#374151;line-height:1.8;">
                  <li>A technician will call you when they're on the way</li>
                  <li>Please ensure someone 18+ is available at the property</li>
                  <li>Clear access to your HVAC equipment (indoor and outdoor units)</li>
                  <li>The tech will diagnose the issue and explain all options before any work</li>
                  <li>Most repairs are completed on the first visit</li>
                  <li>Your $89 service fee is credited toward any approved repairs</li>
                </ul>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0;font-size:14px;"><strong>Need to reschedule?</strong> Call us at <a href="tel:+19566699093">(956) 669-9093</a></p>
                </div>
                <p style="color:#6b7280;font-size:13px;margin-top:20px;">Thank you for choosing Harden HVAC & Refrigeration!<br>Tallahassee, FL | hardenhvacr.com | (956) 669-9093</p>
              </div>
            </div>`,
        }),
      }).catch(err => console.error('[confirm-payment] Customer email failed:', err));
    }

    // Discord notification
    if (process.env.DISCORD_BOT_TOKEN_DISPATCH && process.env.DISCORD_CHANNEL_DISPATCH) {
      fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_DISPATCH}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_DISPATCH}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `Payment Confirmed — ${customerName}`,
            color: 0x059669,
            fields: [
              { name: 'Service', value: b.service_type || 'HVAC Service', inline: true },
              { name: 'Date', value: scheduledDateFormatted, inline: true },
              { name: 'Calendar', value: calendarEventId ? 'Added' : 'Failed', inline: true },
              { name: 'Work Order', value: workOrder ? 'Created' : 'Failed', inline: true },
            ],
            footer: { text: `Booking: ${booking_id.slice(0, 8)}` },
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {});
    }

    // Log
    await supabase.from('agent_logs').insert({
      agent: 'csr_booking',
      action: 'payment_confirmed',
      request_id: null,
      details: {
        booking_id,
        work_order_id: workOrder?.id,
        calendar_event_id: calendarEventId,
        customer_name: customerName,
        customer_email: customerEmail,
      },
    } as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      booking_id,
      work_order_id: workOrder?.id,
      calendar_event_id: calendarEventId,
      confirmation_sent: !!customerEmail,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[confirm-payment] Error:', errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
