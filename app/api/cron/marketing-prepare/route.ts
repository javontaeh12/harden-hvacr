import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runPreparePipeline } from '@/lib/agents/marketing/orchestrator';
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
    const result = await runPreparePipeline(supabase);

    try {
      await sendToOwnChannel('marketing', '', {
        embeds: [{
          title: 'Content Ready for Review',
          color: result.passed > 0 ? 0x059669 : 0xf59e0b,
          fields: [
            { name: 'Validated', value: String(result.validated), inline: true },
            { name: 'Passed', value: String(result.passed), inline: true },
            { name: 'Failed', value: String(result.failed), inline: true },
            { name: 'AI Cost', value: `$${result.cost.toFixed(4)}`, inline: true },
          ],
          footer: { text: 'Approve content at /admin/marketing → Review Queue' },
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (e) { console.error('Discord error:', e); }

    return NextResponse.json({
      ok: true,
      validated: result.validated,
      passed: result.passed,
      failed: result.failed,
      cost: result.cost,
    });
  } catch (error) {
    console.error('Marketing prepare cron error:', error);
    return NextResponse.json({ error: 'Prepare pipeline failed' }, { status: 500 });
  }
}
