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

    // Single surface fetch
    if (id) {
      const { data, error } = await supabase
        .from('install_surfaces')
        .select('*')
        .eq('id', id)
        .eq('room_id', room_id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // List all surfaces for room
    const { data, error } = await supabase
      .from('install_surfaces')
      .select('*')
      .eq('room_id', room_id)
      .order('surface_type', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install surfaces GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch install surfaces' }, { status: 500 });
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

    const { data, error } = await supabase
      .from('install_surfaces')
      .insert({
        room_id: body.room_id,
        surface_type: body.surface_type,
        orientation: body.orientation,
        gross_area_sqft: body.gross_area_sqft,
        net_area_sqft: body.net_area_sqft,
        r_value: body.r_value,
        construction: body.construction,
        is_exterior: body.is_exterior,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install surfaces POST error:', error);
    return NextResponse.json({ error: 'Failed to create install surface' }, { status: 500 });
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
      .from('install_surfaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install surfaces PUT error:', error);
    return NextResponse.json({ error: 'Failed to update install surface' }, { status: 500 });
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

    const { error } = await supabase.from('install_surfaces').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Install surfaces DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete install surface' }, { status: 500 });
  }
}
