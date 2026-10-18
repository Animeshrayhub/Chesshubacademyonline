import { createSupabaseAdmin } from '@/lib/supabase/admin';

export interface PaymentConfirmationEmailParams {
  studentId?: string;
  studentEmail: string;
  studentName: string;
  packageName: string;
  sessions: number;
  amount: number;
  currency: 'INR' | 'USD';
  orderId: string;
}

/**
 * Dispatches post-payment confirmation email and in-app dashboard notification.
 */
export async function sendPaymentConfirmationEmail(
  params: PaymentConfirmationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    studentId,
    studentEmail,
    studentName,
    packageName,
    sessions,
    amount,
    currency,
    orderId,
  } = params;

  const symbol = currency === 'USD' ? '$' : '₹';
  const formattedAmount = `${symbol}${amount.toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN')}`;

  // 1. Dispatch In-App Notification (Always succeeds and populates student bell/feed)
  if (studentId) {
    try {
      const admin = createSupabaseAdmin();
      await admin.from('notifications').insert({
        user_id: studentId,
        title: '🎉 Enrollment Confirmed!',
        message: `Your payment of ${formattedAmount} for ${packageName} was successful. ${sessions} sessions have been added to your coaching balance.`,
        is_read: false,
      });
    } catch (err) {
      console.error('[sendPaymentConfirmationEmail] In-app notification error:', err);
    }
  }

  // 2. Send Transactional Confirmation Email
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'ChessHub Academy <orders@chesshubacademy.online>';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #f59e0b;">ChessHub Academy</h1>
          <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">Coaching Enrollment & Payment Receipt</p>
        </div>
        
        <div style="padding: 32px; color: #1e293b;">
          <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Hello ${studentName},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Thank you for enrolling with ChessHub Academy! Your payment was verified and your coaching sessions have been credited to your student dashboard.
          </p>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Package:</td>
                <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0f172a;">${packageName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Sessions Credited:</td>
                <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #059669;">${sessions} Live 1-on-1 Sessions</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
                <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0f172a;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Order Reference:</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 12px; text-align: right; color: #64748b;">${orderId}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://chesshubacademy.online/dashboard/student" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px;">
              Go to Student Dashboard →
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Our head coach will review your student roadmap and connect with you to confirm your upcoming class schedule. If you have any questions, reach us on WhatsApp at <strong>+91 70086 65245</strong> or reply to <strong>clubchess259@gmail.com</strong>.
          </p>
        </div>

        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © ${new Date().getFullYear()} ChessHub Academy. 100% Online Grandmaster Chess Coaching worldwide.
        </div>
      </div>
    `;

    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [studentEmail],
          subject: `🎉 Payment Confirmed: ${packageName} (${sessions} Sessions) - ChessHub Academy`,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.warn('[sendPaymentConfirmationEmail] Resend API error:', errData);
      }
    } else {
      console.log(`[sendPaymentConfirmationEmail] Email simulated (no RESEND_API_KEY). To: ${studentEmail}, Package: ${packageName}, Order: ${orderId}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[sendPaymentConfirmationEmail] Unexpected email sending error:', err);
    return { success: false, error: err?.message };
  }
}
