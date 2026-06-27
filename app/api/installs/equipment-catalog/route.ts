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
    const group_id = searchParams.get('group_id');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const tonnage = searchParams.get('tonnage');
    const min_seer = searchParams.get('min_seer');
    const tier = searchParams.get('tier');
    const search = searchParams.get('search');

    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('equipment_catalog')
      .select('*')
      .eq('group_id', group_id)
      .eq('is_active', true)
      .order('category')
      .order('brand')
      .order('tonnage', { ascending: true });

    if (category) query = query.eq('category', category);
    if (brand) query = query.eq('brand', brand);
    if (tonnage) query = query.eq('tonnage', Number(tonnage));
    if (min_seer) query = query.gte('seer_rating', Number(min_seer));
    if (tier) query = query.eq('tier', tier);
    if (search) query = query.or(`model_number.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Equipment catalog GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment catalog' }, { status: 500 });
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

    if (!body.group_id || !body.category || !body.brand || !body.model_number) {
      return NextResponse.json({ error: 'group_id, category, brand, and model_number are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('equipment_catalog')
      .insert({
        group_id: body.group_id,
        category: body.category,
        brand: body.brand,
        model_number: body.model_number,
        description: body.description,
        tonnage: body.tonnage,
        seer_rating: body.seer_rating,
        hspf: body.hspf,
        btu_cooling: body.btu_cooling,
        btu_heating: body.btu_heating,
        voltage: body.voltage,
        phase: body.phase ?? '1',
        refrigerant_type: body.refrigerant_type,
        dimensions: body.dimensions ?? {},
        weight_lbs: body.weight_lbs,
        wholesale_cost: body.wholesale_cost,
        retail_price: body.retail_price,
        tier: body.tier,
        is_active: body.is_active ?? true,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Equipment catalog POST error:', error);
    return NextResponse.json({ error: 'Failed to create catalog item' }, { status: 500 });
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
      .from('equipment_catalog')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Equipment catalog PUT error:', error);
    return NextResponse.json({ error: 'Failed to update catalog item' }, { status: 500 });
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

    const { error } = await supabase.from('equipment_catalog').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Equipment catalog DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete catalog item' }, { status: 500 });
  }
}
