import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
    const work_order_id = searchParams.get('work_order_id');
    const draft_type = searchParams.get('draft_type');

    if (!work_order_id) {
      return NextResponse.json({ error: 'work_order_id required' }, { status: 400 });
    }

    let query = supabase
      .from('work_order_drafts')
      .select('*')
      .eq('work_order_id', work_order_id);

    if (draft_type) query = query.eq('draft_type', draft_type);

    const { data, error } = await query;
    if (error) throw error;

    // Return single draft if type specified
    if (draft_type) {
      return NextResponse.json(data?.[0] || null);
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Drafts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { work_order_id, draft_type, data: draftData, group_id, updated_by } = body;

    if (!work_order_id || !draft_type || !group_id) {
      return NextResponse.json({ error: 'work_order_id, draft_type, and group_id required' }, { status: 400 });
    }

    // Upsert: insert or update on conflict
    const { data, error } = await supabase
      .from('work_order_drafts')
      .upsert(
        {
          work_order_id,
          draft_type,
          data: draftData,
          group_id,
          updated_by: updated_by || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'work_order_id,draft_type' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Drafts PUT error:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const work_order_id = searchParams.get('work_order_id');
    const draft_type = searchParams.get('draft_type');

    if (!work_order_id || !draft_type) {
      return NextResponse.json({ error: 'work_order_id and draft_type required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('work_order_drafts')
      .delete()
      .eq('work_order_id', work_order_id)
      .eq('draft_type', draft_type);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Drafts DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
