import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runSecurityScan } from '@/lib/agents/security-agent';
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
    const result = await runSecurityScan(supabase);

    const passCount = result.findings.filter(f => f.status === 'pass').length;
    const warnCount = result.findings.filter(f => f.status === 'warn').length;
    const failCount = result.findings.filter(f => f.status === 'fail').length;

    const statusColors = { passed: 0x059669, warnings: 0xf59e0b, critical: 0xdc2626 };
    const statusEmoji = { passed: 'All Clear', warnings: 'Warnings Found', critical: 'CRITICAL ISSUES' };

    const embed = {
      title: `Security Scan — ${statusEmoji[result.status]}`,
      description: result.summary.slice(0, 4096),
      color: statusColors[result.status],
      fields: [
        { name: 'Passed', value: String(passCount), inline: true },
        { name: 'Warnings', value: String(warnCount), inline: true },
        { name: 'Failures', value: String(failCount), inline: true },
        ...result.findings
          .filter(f => f.status !== 'pass')
          .slice(0, 10)
          .map(f => ({
            name: `${f.status === 'fail' ? 'FAIL' : 'WARN'}: ${f.check}`,
            value: f.detail.slice(0, 1024),
          })),
      ],
      footer: { text: `AI Cost: $${result.aiCost.toFixed(4)} | Severity: ${result.severity.toUpperCase()}` },
      timestamp: new Date().toISOString(),
    };

    // Post to #security
    await sendToOwnChannel('security', '', { embeds: [embed] });

    // If critical or warnings, also post to #group-meeting
    if (result.status === 'critical' || result.status === 'warnings') {
      await sendToGroupMeeting('security', '', { embeds: [embed] });
    }

    // Log
    await supabase.from('agent_logs').insert({
      agent: 'security',
      action: 'daily_security_scan',
      details: {
        status: result.status,
        severity: result.severity,
        pass: passCount,
        warn: warnCount,
        fail: failCount,
        cost: result.aiCost,
      },
    } as Record<string, unknown>);

    return NextResponse.json({ ok: true, status: result.status, severity: result.severity });
  } catch (error) {
    console.error('Security daily cron error:', error);
    return NextResponse.json({ error: 'Security scan failed' }, { status: 500 });
  }
}
