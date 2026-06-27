import { parseIntent } from './agents/intake-parser';
import { identifyCaller } from './agents/caller-identity';
import { checkAvailability } from './agents/calendar-availability';
import { generateBookingProposal, type BookingProposal } from './agents/booking';
import { answerQuestion, type KBAnswer } from './agents/knowledgebase';
import { escalateToHuman } from './agents/escalation';
import { resolveComplaint } from './agents/complaint-resolver';
import { saveCallSummary } from './agents/summary';
import { appendCallToSheet } from './integrations/google-sheets';
import { createCalendarEvent } from './integrations/google-calendar';
import { createServiceClient } from './utils';

const DISCORD_API = 'https://discord.com/api/v10';
const GROUP_ID = '6dc0a985-6074-4c89-bf08-099c5cdfab0c'; // Harden HVACR
const OWNER_TECH_ID = '09309f84-6914-453a-ad85-9bb45817a342'; // javontae harden
const ADMIN_EMAIL = 'Javontaedharden@gmail.com';
const FROM_EMAIL = 'Harden HVAC <noreply@hardenhvacr.com>';

interface PipelineInput {
  callId: string;
  callerPhone: string | null;
  transcript: string;
  durationSeconds: number | null;
  recordingUrl: string | null;
}

interface PipelineResult {
  session_id: string;
  intent: string;
  confidence: number;
  outcome: string;
  processing_ms: number;
}

/**
 * Full post-call pipeline. Runs inside after() — up to 60s on Vercel.
 */
