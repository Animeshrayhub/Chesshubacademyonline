import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { dispatchResendEmail, verifyResendEmailDelivery } from '@/lib/email/bookingEmails';

export const dynamic = 'force-dynamic';

/**
 * DEVELOPMENT-ONLY / ADMIN TEST EMAIL ENDPOINT
 * 
 * Restrictions & Guards:
 * 1. Only accepts calls authorized via Bearer token (matching CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY)
 *    or a verified Admin session.
 * 2. ONLY permits dispatching to explicitly authorized test recipients (BOOKING_ADMIN_EMAIL or AUTHORIZED_TEST_EMAILS).
 *    All arbitrary/unknown recipient requests are strictly rejected with 403 Forbidden.
 * 3. Never leaks secret keys or service role tokens in responses or logs.
 */

function getAuthorizedRecipients(): Set<string> {
  const adminEmail = (process.env.BOOKING_ADMIN_EMAIL || 'clubchess259@gmail.com').toLowerCase().trim();
  const extraList = (process.env.AUTHORIZED_TEST_EMAILS || '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  return new Set([adminEmail, ...extraList]);
}

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const testKeyHeader = req.headers.get('x-test-email-key') || '';

  const cronSecret = process.env.CRON_SECRET || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (cronSecret && (token === cronSecret || testKeyHeader === cronSecret)) {
    return true;
  }
  if (serviceRoleKey && (token === serviceRoleKey || testKeyHeader === serviceRoleKey)) {
    return true;
  }

  // Also permit local loopback in non-production environments
  const isDev = process.env.NODE_ENV !== 'production';
  const isLocalhost =
    req.headers.get('host')?.includes('localhost') ||
    req.headers.get('host')?.includes('127.0.0.1');

  if (isDev && isLocalhost && testKeyHeader === 'dev-local-authorized') {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Valid administrative token or test key is required.' },
      { status: 401 }
    );
  }

  const authorizedList = Array.from(getAuthorizedRecipients());
  return NextResponse.json({
    status: 'online',
    authorizedTestRecipients: authorizedList,
    provider: 'Resend',
    verifiedSenderDomain: 'chesshubacademy.online',
    availableTemplates: [
      'receipt',
      'admin_alert',
      'confirmation',
      'reschedule',
      'cancellation',
      'reminder_24h',
      'reminder_1h',
      'ping',
    ],
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Administrative credentials required.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const recipient = (body.recipient || '').toLowerCase().trim();
    const template = (body.template || 'ping').toLowerCase().trim();

    if (!recipient) {
      return NextResponse.json(
        { error: 'Missing required field: "recipient".' },
        { status: 400 }
      );
    }

    const authorized = getAuthorizedRecipients();
    if (!authorized.has(recipient)) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Target recipient is not in the authorized test whitelist. In test/dev mode, emails can only be sent to authorized admin/testing addresses.',
          authorizedWhitelist: Array.from(authorized),
        },
        { status: 403 }
      );
    }

    const mockRef = 'CHA-TEST' + Math.floor(1000 + Math.random() * 9000);
    const mockStudent = body.studentName || 'Test Student';
    const mockParent = body.parentName || 'Test Parent';
    const mockTime = body.time || 'Tomorrow at 5:00 PM IST';
    const mockMeetLink = body.meetLink || 'https://meet.google.com/test-demo-room';

    let subject = '';
    let html = '';

    switch (template) {
      case 'receipt':
        subject = `[TEST] ♟️ Booking Request Received: ${mockStudent} [Ref: ${mockRef}]`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div style="background: #e0f2fe; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: bold; color: #0369a1;">
              🧪 TEST MODE RECEIPT — Not a real booking
            </div>
            <h2>Hello ${mockParent},</h2>
            <p>This is a test of the parent demo booking receipt email.</p>
            <p><strong>Student:</strong> ${mockStudent} (Age 7)</p>
            <p><strong>Requested Slot:</strong> ${mockTime}</p>
            <p><strong>Reference:</strong> ${mockRef}</p>
            <p style="color: #64748b;">Status: Under Review (Pending Admin Approval)</p>
          </div>
        `;
        break;

      case 'admin_alert':
        subject = `[TEST] 🚨 New Demo Booking: ${mockStudent} (7y) - ${mockParent} [${mockRef}]`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: bold; color: #92400e;">
              🧪 TEST MODE ADMIN ALERT — Action Required
            </div>
            <h2>Admin Notification Test</h2>
            <p><strong>Parent:</strong> ${mockParent} (${recipient})</p>
            <p><strong>Student:</strong> ${mockStudent} (7 years old)</p>
            <p><strong>Requested Slot:</strong> ${mockTime}</p>
            <p><strong>Reference:</strong> ${mockRef}</p>
          </div>
        `;
        break;

      case 'confirmation':
        subject = `[TEST] ✅ Demo Class Confirmed: ${mockStudent} [Ref: ${mockRef}]`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div style="background: #dcfce7; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: bold; color: #15803d;">
              🧪 TEST MODE CONFIRMATION — Lesson Confirmed
            </div>
            <h2>Hello ${mockParent},</h2>
            <p>Your demo lesson for <strong>${mockStudent}</strong> is confirmed!</p>
            <p><strong>Date & Time:</strong> ${mockTime}</p>
            <p><strong>Instructor:</strong> Grandmaster Coach</p>
            <div style="margin: 15px 0;">
              <a href="${mockMeetLink}" style="background: #059669; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Join Google Meet
              </a>
            </div>
          </div>
        `;
        break;

      case 'reschedule':
        subject = `[TEST] 🗓️ Demo Lesson Rescheduled: ${mockStudent} [Ref: ${mockRef}]`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div style="background: #ede9fe; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: bold; color: #6d28d9;">
              🧪 TEST MODE RESCHEDULE — Time Updated
            </div>
            <h2>Hello ${mockParent},</h2>
            <p>The demo session has been rescheduled to: <strong>${mockTime}</strong>.</p>
            <p><strong>Reference:</strong> ${mockRef}</p>
          </div>
        `;
        break;

      case 'cancellation':
        subject = `[TEST] Demo Lesson Request Cancelled [Ref: ${mockRef}]`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div style="background: #fee2e2; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: bold; color: #991b1b;">
              🧪 TEST MODE CANCELLATION
            </div>
            <h2>Hello ${mockParent},</h2>
            <p>Your demo lesson request has been cancelled as requested.</p>
            <p><strong>Reference:</strong> ${mockRef}</p>
          </div>
        `;
        break;

      case 'reminder_24h':
      case 'reminder_1h':
        const intervalText = template === 'reminder_24h' ? '24 hours' : '1 hour';
        subject = `[TEST] ⏰ Reminder: Demo Class for ${mockStudent} starts in ${intervalText}! [Ref: ${mockRef}]`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div style="background: #e0f2fe; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: bold; color: #0369a1;">
              🧪 TEST MODE SESSION REMINDER (${intervalText})
            </div>
            <h2>Hello ${mockParent},</h2>
            <p>This is a reminder that your demo class starts in ${intervalText}.</p>
            <p><strong>Time:</strong> ${mockTime}</p>
            <p><a href="${mockMeetLink}">Join Google Meet Link</a></p>
          </div>
        `;
        break;

      case 'ping':
      default:
        subject = `[TEST] ♟️ ChessHub Academy Resend Integration Ping`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <h2>ChessHub Academy — Resend Pipeline Test</h2>
            <p>This is an automated operational ping to verify active delivery through Resend.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Recipient:</strong> ${recipient}</p>
            <p style="color: #059669; font-weight: bold;">✅ Server-side delivery verified.</p>
          </div>
        `;
        break;
    }

    const sendResult = await dispatchResendEmail({
      to: [recipient],
      subject,
      html,
    });

    // Record test dispatch in audit_logs
    try {
      const admin = createSupabaseAdmin();
      await admin.from('audit_logs').insert({
        action: 'TEST_EMAIL_DISPATCHED',
        ip_address: '127.0.0.1',
        details: {
          test_mode: true,
          template,
          recipient,
          provider_message_id: sendResult.id || null,
          status: sendResult.success ? 'ACCEPTED_BY_PROVIDER' : 'FAILED',
          error: sendResult.error || null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('[test-email] Audit log record failed:', auditErr);
    }

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error,
          providerStatus: 'FAILED',
        },
        { status: 502 }
      );
    }

    // Verify delivery status if possible
    let verificationStatus: string | undefined;
    if (sendResult.id) {
      const check = await verifyResendEmailDelivery(sendResult.id);
      if (check.success) {
        verificationStatus = check.status;
      }
    }

    return NextResponse.json({
      success: true,
      providerMessageId: sendResult.id,
      providerStatus: 'ACCEPTED_BY_PROVIDER',
      recipient,
      template,
      verifiedDeliveryStatus: verificationStatus || 'queued',
      message:
        'Test email accepted and queued by Resend provider. Confirmed delivery tracked via Resend API.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal test email error' },
      { status: 500 }
    );
  }
}
