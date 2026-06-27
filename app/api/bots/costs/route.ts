import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch bot-related agent logs
    const { data: logs, error } = await supabase
      .from('agent_logs')
      .select('agent, action, details, created_at')
      .like('agent', 'bot_%')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Aggregate costs per bot
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    interface BotCostData {
      totalCost: number;
      todayCost: number;
      weekCost: number;
      monthCost: number;
      totalCalls: number;
      totalTokens: number;
    }

    const botCosts: Record<string, BotCostData> = {};

    for (const log of (logs || [])) {
      const agent = log.agent;
      const details = log.details as Record<string, unknown>;
      const cost = Number(details?.cost) || 0;
      const tokens = (Number(details?.input_tokens) || 0) + (Number(details?.output_tokens) || 0);
      const logDate = new Date(log.created_at);

      if (!botCosts[agent]) {
        botCosts[agent] = { totalCost: 0, todayCost: 0, weekCost: 0, monthCost: 0, totalCalls: 0, totalTokens: 0 };
      }

      botCosts[agent].totalCost += cost;
      botCosts[agent].totalCalls++;
      botCosts[agent].totalTokens += tokens;

      if (log.created_at.startsWith(today)) botCosts[agent].todayCost += cost;
      if (logDate >= sevenDaysAgo) botCosts[agent].weekCost += cost;
      if (logDate >= thirtyDaysAgo) botCosts[agent].monthCost += cost;
    }

    // Totals
    const totalCost = Object.values(botCosts).reduce((s, b) => s + b.totalCost, 0);
    const todayCost = Object.values(botCosts).reduce((s, b) => s + b.todayCost, 0);
    const weekCost = Object.values(botCosts).reduce((s, b) => s + b.weekCost, 0);
    const monthCost = Object.values(botCosts).reduce((s, b) => s + b.monthCost, 0);
    const totalCalls = Object.values(botCosts).reduce((s, b) => s + b.totalCalls, 0);

    return NextResponse.json({
      botCosts,
      totals: { totalCost, todayCost, weekCost, monthCost, totalCalls },
    });
  } catch (error) {
    console.error('Bot costs error:', error);
    return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 });
  }
}
