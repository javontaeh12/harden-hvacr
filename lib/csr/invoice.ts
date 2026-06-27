import OpenAI from 'openai';
import { createServiceClient, parseAIJson, extractAIText, extractUsage, calculateCost } from './utils';
import { getPricingData } from './knowledgebase/pricing';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceResult {
  invoice_id: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  customer_email: string | null;
  email_sent: boolean;
}

export async function generateInvoice(workOrderId: string): Promise<InvoiceResult> {
  const supabase = createServiceClient();

  // Gather work order + customer + parts
  const { data: workOrder, error: woErr } = await supabase
    .from('work_orders')
    .select('*, customers(full_name, email, phone, address)')
    .eq('id', workOrderId)
    .single();

  if (woErr || !workOrder) {
    throw new Error(`Work order ${workOrderId} not found: ${woErr?.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wo = workOrder as any;
  const customer = wo.customers || {};
  const partsUsed = wo.parts_used || [];

  // Fetch AI summary from service report if available
  const { data: serviceReport } = await supabase
    .from('service_reports')
    .select('ai_customer_summary')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiSummary = (serviceReport as any)?.ai_customer_summary || null;

  // Get pricing data for context
  const pricingItems = await getPricingData();

  // AI generates professional line items
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = 'gpt-5-mini';

  const prompt = `Generate invoice line items for this completed HVAC job.

WORK ORDER:
- Description: ${wo.description || 'HVAC Service'}
- Service Type: ${wo.service_type || 'General'}
- Priority: ${wo.priority || 'normal'}
- Notes: ${wo.notes || 'None'}
- Parts Used: ${JSON.stringify(partsUsed)}
- Started: ${wo.started_at || 'N/A'}
- Completed: ${wo.completed_at || 'N/A'}

CUSTOMER: ${customer.full_name || 'Unknown'}

OUR PRICING (for reference):
${pricingItems.slice(0, 20).map(p => `${p.name}: $${p.price}/${p.unit}`).join('\n')}

Return JSON:
{
  "line_items": [
    { "description": "Labor - HVAC Diagnostic", "quantity": 1, "unit_price": 89.00, "total": 89.00 },
    { "description": "Part - Capacitor 45/5 MFD", "quantity": 1, "unit_price": 35.00, "total": 35.00 }
  ],
  "message": "Brief professional thank-you message for the invoice email"
}

RULES:
- Include labor line item(s) based on service type and duration
- Include part line items if parts were used
- Use our pricing table when applicable
- Be accurate — don't make up parts that weren't used
- Keep the message warm and professional`;

  const response = await openai.responses.create({
    model,
    instructions: 'Generate HVAC invoice line items. Return only valid JSON.',
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: 2000,
  });

  const resp = response as unknown as Record<string, unknown>;
  const aiText = extractAIText(resp);
  const usage = extractUsage(resp);
  const aiCost = calculateCost(model, usage.input_tokens, usage.output_tokens);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parseAIJson(aiText) as any;
  const lineItems: InvoiceLineItem[] = (raw.line_items || []).map((item: Record<string, unknown>) => ({
    description: String(item.description || ''),
    quantity: Number(item.quantity) || 1,
    unit_price: Number(item.unit_price) || 0,
    total: Number(item.total) || 0,
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * 0.075 * 100) / 100; // 7.5% FL sales tax
  const total = Math.round((subtotal + tax) * 100) / 100;

  // Save invoice to DB
  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      work_order_id: workOrderId,
      customer_id: wo.customer_id,
      line_items: lineItems,
      subtotal,
      tax,
      total,
      status: 'sent',
      ai_cost: aiCost,
    } as Record<string, unknown>)
    .select('id')
    .single();

  if (invoiceErr) {
    console.error('[invoice] Failed to save invoice:', invoiceErr);
    throw invoiceErr;
  }

  const invoiceId = invoice!.id;

  // Send invoice email via Resend
  let emailSent = false;
  const customerEmail = customer.email;

  if (customerEmail && process.env.RESEND_API_KEY) {
    try {
      const lineItemsHtml = lineItems.map(item =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unit_price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
        </tr>`
      ).join('');

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Harden HVAC <noreply@hardenhvacr.com>',
          to: customerEmail,
          cc: process.env.ADMIN_EMAIL || undefined,
          subject: `Invoice from Harden HVAC & Refrigeration — $${total.toFixed(2)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">Harden HVAC & Refrigeration</h1>
                <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Invoice #${invoiceId.slice(0, 8).toUpperCase()}</p>
              </div>
              <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p>Dear ${customer.full_name || 'Valued Customer'},</p>
                <p>${raw.message || 'Thank you for choosing Harden HVAC & Refrigeration. Below is your invoice for the recent service.'}</p>

                ${aiSummary ? `
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <h3 style="margin: 0 0 8px; font-size: 15px; color: #0c4a6e;">Service Summary</h3>
                  <p style="margin: 0 0 12px; font-size: 13px; color: #334155; line-height: 1.5;">${aiSummary.findings_summary || ''}</p>
                  ${aiSummary.urgency_explanation ? `<p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;"><strong>Why it matters:</strong> ${aiSummary.urgency_explanation}</p>` : ''}
                </div>
                ` : ''}

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 8px; text-align: left;">Description</th>
                      <th style="padding: 8px; text-align: center;">Qty</th>
                      <th style="padding: 8px; text-align: right;">Unit Price</th>
                      <th style="padding: 8px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>${lineItemsHtml}</tbody>
                  <tfoot>
                    <tr><td colspan="3" style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td><td style="padding: 8px; text-align: right;">$${subtotal.toFixed(2)}</td></tr>
                    <tr><td colspan="3" style="padding: 8px; text-align: right;">Tax (7.5%):</td><td style="padding: 8px; text-align: right;">$${tax.toFixed(2)}</td></tr>
                    <tr style="font-size: 18px;"><td colspan="3" style="padding: 12px 8px; text-align: right;"><strong>Total:</strong></td><td style="padding: 12px 8px; text-align: right;"><strong>$${total.toFixed(2)}</strong></td></tr>
                  </tfoot>
                </table>

                <p style="color: #6b7280; font-size: 13px;">If you have any questions about this invoice, please call us at (956) 669-9093 or reply to this email.</p>
                <p style="color: #6b7280; font-size: 13px;">Harden HVAC & Refrigeration | Tallahassee, FL | hardenhvacr.com</p>
              </div>
            </div>
          `,
        }),
      });

      emailSent = res.ok;
    } catch (err) {
      console.error('[invoice] Email send failed:', err);
    }
  }

  // Log to agent_logs
  await supabase.from('agent_logs').insert({
    agent: 'csr_invoice',
    action: 'invoice_generated',
    request_id: null,
    details: {
      invoice_id: invoiceId,
      work_order_id: workOrderId,
      customer_id: wo.customer_id,
      total,
      line_items_count: lineItems.length,
      email_sent: emailSent,
      ai_cost: aiCost,
    },
  } as Record<string, unknown>);

  return {
    invoice_id: invoiceId,
    line_items: lineItems,
    subtotal,
    tax,
    total,
    customer_email: customerEmail || null,
    email_sent: emailSent,
  };
}
