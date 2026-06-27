import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const GROUP_ID = '6dc0a985-6074-4c89-bf08-099c5cdfab0c';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('id, date, reason')
      .eq('group_id', GROUP_ID)
      .order('date', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Blocked dates GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, reason } = await request.json();
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('blocked_dates')
      .insert({ date, reason: reason || null, group_id: GROUP_ID } as Record<string, unknown>)
      .select('id, date, reason')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Blocked dates POST error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('date', date)
      .eq('group_id', GROUP_ID);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Blocked dates DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