export async function runCallPipeline(input: PipelineInput): Promise<PipelineResult> {
  const startTime = Date.now();
  const supabase = createServiceClient();

  // Dedup check
  const { data: existing } = await supabase
    .from('call_sessions')
    .select('id')
    .eq('vapi_call_id', input.callId)
    .maybeSingle();

  if (existing) {
    return {
      session_id: existing.id,
      intent: 'duplicate',
      confidence: 1,
      outcome: 'duplicate',
      processing_ms: Date.now() - startTime,
    };
  }

  let totalCost = 0;

  // Step 1: Identify caller + Parse intent (parallel)
  const [caller, intakeResult] = await Promise.all([
    identifyCaller(input.callerPhone || ''),
    parseIntent(input.transcript),
  ]);
  totalCost += intakeResult.cost;
  const { intent } = intakeResult;

  // Step 2: Check escalation
  const escalation = await escalateToHuman(intent, caller, input.callId, input.transcript);

  // Step 3: Complaint resolution
  if (intent.intent === 'complaint') {
    const complaintResult = await resolveComplaint(intent, caller, input.transcript, input.callId);
    totalCost += complaintResult.cost;
  }

  // Step 4: Calendar + booking + work order (if booking intent)
  let proposal: BookingProposal | null = null;
  let bookingId: string | null = null;
  let customerId: string | null = caller.customer_id;

  if (!escalation.escalated && ['book_service', 'emergency', 'reschedule'].includes(intent.intent)) {
    const availability = await checkAvailability(14, intent.preferred_date || undefined);
    const bookingResult = await generateBookingProposal(intent, caller, availability);
    proposal = bookingResult.proposal;
    totalCost += bookingResult.cost;

    if (proposal) {
      const resolvedName = caller.name || intent.caller_name || 'New Customer';

      // Create or find customer
      if (!customerId && input.callerPhone) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            full_name: resolvedName,
            phone: input.callerPhone,
            email: caller.email || null,
            address: intent.address_mentioned || null,
            group_id: GROUP_ID,
          } as Record<string, unknown>)
          .select('id')
          .single();
        if (newCustomer) customerId = newCustomer.id;
      }

      // Create PENDING booking (not scheduled yet — needs admin approval)
      const startHour = proposal.recommended_time_frame.includes('8') ? 8 : 12;
      const endHour = proposal.recommended_time_frame.includes('12 PM - 5') ? 17 : 12;
      const bookingStartTime = `${proposal.recommended_date}T${String(startHour).padStart(2, '0')}:00:00-04:00`;
      const endTime = `${proposal.recommended_date}T${String(endHour).padStart(2, '0')}:00:00-04:00`;

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          name: `${proposal.service_type} — ${resolvedName}`,
          contact: input.callerPhone,
          service_type: proposal.service_type,
          start_time: bookingStartTime,
          end_time: endTime,
          notes: `PENDING APPROVAL\n${intent.issue_summary}\nAddress: ${intent.address_mentioned || 'N/A'}\nEquipment: ${intent.equipment_mentioned || 'N/A'}`,
          status: 'scheduled', // will be approved/denied by admin
          group_id: GROUP_ID,
        } as Record<string, unknown>)
        .select('id')
        .single();

      if (booking) bookingId = booking.id;

      // NO work order or calendar event yet — those happen after payment
    }
  }

  // Step 5: KB answer for questions
  let kbAnswer: KBAnswer | null = null;
  if (intent.intent === 'general_question' || intent.intent === 'get_quote') {
    kbAnswer = await answerQuestion(intent.issue_summary, input.transcript.slice(0, 1000));
    totalCost += kbAnswer.cost;
  }

  // Step 6: Save call summary
  const sessionId = await saveCallSummary({
    vapi_call_id: input.callId,
    caller_phone: input.callerPhone,
    customer_id: customerId,
    transcript: input.transcript,
    intent,
    caller,
    proposal,
    escalation,
    ai_model: intakeResult.model,
    total_ai_cost: totalCost,
    duration_seconds: input.durationSeconds,
    recording_url: input.recordingUrl,
  });

  const outcome = escalation.escalated ? 'escalated' : (proposal ? 'booked' : 'answered');

  // Step 7: Fire-and-forget reporting + emails
  const scheduledDateFormatted = proposal
    ? new Date(proposal.recommended_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  Promise.allSettled([
    // Google Sheets
    appendCallToSheet({
      date: new Date().toISOString(),
      caller: caller.name || intent.caller_name || input.callerPhone || 'Unknown',
      phone: input.callerPhone || 'Unknown',
      intent: intent.intent,
      confidence: intent.confidence,
      service: intent.service_type || 'N/A',
      urgency: intent.urgency,
      outcome,
      proposed_date: proposal?.recommended_date || 'N/A',
      ai_cost: totalCost,
      duration: input.durationSeconds || 0,
      session_id: sessionId,
    }),

    // Discord #dispatch
    postCallToDiscord({
      sessionId,
      callerName: caller.name || intent.caller_name || input.callerPhone || 'Unknown',
      intent: intent.intent,
      confidence: intent.confidence,
      issueSummary: intent.issue_summary,
      urgency: intent.urgency,
      outcome,
      proposedDate: proposal?.recommended_date,
      proposedTime: proposal?.recommended_time_frame,
      aiCost: totalCost,
      bookingId,
    }),

    // Admin email
    sendCallSummaryEmail({
      sessionId,
      callerName: caller.name || intent.caller_name || 'Unknown',
      callerPhone: input.callerPhone || 'Unknown',
      intent: intent.intent,
      issueSummary: intent.issue_summary,
      urgency: intent.urgency,
      outcome,
      proposal,
      kbAnswer: kbAnswer?.answer || null,
      aiCost: totalCost,
      duration: input.durationSeconds,
      bookingId,
    }),

    // NO customer emails or invoices here — those are sent after admin approves from Discord
  ]).catch(err => console.error('[pipeline] Reporting error:', err));

  return {
    session_id: sessionId,
    intent: intent.intent,
    confidence: intent.confidence,
    outcome,
    processing_ms: Date.now() - startTime,
  };
}

// ---- Inline reporting helpers ----

const OUTCOME_COLORS: Record<string, number> = {
  booked: 0x059669,
  proposed: 0x059669,
  escalated: 0xdc2626,
  answered: 0x1e40af,
  pending: 0xf59e0b,
};

