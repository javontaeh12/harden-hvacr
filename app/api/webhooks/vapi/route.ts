import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { runCallPipeline } from '@/lib/csr/pipeline';

/**
 * POST /api/webhooks/vapi — End-of-call report from Vapi
 * Responds 200 immediately, processes call via after()
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (mandatory)
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('VAPI_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Parse Vapi webhook — handle both nested message format and flat format
    let callId: string;
    let callerPhone: string | null;
    let transcript: string;
    let durationSeconds: number | null = null;
    let recordingUrl: string | null = null;

    if (body.message?.type === 'end-of-call-report') {
      const msg = body.message;
      const call = msg.call || {};
      callId = call.id;
      callerPhone = call.customer?.number || null;
      transcript = msg.transcript || call.transcript || call.artifact?.transcript || '';
      recordingUrl = msg.recordingUrl || call.recordingUrl || null;
      if (call.startedAt && call.endedAt) {
        durationSeconds = Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000);
      }
    } else if (body.call_id || body.message?.call?.id) {
      callId = body.call_id || body.message?.call?.id;
      callerPhone = body.caller_phone || body.phone_number || null;
      transcript = body.transcript || '';
      durationSeconds = body.duration_seconds || null;
      recordingUrl = body.recording_url || null;
    } else {
      // Not an end-of-call-report — status-update, etc.
      return NextResponse.json({ ok: true, ignored: true, type: body.message?.type });
    }

    if (!callId || !transcript) {
      return NextResponse.json({ ok: false, error: 'Missing call_id or transcript' });
    }

    console.log(`[vapi-webhook] Call received: ${callId}, phone: ${callerPhone}`);

    // Respond 200 immediately — process in background via after()
    after(async () => {
      try {
        const result = await runCallPipeline({
          callId,
          callerPhone,
          transcript,
          durationSeconds,
          recordingUrl,
        });
        console.log(`[vapi-webhook] Pipeline complete: ${result.session_id} — ${result.outcome} (${result.processing_ms}ms)`);
      } catch (err) {
        console.error('[vapi-webhook] Pipeline error:', err);
      }
    });

    return NextResponse.json({ ok: true, received: callId });
  } catch (err) {
    console.error('[vapi-webhook] Request error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
