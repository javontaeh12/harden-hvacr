import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const GROUP_ID = process.env.DEFAULT_GROUP_ID || '6dc0a985-6074-4c89-bf08-099c5cdfab0c';
const OWNER_TECH_ID = process.env.OWNER_TECH_ID || '09309f84-6914-453a-ad85-9bb45817a342';
const FROM_EMAIL = 'Harden HVAC <noreply@hardenhvacr.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'Javontaedharden@gmail.com';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/csr/approve-booking
 * Body: { booking_id, action: "approve" | "deny" }
 *
 * APPROVE: sends service fee invoice to customer
 * DENY: updates booking status to cancelled, notifies customer
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, action } = await request.json();
    if (!booking_id || !['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'booking_id and action (approve/deny) required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, customers(full_name, email, phone, address)')
      .eq('id', booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = booking as any;
    const customer = b.customers || {};
    const customerEmail = customer.email;
    const customerName = customer.full_name || b.name || 'Customer';

    const scheduledDateFormatted = b.start_time
      ? new Date(b.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';

    const startHour = b.start_time ? new Date(b.start_time).getHours() : 8;
    const timeFrame = startHour < 12 ? '8 AM - 12 PM' : '12 PM - 5 PM';

    if (action === 'deny') {
      await supabase.from('bookings').update({ status: 'cancelled' } as Record<string, unknown>).eq('id', booking_id);

      // Notify customer if email available
      if (customerEmail && process.env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: 'Service Request Update — Harden HVAC',
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;"><h1 style="margin:0;font-size:20px;">Harden HVAC & Refrigeration</h1></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;"><p>Hi ${customerName},</p><p>Unfortunately, we're unable to accommodate your service request at this time. Please call us at <a href="tel:+19566699093">(956) 669-9093</a> to discuss alternatives or reschedule.</p><p style="color:#6b7280;font-size:13px;">Harden HVAC & Refrigeration | Tallahassee, FL | hardenhvacr.com</p></div></div>`,
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ ok: true, action: 'denied', booking_id });
    }

    // APPROVE — update status and send invoice
    await supabase.from('bookings').update({ status: 'approved' } as Record<string, unknown>).eq('id', booking_id);

    // Send service fee invoice to customer
    if (customerEmail && process.env.RESEND_API_KEY) {
      const serviceFee = Number(process.env.DEFAULT_SERVICE_FEE) || 99.00;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: customerEmail,
          cc: ADMIN_EMAIL,
          subject: `Service Fee Invoice — $${serviceFee.toFixed(2)} — Harden HVAC`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:20px;">Harden HVAC & Refrigeration</h1>
                <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">Service Fee Invoice</p>
              </div>
              <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p>Dear ${customerName},</p>
                <p>Your service request has been approved! Please pay the service fee below to confirm your appointment.</p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0 0 8px;"><strong>Service:</strong> ${b.service_type || 'HVAC Service'}</p>
                  <p style="margin:0 0 8px;"><strong>Date:</strong> ${scheduledDateFormatted}</p>
                  <p style="margin:0;"><strong>Time Window:</strong> ${timeFrame}</p>
                </div>
                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                  <thead><tr style="background:#f3f4f6;"><th style="padding:10px;text-align:left;border-bottom:2px solid #e5e7eb;">Description</th><th style="padding:10px;text-align:right;border-bottom:2px solid #e5e7eb;">Amount</th></tr></thead>
                  <tbody><tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;"><strong>Diagnostic Service Fee</strong><br><span style="color:#6b7280;font-size:13px;">${b.service_type || 'HVAC Service'} — ${scheduledDateFormatted}</span></td><td style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb;">$${serviceFee.toFixed(2)}</td></tr></tbody>
                  <tfoot><tr style="font-size:18px;font-weight:bold;"><td style="padding:12px 10px;">Total Due</td><td style="padding:12px 10px;text-align:right;">$${serviceFee.toFixed(2)}</td></tr></tfoot>
                </table>
                <div style="text-align:center;margin:24px 0;">
                  <a href="https://hardenhvacr.com/portal/login" style="display:inline-block;background:#1e40af;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Pay Now</a>
                </div>
                <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0 0 8px;font-weight:bold;font-size:14px;">What's included:</p>
                  <ul style="color:#374151;margin:0;padding-left:20px;line-height:1.8;font-size:14px;">
                    <li>On-site diagnostic inspection by a certified technician</li>
                    <li>Full system evaluation and testing</li>
                    <li>Detailed explanation of findings and repair options</li>
                    <li>Written estimate for any additional work needed</li>
                    <li>Service fee is credited toward any approved repairs</li>
                  </ul>
                </div>
                <p style="color:#6b7280;font-size:13px;">Once payment is received, your appointment will be confirmed and added to your calendar.<br>Questions? Call <a href="tel:+19566699093">(956) 669-9093</a></p>
                <p style="color:#9ca3af;font-size:12px;">Harden HVAC & Refrigeration | Tallahassee, FL | hardenhvacr.com</p>
              </div>
            </div>`,
        }),
      });
    }

    // Log
    await supabase.from('agent_logs').insert({
      agent: 'csr_booking',
      action: 'booking_approved',
      request_id: null,
      details: { booking_id, customer_name: customerName, customer_email: customerEmail, service: b.service_type },
    } as Record<string, unknown>);

    return NextResponse.json({ ok: true, action: 'approved', booking_id, invoice_sent: !!customerEmail });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[approve-booking] Error:', errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
