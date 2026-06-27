import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content_id, action, rejection_reason } = await request.json();
    if (!content_id || !action) {
      return NextResponse.json({ error: 'Missing content_id or action' }, { status: 400 });
    }

    if (action === 'approve') {
      const { data, error } = await supabase
        .from('marketing_content')
        .update({
          status: 'approved',
          approved_by: user.user.email || user.user.id,
          approved_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', content_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (action === 'reject') {
      const { data, error } = await supabase
        .from('marketing_content')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || 'Rejected by admin',
        } as Record<string, unknown>)
        .eq('id', content_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Content approve error:', error);
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}