async function postCallToDiscord(data: {
  sessionId: string;
  callerName: string;
  intent: string;
  confidence: number;
  issueSummary: string;
  urgency: string;
  outcome: string;
  proposedDate?: string;
  proposedTime?: string;
  aiCost: number;
  bookingId?: string | null;
  workOrderId?: string | null;
}): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN_DISPATCH || !process.env.DISCORD_CHANNEL_DISPATCH) return;

  const color = OUTCOME_COLORS[data.outcome] || OUTCOME_COLORS.pending;
  const fields = [
    { name: 'Intent', value: `${data.intent} (${(data.confidence * 100).toFixed(0)}%)`, inline: true },
    { name: 'Urgency', value: data.urgency, inline: true },
    { name: 'Outcome', value: data.outcome.charAt(0).toUpperCase() + data.outcome.slice(1), inline: true },
    { name: 'Issue', value: data.issueSummary.slice(0, 1024) },
  ];
  if (data.proposedDate) fields.push({ name: 'Scheduled', value: `${data.proposedDate} ${data.proposedTime || ''}`, inline: true });
  if (data.bookingId) fields.push({ name: 'Booking', value: data.bookingId.slice(0, 8), inline: true });
  if (data.workOrderId) fields.push({ name: 'Work Order', value: `[View](https://hardenhvacr.com/admin/work-orders)`, inline: true });
  fields.push({ name: 'AI Cost', value: `$${data.aiCost.toFixed(4)}`, inline: true });

  // Build message payload with optional Approve/Deny buttons for bookings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    embeds: [{
      title: `CSR Call — ${data.callerName}`,
      color,
      fields,
      footer: { text: `Session: ${data.sessionId}` },
      timestamp: new Date().toISOString(),
    }],
  };

  // Add Approve/Deny buttons if this is a booking request
  if (data.bookingId && data.outcome === 'booked') {
    payload.components = [{
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 3, // Success (green)
          label: 'Approve & Send Invoice',
          custom_id: `approvebooking_${data.bookingId}`,
        },
        {
          type: 2,
          style: 4, // Danger (red)
          label: 'Deny',
          custom_id: `denybooking_${data.bookingId}`,
        },
      ],
    }];
  }

  await fetch(`${DISCORD_API}/channels/${process.env.DISCORD_CHANNEL_DISPATCH}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_DISPATCH}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function sendCallSummaryEmail(data: {
  sessionId: string;
  callerName: string;
  callerPhone: string;
  intent: string;
  issueSummary: string;
  urgency: string;
  outcome: string;
  proposal: BookingProposal | null;
  kbAnswer: string | null;
  aiCost: number;
  duration: number | null;
  bookingId?: string | null;
  workOrderId?: string | null;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const outcomeLabel = data.outcome.charAt(0).toUpperCase() + data.outcome.slice(1);
  const urgencyColor = data.urgency === 'emergency' ? '#dc2626'
    : data.urgency === 'urgent' ? '#ea580c'
    : data.urgency === 'soon' ? '#f59e0b'
    : '#059669';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `CSR: ${data.intent} — ${data.callerName} (${outcomeLabel})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">AI CSR Call Report</h1>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="margin-bottom: 16px;">
              <span style="background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">${data.urgency.toUpperCase()}</span>
              <span style="background: #e5e7eb; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 8px;">${outcomeLabel}</span>
            </div>
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px;"><strong>Caller:</strong> ${data.callerName}</p>
              <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${data.callerPhone}</p>
              <p style="margin: 0 0 8px;"><strong>Intent:</strong> ${data.intent}</p>
              <p style="margin: 0;"><strong>Issue:</strong> ${data.issueSummary}</p>
            </div>
            ${data.proposal ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 8px;">Booking Created</h3>
              <p style="margin: 0 0 4px;"><strong>Date:</strong> ${data.proposal.recommended_date}</p>
              <p style="margin: 0 0 4px;"><strong>Time:</strong> ${data.proposal.recommended_time_frame}</p>
              <p style="margin: 0 0 4px;"><strong>Service:</strong> ${data.proposal.service_type}</p>
              <p style="margin: 0;"><strong>Priority:</strong> ${data.proposal.priority}</p>
              ${data.workOrderId ? `<p style="margin: 8px 0 0;"><a href="https://hardenhvacr.com/admin/work-orders" style="color: #1e40af; font-weight: bold;">View Work Order &rarr;</a></p>` : ''}
            </div>` : ''}
            ${data.kbAnswer ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 8px;">AI Answer Provided</h3>
              <p style="margin: 0;">${data.kbAnswer}</p>
            </div>` : ''}
            <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
              Duration: ${data.duration ? `${Math.round(data.duration / 60)} min` : 'N/A'} |
              AI Cost: $${data.aiCost.toFixed(4)} |
              Session: ${data.sessionId}
            </p>
          </div>
        </div>
      `,
    }),
  });
}

async function sendCustomerServiceEmail(data: {
  to: string;
  customerName: string;
  serviceType: string;
  scheduledDate: string;
  timeFrame: string;
  issueSummary: string;
  address: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: data.to,
      subject: `Service Confirmed — ${data.scheduledDate} — Harden HVAC`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Harden HVAC & Refrigeration</h1>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Service Appointment Confirmed</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hi ${data.customerName},</p>
            <p>Your appointment has been scheduled. Here are the details:</p>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px;"><strong>Service:</strong> ${data.serviceType}</p>
              <p style="margin: 0 0 8px;"><strong>Date:</strong> ${data.scheduledDate}</p>
              <p style="margin: 0 0 8px;"><strong>Time Window:</strong> ${data.timeFrame}</p>
              ${data.address ? `<p style="margin: 0;"><strong>Location:</strong> ${data.address}</p>` : ''}
            </div>

            <h3 style="color: #1e40af; margin: 20px 0 12px;">What to Expect</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>A technician will call you when they're on the way</li>
              <li>Please ensure someone 18+ is available at the property</li>
              <li>Clear access to your HVAC equipment (indoor and outdoor units)</li>
              <li>The tech will diagnose the issue and explain all options before any work</li>
              <li>Most repairs are completed on the first visit</li>
              <li>You'll receive an invoice after service is complete</li>
            </ul>

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>Need to reschedule?</strong> Call us at <a href="tel:+19566699093" style="color: #1e40af;">(956) 669-9093</a></p>
            </div>

            <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
              Thank you for choosing Harden HVAC & Refrigeration!<br>
              Tallahassee, FL | hardenhvacr.com | (956) 669-9093
            </p>
          </div>
        </div>
      `,
    }),
  });
}

