import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runTriggerCheck } from '@/lib/agents/marketing/orchestrator';
import { sendToOwnChannel } from '@/lib/discord';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const result = await runTriggerCheck(supabase);

    if (result.triggered > 0) {
      try {
        await sendToOwnChannel('marketing', '', {
          embeds: [{
            title: 'Marketing Triggers Fired',
            color: 0xea580c,
            fields: [
              { name: 'Triggers Fired', value: String(result.triggered), inline: true },
            ],
            footer: { text: 'New campaigns created from triggers' },
            timestamp: new Date().toISOString(),
          }],
        });
      } catch (e) { console.error('Discord error:', e); }
    }

    return NextResponse.json({
      ok: true,
      triggered: result.triggered,
    });
  } catch (error) {
    console.error('Marketing triggers cron error:', error);
    return NextResponse.json({ error: 'Trigger check failed' }, { status: 500 });
  }
}
