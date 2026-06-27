import type { ParsedIntent } from './intake-parser';
import type { CallerProfile } from './caller-identity';
import { createServiceClient } from '../utils';

const DISCORD_API = 'https://discord.com/api/v10';

export interface EscalationResult {
  escalated: boolean;
  reason: string;
  discord_posted: boolean;
  email_sent: boolean;
}

export async function escalateToHuman(
  intent: ParsedIntent,
  caller: CallerProfile,
  callSessionId: string,
  transcript: string,
): Promise<EscalationResult> {
  const reasons: string[] = [];

  if (intent.confidence < 0.75) reasons.push(`Low confidence: ${intent.confidence}`);
  if (intent.intent === 'complaint') reasons.push('Customer complaint');
  if (intent.intent === 'emergency') reasons.push('Emergency call');

  if (!reasons.length) {
    return { escalated: false, reason: '', discord_posted: false, email_sent: false };
  }

  const reason = reasons.join('; ');
  let discordPosted = false;
  let emailSent = false;

  // Post to Discord #dispatch
  if (process.env.DISCORD_BOT_TOKEN_DISPATCH && process.env.DISCORD_CHANNEL_DISPATCH) {
    try {
      const embed = {
        title: `Escalation — ${caller.name || caller.phone || 'Unknown Caller'}`,
        color: 0xdc2626,
        fields: [
          { name: 'Reason', value: reason },
          { name: 'Intent', value: `${intent.intent} (${(intent.confidence * 100).toFixed(0)}% confidence)` },
          { name: 'Issue', value: intent.issue_summary.slice(0, 1024) },
          { name: 'Phone', value: caller.phone || 'Unknown', inline: true },
          { name: 'Customer', value: caller.is_known ? `${caller.name} (existing)` : 'New caller', inline: true },
          { name: 'Call Session', value: callSessionId, inline: false },
        ],
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`${DISCORD_API}/channels/${process.env.DISCORD_CHANNEL_DISPATCH}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_DISPATCH}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      });

      discordPosted = res.ok;
    } catch (err) {
      console.error('[escalation] Discord post error:', err);
    }
  }

  // Send escalation email via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Harden HVAC <noreply@hardenhvacr.com>',
          to: process.env.ADMIN_EMAIL || 'Javontaedharden@gmail.com',
          subject: `CSR Escalation — ${caller.name || caller.phone || 'Unknown'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">Call Escalation</h1>
              </div>
              <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Caller:</strong> ${caller.name || 'Unknown'} (${caller.phone || 'no phone'})</p>
                <p><strong>Intent:</strong> ${intent.intent} — ${intent.issue_summary}</p>
                <p><strong>Urgency:</strong> ${intent.urgency}</p>
                <h3>Transcript Excerpt</h3>
                <div style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 13px; white-space: pre-wrap;">${transcript.slice(0, 2000)}</div>
              </div>
            </div>
          `,
        }),
      });

      emailSent = res.ok;
    } catch (err) {
      console.error('[escalation] Email error:', err);
    }
  }

  // Log escalation in DB
  const supabase = createServiceClient();
  await supabase.from('agent_logs').insert({
    agent: 'csr_escalation',
    action: 'escalate_to_human',
    request_id: null,
    details: {
      call_session_id: callSessionId,
      reason,
      intent: intent.intent,
      confidence: intent.confidence,
      discord_posted: discordPosted,
      email_sent: emailSent,
    },
  } as Record<string, unknown>);

  return { escalated: true, reason, discord_posted: discordPosted, email_sent: emailSent };
}
