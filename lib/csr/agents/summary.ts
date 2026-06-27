import type { ParsedIntent } from './intake-parser';
import type { CallerProfile } from './caller-identity';
import type { BookingProposal } from './booking';
import type { EscalationResult } from './escalation';
import { createServiceClient } from '../utils';

export interface CallSummaryData {
  vapi_call_id: string;
  caller_phone: string | null;
  customer_id: string | null;
  transcript: string;
  intent: ParsedIntent;
  caller: CallerProfile;
  proposal: BookingProposal | null;
  escalation: EscalationResult;
  ai_model: string;
  total_ai_cost: number;
  duration_seconds: number | null;
  recording_url: string | null;
}

export async function saveCallSummary(data: CallSummaryData): Promise<string> {
  const supabase = createServiceClient();

  let outcome = 'pending';
  if (data.escalation.escalated) outcome = 'escalated';
  else if (data.proposal) outcome = 'booked';
  else if (data.intent.intent === 'general_question') outcome = 'answered';

  const { data: session, error } = await supabase
    .from('call_sessions')
    .insert({
      vapi_call_id: data.vapi_call_id,
      caller_phone: data.caller_phone,
      customer_id: data.customer_id,
      transcript: data.transcript,
      intent: data.intent.intent,
      confidence: data.intent.confidence,
      service_type: data.intent.service_type || null,
      urgency: data.intent.urgency,
      extracted_info: {
        caller_name: data.intent.caller_name,
        issue_summary: data.intent.issue_summary,
        preferred_date: data.intent.preferred_date,
        preferred_time: data.intent.preferred_time,
        equipment_mentioned: data.intent.equipment_mentioned,
        address_mentioned: data.intent.address_mentioned,
      },
      proposed_slot: data.proposal
        ? {
            date: data.proposal.recommended_date,
            time_frame: data.proposal.recommended_time_frame,
            tech: data.proposal.recommended_tech,
            service: data.proposal.service_type,
          }
        : {},
      outcome,
      escalation_reason: data.escalation.escalated ? data.escalation.reason : null,
      ai_model: data.ai_model,
      ai_cost: data.total_ai_cost,
      duration_seconds: data.duration_seconds,
      recording_url: data.recording_url,
    } as Record<string, unknown>)
    .select('id')
    .single();

  if (error) {
    console.error('[summary] Failed to save call session:', error);
    throw error;
  }

  const sessionId = session!.id;

  // Log to customer_communications if known customer
  if (data.customer_id) {
    await supabase.from('customer_communications').insert({
      customer_id: data.customer_id,
      type: 'phone_call',
      direction: 'inbound',
      subject: `AI CSR: ${data.intent.intent} — ${data.intent.issue_summary.slice(0, 100)}`,
      body: `Call handled by AI receptionist.\nIntent: ${data.intent.intent} (${(data.intent.confidence * 100).toFixed(0)}%)\nOutcome: ${outcome}${data.proposal ? `\nProposed: ${data.proposal.recommended_date} ${data.proposal.recommended_time_frame}` : ''}`,
      metadata: { call_session_id: sessionId },
    } as Record<string, unknown>);
  }

  // Log to agent_logs
  await supabase.from('agent_logs').insert({
    agent: 'csr_summary',
    action: 'call_processed',
    request_id: null,
    details: {
      call_session_id: sessionId,
      intent: data.intent.intent,
      confidence: data.intent.confidence,
      outcome,
      total_cost: data.total_ai_cost,
      duration: data.duration_seconds,
    },
  } as Record<string, unknown>);

  return sessionId;
}
