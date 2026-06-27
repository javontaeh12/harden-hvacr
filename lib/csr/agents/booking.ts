import OpenAI from 'openai';
import type { ParsedIntent } from './intake-parser';
import type { CallerProfile } from './caller-identity';
import type { AvailabilityResult } from './calendar-availability';
import { parseAIJson, calculateCost, extractUsage, extractAIText } from '../utils';

export interface BookingProposal {
  recommended_date: string;
  recommended_time_frame: string;
  recommended_tech: { id: string; name: string } | null;
  service_type: string;
  estimated_duration: string;
  priority: string;
  reasoning: string;
  customer_message: string;
}

export interface BookingResult {
  proposal: BookingProposal;
  model: string;
  cost: number;
}

export async function generateBookingProposal(
  intent: ParsedIntent,
  caller: CallerProfile,
  availability: AvailabilityResult,
): Promise<BookingResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = 'gpt-5-mini';

  const slotsSummary = availability.slots.slice(0, 20).map(s =>
    `${s.date} ${s.time_frame} — ${s.booking_count} existing jobs, ${s.available_techs.length} techs available`
  ).join('\n');

  const customerContext = caller.is_known
    ? `KNOWN CUSTOMER: ${caller.name}, ${caller.past_bookings.length} previous visits, rewards: ${caller.rewards_balance} pts`
    : 'NEW CALLER — no previous history';

  const prompt = `You are the scheduling AI for Harden HVAC & Refrigeration.

CALLER REQUEST:
- Intent: ${intent.intent}
- Service: ${intent.service_type || 'General Service'}
- Issue: ${intent.issue_summary}
- Urgency: ${intent.urgency}
- Preferred Date: ${intent.preferred_date || 'None specified'}
- Preferred Time: ${intent.preferred_time || 'None specified'}

${customerContext}

AVAILABLE SLOTS (next 14 days):
${slotsSummary}

TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Propose the best appointment slot. Return ONLY valid JSON:
{
  "recommended_date": "YYYY-MM-DD",
  "recommended_time_frame": "8 AM - 12 PM" or "12 PM - 5 PM",
  "recommended_tech_id": "tech UUID or null",
  "recommended_tech_name": "Tech Name or null",
  "service_type": "matched service name",
  "estimated_duration": "1-2 hours",
  "priority": "low" | "normal" | "high" | "urgent",
  "reasoning": "Why this slot (1-2 sentences)",
  "customer_message": "Friendly message to tell the customer about this proposed time"
}

RULES:
- Emergency → same day or next morning
- Urgent → within 48 hours
- Routine → soonest slot with low load
- Respect caller's preferred date/time if available`;

  const response = await openai.responses.create({
    model,
    instructions: 'You are an HVAC scheduling assistant. Return only valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 2000,
  });

  const resp = response as unknown as Record<string, unknown>;
  const aiText = extractAIText(resp);
  const usage = extractUsage(resp);
  const cost = calculateCost(model, usage.input_tokens, usage.output_tokens);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseAIJson(aiText) as any;

  const proposal: BookingProposal = {
    recommended_date: raw.recommended_date,
    recommended_time_frame: raw.recommended_time_frame,
    recommended_tech: raw.recommended_tech_id
      ? { id: raw.recommended_tech_id, name: raw.recommended_tech_name }
      : availability.slots[0]?.available_techs[0] || null,
    service_type: raw.service_type || intent.service_type || 'General Service',
    estimated_duration: raw.estimated_duration || '1-2 hours',
    priority: raw.priority || 'normal',
    reasoning: raw.reasoning,
    customer_message: raw.customer_message,
  };

  return { proposal, model, cost };
}
