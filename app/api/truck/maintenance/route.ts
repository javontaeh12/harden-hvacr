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
    const upcoming = searchParams.get('upcoming'); // 'true' to get upcoming maintenance

    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('truck_maintenance_logs')
      .select('*')
      .order('date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = supabase
        .from('truck_maintenance_logs')
        .select('*')
        .not('next_due_date', 'is', null)
        .gte('next_due_date', today)
        .order('next_due_date', { ascending: true });

      if (vanId) {
        query = query.eq('van_id', vanId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Maintenance GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { van_id, date, type, description, cost, vendor, next_due_date, next_due_miles } = body;

    if (!date || !type) {
      return NextResponse.json({ error: 'date and type are required' }, { status: 400 });
    }

    const validTypes = ['Oil Change', 'Tire Rotation', 'Brake Service', 'Transmission', 'AC Service', 'Other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('truck_maintenance_logs')
      .insert({
        van_id: van_id || profile.van_id,
        date,
        type,
        description: description || null,
        cost: cost ? Number(cost) : null,
        vendor: vendor || null,
        next_due_date: next_due_date || null,
        next_due_miles: next_due_miles ? Number(next_due_miles) : null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Maintenance POST error:', error);
    return NextResponse.json({ error: 'Failed to create maintenance log' }, { status: 500 });
  }
}
