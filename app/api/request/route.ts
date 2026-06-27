import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getResend = () => new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = process.env.ADMIN_EMAIL || 'Javontaedharden@gmail.com';

function urgencyLabel(val: string) {
  const map: Record<string, string> = {
    emergency: 'Emergency — not working at all',
    soon: 'Soon — having issues but still running',
    routine: 'Routine — maintenance or tune-up',
    question: 'Just a question',
  };
  return map[val] || val;
}

function buildOwnerHtml(d: {
  name: string; phone?: string; email?: string;
  address?: string; city?: string; zip?: string;
  service_type?: string; urgency?: string; equipment_info?: string;
  issue: string; started_when?: string; symptoms?: string[];
  file_urls?: string[]; membership_interest?: boolean;
  requestId?: string;
}) {
  const adminUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hardenhvacr.com';
  const reviewLink = d.requestId ? `${adminUrl}/admin/requests/${d.requestId}` : `${adminUrl}/admin/requests`;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
      <h2 style="color:#e65100;margin-bottom:4px">New Service Request</h2>
      <hr style="border:none;border-top:2px solid #e65100;margin-bottom:20px"/>

      <a href="${reviewLink}" style="display:inline-block;background:#0a1f3f;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-bottom:20px">
        Review &amp; Set Quote →
      </a>

      <h3 style="margin-bottom:8px">Contact</h3>
      <p style="margin:2px 0"><strong>Name:</strong> ${d.name}</p>
      ${d.phone ? `<p style="margin:2px 0"><strong>Phone:</strong> <a href="tel:${d.phone.replace(/\D/g, '')}" style="color:#e65100">${d.phone}</a></p>` : ''}
      ${d.email ? `<p style="margin:2px 0"><strong>Email:</strong> <a href="mailto:${d.email}" style="color:#e65100">${d.email}</a></p>` : ''}
      ${d.address ? `<p style="margin:2px 0"><strong>Address:</strong> <a href="https://maps.google.com/?q=${encodeURIComponent([d.address, d.city, d.zip].filter(Boolean).join(', '))}" style="color:#e65100">${d.address}${d.city ? `, ${d.city}` : ''} ${d.zip || ''}</a></p>` : ''}

      <h3 style="margin-top:16px;margin-bottom:8px">Service Details</h3>
      ${d.service_type ? `<p style="margin:2px 0"><strong>Type:</strong> ${d.service_type}</p>` : ''}
      ${d.urgency ? `<p style="margin:2px 0"><strong>Urgency:</strong> ${urgencyLabel(d.urgency)}</p>` : ''}
      ${d.equipment_info ? `<p style="margin:2px 0"><strong>Equipment:</strong> ${d.equipment_info}</p>` : ''}

      <h3 style="margin-top:16px;margin-bottom:8px">Problem</h3>
      <p style="margin:2px 0">${d.issue}</p>
      ${d.started_when ? `<p style="margin:6px 0"><strong>Started:</strong> ${d.started_when}</p>` : ''}
      ${d.symptoms?.length ? `<p style="margin:6px 0"><strong>Symptoms:</strong> ${d.symptoms.join(', ')}</p>` : ''}

      ${d.file_urls?.length ? `<h3 style="margin-top:16px;margin-bottom:8px">Attachments</h3><p>${d.file_urls.map((u, i) => `<a href="${u}">File ${i + 1}</a>`).join(' &middot; ')}</p>` : ''}

      ${d.membership_interest ? '<p style="margin-top:12px;color:#e65100;font-weight:bold">⭐ Interested in priority membership</p>' : ''}
    </div>
  `;
}

function buildCustomerHtml(name: string, service_type?: string) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
      <h2 style="color:#0a1f3f;margin-bottom:4px">We Got Your Request!</h2>
      <hr style="border:none;border-top:2px solid #e65100;margin-bottom:20px"/>

      <p>Hi ${name},</p>
      <p>Thanks for reaching out to <strong>Harden HVAC &amp; Refrigeration</strong>. We&apos;ve received your ${service_type ? service_type.toLowerCase() + ' ' : ''}service request and will be in touch shortly.</p>

      <h3 style="margin-top:20px;margin-bottom:8px">What happens next?</h3>
      <ol style="padding-left:20px;line-height:1.8">
        <li>We review your request within a few hours</li>
        <li>We call or text to confirm details and schedule</li>
        <li>You receive an invoice after service is discussed</li>
      </ol>

      <p style="margin-top:20px">If this is an <strong>emergency</strong>, don&apos;t wait &mdash; call us directly at <a href="tel:9105466485" style="color:#e65100;font-weight:bold">(910) 546-6485</a>.</p>

      <p style="margin-top:24px;color:#666;font-size:13px">
        &mdash; The Harden HVAC &amp; Refrigeration Team<br/>
        Tallahassee &amp; Quincy, FL
      </p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, contact, issue,
      phone, email, address, city, zip,
      service_type, urgency, equipment_info,
      started_when, symptoms, file_urls,
      fileUrl, membership_interest, membershipInterest,
    } = body;

    if (!name || !issue) {
      return NextResponse.json(
        { ok: false, error: 'Name and issue description are required.' },
        { status: 400 }
      );
    }

    const memberInterest = membership_interest ?? membershipInterest ?? false;

    const row: Record<string, unknown> = {
      name,
      contact: contact || phone || '',
      issue,
      file_url: fileUrl || (file_urls?.length ? file_urls[0] : null),
      membership_interest: memberInterest,
      status: 'pending',
    };

    if (phone) row.phone = phone;
    if (email) row.email = email;
    if (address) row.address = address;
    if (city) row.city = city;
    if (zip) row.zip = zip;
    if (service_type) row.service_type = service_type;
    if (urgency) row.urgency = urgency;
    if (equipment_info) row.equipment_info = equipment_info;
    if (started_when) row.started_when = started_when;
    if (symptoms?.length) row.symptoms = symptoms;
    if (file_urls?.length) row.file_urls = file_urls;

    const { data, error } = await supabase
      .from('service_requests')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('Service request insert error:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to submit request.' },
        { status: 500 }
      );
    }

    // Send emails (non-blocking, won't fail the request)
    try {
      const resend = getResend();
      const emailPromises = [
        resend.emails.send({
          from: 'Harden HVAC <onboarding@resend.dev>',
          to: OWNER_EMAIL,
          subject: `New Service Request from ${name}${urgency === 'emergency' ? ' ⚠️ EMERGENCY' : ''}`,
          html: buildOwnerHtml({
            name, phone, email, address, city, zip,
            service_type, urgency, equipment_info,
            issue, started_when, symptoms, file_urls,
            membership_interest: memberInterest,
            requestId: data.id,
          }),
        }),
      ];

      if (email) {
        emailPromises.push(
          resend.emails.send({
            from: 'Harden HVAC <onboarding@resend.dev>',
            to: email,
            subject: 'We received your service request — Harden HVAC',
            html: buildCustomerHtml(name, service_type),
          }),
        );
      }

      Promise.allSettled(emailPromises).then(results => {
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(`Email ${i} failed:`, r.reason);
          }
        });
      });
    } catch (emailErr) {
      console.error('Email setup error (non-fatal):', emailErr);
    }

    // Trigger AI Dispatch Agent to analyze and schedule (async, non-blocking)
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: data.id }),
    }).catch(e => console.error('Dispatch trigger error:', e));

    return NextResponse.json({ ok: true, requestId: data.id });
  } catch (err) {
    console.error('Service request error:', err);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
