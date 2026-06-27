import { getProfile } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEVELOPER_EMAIL = 'javontaedharden@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile || profile.email !== DEVELOPER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { vanId } = await request.json();

    if (!vanId) {
      return NextResponse.json({ error: 'vanId is required' }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Clear van_id from any profiles assigned to this van
    await adminClient
      .from('profiles')
      .update({ van_id: null })
      .eq('van_id', vanId);

    // Delete inventory items for this van
    await adminClient
      .from('inventory_items')
      .delete()
      .eq('van_id', vanId);

    // Delete the van
    const { error } = await adminClient
      .from('vans')
      .delete()
      .eq('id', vanId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Van delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
