import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { generateDuctLayout, estimateStaticPressure } from '@/lib/installs/duct-sizing';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('install_duct_segments')
      .select('*')
      .eq('project_id', project_id)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ducts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch duct segments' }, { status: 500 });
  }
}

/**
 * POST /api/installs/ducts
 * Body: { project_id, action: 'auto_generate' } — auto-generates duct layout from room CFMs
 * Body: { project_id, ...segmentData } — creates a single segment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, action } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    if (action === 'auto_generate') {
      // Fetch rooms with CFM data
      const { data: rooms, error: roomsErr } = await supabase
        .from('install_rooms')
        .select('id, name, cooling_cfm, heating_cfm, floor_level')
        .eq('project_id', project_id)
        .order('sort_order', { ascending: true });

      if (roomsErr) throw roomsErr;
      if (!rooms || rooms.length === 0) {
        return NextResponse.json({ error: 'No rooms found. Calculate loads first.' }, { status: 400 });
      }

      // Check if rooms have CFM data
      const hasAirflow = rooms.some(r => r.cooling_cfm && r.cooling_cfm > 0);
      if (!hasAirflow) {
        return NextResponse.json({ error: 'Rooms have no CFM data. Run load calculation first.' }, { status: 400 });
      }

      const totalCoolingCfm = rooms.reduce((s, r) => s + (r.cooling_cfm || 0), 0);

      const roomData = rooms.map(r => ({
        roomId: r.id,
        roomName: r.name,
        coolingCfm: r.cooling_cfm || 0,
        heatingCfm: r.heating_cfm || 0,
        floorLevel: r.floor_level || 1,
      }));

      const segments = generateDuctLayout(roomData, totalCoolingCfm);

      // Delete existing segments for this project
      await supabase.from('install_duct_segments').delete().eq('project_id', project_id);

      // Insert new segments
      const rows = segments.map(s => ({
        project_id,
        ...s,
      }));

      const { data: saved, error: insertErr } = await supabase
        .from('install_duct_segments')
        .insert(rows as Record<string, unknown>[])
        .select();

      if (insertErr) throw insertErr;

      // Compute static pressure estimate
      const staticPressure = estimateStaticPressure(segments);

      return NextResponse.json({
        segments: saved,
        totalCoolingCfm,
        staticPressure,
        segmentCount: saved?.length ?? 0,
      });
    }

    // Single segment creation
    const { data, error } = await supabase
      .from('install_duct_segments')
      .insert({
        project_id,
        room_id: body.room_id,
        segment_type: body.segment_type,
        shape: body.shape ?? 'round',
        diameter_in: body.diameter_in,
        width_in: body.width_in,
        height_in: body.height_in,
        length_ft: body.length_ft,
        cfm: body.cfm,
        friction_rate: body.friction_rate,
        velocity_fpm: body.velocity_fpm,
        insulation_r: body.insulation_r ?? 6,
        material: body.material ?? 'flex',
        register_type: body.register_type,
        register_size: body.register_size,
        notes: body.notes,
        sort_order: body.sort_order ?? 0,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ducts POST error:', error);
    return NextResponse.json({ error: 'Failed to create duct segment' }, { status: 500 });
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

    const { data, error } = await supabase
      .from('install_duct_segments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ducts PUT error:', error);
    return NextResponse.json({ error: 'Failed to update duct segment' }, { status: 500 });
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

    const { error } = await supabase.from('install_duct_segments').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ducts DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete duct segment' }, { status: 500 });
  }
}
