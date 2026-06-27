import { getProfile } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const DEVELOPER_EMAIL = process.env.DEVELOPER_EMAIL || 'javontaedharden@gmail.com';

export async function GET() {
  try {
    const profile = await getProfile();

    if (!profile || profile.email !== DEVELOPER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [profilesResult, vansResult, groupsResult] = await Promise.all([
      adminClient
        .from('profiles')
        .select('*, groups:group_id(name)')
        .order('created_at', { ascending: false }),
      adminClient
        .from('vans')
        .select('id, name, van_number, group_id')
        .order('name'),
      adminClient
        .from('organization_groups')
        .select('id, name, group_code')
        .order('name'),
    ]);

    if (profilesResult.error) throw profilesResult.error;

    return NextResponse.json({
      users: profilesResult.data,
      vans: vansResult.data || [],
      groups: groupsResult.data || [],
    });
  } catch (error) {
    console.error('List all users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
