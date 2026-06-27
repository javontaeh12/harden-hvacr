import { createServerSupabaseClient, getProfile } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const vanId = searchParams.get('van_id');
    const month = searchParams.get('month'); // YYYY-MM format

    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('truck_mileage_logs')
      .select('*')
      .order('date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (month) {
      const startDate = `${month}-01`;
      const [year, mon] = month.split('-').map(Number);
      const endDate = new Date(year, mon, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Mileage GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch mileage logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { van_id, date, start_miles, end_miles, notes } = body;

    if (!date || start_miles == null || end_miles == null) {
      return NextResponse.json({ error: 'date, start_miles, and end_miles are required' }, { status: 400 });
    }

    if (Number(end_miles) < Number(start_miles)) {
      return NextResponse.json({ error: 'end_miles must be greater than start_miles' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('truck_mileage_logs')
      .insert({
        van_id: van_id || profile.van_id,
        date,
        start_miles: Number(start_miles),
        end_miles: Number(end_miles),
        notes: notes || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Mileage POST error:', error);
    return NextResponse.json({ error: 'Failed to create mileage log' }, { status: 500 });
  }
}
