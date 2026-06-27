import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();
    const origin = request.headers.get('origin') || 'https://hardenhvacr.com';

    if (!process.env.GMAIL_APP_PASSWORD || !process.env.ADMIN_EMAIL) {
      console.error('Email not configured: GMAIL_APP_PASSWORD or ADMIN_EMAIL missing');
      return NextResponse.json({ ok: false, error: 'Email not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `HVAC Service Portal <${process.env.ADMIN_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New User Access Request — ${name || email}`,
      html: `
        <h2>New User Access Request</h2>
        <p>A new user has requested access to the HVAC Service Portal:</p>
        <ul>
          <li><strong>Name:</strong> ${name || 'Not provided'}</li>
          <li><strong>Email:</strong> ${email}</li>
        </ul>
        <p>Please log in to approve or reject this request.</p>
        <p><a href="${origin}/admin/users">Go to User Management</a></p>
      `,
    });

    console.log(`Admin notification sent for new user: ${email}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to send admin notification email:', err);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
