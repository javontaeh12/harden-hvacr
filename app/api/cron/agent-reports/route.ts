import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createThread, buildSubjectWithToken } from '@/lib/email-threads';
import { sendToOwnChannel, buildReportEmbed, buildActionButtons } from '@/lib/discord';
import { generateWeeklyReport, buildManagerPrompt, formatReportEmbed } from '@/lib/agents/manager-agent';
import { generateFinancialSnapshot } from '@/lib/agents/finance-agent';
import { runSecurityScan } from '@/lib/agents/security-agent';

const FROM_EMAIL = 'Harden HVAC <onboarding@resend.dev>';
const OWNER_EMAIL = 'Javontaedharden@gmail.com';

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

    // Use manager-agent for comprehensive weekly report
    const reportData = await generateWeeklyReport(supabase);
    const { summary, cost: aiCost } = await buildManagerPrompt(reportData, 'weekly');
    const reportEmbed = formatReportEmbed(summary, 'weekly', reportData);

    // Get legacy stats for backwards compatibility
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await supabase
      .from('agent_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    const allLogs = logs || [];
    const dispatchLogs = allLogs.filter(l => l.agent === 'dispatch');
    const autoScheduled = dispatchLogs.filter(l => l.action === 'auto_schedule').length;
    const conflicts = dispatchLogs.filter(l => l.action === 'conflict').length;
    const followUps = allLogs.filter(l => l.agent === 'follow_up' && l.action === 'email_sent').length;
    const replyActions = allLogs.filter(l => l.agent === 'discord' || l.agent === 'inbound_email').length;

    let totalCost = 0;
    for (const log of allLogs) {
      const details = log.details as Record<string, unknown> | null;
      if (details?.cost) totalCost += Number(details.cost);
    }

    // Get finance + security summaries
    const [financeSnapshot, securityResult] = await Promise.allSettled([
      generateFinancialSnapshot(supabase, 'week'),
      runSecurityScan(supabase),
    ]);

    const financeData = financeSnapshot.status === 'fulfilled' ? financeSnapshot.value : null;
    const securityData = securityResult.status === 'fulfilled' ? securityResult.value : null;

    // Create thread so admin can reply with instructions
    const token = await createThread('report', null, {
      report_type: 'weekly_summary',
      period_start: sevenDaysAgo,
      period_end: new Date().toISOString(),
      stats: { autoScheduled, conflicts, followUps, replyActions, totalCost },
    });

    // Post enhanced report to Discord #manager
    try {
      // Main report embed
      await sendToOwnChannel('manager', '', {
        embeds: [reportEmbed],
        components: buildActionButtons(token),
      });

      // Legacy stats embed
      await sendToOwnChannel('manager', '', {
        embeds: [buildReportEmbed({ autoScheduled, conflicts, followUps, replyActions, totalCost })],
      });

      // Finance summary section
      if (financeData) {
        await sendToOwnChannel('manager', '', {
          embeds: [{
            title: 'Weekly Finance Summary',
            color: 0xf59e0b,
            fields: [
              { name: 'Revenue', value: `$${financeData.grossRevenue.toFixed(2)}`, inline: true },
              { name: 'Expenses', value: `$${financeData.totalExpenses.toFixed(2)}`, inline: true },
              { name: 'Net Profit', value: `$${financeData.netProfit.toFixed(2)}`, inline: true },
              { name: 'Profit Margin', value: `${financeData.profitMargin.toFixed(1)}%`, inline: true },
            ],
            timestamp: new Date().toISOString(),
          }],
        });
      }

      // Security summary section
      if (securityData) {
        const statusColors = { passed: 0x059669, warnings: 0xf59e0b, critical: 0xdc2626 };
        await sendToOwnChannel('manager', '', {
          embeds: [{
            title: `Security Status: ${securityData.status.toUpperCase()}`,
            description: securityData.summary.slice(0, 4096),
            color: statusColors[securityData.status],
            timestamp: new Date().toISOString(),
          }],
        });
      }
    } catch (e) { console.error('Discord report error:', e); }

    // Send email
    const subject = buildSubjectWithToken('Weekly AI Agent Report - Harden HVAC', token);
    const financeHtml = financeData ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px;">Finance</h3>
              <p style="margin: 0 0 4px;"><strong>Revenue:</strong> $${financeData.grossRevenue.toFixed(2)}</p>
              <p style="margin: 0 0 4px;"><strong>Expenses:</strong> $${financeData.totalExpenses.toFixed(2)}</p>
              <p style="margin: 0 0 4px;"><strong>Net Profit:</strong> $${financeData.netProfit.toFixed(2)}</p>
              <p style="margin: 0;"><strong>Margin:</strong> ${financeData.profitMargin.toFixed(1)}%</p>
            </div>` : '';
    const securityHtml = securityData ? `
            <div style="background: ${securityData.status === 'passed' ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${securityData.status === 'passed' ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px;">Security: ${securityData.status.toUpperCase()}</h3>
              <p style="margin: 0;">${securityData.summary.slice(0, 500)}</p>
            </div>` : '';

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Weekly AI Agent Report</h1>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
              <h3 style="margin: 0 0 12px;">AI Summary</h3>
              <p style="margin: 0; white-space: pre-wrap;">${summary.slice(0, 1000)}</p>
            </div>

            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px;">Dispatch</h3>
              <p style="margin: 0 0 4px;"><strong>Auto-Scheduled:</strong> ${autoScheduled}</p>
              <p style="margin: 0 0 4px;"><strong>Conflicts (needed review):</strong> ${conflicts}</p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px;">Follow-Ups & Replies</h3>
              <p style="margin: 0 0 4px;"><strong>Follow-Up Emails Sent:</strong> ${followUps}</p>
              <p style="margin: 0 0 4px;"><strong>Email Replies Processed:</strong> ${replyActions}</p>
            </div>
            ${financeHtml}
            ${securityHtml}
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px;">AI Costs</h3>
              <p style="margin: 0;"><strong>Total Spend:</strong> $${totalCost.toFixed(4)}</p>
            </div>

            <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Reply to this email</strong> to adjust priorities, give instructions, or change how the AI agents operate.</p>
            </div>
          </div>
        </div>
      `,
    });

    // Log the report
    await supabase.from('agent_logs').insert({
      agent: 'report',
      action: 'weekly_summary_sent',
      details: {
        token,
        auto_scheduled: autoScheduled,
        conflicts,
        follow_ups: followUps,
        reply_actions: replyActions,
        total_cost: totalCost,
        ai_summary_cost: aiCost,
        finance_included: !!financeData,
        security_included: !!securityData,
      },
    } as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      stats: { autoScheduled, conflicts, followUps, replyActions, totalCost: totalCost.toFixed(4) },
    });
  } catch (error) {
    console.error('Agent reports cron error:', error);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}
