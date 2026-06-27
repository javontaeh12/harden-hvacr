import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendFollowUp } from '@/lib/dispatch-emails';
import { createThread } from '@/lib/email-threads';
import { sendToOwnChannel, buildFollowUpEmbed } from '@/lib/discord';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/cron/follow-up — Send next-day follow-up emails for jobs completed yesterday
// Intended to be called daily by Vercel Cron or external scheduler
export async function GET(request: NextRequest) {
  // Optional: verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Find job_completed agent logs from yesterday (completed 18-42 hours ago for safety)
    const now = new Date();
    const hoursAgo42 = new Date(now.getTime() - 42 * 60 * 60 * 1000).toISOString();
    const hoursAgo18 = new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString();

    const { data: completedLogs, error } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('agent', 'dispatch')
      .eq('action', 'job_completed')
      .gte('created_at', hoursAgo42)
      .lte('created_at', hoursAgo18);

    if (error) throw error;

    if (!completedLogs || completedLogs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'No follow-ups needed' });
    }

    // Check which ones already got a follow-up (avoid duplicates)
    const requestIds = completedLogs.map((l: Record<string, unknown>) => l.request_id).filter(Boolean);
    const { data: existingFollowUps } = await supabase
      .from('agent_logs')
      .select('request_id')
      .eq('agent', 'follow_up')
      .eq('action', 'email_sent')
      .in('request_id', requestIds);

    const alreadySent = new Set((existingFollowUps || []).map((f: Record<string, unknown>) => f.request_id));

    let sentCount = 0;
    const errors: string[] = [];

    for (const log of completedLogs) {
      if (alreadySent.has(log.request_id)) continue;

      const details = log.details as Record<string, string> | null;
      const email = details?.customer_email;
      const customerName = details?.customer_name;
      const techName = details?.tech_name;
      const serviceType = details?.service_type;

      if (!email || !customerName) continue;

      try {
        // Create thread so forwarded customer replies can be processed
        let token: string | undefined;
        try {
          token = await createThread('follow_up', log.request_id, {
            customer_email: email,
            customer_name: customerName,
            tech_name: techName,
            service_type: serviceType,
          });
        } catch { /* thread creation is optional */ }

        await sendFollowUp(email, {
          customerName,
          serviceType: serviceType || 'HVAC Service',
          techName: techName || 'Your Technician',
          token,
        });

        // Post to Discord #marketing (follow-ups are marketing's job)
        try {
          await sendToOwnChannel('marketing', '', {
            embeds: [buildFollowUpEmbed({
              customerName,
              email,
              serviceType: serviceType || 'HVAC Service',
              techName: techName || 'Your Technician',
              status: 'Follow-up email sent',
            })],
          });
        } catch (e) { console.error('Discord post error:', e); }

        // Log the follow-up
        await supabase.from('agent_logs').insert({
          agent: 'follow_up',
          action: 'email_sent',
          request_id: log.request_id,
          details: {
            customer_email: email,
            customer_name: customerName,
            tech_name: techName,
            service_type: serviceType,
          },
        } as Record<string, unknown>);

        sentCount++;
      } catch (e) {
        console.error(`Follow-up email failed for ${email}:`, e);
        errors.push(email);
      }
    }

    return NextResponse.json({
      ok: true,
      sent: sentCount,
      skipped: alreadySent.size,
      errors: errors.length,
    });
  } catch (error) {
    console.error('Follow-up cron error:', error);
    return NextResponse.json({ error: 'Follow-up processing failed' }, { status: 500 });
  }
}
