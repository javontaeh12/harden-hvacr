import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { generateMaterials } from '@/lib/installs/materials-generator';
import type { InstallDuctSegment, InstallEquipmentOption } from '@/lib/installs/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    const tier = searchParams.get('tier');

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('install_materials')
      .select('*')
      .eq('project_id', project_id)
      .order('sort_order', { ascending: true });

    if (tier) query = query.eq('equipment_option_tier', tier);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Materials GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

/**
 * POST /api/installs/materials
 * Body: { project_id, action: 'auto_generate', equipment_option_id?: string }
 *   — auto-generates from duct segments + equipment option
 * Body: { project_id, ...materialData }
 *   — creates a single material line
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
      // Fetch duct segments
      const { data: segments, error: segErr } = await supabase
        .from('install_duct_segments')
        .select('*')
        .eq('project_id', project_id)
        .order('sort_order', { ascending: true });

      if (segErr) throw segErr;

      // Fetch equipment option (recommended or specified)
      let equipmentOption: InstallEquipmentOption | null = null;
      if (body.equipment_option_id) {
        const { data } = await supabase
          .from('install_equipment_options')
          .select('*')
          .eq('id', body.equipment_option_id)
          .single();
        equipmentOption = data as InstallEquipmentOption | null;
      } else {
        // Try to find the recommended option
        const { data } = await supabase
          .from('install_equipment_options')
          .select('*')
          .eq('project_id', project_id)
          .eq('is_recommended', true)
          .limit(1)
          .maybeSingle();
        equipmentOption = data as InstallEquipmentOption | null;
      }

      const materials = generateMaterials(
        (segments || []) as InstallDuctSegment[],
        equipmentOption,
        body.line_set_length_ft,
        body.thermostat_wire_length_ft,
      );

      // Delete existing materials for this project (matching tier if specified)
      if (equipmentOption?.tier) {
        await supabase
          .from('install_materials')
          .delete()
          .eq('project_id', project_id)
          .eq('equipment_option_tier', equipmentOption.tier);
      } else {
        await supabase.from('install_materials').delete().eq('project_id', project_id);
      }

      const rows = materials.map(m => ({
        project_id,
        ...m,
      }));

      const { data: saved, error: insertErr } = await supabase
        .from('install_materials')
        .insert(rows as Record<string, unknown>[])
        .select();

      if (insertErr) throw insertErr;

      const totalCost = (saved || []).reduce((s, m) => s + ((m as Record<string, number>).total_cost || 0), 0);

      return NextResponse.json({
        materials: saved,
        totalCost: Math.round(totalCost * 100) / 100,
        itemCount: saved?.length ?? 0,
      });
    }

    // Single material creation
    const { data, error } = await supabase
      .from('install_materials')
      .insert({
        project_id,
        category: body.category,
        name: body.name,
        description: body.description,
        quantity: body.quantity ?? 1,
        unit: body.unit ?? 'each',
        unit_cost: body.unit_cost ?? 0,
        total_cost: body.total_cost ?? (body.quantity ?? 1) * (body.unit_cost ?? 0),
        source: body.source,
        equipment_option_tier: body.equipment_option_tier,
        sort_order: body.sort_order ?? 0,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Materials POST error:', error);
    return NextResponse.json({ error: 'Failed to generate materials' }, { status: 500 });
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

    // Recalculate total if quantity or unit_cost changed
    if (updates.quantity !== undefined || updates.unit_cost !== undefined) {
      updates.total_cost = (updates.quantity ?? 0) * (updates.unit_cost ?? 0);
    }

    const { data, error } = await supabase
      .from('install_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Materials PUT error:', error);
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
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

    const { error } = await supabase.from('install_materials').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Materials DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}
