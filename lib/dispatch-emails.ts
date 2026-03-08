import { Resend } from 'resend';

const getResend = () => new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'Harden HVAC <onboarding@resend.dev>';
const OWNER_EMAIL = 'Javontaedharden@gmail.com';
const INBOUND_DOMAIN = process.env.RESEND_INBOUND_DOMAIN || 'inbound.hardenhvacr.com';

export async function sendCustomerConfirmation(to: string, data: {
  customerName: string;
  serviceType: string;
  scheduledDate: string;
  timeFrame: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Service Request Received - Harden HVAC',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Harden HVAC</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${data.customerName},</p>
          <p>We've received your service request and are scheduling your appointment. You'll receive a confirmation email shortly with your service date, time frame, and assigned technician.</p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Service:</strong> ${data.serviceType}</p>
            <p style="margin: 0;"><strong>Requested Date:</strong> ${data.scheduledDate}</p>
          </div>
          <p>If you have any questions, call us at <strong>(555) 123-4567</strong>.</p>
          <p style="color: #6b7280; font-size: 13px;">Thank you for choosing Harden HVAC!</p>
        </div>
      </div>
    `,
  });
}

export async function sendServiceConfirmation(to: string, data: {
  customerName: string;
  serviceType: string;
  scheduledDate: string;
  timeFrame: string;
  techName: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Service Confirmed - ${data.scheduledDate} - Harden HVAC`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Service Confirmed</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${data.customerName},</p>
          <p>Your service appointment has been confirmed!</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Date:</strong> ${data.scheduledDate}</p>
            <p style="margin: 0 0 8px;"><strong>Time Frame:</strong> ${data.timeFrame}</p>
            <p style="margin: 0 0 8px;"><strong>Service:</strong> ${data.serviceType}</p>
            <p style="margin: 0;"><strong>Technician:</strong> ${data.techName}</p>
          </div>
          <p>Your technician will contact you when they're on their way.</p>
          <p style="color: #6b7280; font-size: 13px;">Thank you for choosing Harden HVAC!</p>
        </div>
      </div>
    `,
  });
}

export async function sendTechEnRoute(to: string, data: {
  customerName: string;
  techName: string;
  estimatedArrival: string;
  serviceType: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Technician is On The Way - Harden HVAC`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Technician En Route</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${data.customerName},</p>
          <p><strong>${data.techName}</strong> is on the way to your location!</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Technician:</strong> ${data.techName}</p>
            <p style="margin: 0 0 8px;"><strong>Service:</strong> ${data.serviceType}</p>
            <p style="margin: 0;"><strong>Estimated Arrival:</strong> ${data.estimatedArrival}</p>
          </div>
          <p>Please ensure someone is available to provide access. Your tech will arrive in a clearly marked Harden HVAC vehicle.</p>
        </div>
      </div>
    `,
  });
}

export async function sendJobCompleted(to: string, data: {
  customerName: string;
  techName: string;
  serviceType: string;
  completedAt: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Service Complete - Harden HVAC`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Service Complete</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${data.customerName},</p>
          <p>Your service with <strong>${data.techName}</strong> has been completed!</p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Service:</strong> ${data.serviceType}</p>
            <p style="margin: 0;"><strong>Completed:</strong> ${data.completedAt}</p>
          </div>
          <p>If you have any questions about the work performed, please don't hesitate to reach out.</p>
          <p style="color: #6b7280; font-size: 13px;">Thank you for trusting Harden HVAC with your comfort!</p>
        </div>
      </div>
    `,
  });
}

export async function sendFollowUp(to: string, data: {
  customerName: string;
  serviceType: string;
  techName: string;
  token?: string;
}) {
  const resend = getResend();
  const subject = data.token
    ? `How's Everything Going? - Harden HVAC [${data.token}]`
    : `How's Everything Going? - Harden HVAC`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    replyTo: data.token ? `followup@${INBOUND_DOMAIN}` : undefined,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Just Checking In</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${data.customerName},</p>
          <p>We wanted to follow up on the ${data.serviceType.toLowerCase()} service ${data.techName} performed for you yesterday. How is everything working?</p>
          <p>If you're experiencing any issues or have questions about the work, please let us know right away — we want to make sure everything is running perfectly.</p>
          <p>If everything is great, we'd really appreciate a quick review! It helps other homeowners find quality service.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Leave a Review</a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Thank you for choosing Harden HVAC — we appreciate your business!</p>
        </div>
      </div>
    `,
  });
}

export async function sendDispatchConflictAlert(data: {
  requestName: string;
  requestService: string;
  requestDate: string;
  requestIssue: string;
  aiAnalysis: string;
  suggestedPlan: string;
  token?: string;
}) {
  const resend = getResend();
  const subject = data.token
    ? `Dispatch Conflict - ${data.requestName} [${data.token}]`
    : `Dispatch Conflict - ${data.requestName} - Needs Review`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: OWNER_EMAIL,
    replyTo: `dispatch@${INBOUND_DOMAIN}`,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Dispatch Conflict - Review Needed</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="margin-top: 0;">New Service Request</h3>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Customer:</strong> ${data.requestName}</p>
            <p style="margin: 0 0 8px;"><strong>Service:</strong> ${data.requestService}</p>
            <p style="margin: 0 0 8px;"><strong>Requested Date:</strong> ${data.requestDate}</p>
            <p style="margin: 0;"><strong>Issue:</strong> ${data.requestIssue}</p>
          </div>
          <h3>AI Analysis</h3>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${data.aiAnalysis}</p>
          </div>
          <h3>Suggested Dispatch Plan</h3>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${data.suggestedPlan}</p>
          </div>
          <p><a href="https://hardenhvacr.com/admin/bookings" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Bookings</a></p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">Reply to this email to take action (e.g., "Schedule for Tuesday 8 AM", "Cancel this request", "Reassign to [tech name]").</p>
        </div>
      </div>
    `,
  });
}

export async function sendAgentConfirmation(
  to: string,
  summary: string,
  token: string
) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Action Confirmed [${token}]`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Action Confirmed</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>${summary}</p>
          <p style="color: #6b7280; font-size: 13px;">This action was processed automatically based on your email reply.</p>
        </div>
      </div>
    `,
  });
}
