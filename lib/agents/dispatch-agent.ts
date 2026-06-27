import { SupabaseClient } from '@supabase/supabase-js';
import { sendToOwnChannel } from '@/lib/discord';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveJoin(data: any): Record<string, any> | null {
  const d = Array.isArray(data) ? data[0] : data;
  return d || null;
}

// Enhance the base dispatch prompt with geographic clustering rules
export function enhanceDispatchPrompt(basePrompt: string): string {
  return `${basePrompt}

GEOGRAPHIC OPTIMIZATION RULES:
- Group jobs with the same ZIP code on the same day whenever possible
- Flag geographic clusters: if 2+ jobs are within a 5-mile radius, schedule them back-to-back
- Optimize drive routes: schedule closest jobs sequentially to minimize drive time
- Morning slots for northern service area, afternoon for southern (or vice versa based on tech location)
- If a ZIP code already has a job that day, strongly prefer adding new same-ZIP jobs to that day
- Include drive time estimates between jobs when clustering`;
}

// Post relay message to #dispatch after emailing a customer
export async function relayCustomerEmail(data: {
  name: string;
  email: string;
  subject: string;
}) {
  try {
    await sendToOwnChannel('dispatch', `Emailed **${data.name}** at ${data.email} — ${data.subject}`);
  } catch (e) {
    console.error('Dispatch relay error:', e);
  }
}

// Build daily schedule embed grouped by area
export async function buildDailyScheduleEmbed(supabase: SupabaseClient) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .gte('start_time', todayStr)
    .lt('start_time', tomorrowStr)
    .eq('status', 'scheduled')
    .order('start_time', { ascending: true });

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('*, customers(full_name, address, city, zip), profiles(full_name)')
    .eq('scheduled_date', todayStr)
    .in('status', ['assigned', 'en_route', 'in_progress']);

  // Group work orders by ZIP/city
  const areaGroups: Record<string, typeof workOrders> = {};
  for (const wo of workOrders || []) {
    const cust = resolveJoin(wo.customers);
    const zip = cust?.zip || 'Unknown';
    const city = cust?.city || 'Unknown';
    const key = `${city} (${zip})`;
    if (!areaGroups[key]) areaGroups[key] = [];
    areaGroups[key].push(wo);
  }

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  // Bookings section
  if (bookings && bookings.length > 0) {
    fields.push({
      name: `Bookings (${bookings.length})`,
      value: bookings.map(b => {
        const time = new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `${time} — ${b.name} — ${b.service_type}`;
      }).join('\n').slice(0, 1024),
    });
  }

  // Area-grouped work orders
  for (const [area, orders] of Object.entries(areaGroups)) {
    fields.push({
      name: `${area} (${orders!.length} jobs)`,
      value: orders!.map(wo => {
        const tech = resolveJoin(wo.profiles)?.full_name || 'Unassigned';
        const customer = resolveJoin(wo.customers)?.full_name || 'Unknown';
        return `${customer} — Tech: ${tech} — ${wo.priority || 'normal'}`;
      }).join('\n').slice(0, 1024),
    });
  }

  if (fields.length === 0) {
    fields.push({ name: 'Schedule', value: 'No jobs scheduled for today.' });
  }

  const totalJobs = (bookings?.length || 0) + (workOrders?.length || 0);
  const clusterCount = Object.keys(areaGroups).length;

  return {
    title: `Daily Schedule — ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
    color: 0x1e40af,
    fields: [
      { name: 'Total Jobs', value: String(totalJobs), inline: true },
      { name: 'Service Areas', value: String(clusterCount), inline: true },
      ...fields,
    ],
    timestamp: new Date().toISOString(),
  };
}
