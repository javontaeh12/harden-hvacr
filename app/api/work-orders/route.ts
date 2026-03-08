import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendTechEnRoute,
  sendJobCompleted,
  sendServiceConfirmation,
} from '@/lib/dispatch-emails';

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
      .select('*, scheduled_date, customers(full_name, phone, address, email)')
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
      .select('*, scheduled_date, customers(full_name, phone, address, email)')
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
      .select('*, scheduled_date, customers(full_name, phone, address, email)')
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

    // Send status-change emails (async, non-blocking)
    if (updated.customer_id && updates.status) {
      const { data: customer } = await supabase
        .from('customers')
        .select('email, full_name')
        .eq('id', updated.customer_id)
        .single();

      if (customer?.email) {
        const techName = profiles?.full_name || 'Your Technician';
        const customerName = customer.full_name || 'Valued Customer';
        const serviceDesc = updated.description?.split('\n')[0] || 'HVAC Service';

        Promise.allSettled([
          // Tech claimed/assigned → send service confirmation
          updates.assigned_tech_id && !updates.status ? sendServiceConfirmation(customer.email, {
            customerName,
            serviceType: serviceDesc,
            scheduledDate: updated.scheduled_date ? new Date(updated.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD',
            timeFrame: '8 AM - 5 PM',
            techName,
          }) : Promise.resolve(),

          // Tech en route → notify customer
          updates.status === 'en_route' ? sendTechEnRoute(customer.email, {
            customerName,
            techName,
            estimatedArrival: '30-60 minutes',
            serviceType: serviceDesc,
          }) : Promise.resolve(),

          // Job completed → notify customer
          updates.status === 'completed' ? sendJobCompleted(customer.email, {
            customerName,
            techName,
            serviceType: serviceDesc,
            completedAt: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }),
          }) : Promise.resolve(),
        ]).catch(e => console.error('Status email error:', e));

        // Log agent action for completed jobs (for follow-up scheduling)
        if (updates.status === 'completed') {
          Promise.resolve(supabase.from('agent_logs').insert({
            agent: 'dispatch',
            action: 'job_completed',
            request_id: updated.id,
            details: { customer_email: customer.email, customer_name: customerName, tech_name: techName, service_type: serviceDesc },
          } as Record<string, unknown>)).catch((err: unknown) => console.error('Failed to log job completion:', err));
        }
      }
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
