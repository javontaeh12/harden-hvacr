import { NextRequest, NextResponse } from 'next/server';
import { autoReschedule } from '@/lib/csr/reschedule';

/**
 * POST /api/csr/reschedule — Trigger auto-reschedule for a booking
 * Body: { booking_id, preferred_date? }
 */
export async function POST(request: NextRequest) {
  try {
    const { booking_id, preferred_date } = await request.json();

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 });
    }

    const result = await autoReschedule(booking_id, preferred_date);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[reschedule] Error:', errMsg);
    return NextResponse.json({ error: 'Reschedule failed', detail: errMsg }, { status: 500 });
  }
}
