import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { generateShareToken } from '@/lib/installs/proposal-helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    const id = searchParams.get('id');

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    if (id) {
      const { data, error } = await supabase
        .from('install_proposals')
        .select('*')
        .eq('id', id)
        .eq('project_id', project_id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('install_proposals')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proposals GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
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

    if (!body.project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Auto-generate share token
    const shareToken = generateShareToken();

    // Default valid_until to 30 days from now
    const validUntil = body.valid_until ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('install_proposals')
      .insert({
        project_id: body.project_id,
        status: body.status ?? 'draft',
        selected_tier: body.selected_tier,
        cover_title: body.cover_title ?? 'HVAC System Proposal',
        cover_subtitle: body.cover_subtitle,
        intro_message: body.intro_message,
        closing_message: body.closing_message,
        company_terms: body.company_terms,
        show_financing: body.show_financing ?? false,
        financing_provider: body.financing_provider,
        financing_term_months: body.financing_term_months,
        financing_apr: body.financing_apr,
        financing_monthly: body.financing_monthly,
        valid_until: validUntil,
        share_token: shareToken,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proposals POST error:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
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

    // If sending proposal, generate share token if missing
    if (updates.status === 'sent' && !updates.share_token) {
      updates.share_token = generateShareToken();
    }

    const { data, error } = await supabase
      .from('install_proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proposals PUT error:', error);
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
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

    const { error } = await supabase.from('install_proposals').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Proposals DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
