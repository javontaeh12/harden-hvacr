import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const room_id = searchParams.get('room_id');
    const id = searchParams.get('id');

    if (!room_id) {
      return NextResponse.json({ error: 'room_id is required' }, { status: 400 });
    }

    // Single opening fetch
    if (id) {
      const { data, error } = await supabase
        .from('install_openings')
        .select('*')
        .eq('id', id)
        .eq('room_id', room_id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // List all openings for room
    const { data, error } = await supabase
      .from('install_openings')
      .select('*')
      .eq('room_id', room_id)
      .order('opening_type', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install openings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch install openings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Auto-calculate area_sqft from dimensions if not provided
    const area_sqft = body.area_sqft ?? (
      body.quantity && body.width_in && body.height_in
        ? (Number(body.quantity) * Number(body.width_in) * Number(body.height_in)) / 144
        : null
    );

    const { data, error } = await supabase
      .from('install_openings')
      .insert({
        room_id: body.room_id,
        surface_id: body.surface_id,
        opening_type: body.opening_type,
        quantity: body.quantity,
        width_in: body.width_in,
        height_in: body.height_in,
        area_sqft,
        u_factor: body.u_factor,
        shgc: body.shgc,
        orientation: body.orientation,
        has_overhang: body.has_overhang,
        frame_type: body.frame_type,
        glass_type: body.glass_type,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install openings POST error:', error);
    return NextResponse.json({ error: 'Failed to create install opening' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Auto-calculate area_sqft if dimensions changed but area_sqft not explicitly provided
    if ((updates.quantity || updates.width_in || updates.height_in) && updates.area_sqft === undefined) {
      if (updates.quantity && updates.width_in && updates.height_in) {
        updates.area_sqft = (Number(updates.quantity) * Number(updates.width_in) * Number(updates.height_in)) / 144;
      }
    }

    const { data, error } = await supabase
      .from('install_openings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install openings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update install opening' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase.from('install_openings').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Install openings DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete install opening' }, { status: 500 });
  }
}
