import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  );
}

// Public: get all active packages (optionally filtered by service_type)
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const serviceType = req.nextUrl.searchParams.get('service_type');

  let query = supabase
    .from('service_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('price');

  if (serviceType) {
    query = query.eq('service_type', serviceType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Create a new package
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();

  const { data, error } = await supabase
    .from('service_packages')
    .insert({
      service_type: body.service_type,
      name: body.name,
      description: body.description || null,
      includes: body.includes || [],
      price: body.price || 0,
      sort_order: body.sort_order || 0,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// Update a package
export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('service_packages')
    .update({
      service_type: body.service_type,
      name: body.name,
      description: body.description || null,
      includes: body.includes || [],
      price: body.price || 0,
      sort_order: body.sort_order || 0,
      is_active: body.is_active ?? true,
    })
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Delete a package
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('service_packages')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