async function sendServiceFeeInvoice(data: {
  to: string;
  customerName: string;
  serviceType: string;
  scheduledDate: string;
  timeFrame: string;
  workOrderId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const serviceFee = 89.00;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: data.to,
      cc: ADMIN_EMAIL,
      subject: `Service Fee Invoice — $${serviceFee.toFixed(2)} — Harden HVAC`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Harden HVAC & Refrigeration</h1>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Service Fee Invoice</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Dear ${data.customerName},</p>
            <p>Thank you for scheduling service with Harden HVAC & Refrigeration. Below is your service fee invoice.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    <strong>Diagnostic Service Fee</strong><br>
                    <span style="color: #6b7280; font-size: 13px;">${data.serviceType} — ${data.scheduledDate} (${data.timeFrame})</span>
                  </td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${serviceFee.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="font-size: 18px; font-weight: bold;">
                  <td style="padding: 12px 10px;">Total Due</td>
                  <td style="padding: 12px 10px; text-align: right;">$${serviceFee.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div style="text-align: center; margin: 24px 0;">
              <a href="https://hardenhvacr.com/portal/login" style="display: inline-block; background: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Pay Now</a>
            </div>

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px;">What's included:</p>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
                <li>On-site diagnostic inspection by a certified technician</li>
                <li>Full system evaluation and testing</li>
                <li>Detailed explanation of findings and repair options</li>
                <li>Written estimate for any additional work needed</li>
                <li>Service fee is credited toward any approved repairs</li>
              </ul>
            </div>

            <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
              Payment is due at time of service. We accept cash, check, and all major credit cards.<br>
              Questions? Call us at <a href="tel:+19566699093" style="color: #1e40af;">(956) 669-9093</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px;">
              Harden HVAC & Refrigeration | Tallahassee, FL | hardenhvacr.com
            </p>
          </div>
        </div>
      `,
    }),
  });
}
