import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import TechDashboardClient from './TechDashboardClient';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function TechDashboard() {
  const headerStore = await headers();
  const groupId = headerStore.get('x-group-id');
  const userId = headerStore.get('x-user-id');

  if (!groupId || !userId) {
    return (
      <div className="pt-12 text-center">
        <p className="text-gray-500">Please sign in to view your jobs.</p>
      </div>
    );
  }

  const supabase = createServiceClient();

  // Fetch profile and all jobs assigned to this tech for the current year
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [profileResult, jobsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single(),
    supabase
      .from('work_orders')
      .select('*, customers(full_name, phone, address)')
      .eq('group_id', groupId)
      .eq('assigned_tech_id', userId)
      .gte('created_at', yearStart)
      .order('created_at', { ascending: false }),
  ]);

  const firstName = profileResult.data?.full_name?.split(' ')[0] || 'Tech';
  const jobs = jobsResult.data || [];

  return (
    <TechDashboardClient
      jobs={jobs}
      firstName={firstName}
    />
  );
}
