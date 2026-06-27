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

    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('install_price_book')
      .select('*')
      .eq('group_id', group_id)
      .eq('is_active', true)
      .order('category')
      .order('name');

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Price book GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch price book' }, { status: 500 });
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

    if (!body.group_id || !body.category || !body.name) {
      return NextResponse.json({ error: 'group_id, category, and name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('install_price_book')
      .insert({
        group_id: body.group_id,
        category: body.category,
        name: body.name,
        description: body.description,
        unit: body.unit ?? 'each',
        unit_cost: body.unit_cost ?? 0,
        is_active: body.is_active ?? true,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Price book POST error:', error);
    return NextResponse.json({ error: 'Failed to create price book item' }, { status: 500 });
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
      .from('install_price_book')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Price book PUT error:', error);
    return NextResponse.json({ error: 'Failed to update price book item' }, { status: 500 });
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

    const { error } = await supabase.from('install_price_book').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Price book DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete price book item' }, { status: 500 });
  }
}
