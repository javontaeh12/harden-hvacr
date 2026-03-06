import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role client for API routes — middleware already verified auth
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const group_id = searchParams.get('group_id');
    const status = searchParams.get('status');
    const tech_id = searchParams.get('tech_id');
    const unassigned = searchParams.get('unassigned');
    const id = searchParams.get('id');

    let query = supabase
      .from('work_orders')
      .select('*, customers(full_name, phone, address)')
      .order('created_at', { ascending: false });

    if (id) query = query.eq('id', id);
    if (group_id) query = query.eq('group_id', group_id);
    if (status) query = query.eq('status', status);
    if (tech_id) query = query.eq('assigned_tech_id', tech_id);
    if (unassigned === 'true') {
      query = query.is('assigned_tech_id', null).not('status', 'in', '("completed","cancelled")');
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch tech names for assigned work orders
    const techIds = [...new Set((data || []).map((wo: Record<string, unknown>) => wo.assigned_tech_id).filter(Boolean))];
    let techMap: Record<string, string> = {};
    if (techIds.length > 0) {
      const { data: techs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', techIds);
      techMap = Object.fromEntries((techs || []).map((t: Record<string, unknown>) => [t.id, t.full_name]));
    }

    const result = (data || []).map((wo: Record<string, unknown>) => ({
      ...wo,
      profiles: wo.assigned_tech_id ? { full_name: techMap[wo.assigned_tech_id as string] || null } : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Work orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { data: inserted, error: insertError } = await supabase
      .from('work_orders')
      .insert(body)
      .select('*')
      .single();

    if (insertError) throw insertError;

    // Fetch with customer join
    const { data, error } = await supabase
      .from('work_orders')
      .select('*, customers(full_name, phone, address)')
      .eq('id', inserted.id)
      .single();

    if (error) throw error;

    // Fetch tech name separately if assigned
    let profiles: { full_name: string | null } | null = null;
    if (inserted.assigned_tech_id) {
      const { data: techData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', inserted.assigned_tech_id)
        .single();
      profiles = techData;
    }

    return NextResponse.json({ ...data, profiles });
  } catch (error) {
    console.error('Work orders POST error:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, ...updates } = body;

    // If completing, also deduct parts from inventory
    if (updates.status === 'completed' && updates.parts_used?.length) {
      for (const part of updates.parts_used) {
        if (part.inventory_item_id) {
          await supabase.rpc('decrement_inventory', {
            item_id: part.inventory_item_id,
            qty: part.quantity,
          });
        }
      }
      updates.completed_at = new Date().toISOString();
    }

    if (updates.status === 'in_progress' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select('*, customers(full_name, phone, address)')
      .single();

    if (updateError) throw updateError;

    // Fetch tech name separately
    let profiles: { full_name: string | null } | null = null;
    if (updated.assigned_tech_id) {
      const { data: techData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', updated.assigned_tech_id)
        .single();
      profiles = techData;
    }

    return NextResponse.json({ ...updated, profiles });
  } catch (error) {
    console.error('Work orders PUT error:', error);
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Work orders DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete work order' }, { status: 500 });
  }
}
