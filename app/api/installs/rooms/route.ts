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
    const project_id = searchParams.get('project_id');
    const id = searchParams.get('id');

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Single room fetch with children
    if (id) {
      const { data, error } = await supabase
        .from('install_rooms')
        .select('*, install_surfaces(*), install_openings(*)')
        .eq('id', id)
        .eq('project_id', project_id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // List all rooms for project
    const { data, error } = await supabase
      .from('install_rooms')
      .select('*')
      .eq('project_id', project_id)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install rooms GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch install rooms' }, { status: 500 });
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

    // Auto-calculate sqft from length * width if not provided
    const sqft = body.sqft ?? (
      body.length_ft && body.width_ft
        ? Number(body.length_ft) * Number(body.width_ft)
        : null
    );

    const { data, error } = await supabase
      .from('install_rooms')
      .insert({
        project_id: body.project_id,
        name: body.name,
        floor_level: body.floor_level,
        length_ft: body.length_ft,
        width_ft: body.width_ft,
        ceiling_height_ft: body.ceiling_height_ft,
        sqft,
        orientation: body.orientation,
        ceiling_r_value: body.ceiling_r_value,
        floor_type: body.floor_type,
        floor_r_value: body.floor_r_value,
        occupants: body.occupants,
        has_kitchen: body.has_kitchen,
        has_fireplace: body.has_fireplace,
        appliance_btuh: body.appliance_btuh,
        sort_order: body.sort_order,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install rooms POST error:', error);
    return NextResponse.json({ error: 'Failed to create install room' }, { status: 500 });
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

    // Recalculate sqft if dimensions changed and sqft not explicitly set
    if ((updates.length_ft || updates.width_ft) && updates.sqft === undefined) {
      // We need both dimensions — fetch existing if only one changed
      if (updates.length_ft && updates.width_ft) {
        updates.sqft = Number(updates.length_ft) * Number(updates.width_ft);
      }
    }

    const { data, error } = await supabase
      .from('install_rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install rooms PUT error:', error);
    return NextResponse.json({ error: 'Failed to update install room' }, { status: 500 });
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

    const { error } = await supabase.from('install_rooms').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Install rooms DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete install room' }, { status: 500 });
  }
}
