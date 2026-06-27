import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('agent_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agent) query = query.eq('agent', agent);

    const { data, error, count } = await query;
    if (error) throw error;

    // Also get summary stats
    const { data: stats } = await supabase
      .from('agent_logs')
      .select('agent, action');

    const summary: Record<string, { total: number; actions: Record<string, number> }> = {};
    for (const log of stats || []) {
      if (!summary[log.agent]) summary[log.agent] = { total: 0, actions: {} };
      summary[log.agent].total++;
      summary[log.agent].actions[log.action] = (summary[log.agent].actions[log.action] || 0) + 1;
    }

    return NextResponse.json({ logs: data || [], count, summary });
  } catch (error) {
    console.error('Agent logs GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent logs' }, { status: 500 });
  }
}
