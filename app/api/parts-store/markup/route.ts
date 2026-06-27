import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const group_id = searchParams.get('group_id');

    let query = supabase.from('supplier_markup_rules').select('*');
    if (group_id) query = query.eq('group_id', group_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Markup GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch markup rules' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { group_id, category, default_markup_pct } = body;

    const { data, error } = await supabase
      .from('supplier_markup_rules')
      .upsert({ group_id, category, default_markup_pct }, { onConflict: 'group_id,category' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Markup PUT error:', error);
    return NextResponse.json({ error: 'Failed to update markup rule' }, { status: 500 });
  }
}
