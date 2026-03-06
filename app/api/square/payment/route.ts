import { NextRequest, NextResponse } from 'next/server';

const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

export async function POST(request: NextRequest) {
  try {
    const { sourceId, amount, currency, workOrderId, customerName, description } = await request.json();

    if (!sourceId || !amount) {
      return NextResponse.json({ error: 'sourceId and amount are required' }, { status: 400 });
    }

    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Square is not configured' }, { status: 500 });
    }

    const idempotencyKey = crypto.randomUUID();

    const paymentBody: Record<string, unknown> = {
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: Math.round(amount * 100), // Convert dollars to cents
        currency: currency || 'USD',
      },
      note: description || `Payment for Work Order`,
      reference_id: workOrderId || undefined,
    };

    if (process.env.SQUARE_LOCATION_ID) {
      paymentBody.location_id = process.env.SQUARE_LOCATION_ID;
    }

    const response = await fetch(`${SQUARE_BASE_URL}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Square payment error:', data);
      const errorMessage = data.errors?.[0]?.detail || 'Payment failed';
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      paymentId: data.payment?.id,
      receiptUrl: data.payment?.receipt_url,
      status: data.payment?.status,
      amount: data.payment?.amount_money,
    });
  } catch (error) {
    console.error('Square payment error:', error);
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}
