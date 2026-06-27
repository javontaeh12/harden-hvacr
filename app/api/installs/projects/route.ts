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
    const id = searchParams.get('id');
    const group_id = searchParams.get('group_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 });
    }

    // Single project fetch with full joins
    if (id) {
      const { data, error } = await supabase
        .from('install_projects')
        .select('*, customers(full_name, phone, address, email), install_rooms(*), install_equipment_options(*), install_proposals(*)')
        .eq('id', id)
        .eq('group_id', group_id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // List fetch
    let query = supabase
      .from('install_projects')
      .select('*, customers(full_name)')
      .eq('group_id', group_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`project_name.ilike.%${search}%,address.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install projects GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch install projects' }, { status: 500 });
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
      .from('install_projects')
      .insert({
        project_name: body.project_name,
        customer_id: body.customer_id,
        project_type: body.project_type,
        system_type: body.system_type,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        building_type: body.building_type,
        stories: body.stories,
        year_built: body.year_built,
        total_sqft: body.total_sqft,
        conditioned_sqft: body.conditioned_sqft,
        design_cooling_temp: body.design_cooling_temp,
        design_heating_temp: body.design_heating_temp,
        indoor_cooling_temp: body.indoor_cooling_temp,
        indoor_heating_temp: body.indoor_heating_temp,
        elevation_ft: body.elevation_ft,
        humidity_zone: body.humidity_zone,
        climate_zone: body.climate_zone,
        existing_equipment: body.existing_equipment,
        notes: body.notes,
        group_id: body.group_id,
        created_by: body.created_by,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install projects POST error:', error);
    return NextResponse.json({ error: 'Failed to create install project' }, { status: 500 });
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
      .from('install_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install projects PUT error:', error);
    return NextResponse.json({ error: 'Failed to update install project' }, { status: 500 });
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

    const { error } = await supabase.from('install_projects').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Install projects DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete install project' }, { status: 500 });
  }
}
