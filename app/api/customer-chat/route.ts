import { createClient } from '@supabase/supabase-js';
import { calculateCost } from '@/lib/ai-costs';
import { buildCustomerChatSystemPrompt } from '@/lib/customer-chat-knowledge';

export const maxDuration = 30;

const GROUP_ID = '6dc0a985-6074-4c89-bf08-099c5cdfab0c';
const OWNER_TECH_ID = '09309f84-6914-453a-ad85-9bb45817a342';
const ADMIN_EMAIL = 'Javontaedharden@gmail.com';
const FROM_EMAIL = 'Harden HVAC <noreply@hardenhvacr.com>';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Tool definition for OpenAI function calling
const BOOK_SERVICE_TOOL = {
  type: 'function' as const,
  name: 'book_service',
  description: 'Book a service appointment for the customer. Call this when you have collected the customer name, phone number, address, and service/issue details.',
  parameters: {
    type: 'object',
    properties: {
      customer_name: { type: 'string', description: 'Customer full name' },
      phone: { type: 'string', description: 'Customer phone number' },
      email: { type: 'string', description: 'Customer email address (if provided)' },
      address: { type: 'string', description: 'Service address' },
      service_type: { type: 'string', description: 'Type of service needed (e.g. AC Repair, Emergency Repair, Tune-Up)' },
      issue_summary: { type: 'string', description: 'Brief description of the issue' },
      urgency: { type: 'string', enum: ['routine', 'soon', 'urgent', 'emergency'], description: 'How urgent is the request' },
      equipment_mentioned: { type: 'string', description: 'Equipment type if mentioned (AC, furnace, heat pump, etc.)' },
    },
    required: ['customer_name', 'phone', 'address', 'service_type', 'issue_summary', 'urgency'],
    additionalProperties: false,
  },
};

export async function POST(req: Request) {
  try {
    const { messages, phone } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array required', { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response('AI service not configured', { status: 500 });
    }

    const systemPrompt = await buildCustomerChatSystemPrompt();

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        instructions: systemPrompt,
        input: messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        tools: [BOOK_SERVICE_TOOL],
        max_output_tokens: 512,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', await response.text());
      return new Response('AI error', { status: 500 });
    }

    const encoder = new TextEncoder();
    let inputTokens = 0;
    let outputTokens = 0;

    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        const decoder = new TextDecoder();
        let buffer = '';
        let toolCallArgs = '';
        let isToolCall = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              // Regular text output
              if (event.type === 'response.output_text.delta') {
                controller.enqueue(encoder.encode(event.delta));
              }

              // Tool call detected — collect arguments
              if (event.type === 'response.function_call_arguments.delta') {
                isToolCall = true;
                toolCallArgs += event.delta || '';
              }

              // Tool call complete — execute booking
              if (event.type === 'response.function_call_arguments.done') {
                isToolCall = true;
                toolCallArgs = event.arguments || toolCallArgs;
              }

              if (event.type === 'response.completed') {
                const usage = event.response?.usage;
                inputTokens = usage?.input_tokens || 0;
                outputTokens = usage?.output_tokens || 0;

                // Check if response contains a tool call in the output
                if (event.response?.output) {
                  for (const item of event.response.output) {
                    if (item.type === 'function_call' && item.name === 'book_service') {
                      isToolCall = true;
                      toolCallArgs = item.arguments || toolCallArgs;
                    }
                  }
                }
              }
            } catch {
              // skip unparseable lines
            }
          }
        }

        // If a tool call was made, execute the booking
        if (isToolCall && toolCallArgs) {
          try {
            const args = JSON.parse(toolCallArgs);
            const result = await executeBooking(args, phone);

            // Send confirmation message to the stream
            const confirmMsg = result.success
              ? `\n\nYour service request has been submitted! Here's what we have:\n\n🔧 **Service:** ${args.service_type}\n📅 **Requested Date:** ${result.scheduledDate}\n⏰ **Time Window:** ${result.timeFrame}\n📍 **Address:** ${args.address}\n\nOur team is reviewing your request now. Once approved, you'll receive a service fee invoice ($89 diagnostic fee)${args.email ? ' via email' : ''}. After payment, your appointment will be confirmed and added to your calendar.\n\nNeed to reach us? Call (956) 669-9093.`
              : `\n\nI wasn't able to submit the request automatically. Please call us at (956) 669-9093 and we'll get you scheduled right away.`;

            controller.enqueue(encoder.encode(confirmMsg));
          } catch (err) {
            console.error('[customer-chat] Booking execution failed:', err);
            controller.enqueue(encoder.encode('\n\nLet me get you scheduled — please call us at (956) 669-9093 and we\'ll book your appointment right away.'));
          }
        }

        // Log cost
        if (inputTokens || outputTokens) {
          const cost = calculateCost('gpt-5-mini', inputTokens, outputTokens);
          const supabase = createServiceClient();
          supabase.from('agent_logs').insert({
            agent: 'customer_chat',
            action: isToolCall ? 'chat_booking' : 'chat',
            details: {
              model: 'gpt-5-mini',
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost,
              phone: phone || null,
              tool_call: isToolCall,
            },
          } as Record<string, unknown>).then(() => {});
        }

        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Customer chat error:', error);
    return new Response('Error processing chat request', { status: 500 });
  }
}

