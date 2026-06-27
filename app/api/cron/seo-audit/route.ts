import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { runSEOAudit } from '@/lib/agents/seo-agent';
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
    const result = await runSEOAudit();

    const errors = result.findings.filter(f => f.severity === 'error');
    const warnings = result.findings.filter(f => f.severity === 'warning');
    const goods = result.findings.filter(f => f.severity === 'good');

    const scoreColor = result.score >= 80 ? 0x059669 : result.score >= 50 ? 0xf59e0b : 0xdc2626;
    const scoreLabel = result.score >= 80 ? 'Healthy' : result.score >= 50 ? 'Needs Work' : 'Critical';

    // Build issue fields (top 10 non-good findings)
    const issueFields = [...errors, ...warnings]
      .slice(0, 10)
      .map(f => ({
        name: `${f.severity === 'error' ? 'ERROR' : 'WARN'}: ${f.page} — ${f.category}`,
        value: `${f.issue}\n*Fix:* ${f.fix}`.slice(0, 1024),
      }));

    const mainEmbed = {
      title: `SEO Audit — Score: ${result.score}/100 (${scoreLabel})`,
      description: result.summary.slice(0, 4096),
      color: scoreColor,
      fields: [
        { name: 'Passed', value: String(goods.length), inline: true },
        { name: 'Warnings', value: String(warnings.length), inline: true },
        { name: 'Errors', value: String(errors.length), inline: true },
        { name: 'Pages Audited', value: String(new Set(result.findings.map(f => f.page)).size), inline: true },
      ],
      footer: { text: `AI Cost: $${result.aiCost.toFixed(4)}` },
      timestamp: new Date().toISOString(),
    };

    // Post main report to #marketing (SEO is marketing's domain)
    await sendToOwnChannel('seo', '', { embeds: [mainEmbed] });

    // Post detailed issues if any
    if (issueFields.length > 0) {
      await sendToOwnChannel('seo', '', {
        embeds: [{
          title: 'SEO Issues to Fix',
          color: 0xdc2626,
          fields: issueFields,
          timestamp: new Date().toISOString(),
        }],
      });
    }

    // If score is below 70, also post to #group-meeting
    if (result.score < 70) {
      await sendToGroupMeeting('seo', '', {
        embeds: [{
          title: `SEO Alert — Score: ${result.score}/100`,
          description: `${errors.length} errors, ${warnings.length} warnings found. Check #marketing for details.`,
          color: scoreColor,
          timestamp: new Date().toISOString(),
        }],
      });
    }

    // Log the audit
    await supabase.from('agent_logs').insert({
      agent: 'seo',
      action: 'seo_audit',
      details: {
        score: result.score,
        errors: errors.length,
        warnings: warnings.length,
        passed: goods.length,
        cost: result.aiCost,
      },
    } as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      score: result.score,
      errors: errors.length,
      warnings: warnings.length,
    });
  } catch (error) {
    console.error('SEO audit cron error:', error);
    return NextResponse.json({ error: 'SEO audit failed' }, { status: 500 });
  }
}
