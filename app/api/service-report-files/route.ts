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
    const service_report_id = searchParams.get('service_report_id');
    const customer_id = searchParams.get('customer_id');
    const work_order_id = searchParams.get('work_order_id');

    let query = supabase
      .from('service_report_files')
      .select('*')
      .order('sort_order', { ascending: true });

    if (service_report_id) query = query.eq('service_report_id', service_report_id);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (work_order_id) query = query.eq('work_order_id', work_order_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Service report files GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('service_report_files')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Service report files POST error:', error);
    return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase
      .from('service_report_files')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Service report files DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete file record' }, { status: 500 });
  }
}
