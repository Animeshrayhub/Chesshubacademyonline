import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Resend Email Dispatcher & Notification Engine for ChessHub Academy Bookings
 */

export interface BookingEmailBaseParams {
  bookingId: string;
  bookingRef: string;
  parentName: string;
  parentEmail: string;
  studentName: string;
  studentAge: number;
}

export interface ParentReceiptParams extends BookingEmailBaseParams {
  requestedTime: string;
  timeZone?: string;
  experience?: string;
  goals?: string;
}

export interface AdminAlertParams extends BookingEmailBaseParams {
  parentPhone: string;
  requestedTime: string;
  timeZone?: string;
  experience?: string;
  notes?: string;
}

export interface ParentConfirmationParams extends BookingEmailBaseParams {
  confirmedTime: string;
  timeZone?: string;
  coachName?: string;
  meetLink?: string;
}

export interface RescheduledParams extends BookingEmailBaseParams {
  newTime: string;
  timeZone?: string;
  meetLink?: string;
}

export interface ReminderParams extends BookingEmailBaseParams {
  reminderInterval: '24h' | '1h';
  sessionTime: string;
  timeZone?: string;
  meetLink?: string;
  coachName?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'ChessHub Academy <orders@chesshubacademy.online>';
const ADMIN_NOTIFICATION_EMAIL = process.env.BOOKING_ADMIN_EMAIL || 'clubchess259@gmail.com';

/**
 * Records notification event in public.audit_logs for auditability and idempotency.
 */
async function recordNotificationAudit(params: {
  idempotencyKey: string;
  eventType: string;
  bookingId: string;
  recipient: string;
  status: 'ACCEPTED_BY_PROVIDER' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
  providerMessageId?: string;
  errorMessage?: string;
}) {
  try {
    const admin = createSupabaseAdmin();
    await admin.from('audit_logs').insert({
      action: 'NOTIFICATION_SENT',
      ip_address: '127.0.0.1',
      details: {
        idempotency_key: params.idempotencyKey,
        event_type: params.eventType,
        booking_id: params.bookingId,
        recipient: params.recipient,
        status: params.status,
        provider_message_id: params.providerMessageId || null,
        error_message: params.errorMessage || null,
        delivery_confirmed: params.status === 'DELIVERED',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('[recordNotificationAudit] Failed to record notification audit log:', err);
  }
}

/**
 * Checks if a notification with the given stable idempotency key was already dispatched successfully or queued.
 */
async function isNotificationAlreadySent(idempotencyKey: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('audit_logs')
      .select('id, details')
      .contains('details', { idempotency_key: idempotencyKey })
      .limit(5);

    if (!data || data.length === 0) return false;

    return data.some((row: any) => {
      const st = row.details?.status;
      return st === 'ACCEPTED_BY_PROVIDER' || st === 'SENT' || st === 'DELIVERED';
    });
  } catch (err) {
    console.warn('[isNotificationAlreadySent] Check failed:', err);
    return false;
  }
}

/**
 * Core HTTP sender to Resend API.
 * Distinguishes accepted/queued email from confirmed delivery.
 */
export async function dispatchResendEmail(params: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{
  success: boolean;
  id?: string;
  error?: string;
  providerStatus?: 'ACCEPTED_BY_PROVIDER' | 'FAILED' | 'SKIPPED';
  skipped?: boolean;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;

  if (!apiKey) {
    console.warn('[dispatchResendEmail] Missing RESEND_API_KEY in environment.');
    return {
      success: false,
      error: 'RESEND_API_KEY is not configured in server environment.',
      providerStatus: 'FAILED',
    };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo || 'clubchess259@gmail.com',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.error?.message || 'Resend API error',
        providerStatus: 'FAILED',
      };
    }

    return {
      success: true,
      id: data.id,
      providerStatus: 'ACCEPTED_BY_PROVIDER',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error reaching Resend provider',
      providerStatus: 'FAILED',
    };
  }
}

/**
 * Queries Resend API to verify confirmed delivery status for a specific message ID.
 * Resend statuses: 'delivered' | 'sent' | 'bounced' | 'complained' | 'delayed'
 */
export async function verifyResendEmailDelivery(emailId: string): Promise<{
  success: boolean;
  status?: string;
  data?: any;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured.' };
  }

  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data?.message || 'Failed to fetch message status from Resend API',
      };
    }

    return {
      success: true,
      status: data.last_event || data.status || 'accepted',
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error verifying Resend delivery status',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PARENT BOOKING RECEIPT (Immediately after submission)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendParentBookingReceiptEmail(params: ParentReceiptParams) {
  const idempotencyKey = `booking-receipt-${params.bookingId}`;
  if (await isNotificationAlreadySent(idempotencyKey)) {
    return { success: true, skipped: true };
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #09122C 0%, #172554 100%); padding: 36px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #E5A93C; letter-spacing: -0.5px;">ChessHub Academy</h1>
        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 15px;">Demo Lesson Booking Request</p>
      </div>

      <div style="padding: 32px 28px; color: #1e293b;">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Hello ${params.parentName},</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569;">
          Thank you for requesting a free demo chess lesson for <strong>${params.studentName}</strong> (Age ${params.studentAge})! We have safely recorded your request.
        </p>

        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <div style="font-weight: 700; color: #92400e; font-size: 14px; margin-bottom: 4px;">Status: Under Review (Pending Admin Approval)</div>
          <div style="font-size: 13px; color: #b45309; line-height: 1.5;">
            Our academy director is reviewing our FIDE-rated coach schedule. You will receive an official confirmation email with your meeting link once approved.
          </div>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Booking Reference:</td>
              <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0f172a; font-family: monospace;">${params.bookingRef}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Student:</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${params.studentName} (${params.studentAge} yrs)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Requested Slot:</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${params.requestedTime}</td>
            </tr>
            ${params.timeZone ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Time Zone:</td>
              <td style="padding: 8px 0; text-align: right; color: #0f172a;">${params.timeZone}</td>
            </tr>` : ''}
            ${params.experience ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Experience:</td>
              <td style="padding: 8px 0; text-align: right; color: #0f172a;">${params.experience}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Have questions or need to adjust your time? Reach us on WhatsApp at <strong>+91 70086 65245</strong> or reply directly to <strong>clubchess259@gmail.com</strong>.
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        © ${new Date().getFullYear()} ChessHub Academy · FIDE-Rated Online Coaching Worldwide
      </div>
    </div>
  `;

  const sendResult = await dispatchResendEmail({
    to: [params.parentEmail],
    subject: `♟️ Booking Request Received: ${params.studentName} [Ref: ${params.bookingRef}]`,
    html,
  });

  await recordNotificationAudit({
    idempotencyKey,
    eventType: 'PARENT_BOOKING_RECEIPT',
    bookingId: params.bookingId,
    recipient: params.parentEmail,
    status: sendResult.success ? 'ACCEPTED_BY_PROVIDER' : 'FAILED',
    providerMessageId: sendResult.id,
    errorMessage: sendResult.error,
  });

  return sendResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMINISTRATOR NOTIFICATION (New Demo Request)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAdminNewBookingAlertEmail(params: AdminAlertParams) {
  const idempotencyKey = `admin-alert-${params.bookingId}`;
  if (await isNotificationAlreadySent(idempotencyKey)) {
    return { success: true, skipped: true };
  }

  const adminDashboardUrl = 'https://chesshubacademy.online/dashboard/admin/bookings';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: #09122C; padding: 28px 24px; text-align: center; color: #ffffff;">
        <span style="background: #E5A93C; color: #09122C; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">New Demo Request</span>
        <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 800; color: #ffffff;">Action Required: Demo Booking</h1>
      </div>

      <div style="padding: 28px; color: #1e293b;">
        <p style="font-size: 15px; line-height: 1.5; color: #334155;">
          A new demo chess lesson request was submitted on the website and is awaiting your confirmation.
        </p>

        <div style="background: #f8fafc; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Booking Reference:</td>
              <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #0f172a; font-family: monospace;">${params.bookingRef}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Parent Name:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${params.parentName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Parent Email:</td>
              <td style="padding: 6px 0; text-align: right; color: #2563eb;"><a href="mailto:${params.parentEmail}">${params.parentEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Parent Phone:</td>
              <td style="padding: 6px 0; text-align: right; color: #0f172a;">${params.parentPhone}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Student Name:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${params.studentName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Student Age:</td>
              <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #0f172a;">${params.studentAge} years old</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Requested Slot:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${params.requestedTime}</td>
            </tr>
            ${params.experience ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Chess Level:</td>
              <td style="padding: 6px 0; text-align: right; color: #0f172a;">${params.experience}</td>
            </tr>` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${adminDashboardUrl}" style="display: inline-block; background: #E5A93C; color: #09122C; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px;">
            Open Admin Dashboard & Assign Coach →
          </a>
        </div>
      </div>
    </div>
  `;

  const sendResult = await dispatchResendEmail({
    to: [ADMIN_NOTIFICATION_EMAIL],
    subject: `🚨 New Demo Booking: ${params.studentName} (${params.studentAge}y) - ${params.parentName} [${params.bookingRef}]`,
    html,
  });

  await recordNotificationAudit({
    idempotencyKey,
    eventType: 'ADMIN_BOOKING_ALERT',
    bookingId: params.bookingId,
    recipient: ADMIN_NOTIFICATION_EMAIL,
    status: sendResult.success ? 'ACCEPTED_BY_PROVIDER' : 'FAILED',
    providerMessageId: sendResult.id,
    errorMessage: sendResult.error,
  });

  return sendResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PARENT CONFIRMATION (Sent only after Admin approval)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendParentBookingConfirmedEmail(params: ParentConfirmationParams) {
  const idempotencyKey = `parent-confirmation-${params.bookingId}`;
  if (await isNotificationAlreadySent(idempotencyKey)) {
    return { success: true, skipped: true };
  }

  const meetLinkHtml = params.meetLink
    ? `
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
        <div style="font-weight: 700; color: #065f46; font-size: 14px; margin-bottom: 6px;">Your Google Meet Lesson Link</div>
        <a href="${params.meetLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 8px; margin-top: 6px;">
          Join Live Chess Lesson →
        </a>
        <div style="margin-top: 8px; font-size: 12px; color: #047857; font-family: monospace;">${params.meetLink}</div>
      </div>
    `
    : `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 20px 0; text-align: center; color: #64748b; font-size: 13px;">
        Your instructor will share the classroom link directly before the session.
      </div>
    `;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #09122C 0%, #15803d 100%); padding: 36px 24px; text-align: center; color: #ffffff;">
        <span style="background: #ffffff; color: #15803d; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Class Confirmed</span>
        <h1 style="margin: 12px 0 0 0; font-size: 26px; font-weight: 800; color: #ffffff;">Your Demo Class Is Confirmed! 🎉</h1>
      </div>

      <div style="padding: 32px 28px; color: #1e293b;">
        <h2 style="margin-top: 0; font-size: 18px; font-weight: 700;">Hello ${params.parentName},</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569;">
          We are delighted to confirm the 1-on-1 demo chess class for <strong>${params.studentName}</strong>!
        </p>

        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Booking Reference:</td>
              <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #0f172a; font-family: monospace;">${params.bookingRef}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Confirmed Date & Time:</td>
              <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #059669;">${params.confirmedTime}</td>
            </tr>
            ${params.timeZone ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Time Zone:</td>
              <td style="padding: 6px 0; text-align: right; color: #0f172a;">${params.timeZone}</td>
            </tr>` : ''}
            ${params.coachName ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">FIDE Coach:</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${params.coachName}</td>
            </tr>` : ''}
          </table>
        </div>

        ${meetLinkHtml}

        <div style="background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 8px;">How to Prepare:</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
            <li>Please join 5 minutes early using a laptop, desktop, or tablet for optimal board visibility.</li>
            <li>Ensure a stable internet connection and quiet learning environment.</li>
            <li>Have a notebook or chess board handy if desired.</li>
          </ul>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Need to reschedule? Contact us on WhatsApp at <strong>+91 70086 65245</strong> or email <strong>clubchess259@gmail.com</strong> at least 6 hours in advance.
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        © ${new Date().getFullYear()} ChessHub Academy · https://chesshubacademy.online
      </div>
    </div>
  `;

  const sendResult = await dispatchResendEmail({
    to: [params.parentEmail],
    subject: `✅ Demo Class Confirmed: ${params.studentName} [Ref: ${params.bookingRef}]`,
    html,
  });

  await recordNotificationAudit({
    idempotencyKey,
    eventType: 'PARENT_CONFIRMATION',
    bookingId: params.bookingId,
    recipient: params.parentEmail,
    status: sendResult.success ? 'ACCEPTED_BY_PROVIDER' : 'FAILED',
    providerMessageId: sendResult.id,
    errorMessage: sendResult.error,
  });

  return sendResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RESCHEDULING & CANCELLATION NOTICES
// ─────────────────────────────────────────────────────────────────────────────
export async function sendBookingRescheduledEmail(params: RescheduledParams) {
  // Stable deterministic event ID using base64url slug of the new time string (avoids random/Date.now() jitter)
  const timeSlug = Buffer.from(params.newTime.trim()).toString('base64url').slice(0, 32);
  const idempotencyKey = `booking-rescheduled-${params.bookingId}-${timeSlug}`;
  if (await isNotificationAlreadySent(idempotencyKey)) {
    return { success: true, skipped: true };
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: #1e3a8a; padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Lesson Rescheduled</h1>
      </div>
      <div style="padding: 28px; color: #1e293b;">
        <p style="font-size: 15px;">Hello ${params.parentName},</p>
        <p style="font-size: 14px; color: #475569;">
          The demo chess session for <strong>${params.studentName}</strong> has been updated to:
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 18px 0; font-size: 15px; font-weight: 700; color: #166534; text-align: center;">
          ${params.newTime} ${params.timeZone ? `(${params.timeZone})` : ''}
        </div>
        ${params.meetLink ? `<p style="font-size: 13px;">Google Meet Link: <a href="${params.meetLink}">${params.meetLink}</a></p>` : ''}
      </div>
    </div>
  `;

  const sendResult = await dispatchResendEmail({
    to: [params.parentEmail],
    subject: `🗓️ Demo Lesson Rescheduled: ${params.studentName} [Ref: ${params.bookingRef}]`,
    html,
  });

  await recordNotificationAudit({
    idempotencyKey,
    eventType: 'BOOKING_RESCHEDULED',
    bookingId: params.bookingId,
    recipient: params.parentEmail,
    status: sendResult.success ? 'ACCEPTED_BY_PROVIDER' : 'FAILED',
    providerMessageId: sendResult.id,
    errorMessage: sendResult.error,
  });

  return sendResult;
}

export async function sendBookingCancelledEmail(params: BookingEmailBaseParams & { reason?: string }) {
  // Stable deterministic event ID for cancellation
  const idempotencyKey = `booking-cancelled-${params.bookingId}`;
  if (await isNotificationAlreadySent(idempotencyKey)) {
    return { success: true, skipped: true };
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: #334155; padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Demo Request Cancelled</h1>
      </div>
      <div style="padding: 28px; color: #1e293b;">
        <p style="font-size: 15px;">Hello ${params.parentName},</p>
        <p style="font-size: 14px; color: #475569;">
          Your demo lesson request for <strong>${params.studentName}</strong> (Ref: ${params.bookingRef}) has been cancelled.
          ${params.reason ? `<br/><br/><em>Reason: ${params.reason}</em>` : ''}
        </p>
        <p style="font-size: 13px; color: #64748b;">
          If you would like to book a different time, visit <a href="https://chesshubacademy.online/book-demo">chesshubacademy.online/book-demo</a> anytime.
        </p>
      </div>
    </div>
  `;

  const sendResult = await dispatchResendEmail({
    to: [params.parentEmail],
    subject: `Demo Lesson Request Cancelled [Ref: ${params.bookingRef}]`,
    html,
  });

  await recordNotificationAudit({
    idempotencyKey,
    eventType: 'BOOKING_CANCELLED',
    bookingId: params.bookingId,
    recipient: params.parentEmail,
    status: sendResult.success ? 'ACCEPTED_BY_PROVIDER' : 'FAILED',
    providerMessageId: sendResult.id,
    errorMessage: sendResult.error,
  });

  return sendResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SESSION REMINDERS (24 Hours & 1 Hour Before Session)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendSessionReminderEmail(
  params: ReminderParams
): Promise<{ success: boolean; id?: string; error?: string; skipped?: boolean }> {
  const idempotencyKey = `reminder-${params.reminderInterval}-${params.bookingId}`;
  if (await isNotificationAlreadySent(idempotencyKey)) {
    return { success: true, skipped: true };
  }

  const timingText = params.reminderInterval === '24h' ? 'in 24 hours' : 'in 1 hour';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #09122C 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <span style="background: #E5A93C; color: #09122C; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Class Reminder</span>
        <h1 style="margin: 12px 0 0 0; font-size: 24px; font-weight: 800;">Your Chess Lesson Starts ${timingText}!</h1>
      </div>

      <div style="padding: 28px; color: #1e293b;">
        <p style="font-size: 15px;">Hello ${params.parentName},</p>
        <p style="font-size: 14px; color: #475569;">
          This is a friendly reminder that <strong>${params.studentName}</strong>'s free demo chess class is scheduled for:
        </p>

        <div style="background: #f8fafc; border-radius: 12px; padding: 18px; margin: 18px 0; border: 1px solid #e2e8f0; font-size: 14px;">
          <div><strong>Session Time:</strong> ${params.sessionTime} ${params.timeZone ? `(${params.timeZone})` : ''}</div>
          ${params.coachName ? `<div style="margin-top: 6px;"><strong>Instructor:</strong> ${params.coachName}</div>` : ''}
        </div>

        ${params.meetLink ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${params.meetLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
              Join Google Meet Classroom →
            </a>
            <div style="margin-top: 8px; font-size: 12px; color: #64748b;">${params.meetLink}</div>
          </div>
        ` : ''}

        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
          Questions or connection issues? WhatsApp us at <strong>+91 70086 65245</strong>.
        </p>
      </div>
    </div>
  `;

  const sendResult = await dispatchResendEmail({
    to: [params.parentEmail],
    subject: `⏰ Reminder: Demo Class for ${params.studentName} starts ${timingText}! [Ref: ${params.bookingRef}]`,
    html,
  });

  await recordNotificationAudit({
    idempotencyKey,
    eventType: `REMINDER_${params.reminderInterval.toUpperCase()}`,
    bookingId: params.bookingId,
    recipient: params.parentEmail,
    status: sendResult.success ? 'ACCEPTED_BY_PROVIDER' : 'FAILED',
    providerMessageId: sendResult.id,
    errorMessage: sendResult.error,
  });

  return sendResult;
}
