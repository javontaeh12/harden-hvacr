import { createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { calculateCost, extractUsage } from '@/lib/ai-costs';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface ReplyAction {
  action: 'approve_schedule' | 'reschedule' | 'cancel' | 'reassign' | 'custom_instruction' | 'no_action';
  parameters: Record<string, unknown>;
  confidence: number;
  summary: string;
}

export async function resolveReplyAction(
  thread: Record<string, unknown>,
  replyBody: string
): Promise<ReplyAction> {
  const prompt = `You are an AI assistant for Harden HVAC. An admin replied to an automated email from the "${thread.agent}" agent.

ORIGINAL CONTEXT (what the agent sent about):
${JSON.stringify(thread.context, null, 2)}

ADMIN'S REPLY:
${replyBody}

Determine what action the admin wants taken. Return ONLY valid JSON:
{
  "action": "approve_schedule" | "reschedule" | "cancel" | "reassign" | "custom_instruction" | "no_action",
  "parameters": {
    "date": "YYYY-MM-DD (if scheduling/rescheduling)",
    "time_frame": "8 AM - 12 PM or 12 PM - 5 PM (if scheduling)",
    "tech_id": "UUID (if reassigning)",
    "reason": "brief reason"
  },
  "confidence": 0.0-1.0,
  "summary": "One sentence describing what the admin wants"
}

Rules:
- "approve_schedule" = admin approves the suggested schedule or gives a specific date/time
- "reschedule" = admin wants to change an existing booking's date/time
- "cancel" = admin wants to cancel the service request
- "reassign" = admin wants a different technician assigned
- "custom_instruction" = admin gave instructions that don't fit other categories
- "no_action" = reply is acknowledgment only, no action needed (e.g., "thanks", "ok")`;

  const aiResponse = await openai.responses.create({
    model: 'gpt-5-mini',
    instructions: 'You parse admin email replies into structured actions. Return only valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 500,
  });

  const aiText = aiResponse.output_text || '';
  const usage = extractUsage(aiResponse as unknown as Record<string, unknown>);
  const cost = calculateCost('gpt-5-mini', usage.input_tokens, usage.output_tokens);

  // Log AI cost
  const supabase = createServiceClient();
  await supabase.from('agent_logs').insert({
    agent: 'reply_handler',
    action: 'parse_reply',
    request_id: thread.request_id || null,
    details: {
      thread_token: thread.token,
      model: 'gpt-5-mini',
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost,
    },
  } as Record<string, unknown>);

  let jsonStr = aiText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);

  return JSON.parse(jsonStr) as ReplyAction;
}

export async function executeAction(
  action: ReplyAction,
  thread: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();
  const requestId = thread.request_id as string | null;

  switch (action.action) {
    case 'approve_schedule': {
      const date = action.parameters.date as string;
      const timeFrame = (action.parameters.time_frame as string) || '8 AM - 12 PM';
      const context = thread.context as Record<string, unknown>;
      const serviceRequest = context.serviceRequest as Record<string, unknown> | undefined;

      if (requestId && date) {
        // Create booking
        await supabase.from('bookings').insert({
          name: serviceRequest?.name || 'Customer',
          contact: serviceRequest?.phone || serviceRequest?.contact || '',
          service_type: serviceRequest?.service_type || 'General Service',
          start_time: `${date}T${timeFrame.includes('8') ? '08:00' : '12:00'}:00`,
          end_time: `${date}T${timeFrame.includes('12 PM - 5') ? '17:00' : '12:00'}:00`,
          notes: `Scheduled via admin email reply. ${action.summary}`,
          status: 'scheduled',
        } as Record<string, unknown>);

        await supabase.from('service_requests')
          .update({ status: 'scheduled' } as Record<string, unknown>)
          .eq('id', requestId);
      }
      break;
    }

    case 'reschedule': {
      const newDate = action.parameters.date as string;
      if (requestId && newDate) {
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('id, booking_id')
          .eq('request_id', requestId)
          .maybeSingle();

        if (workOrder?.booking_id) {
          const timeFrame = (action.parameters.time_frame as string) || '8 AM - 12 PM';
          await supabase.from('bookings')
            .update({
              start_time: `${newDate}T${timeFrame.includes('8') ? '08:00' : '12:00'}:00`,
              end_time: `${newDate}T${timeFrame.includes('12 PM - 5') ? '17:00' : '12:00'}:00`,
            } as Record<string, unknown>)
            .eq('id', workOrder.booking_id);
        }

        if (workOrder) {
          await supabase.from('work_orders')
            .update({ scheduled_date: newDate } as Record<string, unknown>)
            .eq('id', workOrder.id);
        }
      }
      break;
    }

    case 'cancel': {
      if (requestId) {
        await supabase.from('service_requests')
          .update({ status: 'cancelled' } as Record<string, unknown>)
          .eq('id', requestId);
      }
      break;
    }

    case 'reassign': {
      const techId = action.parameters.tech_id as string;
      if (requestId && techId) {
        await supabase.from('work_orders')
          .update({ assigned_tech_id: techId } as Record<string, unknown>)
          .eq('request_id', requestId);
      }
      break;
    }

    case 'custom_instruction':
    case 'no_action':
      // Just log — no DB mutations needed
      break;
  }

  // Log the executed action
  await supabase.from('agent_logs').insert({
    agent: thread.agent as string,
    action: `reply_action_${action.action}`,
    request_id: requestId,
    details: {
      thread_token: thread.token,
      action: action.action,
      parameters: action.parameters,
      confidence: action.confidence,
      summary: action.summary,
    },
  } as Record<string, unknown>);
}
