import OpenAI from 'openai';
import type { ParsedIntent } from './intake-parser';
import type { CallerProfile } from './caller-identity';
import { parseAIJson, calculateCost, extractUsage, extractAIText, createServiceClient } from '../utils';

export interface ComplaintResolution {
  acknowledgment: string;
  root_cause: string;
  resolution_options: { type: string; label: string; description: string }[];
  recommended_action: string;
  customer_message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  follow_up_required: boolean;
  follow_up_date: string | null;
}

export interface ComplaintResult {
  resolution: ComplaintResolution;
  model: string;
  cost: number;
  escalated_to_manager: boolean;
}

export async function resolveComplaint(
  intent: ParsedIntent,
  caller: CallerProfile,
  transcript: string,
  callSessionId: string,
): Promise<ComplaintResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = 'gpt-5-mini';

  const customerContext = caller.is_known
    ? `KNOWN CUSTOMER: ${caller.name}, ${caller.past_bookings.length} previous visits, rewards balance: ${caller.rewards_balance} pts, ${caller.contracts.length} active contract(s)`
    : 'NEW CALLER — no previous history';

  const recentHistory = caller.past_bookings.slice(0, 5).map((b: Record<string, unknown>) =>
    `- ${b.service_type || b.title || 'Service'} on ${b.start_time || b.date || 'unknown date'} — ${b.status || 'unknown status'}`
  ).join('\n') || 'No recent service history';

  const prompt = `You are the complaint resolution specialist for Harden HVAC & Refrigeration in Tallahassee, FL.

A customer has called with a complaint. Your job is to de-escalate, show empathy, identify the root cause, and propose resolution options.

CUSTOMER COMPLAINT:
${intent.issue_summary}

FULL TRANSCRIPT:
${transcript.slice(0, 3000)}

${customerContext}

RECENT SERVICE HISTORY:
${recentHistory}

Analyze this complaint and return ONLY valid JSON:
{
  "acknowledgment": "An empathetic 1-2 sentence opening that validates their frustration",
  "root_cause": "What likely caused this issue (1-2 sentences)",
  "resolution_options": [
    { "type": "priority_reschedule" | "discount" | "manager_callback" | "free_diagnostic" | "warranty_review" | "refund_referral", "label": "Short label", "description": "What this option entails" }
  ],
  "recommended_action": "The single best resolution for this situation",
  "customer_message": "Full empathetic message to deliver to the customer",
  "severity": "low" | "medium" | "high" | "critical",
  "follow_up_required": true/false,
  "follow_up_date": "YYYY-MM-DD or null"
}

RULES:
- Always lead with empathy — never defensive
- Known customers with history get priority treatment
- If the complaint mentions safety, health risk, or property damage → severity = "critical"
- If about missed appointments or no-shows → always offer priority_reschedule + discount
- If about work quality → offer free_diagnostic + warranty_review
- If about billing → offer manager_callback + refund_referral
- Always include at least 2 resolution options
- Set follow_up_date to 2-3 business days from today for high/critical severity`;

  const response = await openai.responses.create({
    model,
    instructions: 'You are an empathetic customer complaint resolution specialist for an HVAC company. Return only valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 3000,
  });

  const resp = response as unknown as Record<string, unknown>;
  const aiText = extractAIText(resp);
  const usage = extractUsage(resp);
  const cost = calculateCost(model, usage.input_tokens, usage.output_tokens);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseAIJson(aiText) as any;

  const resolution: ComplaintResolution = {
    acknowledgment: raw.acknowledgment || "I'm sorry to hear about your experience.",
    root_cause: raw.root_cause || 'Under investigation',
    resolution_options: (raw.resolution_options || []).map((opt: Record<string, string>) => ({
      type: opt.type || 'manager_callback',
      label: opt.label || opt.type,
      description: opt.description || '',
    })),
    recommended_action: raw.recommended_action || 'Manager callback within 24 hours',
    customer_message: raw.customer_message || "I sincerely apologize for the inconvenience. I've flagged this for our management team and someone will reach out to you within 24 hours.",
    severity: ['low', 'medium', 'high', 'critical'].includes(raw.severity) ? raw.severity : 'medium',
    follow_up_required: raw.follow_up_required ?? true,
    follow_up_date: raw.follow_up_date || null,
  };

  const escalatedToManager = resolution.severity === 'critical' || resolution.severity === 'high';

  // Auto-escalate critical complaints to Discord
  if (escalatedToManager && process.env.DISCORD_BOT_TOKEN_DISPATCH && process.env.DISCORD_CHANNEL_DISPATCH) {
    try {
      const embed = {
        title: `Complaint — ${caller.name || caller.phone || 'Unknown'} [${resolution.severity.toUpperCase()}]`,
        color: resolution.severity === 'critical' ? 0xff0000 : 0xff6600,
        fields: [
          { name: 'Issue', value: intent.issue_summary.slice(0, 1024) },
          { name: 'Root Cause', value: resolution.root_cause.slice(0, 1024) },
          { name: 'Recommended Action', value: resolution.recommended_action },
          { name: 'Customer', value: caller.is_known ? `${caller.name} — ${caller.past_bookings.length} visits` : 'New caller', inline: true },
          { name: 'Phone', value: caller.phone || 'Unknown', inline: true },
          { name: 'Follow-up', value: resolution.follow_up_date || 'ASAP', inline: true },
        ],
        timestamp: new Date().toISOString(),
      };

      await fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_DISPATCH}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_DISPATCH}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (err) {
      console.error('[complaint-resolver] Discord escalation failed:', err);
    }
  }

  // Log to DB
  const supabase = createServiceClient();
  await supabase.from('agent_logs').insert({
    agent: 'csr_complaint_resolver',
    action: 'complaint_resolved',
    request_id: null,
    details: {
      call_session_id: callSessionId,
      severity: resolution.severity,
      root_cause: resolution.root_cause,
      recommended_action: resolution.recommended_action,
      escalated_to_manager: escalatedToManager,
      ai_cost: cost,
    },
  } as Record<string, unknown>);

  return { resolution, model, cost, escalated_to_manager: escalatedToManager };
}
