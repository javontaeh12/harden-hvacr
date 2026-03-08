import { createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendCustomerConfirmation,
  sendDispatchConflictAlert,
} from '@/lib/dispatch-emails';
import { calculateCost, extractUsage } from '@/lib/ai-costs';
import { createThread } from '@/lib/email-threads';
import { sendToOwnChannel, sendToGroupMeeting, buildConflictEmbed, buildActionButtons } from '@/lib/discord';
import { enhanceDispatchPrompt, relayCustomerEmail } from '@/lib/agents/dispatch-agent';

export const maxDuration = 60;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json();
    const supabase = createServiceClient();

    // 1. Fetch the service request
    const { data: serviceRequest, error: reqError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    // 2. Fetch existing bookings for the next 14 days
    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .gte('start_time', now.toISOString())
      .lte('start_time', twoWeeksOut.toISOString())
      .in('status', ['scheduled'])
      .order('start_time', { ascending: true });

    // 3. Fetch existing work orders
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('*, customers(full_name, address), profiles(full_name)')
      .in('status', ['assigned', 'en_route', 'in_progress'])
      .order('scheduled_date', { ascending: true });

    // 4. Fetch available techs
    const { data: techs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'tech')
      .eq('status', 'approved');

    // 5. Ask AI to analyze and make dispatch decision
    const calendarSummary = (bookings || []).map(b =>
      `${b.start_time} - ${b.name} - ${b.service_type} - Status: ${b.status}`
    ).join('\n') || 'No upcoming bookings';

    const workOrderSummary = (workOrders || []).map(wo =>
      `${wo.scheduled_date || 'Unscheduled'} - ${wo.customers?.full_name || 'Unknown'} - ${wo.customers?.address || 'No address'} - Tech: ${wo.profiles?.full_name || 'Unassigned'} - Status: ${wo.status} - Priority: ${wo.priority}`
    ).join('\n') || 'No active work orders';

    const techList = (techs || []).map(t => `${t.full_name} (ID: ${t.id})`).join(', ') || 'No techs available';

    const basePrompt = `You are the Dispatch Manager AI for Harden HVAC. Analyze this new service request and make a scheduling decision.

NEW SERVICE REQUEST:
- Customer: ${serviceRequest.name}
- Phone: ${serviceRequest.phone || serviceRequest.contact || 'Not provided'}
- Email: ${serviceRequest.email || 'Not provided'}
- Address: ${serviceRequest.address || 'Not provided'}, ${serviceRequest.city || ''} ${serviceRequest.zip || ''}
- Service Type: ${serviceRequest.service_type || 'General Service'}
- Urgency: ${serviceRequest.urgency || 'routine'}
- Issue: ${serviceRequest.issue}
- Equipment: ${serviceRequest.equipment_info || 'Not specified'}
- When Started: ${serviceRequest.started_when || 'Not specified'}
- Symptoms: ${Array.isArray(serviceRequest.symptoms) ? serviceRequest.symptoms.join(', ') : 'None listed'}

CURRENT CALENDAR (Next 14 days):
${calendarSummary}

ACTIVE WORK ORDERS:
${workOrderSummary}

AVAILABLE TECHNICIANS:
${techList}

TODAY'S DATE: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

INSTRUCTIONS:
1. Determine if the requested service can be scheduled without conflicts
2. Consider: tech availability, geographic proximity (same area = profitable), urgency level
3. Emergency requests should be same-day or next available
4. Try to group jobs in the same area on the same day for efficiency
5. If no conflict, recommend a specific date, time frame (e.g., "8 AM - 12 PM"), and assign to best tech
6. If conflict, explain the issue and suggest alternative dates/times

Return ONLY valid JSON:
{
  "decision": "auto_schedule" or "conflict",
  "scheduled_date": "YYYY-MM-DD" (if auto_schedule),
  "time_frame": "8 AM - 12 PM" or "12 PM - 5 PM" (if auto_schedule),
  "assigned_tech_id": "tech UUID" (if auto_schedule, pick from available techs),
  "assigned_tech_name": "Tech Name",
  "priority": "low" or "normal" or "high" or "urgent",
  "analysis": "Brief explanation of decision (2-3 sentences)",
  "suggested_plan": "If conflict, detailed alternative dispatch plan. If auto_schedule, confirmation summary.",
  "estimated_duration": "1-2 hours" or "2-4 hours" etc.
}`;

    const aiPrompt = enhanceDispatchPrompt(basePrompt);

    const aiResponse = await openai.responses.create({
      model: 'gpt-5.4',
      instructions: 'You are an HVAC dispatch manager. Return only valid JSON. Be practical and efficient with scheduling.',
      input: [{ role: 'user', content: aiPrompt }],
      max_output_tokens: 1000,
    });

    const aiText = aiResponse.output_text || '';
    const usage = extractUsage(aiResponse as unknown as Record<string, unknown>);
    const cost = calculateCost('gpt-5.4', usage.input_tokens, usage.output_tokens);

    let jsonStr = aiText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);

    let decision;
    try {
      decision = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI dispatch response:', parseError, 'Raw text:', aiText);
      return NextResponse.json({ error: 'AI returned invalid response. Please try again.' }, { status: 502 });
    }

    // 6. Log the agent action with cost tracking
    await supabase.from('agent_logs').insert({
      agent: 'dispatch',
      action: decision.decision,
      request_id: requestId,
      details: { ...decision, model: 'gpt-5.4', input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, cost },
    } as Record<string, unknown>);

    // 7. Act on the decision
    if (decision.decision === 'auto_schedule') {
      // Create booking
      const { data: booking } = await supabase.from('bookings').insert({
        name: serviceRequest.name,
        contact: serviceRequest.phone || serviceRequest.contact,
        service_type: serviceRequest.service_type || 'General Service',
        start_time: `${decision.scheduled_date}T${decision.time_frame.includes('8') ? '08:00' : '12:00'}:00`,
        end_time: `${decision.scheduled_date}T${decision.time_frame.includes('12 PM - 5') ? '17:00' : '12:00'}:00`,
        notes: `Auto-scheduled by AI Dispatch. Issue: ${serviceRequest.issue}`,
        status: 'scheduled',
        group_id: serviceRequest.group_id || (techs && techs[0] ? await getGroupId(supabase, techs[0].id) : null),
      } as Record<string, unknown>).select('id').single();

      // Find or create customer
      let customerId = null;
      if (serviceRequest.email) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('email', serviceRequest.email)
          .maybeSingle();
        customerId = existing?.id || null;
      }

      // Create work order
      const groupId = serviceRequest.group_id || (techs && techs[0] ? await getGroupId(supabase, techs[0].id) : null);
      await supabase.from('work_orders').insert({
        booking_id: booking?.id || null,
        customer_id: customerId,
        assigned_tech_id: decision.assigned_tech_id || null,
        status: 'assigned',
        priority: decision.priority || 'normal',
        description: `${serviceRequest.service_type || 'Service'}: ${serviceRequest.issue}\nAddress: ${serviceRequest.address || 'N/A'}\nPhone: ${serviceRequest.phone || serviceRequest.contact || 'N/A'}`,
        scheduled_date: decision.scheduled_date,
        group_id: groupId,
      } as Record<string, unknown>);

      // Update service request status
      await supabase.from('service_requests').update({ status: 'scheduled' } as Record<string, unknown>).eq('id', requestId);

      // Email customer confirmation
      if (serviceRequest.email) {
        try {
          await sendCustomerConfirmation(serviceRequest.email, {
            customerName: serviceRequest.name,
            serviceType: serviceRequest.service_type || 'General Service',
            scheduledDate: new Date(decision.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            timeFrame: decision.time_frame,
          });
          // Relay email confirmation to #dispatch
          await relayCustomerEmail({
            name: serviceRequest.name,
            email: serviceRequest.email,
            subject: 'Appointment confirmation sent',
          });
        } catch (e) { console.error('Email error:', e); }
      }

      return NextResponse.json({
        ok: true,
        decision: 'auto_schedule',
        details: decision,
        booking_id: booking?.id,
      });

    } else {
      // Conflict — create email thread so admin can reply, then email owner
      let token: string | undefined;
      try {
        token = await createThread('dispatch', requestId, {
          serviceRequest,
          decision,
        });
      } catch (e) { console.error('Thread creation error:', e); }

      // Post to Discord #dispatch with action buttons
      if (token) {
        try {
          await sendToOwnChannel('dispatch', '', {
            embeds: [buildConflictEmbed({
              requestName: serviceRequest.name,
              requestService: serviceRequest.service_type || 'General Service',
              requestDate: serviceRequest.started_when || 'ASAP',
              requestIssue: serviceRequest.issue,
              aiAnalysis: decision.analysis,
              suggestedPlan: decision.suggested_plan,
            })],
            components: buildActionButtons(token),
          });
        } catch (e) { console.error('Discord post error:', e); }
      }

      // Post conflict to #group-meeting so all bots see it
      try {
        await sendToGroupMeeting('dispatch', '', {
          embeds: [buildConflictEmbed({
            requestName: serviceRequest.name,
            requestService: serviceRequest.service_type || 'General Service',
            requestDate: serviceRequest.started_when || 'ASAP',
            requestIssue: serviceRequest.issue,
            aiAnalysis: decision.analysis,
            suggestedPlan: decision.suggested_plan,
          })],
        });
      } catch (e) { console.error('Group meeting conflict post error:', e); }

      // Also send email alert (no reply-to needed, Discord is primary)
      try {
        await sendDispatchConflictAlert({
          requestName: serviceRequest.name,
          requestService: serviceRequest.service_type || 'General Service',
          requestDate: serviceRequest.started_when || 'ASAP',
          requestIssue: serviceRequest.issue,
          aiAnalysis: decision.analysis,
          suggestedPlan: decision.suggested_plan,
          token,
        });
      } catch (e) { console.error('Conflict email error:', e); }

      // Still send customer a "received" email
      if (serviceRequest.email) {
        try {
          await sendCustomerConfirmation(serviceRequest.email, {
            customerName: serviceRequest.name,
            serviceType: serviceRequest.service_type || 'General Service',
            scheduledDate: 'Pending confirmation',
            timeFrame: 'We will contact you shortly',
          });
          await relayCustomerEmail({
            name: serviceRequest.name,
            email: serviceRequest.email,
            subject: 'Request received — pending confirmation',
          });
        } catch (e) { console.error('Email error:', e); }
      }

      return NextResponse.json({
        ok: true,
        decision: 'conflict',
        details: decision,
      });
    }
  } catch (error) {
    console.error('Dispatch error:', error);
    return NextResponse.json({ error: 'Dispatch processing failed' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getGroupId(supabase: any, techId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('group_id').eq('id', techId).single();
  return data?.group_id || null;
}
