import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import ServicePageClient, { type ServicePageClientProps } from './ServicePageClient';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function ServicePage() {
  const headerStore = await headers();
  const groupId = headerStore.get('x-group-id');

  if (!groupId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Service / Work Orders</h1>
        <p className="text-gray-600">No group found. Please sign in again.</p>
      </div>
    );
  }

  const supabase = createServiceClient();

  const [woResult, custResult, techResult] = await Promise.all([
    supabase
      .from('work_orders')
      .select('*, customers(full_name, phone, address)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false }),
    supabase
      .from('customers')
      .select('id, full_name')
      .eq('group_id', groupId)
      .order('full_name'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('group_id', groupId)
      .eq('status', 'approved'),
  ]);

  const workOrders = woResult.data || [];
  const customers = custResult.data || [];
  const techs = techResult.data || [];

  // Fetch tech names for assigned work orders
  const techIds = [...new Set(workOrders.map((wo: Record<string, unknown>) => wo.assigned_tech_id).filter(Boolean))];
  let techMap: Record<string, string> = {};
  if (techIds.length > 0) {
    const { data: techProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', techIds);
    techMap = Object.fromEntries((techProfiles || []).map((t: Record<string, unknown>) => [t.id, t.full_name]));
  }

  const enrichedWorkOrders = workOrders.map((wo) => ({
    ...wo,
    parts_used: (wo.parts_used || []) as Array<{ name: string; quantity: number; cost: number }>,
    profiles: wo.assigned_tech_id ? { full_name: techMap[wo.assigned_tech_id as string] || null } : null,
  }));

  return (
    <ServicePageClient
      initialWorkOrders={enrichedWorkOrders as ServicePageClientProps['initialWorkOrders']}
      initialCustomers={customers.map((c: Record<string, unknown>) => ({ id: c.id as string, full_name: c.full_name as string }))}
      initialTechs={techs}
      groupId={groupId}
    />
  );
}
