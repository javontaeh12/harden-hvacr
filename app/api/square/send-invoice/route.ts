import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SQUARE_BASE = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const SQ_HEADERS = {
  'Square-Version': '2024-12-18',
  'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function sqPost(path: string, body: unknown) {
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    method: 'POST',
    headers: SQ_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.errors?.[0]?.detail || `Square error on ${path}`;
    throw new Error(msg);
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });

    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Square not configured' }, { status: 500 });
    }

    const db = supabase();
    const { data: sr, error: srErr } = await db
      .from('service_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (srErr || !sr) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (!sr.quote_total || sr.quote_total <= 0) {
      return NextResponse.json({ error: 'Set quote pricing before sending invoice' }, { status: 400 });
    }

    const phone = sr.phone || sr.contact || '';
    const email = sr.email || '';

    if (!phone && !email) {
      return NextResponse.json({ error: 'Customer has no phone or email — cannot deliver invoice' }, { status: 400 });
    }

    // 1. Create or find Square customer
    let squareCustomerId = sr.square_customer_id as string | undefined;
    if (!squareCustomerId) {
      const custBody: Record<string, unknown> = {
        idempotency_key: `${requestId}-cust`,
        given_name: sr.name?.split(' ')[0] || sr.name,
        family_name: sr.name?.split(' ').slice(1).join(' ') || undefined,
      };
      if (email) custBody.email_address = email;
      if (phone) custBody.phone_number = phone.replace(/\D/g, '');

      const custRes = await sqPost('/v2/customers', custBody);
      squareCustomerId = custRes.customer.id as string;
    }

    // 2. Create Square order with line items
    const lineItems: Array<Record<string, unknown>> = [];
    if (sr.quote_parts_cost && sr.quote_parts_cost > 0) {
      lineItems.push({
        name: 'Parts',
        quantity: '1',
        base_price_money: { amount: Math.round(sr.quote_parts_cost * 100), currency: 'USD' },
      });
    }
    if (sr.quote_labor_cost && sr.quote_labor_cost > 0) {
      lineItems.push({
        name: 'Labor',
        quantity: '1',
        base_price_money: { amount: Math.round(sr.quote_labor_cost * 100), currency: 'USD' },
      });
    }
    // Fallback if only total is set
    if (lineItems.length === 0) {
      lineItems.push({
        name: sr.service_type || 'HVAC Service',
        quantity: '1',
        base_price_money: { amount: Math.round(sr.quote_total * 100), currency: 'USD' },
      });
    }

    const orderRes = await sqPost('/v2/orders', {
      idempotency_key: `${requestId}-order`,
      order: {
        location_id: process.env.SQUARE_LOCATION_ID,
        customer_id: squareCustomerId,
        line_items: lineItems,
      },
    });
    const orderId = orderRes.order.id as string;

    // 3. Create invoice
    const depositAmt = sr.deposit_amount && sr.deposit_amount > 0
      ? Math.round(sr.deposit_amount * 100)
      : null;

    const paymentRequest: Record<string, unknown> = {
      request_type: depositAmt ? 'DEPOSIT' : 'BALANCE',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tipping_enabled: false,
    };
    if (depositAmt) {
      paymentRequest.fixed_amount_requested_money = { amount: depositAmt, currency: 'USD' };
    }

    // Delivery: prefer SMS if phone, else email
    const deliveryMethod = phone ? 'SMS' : 'EMAIL';

    const invoiceBody: Record<string, unknown> = {
      idempotency_key: `${requestId}-inv`,
      invoice: {
        location_id: process.env.SQUARE_LOCATION_ID,
        order_id: orderId,
        primary_recipient: { customer_id: squareCustomerId },
        payment_requests: [paymentRequest],
        delivery_method: deliveryMethod,
        title: `Harden HVAC — ${sr.service_type || 'Service'} Quote`,
        description: sr.quote_notes || undefined,
        scheduled_at: new Date().toISOString(),
      },
    };

    const invRes = await sqPost('/v2/invoices', invoiceBody);
    const invoiceId = invRes.invoice.id as string;
    const invoiceVersion = invRes.invoice.version as number;

    // 4. Publish invoice (sends SMS/email)
    await sqPost(`/v2/invoices/${invoiceId}/publish`, {
      idempotency_key: `${requestId}-pub`,
      version: invoiceVersion,
    });

    // 5. Update service_request
    await db.from('service_requests').update({
      square_customer_id: squareCustomerId,
      square_invoice_id: invoiceId,
      quote_status: 'sent',
      invoice_sent_at: new Date().toISOString(),
      status: 'quoted',
    }).eq('id', requestId);

    return NextResponse.json({ ok: true, invoiceId, squareCustomerId });
  } catch (err) {
    console.error('send-invoice error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send invoice' },
      { status: 500 }
    );
  }
}
