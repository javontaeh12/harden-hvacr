import { createServiceClient } from '../utils';

export interface TimeSlot {
  date: string;
  time_frame: string;
  available_techs: { id: string; name: string }[];
  booking_count: number;
}

export interface AvailabilityResult {
  slots: TimeSlot[];
  next_available: TimeSlot | null;
  calendar_summary: string;
}

export async function checkAvailability(
  daysAhead: number = 14,
  preferredDate?: string,
): Promise<AvailabilityResult> {
  const supabase = createServiceClient();
  const now = new Date();
  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const [bookingsRes, techsRes, blockedRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*')
      .gte('start_time', now.toISOString())
      .lte('start_time', endDate.toISOString())
      .in('status', ['scheduled'])
      .order('start_time', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'tech')
      .eq('status', 'approved'),
    supabase
      .from('blocked_dates')
      .select('date')
      .gte('date', now.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]),
  ]);

  const bookings = bookingsRes.data;
  const techs = techsRes.data;
  const blockedDates = new Set((blockedRes.data || []).map((d: { date: string }) => d.date));

  const techList = (techs || []).map((t: { id: string; full_name: string }) => ({ id: t.id, name: t.full_name }));

  const bookingsBySlot: Record<string, number> = {};
  for (const b of bookings || []) {
    const dt = new Date(b.start_time);
    const dateKey = dt.toISOString().split('T')[0];
    const hour = dt.getHours();
    const slot = hour < 12 ? 'AM' : 'PM';
    const key = `${dateKey}-${slot}`;
    bookingsBySlot[key] = (bookingsBySlot[key] || 0) + 1;
  }

  const maxPerSlot = Math.max(techList.length * 2, 3);
  const slots: TimeSlot[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now.getTime() + (d + 1) * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) continue; // skip Sunday

    const dateStr = date.toISOString().split('T')[0];
    if (blockedDates.has(dateStr)) continue; // skip blocked days

    for (const [slot, timeFrame] of [['AM', '8 AM - 12 PM'], ['PM', '12 PM - 5 PM']] as const) {
      if (dayOfWeek === 6 && slot === 'PM') continue; // Saturday AM only

      const key = `${dateStr}-${slot}`;
      const count = bookingsBySlot[key] || 0;

      if (count < maxPerSlot) {
        slots.push({
          date: dateStr,
          time_frame: timeFrame,
          available_techs: techList,
          booking_count: count,
        });
      }
    }
  }

  let nextAvailable: TimeSlot | null = slots[0] || null;
  if (preferredDate) {
    const preferred = slots.find(s => s.date === preferredDate);
    if (preferred) nextAvailable = preferred;
  }

  const summary = (bookings || [])
    .map((b: Record<string, unknown>) => `${b.start_time} - ${b.name} - ${b.service_type} (${b.status})`)
    .join('\n') || 'No upcoming bookings';

  return { slots, next_available: nextAvailable, calendar_summary: summary };
}
