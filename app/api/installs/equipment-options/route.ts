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

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('install_equipment_options')
      .select('*')
      .eq('project_id', project_id)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Equipment options GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment options' }, { status: 500 });
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

    if (!body.project_id || !body.tier) {
      return NextResponse.json({ error: 'project_id and tier are required' }, { status: 400 });
    }

    // Calculate totals
    const equipmentTotal = (body.condenser_price || 0) + (body.air_handler_price || 0) +
      (body.furnace_price || 0) + (body.coil_price || 0) + (body.thermostat_price || 0);
    const accessoriesTotal = (body.accessories || []).reduce((s: number, a: { total: number }) => s + (a.total || 0), 0);
    const subtotal = equipmentTotal + accessoriesTotal + (body.labor_total || 0) +
      (body.material_total || 0) + (body.permit_fee || 0) + (body.disposal_fee || 0);
    const tax = body.tax ?? 0;
    const total = subtotal + tax;

    const { data, error } = await supabase
      .from('install_equipment_options')
      .insert({
        project_id: body.project_id,
        tier: body.tier,
        label: body.label,
        condenser_id: body.condenser_id,
        air_handler_id: body.air_handler_id,
        furnace_id: body.furnace_id,
        coil_id: body.coil_id,
        thermostat_id: body.thermostat_id,
        condenser_model: body.condenser_model,
        condenser_price: body.condenser_price,
        air_handler_model: body.air_handler_model,
        air_handler_price: body.air_handler_price,
        furnace_model: body.furnace_model,
        furnace_price: body.furnace_price,
        coil_model: body.coil_model,
        coil_price: body.coil_price,
        thermostat_model: body.thermostat_model,
        thermostat_price: body.thermostat_price,
        accessories: body.accessories ?? [],
        equipment_total: equipmentTotal + accessoriesTotal,
        labor_total: body.labor_total ?? 0,
        material_total: body.material_total ?? 0,
        permit_fee: body.permit_fee ?? 0,
        disposal_fee: body.disposal_fee ?? 0,
        subtotal,
        tax,
        total,
        tonnage: body.tonnage,
        seer: body.seer,
        hspf: body.hspf,
        warranty_years: body.warranty_years,
        estimated_annual_savings: body.estimated_annual_savings,
        is_recommended: body.is_recommended ?? false,
        sort_order: body.sort_order ?? 0,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Equipment options POST error:', error);
    return NextResponse.json({ error: 'Failed to create equipment option' }, { status: 500 });
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

    // Recalculate totals if pricing fields changed
    if (updates.condenser_price !== undefined || updates.air_handler_price !== undefined ||
        updates.labor_total !== undefined || updates.material_total !== undefined) {
      const equipmentTotal = (updates.condenser_price || 0) + (updates.air_handler_price || 0) +
        (updates.furnace_price || 0) + (updates.coil_price || 0) + (updates.thermostat_price || 0);
      const accessoriesTotal = (updates.accessories || []).reduce((s: number, a: { total: number }) => s + (a.total || 0), 0);
      updates.equipment_total = equipmentTotal + accessoriesTotal;
      updates.subtotal = updates.equipment_total + (updates.labor_total || 0) +
        (updates.material_total || 0) + (updates.permit_fee || 0) + (updates.disposal_fee || 0);
      updates.total = updates.subtotal + (updates.tax || 0);
    }

    const { data, error } = await supabase
      .from('install_equipment_options')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Equipment options PUT error:', error);
    return NextResponse.json({ error: 'Failed to update equipment option' }, { status: 500 });
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

    const { error } = await supabase.from('install_equipment_options').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Equipment options DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete equipment option' }, { status: 500 });
  }
}