/**
 * Execute the booking — same flow as the phone pipeline:
 * 1. Create/find customer
 * 2. Create booking
 * 3. Create work order
 * 4. Send emails + invoice
 */
async function executeBooking(args: {
  customer_name: string;
  phone: string;
  email?: string;
  address: string;
  service_type: string;
  issue_summary: string;
  urgency: string;
  equipment_mentioned?: string;
}, chatPhone?: string): Promise<{ success: boolean; scheduledDate: string; timeFrame: string }> {
  const supabase = createServiceClient();
  const customerPhone = args.phone || chatPhone || '';

  // Find next available slot
  const now = new Date();
  let scheduledDate: string;
  let timeFrame: string;

  if (args.urgency === 'emergency') {
    // Today or tomorrow morning
    const hour = now.getHours();
    if (hour < 14) {
      scheduledDate = now.toISOString().split('T')[0];
      timeFrame = '12 PM - 5 PM';
    } else {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      scheduledDate = tomorrow.toISOString().split('T')[0];
      timeFrame = '8 AM - 12 PM';
    }
  } else if (args.urgency === 'urgent') {
    // Within 48 hours
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    scheduledDate = nextDay.toISOString().split('T')[0];
    timeFrame = '8 AM - 12 PM';
  } else {
    // Next available weekday
    const next = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    while (next.getDay() === 0) next.setDate(next.getDate() + 1); // skip Sunday
    scheduledDate = next.toISOString().split('T')[0];
    timeFrame = '8 AM - 12 PM';
  }

  // Create or find customer
  let customerId: string | null = null;
  if (customerPhone) {
    const digits = customerPhone.replace(/\D/g, '');
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .or(`phone.eq.${customerPhone},phone.eq.${digits},phone.eq.+1${digits}`)
      .limit(1);

    if (existing?.length) {
      customerId = existing[0].id;
    } else {
      const { data: newCust } = await supabase
        .from('customers')
        .insert({
          full_name: args.customer_name,
          phone: customerPhone,
          email: args.email || null,
          address: args.address,
          group_id: GROUP_ID,
        } as Record<string, unknown>)
        .select('id')
        .single();
      if (newCust) customerId = newCust.id;
    }
  }

  // Create booking
  const startHour = timeFrame.includes('8') ? 8 : 12;
  const endHour = timeFrame.includes('12 PM - 5') ? 17 : 12;

  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      customer_id: customerId,
      name: `${args.service_type} — ${args.customer_name}`,
      contact: customerPhone,
      service_type: args.service_type,
      start_time: `${scheduledDate}T${String(startHour).padStart(2, '0')}:00:00-04:00`,
      end_time: `${scheduledDate}T${String(endHour).padStart(2, '0')}:00:00-04:00`,
      notes: `Chat-booked: ${args.issue_summary}\nAddress: ${args.address}\nEquipment: ${args.equipment_mentioned || 'N/A'}`,
      status: 'scheduled',
      group_id: GROUP_ID,
    } as Record<string, unknown>)
    .select('id')
    .single();

  if (!booking) throw new Error('Failed to create booking');

  // NO work order or calendar event — those happen after admin approves and customer pays

  // Send to Discord with Approve/Deny buttons (fire and forget)
  if (process.env.DISCORD_BOT_TOKEN_DISPATCH && process.env.DISCORD_CHANNEL_DISPATCH) {
    fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_DISPATCH}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_DISPATCH}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `Chat Booking Request — ${args.customer_name}`,
          color: 0xf59e0b,
          fields: [
            { name: 'Service', value: args.service_type, inline: true },
            { name: 'Urgency', value: args.urgency, inline: true },
            { name: 'Proposed Date', value: `${scheduledDate} ${timeFrame}`, inline: true },
            { name: 'Phone', value: customerPhone || 'N/A', inline: true },
            { name: 'Email', value: args.email || 'N/A', inline: true },
            { name: 'Address', value: args.address.slice(0, 256) },
            { name: 'Issue', value: args.issue_summary.slice(0, 256) },
          ],
          footer: { text: 'Pending approval — via website chat' },
          timestamp: new Date().toISOString(),
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 3, label: 'Approve & Send Invoice', custom_id: `approvebooking_${booking.id}` },
            { type: 2, style: 4, label: 'Deny', custom_id: `denybooking_${booking.id}` },
          ],
        }],
      }),
    }).catch(err => console.error('[chat-booking] Discord failed:', err));
  }

  // Send admin email notification only (no invoice yet — that happens on approval)
  const scheduledDateFormatted = new Date(scheduledDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  if (process.env.RESEND_API_KEY) {
    // Admin notification
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `New Booking (Chat) — ${args.customer_name} — ${args.service_type}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#059669;color:white;padding:20px;border-radius:8px 8px 0 0;"><h1 style="margin:0;font-size:20px;">New Chat Booking</h1></div>
            <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p><strong>Customer:</strong> ${args.customer_name}</p>
              <p><strong>Phone:</strong> ${customerPhone}</p>
              ${args.email ? `<p><strong>Email:</strong> ${args.email}</p>` : ''}
              <p><strong>Address:</strong> ${args.address}</p>
              <p><strong>Service:</strong> ${args.service_type}</p>
              <p><strong>Issue:</strong> ${args.issue_summary}</p>
              <p><strong>Urgency:</strong> ${args.urgency}</p>
              <p><strong>Scheduled:</strong> ${scheduledDateFormatted} (${timeFrame})</p>
              <p><a href="https://hardenhvacr.com/admin/work-orders" style="color:#1e40af;font-weight:bold;">View Work Orders &rarr;</a></p>
            </div>
          </div>`,
      }),
    }).catch(err => console.error('[chat-booking] Admin email failed:', err));

    // Send customer a "request received" email (NOT confirmation yet — pending approval)
    if (args.email) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: args.email,
          subject: `Service Request Received — Harden HVAC`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:20px;">Harden HVAC & Refrigeration</h1>
              </div>
              <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p>Hi ${args.customer_name},</p>
                <p>We've received your service request and it's being reviewed. You'll receive a service fee invoice shortly once your appointment is confirmed.</p>
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0 0 8px;"><strong>Service:</strong> ${args.service_type}</p>
                  <p style="margin:0 0 8px;"><strong>Requested Date:</strong> ${scheduledDateFormatted}</p>
                  <p style="margin:0;"><strong>Time Window:</strong> ${timeFrame}</p>
                </div>
                <p style="color:#6b7280;font-size:13px;">Questions? Call us at <a href="tel:+19566699093">(956) 669-9093</a><br>Harden HVAC & Refrigeration | hardenhvacr.com</p>
              </div>
            </div>`,
        }),
      }).catch(err => console.error('[chat-booking] Customer email failed:', err));
    }
  }

  return { success: true, scheduledDate: scheduledDateFormatted, timeFrame };
}
