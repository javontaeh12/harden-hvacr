import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runDevBot } from '@/lib/agents/webdev-agent';
import { sendToOwnChannel, sendToGroupMeeting } from '@/lib/discord';

export const maxDuration = 60;

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
    const result = await runDevBot(supabase);

    const color = result.fixesApplied > 0 ? 0x06b6d4 : 0x6b7280;
    const previewUrl = `https://github.com/javontaeh12/harden-hvacr/tree/preview/dev-bot`;

    // Post to #web-developer
    await sendToOwnChannel('webdev', '', {
      embeds: [{
        title: result.fixesApplied > 0
          ? `Dev Bot — Pushed ${result.fixesApplied} Fix${result.fixesApplied > 1 ? 'es' : ''}`
          : 'Dev Bot — No Fixes Needed',
        description: result.fixesApplied > 0
          ? `Fixes pushed to \`preview/dev-bot\` branch.\n[Review changes](${previewUrl})`
          : 'All audited pages look good. No code changes needed.',
        color,
        fields: [
          ...(result.filesChanged.length > 0 ? [{
            name: 'Files Changed',
            value: result.filesChanged.map(f => `\`${f}\``).join('\n'),
          }] : []),
          ...(result.errors.length > 0 ? [{
            name: 'Errors',
            value: result.errors.slice(0, 5).join('\n').slice(0, 1024),
          }] : []),
          { name: 'AI Cost', value: `$${result.totalCost.toFixed(4)}`, inline: true },
        ],
        footer: { text: 'Review the preview branch before merging to main' },
        timestamp: new Date().toISOString(),
      }],
    });

    // If fixes were applied, also notify #group-meeting
    if (result.fixesApplied > 0) {
      await sendToGroupMeeting('webdev', '', {
        embeds: [{
          title: `Web Developer pushed ${result.fixesApplied} fix${result.fixesApplied > 1 ? 'es' : ''} to preview branch`,
          description: result.filesChanged.map(f => `\`${f}\``).join(', '),
          color: 0x06b6d4,
          footer: { text: `Review at: ${previewUrl}` },
          timestamp: new Date().toISOString(),
        }],
      });
    }

    // Log the action
    await supabase.from('agent_logs').insert({
      agent: 'webdev',
      action: result.fixesApplied > 0 ? 'code_fixes_pushed' : 'no_fixes_needed',
      details: {
        fixes: result.fixesApplied,
        files: result.filesChanged,
        errors: result.errors.length,
        cost: result.totalCost,
      },
    } as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      fixes: result.fixesApplied,
      files: result.filesChanged,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Web dev bot cron error:', error);
    return NextResponse.json({ error: 'Web dev bot failed' }, { status: 500 });
  }
}
