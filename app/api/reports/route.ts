import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const group_id = searchParams.get('group_id');

    let query = supabase
      .from('system_reports')
      .select('*, customers(full_name), customer_equipment(equipment_type, make, model)')
      .order('created_at', { ascending: false });

    if (group_id) query = query.eq('group_id', group_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { data, error } = await supabase
      .from('system_reports')
      .insert(body)
      .select('*, customers(full_name), customer_equipment(equipment_type, make, model)')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;
    const { data, error } = await supabase
      .from('system_reports')
      .update(updates)
      .eq('id', id)
      .select('*, customers(full_name), customer_equipment(equipment_type, make, model)')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reports PUT error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const { error } = await supabase.from('system_reports').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reports DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
