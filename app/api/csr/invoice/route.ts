import { NextRequest, NextResponse } from 'next/server';
import { generateInvoice } from '@/lib/csr/invoice';

/**
 * POST /api/csr/invoice — Trigger auto-invoice for a completed work order
 * Body: { work_order_id }
 */
export async function POST(request: NextRequest) {
  try {
    const { work_order_id } = await request.json();

    if (!work_order_id) {
      return NextResponse.json({ error: 'work_order_id is required' }, { status: 400 });
    }

    const result = await generateInvoice(work_order_id);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[invoice] Error:', errMsg);
    return NextResponse.json({ error: 'Invoice generation failed', detail: errMsg }, { status: 500 });
  }
}
