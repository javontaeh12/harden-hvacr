import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { after } from 'next/server';
import { findThreadByToken, resolveThread } from '@/lib/email-threads';
import { resolveReplyAction, executeAction } from '@/lib/reply-action-handler';
import {
  editInteractionResponse,
  buildResolvedButtons,
  buildCustomReplyModal,
  getAllPublicKeys,
} from '@/lib/discord';
import { createClient } from '@supabase/supabase-js';

// Interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;
const MESSAGE_COMPONENT = 3;
const MODAL_SUBMIT = 5;

// Response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_REPLY = 5;
const DEFERRED_UPDATE = 6;
const MODAL_RESPONSE = 9;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-signature-ed25519') || '';
  const timestamp = request.headers.get('x-signature-timestamp') || '';

  // Try to verify against all bot public keys
  const allKeys = getAllPublicKeys();
  let matchedAppId = '';
  let verified = false;

  for (const { publicKey, applicationId } of allKeys) {
    if (!publicKey) continue;
    try {
      const isValid = await verifyKey(body, signature, timestamp, publicKey);
      if (isValid) {
        verified = true;
        matchedAppId = applicationId;
        break;
      }
    } catch {
      // Try next key
    }
  }

  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const interaction = JSON.parse(body);
  // Use the application_id from the interaction payload if available
  const applicationId = interaction.application_id || matchedAppId;

  // Handle PING (Discord verification handshake)
  if (interaction.type === PING) {
    return NextResponse.json({ type: PONG });
  }

  // Handle slash commands
  if (interaction.type === APPLICATION_COMMAND) {
    const commandName: string = interaction.data.name;

    // For quick commands, respond immediately
    if (commandName === 'status') {
      return NextResponse.json({
        type: CHANNEL_MESSAGE,
        data: {
          embeds: [{
            title: 'Bot System Status',
            description: 'All 8 bots are online and running on schedule.',
            color: 0x059669,
            fields: [
              { name: 'Dispatch', value: 'Daily 7 AM EST', inline: true },
              { name: 'Manager', value: 'Daily 6 PM EST', inline: true },
              { name: 'Finance', value: 'Daily 5 PM EST', inline: true },
              { name: 'Security', value: 'Daily midnight EST', inline: true },
              { name: 'Marketing', value: 'Daily 9 AM EST', inline: true },
              { name: 'SEO', value: 'Monday 8 AM EST', inline: true },
              { name: 'Web Developer', value: 'Monday 10 AM EST', inline: true },
              { name: 'Group Meeting', value: 'Sunday 11 AM EST', inline: true },
            ],
            timestamp: new Date().toISOString(),
          }],
        },
      });
    }

    // For commands that need processing, defer the reply then do the work
    after(async () => {
      await processSlashCommand(commandName, interaction.token, applicationId);
    });

    return NextResponse.json({ type: DEFERRED_REPLY });
  }

  // Handle button clicks
  if (interaction.type === MESSAGE_COMPONENT) {
    const customId: string = interaction.data.custom_id;
    const parts = customId.split('_');
    const action = parts[0];
    const token = parts.slice(1).join('_'); // HARDEN-XXXXXXXX

    // "Custom Reply" button -> open modal
    if (action === 'custom') {
      return NextResponse.json({
        type: MODAL_RESPONSE,
        data: buildCustomReplyModal(token),
      });
    }

    // CSR booking approve/deny buttons
    if (action === 'approvebooking' || action === 'denybooking') {
      const bookingId = token; // token is actually the booking ID here
      const bookingAction = action === 'approvebooking' ? 'approve' : 'deny';

      after(async () => {
        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://hardenhvacr.com';

          const res = await fetch(`${baseUrl}/api/csr/approve-booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId, action: bookingAction }),
          });

          const result = await res.json();
          const label = bookingAction === 'approve'
            ? `Approved — invoice sent${result.invoice_sent ? '' : ' (no email on file)'}`
            : 'Denied — customer notified';

          await editInteractionResponse(interaction.token, applicationId, {
            components: [{
              type: 1,
              components: [{
                type: 2,
                style: bookingAction === 'approve' ? 3 : 4,
                label,
                custom_id: `resolved_${bookingId}`,
                disabled: true,
              }],
            }],
          });
        } catch (err) {
          console.error('[discord] Booking action error:', err);
          await editInteractionResponse(interaction.token, applicationId, {
            content: 'Failed to process booking action. Try from the admin portal.',
            components: [],
          });
        }
      });

      return NextResponse.json({ type: DEFERRED_UPDATE });
    }

    // Approve, Reschedule, Cancel -> deferred update, then process
    after(async () => {
      await processButtonAction(action, token, interaction.token, applicationId);
    });

    return NextResponse.json({ type: DEFERRED_UPDATE });
  }

  // Handle modal submissions
  if (interaction.type === MODAL_SUBMIT) {
    const modalId: string = interaction.data.custom_id;
    const token = modalId.replace('modal_', '');
    const instruction =
      interaction.data.components?.[0]?.components?.[0]?.value || '';

    after(async () => {
      await processCustomReply(token, instruction, interaction.token, applicationId);
    });

    return NextResponse.json({ type: DEFERRED_UPDATE });
  }

  return NextResponse.json({ error: 'Unknown interaction' }, { status: 400 });
}

async function processButtonAction(
  action: string,
  threadToken: string,
  interactionToken: string,
  applicationId: string
) {
  const thread = await findThreadByToken(threadToken);
  if (!thread) {
    await editInteractionResponse(interactionToken, applicationId, {
      content: 'Thread not found — it may have expired.',
      components: [],
    });
    return;
  }

  // Map button action to reply action format
  const context = thread.context as Record<string, unknown>;
  const decision = context.decision as Record<string, unknown> | undefined;

  let replyAction;
  if (action === 'approve' && decision) {
    replyAction = {
      action: 'approve_schedule' as const,
      parameters: {
        date: decision.scheduled_date || decision.date,
        time_frame: decision.time_frame || '8 AM - 12 PM',
      },
      confidence: 1.0,
      summary: `Approved scheduling for ${decision.scheduled_date || 'suggested date'}`,
    };
  } else if (action === 'cancel') {
    replyAction = {
      action: 'cancel' as const,
      parameters: { reason: 'Cancelled by admin via Discord' },
      confidence: 1.0,
      summary: 'Service request cancelled by admin',
    };
  } else {
    const actionMap: Record<string, string> = {
      approve: 'approve_schedule',
      reschedule: 'reschedule',
      cancel: 'cancel',
    };
    replyAction = {
      action: (actionMap[action] || 'no_action') as 'reschedule' | 'no_action',
      parameters: {},
      confidence: 1.0,
      summary: `Admin selected: ${action}`,
    };
  }

  await executeAction(replyAction, thread);
  await resolveThread(thread.id);

  // Log
  const supabase = createServiceClient();
  await supabase.from('agent_logs').insert({
    agent: 'discord',
    action: `button_${action}`,
    request_id: thread.request_id || null,
    details: {
      thread_token: threadToken,
      resolved_action: replyAction.action,
      summary: replyAction.summary,
      bot_application_id: applicationId,
    },
  } as Record<string, unknown>);

  await editInteractionResponse(interactionToken, applicationId, {
    components: buildResolvedButtons(replyAction.summary),
  });
}

async function processCustomReply(
  threadToken: string,
  instruction: string,
  interactionToken: string,
  applicationId: string
) {
  const thread = await findThreadByToken(threadToken);
  if (!thread) {
    await editInteractionResponse(interactionToken, applicationId, {
      content: 'Thread not found.',
      components: [],
    });
    return;
  }

  // Use AI to parse the free-text instruction
  const action = await resolveReplyAction(thread, instruction);
  await executeAction(action, thread);
  await resolveThread(thread.id);

  const supabase = createServiceClient();
  await supabase.from('agent_logs').insert({
    agent: 'discord',
    action: 'custom_reply',
    request_id: thread.request_id || null,
    details: {
      thread_token: threadToken,
      instruction,
      resolved_action: action.action,
      confidence: action.confidence,
      summary: action.summary,
      bot_application_id: applicationId,
    },
  } as Record<string, unknown>);

  await editInteractionResponse(interactionToken, applicationId, {
    components: buildResolvedButtons(action.summary),
  });
}

async function processSlashCommand(
  command: string,
  interactionToken: string,
  applicationId: string
) {
  const supabase = createServiceClient();

  try {
    switch (command) {
      case 'dispatch': {
        const { buildDailyScheduleEmbed } = await import('@/lib/agents/dispatch-agent');
        const embed = await buildDailyScheduleEmbed(supabase);
        await editInteractionResponse(interactionToken, applicationId, {
          embeds: [embed],
        });
        break;
      }

      case 'report': {
        const { generateDailyReport, buildManagerPrompt, formatReportEmbed } = await import('@/lib/agents/manager-agent');
        const data = await generateDailyReport(supabase);
        const { summary } = await buildManagerPrompt(data, 'daily');
        const embed = formatReportEmbed(summary, 'daily', data);
        await editInteractionResponse(interactionToken, applicationId, {
          embeds: [embed],
        });
        break;
      }

      case 'finance': {
        const { generateFinancialSnapshot, buildFinancePrompt } = await import('@/lib/agents/finance-agent');
        const today = await generateFinancialSnapshot(supabase, 'today');
        const month = await generateFinancialSnapshot(supabase, 'month');
        const { analysis } = await buildFinancePrompt(today);
        await editInteractionResponse(interactionToken, applicationId, {
          embeds: [{
            title: 'Financial Snapshot',
            description: analysis.slice(0, 4096),
            color: 0xf59e0b,
            fields: [
              { name: "Today's Revenue", value: `$${today.grossRevenue.toFixed(2)}`, inline: true },
              { name: "Today's Expenses", value: `$${today.totalExpenses.toFixed(2)}`, inline: true },
              { name: "Today's Net", value: `$${today.netProfit.toFixed(2)}`, inline: true },
              { name: 'MTD Revenue', value: `$${month.grossRevenue.toFixed(2)}`, inline: true },
              { name: 'MTD Expenses', value: `$${month.totalExpenses.toFixed(2)}`, inline: true },
              { name: 'MTD Profit', value: `$${month.netProfit.toFixed(2)}`, inline: true },
            ],
            timestamp: new Date().toISOString(),
          }],
        });
        break;
      }

      case 'security': {
        const { runSecurityScan } = await import('@/lib/agents/security-agent');
        const result = await runSecurityScan(supabase);
        const statusColors = { passed: 0x059669, warnings: 0xf59e0b, critical: 0xdc2626 };
        const passCount = result.findings.filter(f => f.status === 'pass').length;
        const warnCount = result.findings.filter(f => f.status === 'warn').length;
        const failCount = result.findings.filter(f => f.status === 'fail').length;
        await editInteractionResponse(interactionToken, applicationId, {
          embeds: [{
            title: `Security Scan — ${result.status.toUpperCase()}`,
            description: result.summary.slice(0, 4096),
            color: statusColors[result.status],
            fields: [
              { name: 'Passed', value: String(passCount), inline: true },
              { name: 'Warnings', value: String(warnCount), inline: true },
              { name: 'Failures', value: String(failCount), inline: true },
            ],
            footer: { text: `Severity: ${result.severity.toUpperCase()}` },
            timestamp: new Date().toISOString(),
          }],
        });
        break;
      }

      case 'seo': {
        const { runSEOAudit } = await import('@/lib/agents/seo-agent');
        const result = await runSEOAudit();
        const errors = result.findings.filter(f => f.severity === 'error').length;
        const warnings = result.findings.filter(f => f.severity === 'warning').length;
        const goods = result.findings.filter(f => f.severity === 'good').length;
        const scoreColor = result.score >= 80 ? 0x059669 : result.score >= 50 ? 0xf59e0b : 0xdc2626;
        await editInteractionResponse(interactionToken, applicationId, {
          embeds: [{
            title: `SEO Audit — Score: ${result.score}/100`,
            description: result.summary.slice(0, 4096),
            color: scoreColor,
            fields: [
              { name: 'Passed', value: String(goods), inline: true },
              { name: 'Warnings', value: String(warnings), inline: true },
              { name: 'Errors', value: String(errors), inline: true },
            ],
            timestamp: new Date().toISOString(),
          }],
        });
        break;
      }

      case 'webdev': {
        // Show most recent dev bot activity from agent_logs
        const { data: logs } = await supabase
          .from('agent_logs')
          .select('action, details, created_at')
          .eq('agent', 'webdev')
          .order('created_at', { ascending: false })
          .limit(1);

        const latest = logs?.[0];
        if (latest) {
          const details = latest.details as Record<string, unknown>;
          await editInteractionResponse(interactionToken, applicationId, {
            embeds: [{
              title: 'Web Developer Bot — Last Run',
              color: 0x06b6d4,
              fields: [
                { name: 'Action', value: String(latest.action), inline: true },
                { name: 'Fixes Applied', value: String(details?.fixes || 0), inline: true },
                { name: 'Files Changed', value: Array.isArray(details?.files) ? (details.files as string[]).map(f => `\`${f}\``).join('\n') || 'None' : 'None' },
                { name: 'Last Run', value: new Date(latest.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' }), inline: true },
              ],
              footer: { text: 'Preview branch: preview/dev-bot' },
              timestamp: new Date().toISOString(),
            }],
          });
        } else {
          await editInteractionResponse(interactionToken, applicationId, {
            embeds: [{
              title: 'Web Developer Bot',
              description: 'No runs yet. The dev bot runs every Monday at 10 AM EST after the SEO audit.',
              color: 0x06b6d4,
              timestamp: new Date().toISOString(),
            }],
          });
        }
        break;
      }

      default:
        await editInteractionResponse(interactionToken, applicationId, {
          content: `Unknown command: /${command}`,
        });
    }
  } catch (error) {
    console.error(`Slash command /${command} error:`, error);
    await editInteractionResponse(interactionToken, applicationId, {
      content: `Error running /${command}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}
