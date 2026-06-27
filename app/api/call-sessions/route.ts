import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('call_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Call sessions GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch call sessions' }, { status: 500 });
  }
}
