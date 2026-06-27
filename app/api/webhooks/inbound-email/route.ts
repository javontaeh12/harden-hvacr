import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { extractTokenFromSubject, findThreadByToken, resolveThread } from '@/lib/email-threads';
import { resolveReplyAction, executeAction } from '@/lib/reply-action-handler';
import { sendAgentConfirmation } from '@/lib/dispatch-emails';
import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify Svix webhook signature (mandatory)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 500 });
    }

    const wh = new Webhook(webhookSecret);
    const headers = {
      'svix-id': request.headers.get('svix-id') || '',
      'svix-timestamp': request.headers.get('svix-timestamp') || '',
      'svix-signature': request.headers.get('svix-signature') || '',
    };
    try {
      wh.verify(body, headers);
    } catch {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const { data } = payload;

    // Resend inbound webhook provides: from, to, subject, text, html
    const subject = data?.subject || '';
    const replyBody = data?.text || data?.html || '';
    const fromEmail = data?.from || '';

    // Extract token from subject
    const token = extractTokenFromSubject(subject);
    if (!token) {
      console.log('Inbound email without thread token, ignoring:', subject);
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Find the thread
    const thread = await findThreadByToken(token);
    if (!thread) {
      console.log('No thread found for token:', token);
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (thread.status === 'resolved') {
      console.log('Thread already resolved:', token);
      return NextResponse.json({ ok: true, already_resolved: true });
    }

    // AI analyzes the reply and determines action
    const action = await resolveReplyAction(thread, replyBody);

    // Execute the action
    await executeAction(action, thread);

    // Mark thread resolved
    await resolveThread(thread.id);

    // Log inbound email
    const supabase = createServiceClient();
    await supabase.from('agent_logs').insert({
      agent: 'inbound_email',
      action: 'processed',
      request_id: thread.request_id || null,
      details: {
        token,
        from: fromEmail,
        subject,
        resolved_action: action.action,
        confidence: action.confidence,
        summary: action.summary,
      },
    } as Record<string, unknown>);

    // Send confirmation to admin
    try {
      await sendAgentConfirmation(
        fromEmail,
        `Got it — ${action.summary}`,
        token
      );
    } catch (e) {
      console.error('Confirmation email error:', e);
    }

    return NextResponse.json({
      ok: true,
      action: action.action,
      summary: action.summary,
    });
  } catch (error) {
    console.error('Inbound email webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
