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
      .from('truck_gas_logs')
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
    console.error('Gas GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch gas logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { van_id, date, gallons, price_per_gallon, total_cost, odometer, station } = body;

    if (!date || gallons == null || price_per_gallon == null) {
      return NextResponse.json({ error: 'date, gallons, and price_per_gallon are required' }, { status: 400 });
    }

    const computedTotal = total_cost ?? Number((Number(gallons) * Number(price_per_gallon)).toFixed(2));

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('truck_gas_logs')
      .insert({
        van_id: van_id || profile.van_id,
        date,
        gallons: Number(gallons),
        price_per_gallon: Number(price_per_gallon),
        total_cost: computedTotal,
        odometer: odometer ? Number(odometer) : null,
        station: station || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Gas POST error:', error);
    return NextResponse.json({ error: 'Failed to create gas log' }, { status: 500 });
  }
}
