import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runStrategyPipeline } from '@/lib/agents/marketing/orchestrator';
import { sendToOwnChannel } from '@/lib/discord';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const result = await runStrategyPipeline(supabase);

    // Discord notification
    try {
      await sendToOwnChannel('marketing', '', {
        embeds: [{
          title: 'Weekly Marketing Strategy Generated',
          color: 0x7c3aed,
          fields: [
            { name: 'Campaigns Created', value: String(result.campaigns.length), inline: true },
            { name: 'AI Cost', value: `$${result.cost.toFixed(4)}`, inline: true },
            ...result.campaigns.map(c => ({
              name: c.name,
              value: `${c.campaign_type} | ${c.target_platforms.join(', ')}`,
            })),
          ],
          footer: { text: 'Review at /admin/marketing → Campaigns' },
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (e) { console.error('Discord error:', e); }

    return NextResponse.json({
      ok: true,
      campaigns: result.campaigns.length,
      cost: result.cost,
    });
  } catch (error) {
    console.error('Marketing strategy cron error:', error);
    return NextResponse.json({ error: 'Strategy pipeline failed' }, { status: 500 });
  }
}
