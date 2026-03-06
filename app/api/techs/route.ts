import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const group_id = searchParams.get('group_id');

    if (!group_id) {
      return NextResponse.json({ error: 'group_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('group_id', group_id)
      .eq('status', 'approved');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Techs GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch techs' }, { status: 500 });
  }
}
