import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('content_id');
    const campaignId = searchParams.get('campaign_id');
    const status = searchParams.get('status');
    const weekStart = searchParams.get('week_start');

    let query = supabase
      .from('marketing_content')
      .select('*, marketing_campaigns(name, campaign_type)')
      .order('scheduled_date', { ascending: true });

    if (contentId) query = query.eq('id', contentId);
    if (campaignId) query = query.eq('campaign_id', campaignId);
    if (status) query = query.eq('status', status);
    if (weekStart) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      query = query
        .gte('scheduled_date', weekStart)
        .lt('scheduled_date', weekEnd.toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET content error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { data, error } = await supabase
      .from('marketing_content')
      .insert(body as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST content error:', error);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data, error } = await supabase
      .from('marketing_content')
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('PUT content error:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
