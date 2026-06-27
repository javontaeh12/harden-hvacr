import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runCreativePipeline } from '@/lib/agents/marketing/orchestrator';
import { sendToOwnChannel } from '@/lib/discord';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const result = await runCreativePipeline(supabase);

    try {
      await sendToOwnChannel('marketing', '', {
        embeds: [{
          title: 'Creative Briefs Generated',
          color: 0x7c3aed,
          fields: [
            { name: 'Briefs Created', value: String(result.briefsGenerated), inline: true },
            { name: 'AI Cost', value: `$${result.cost.toFixed(4)}`, inline: true },
          ],
          footer: { text: 'Review at /admin/marketing → Content Calendar' },
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (e) { console.error('Discord error:', e); }

    return NextResponse.json({
      ok: true,
      briefs_generated: result.briefsGenerated,
      cost: result.cost,
    });
  } catch (error) {
    console.error('Marketing creative cron error:', error);
    return NextResponse.json({ error: 'Creative pipeline failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
