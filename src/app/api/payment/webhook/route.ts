import { NextResponse } from 'next/server';
import { verifyCashfreeWebhookSignature } from '@/lib/payment/cashfree';
import { grantStudentEntitlement } from '@/lib/payment/entitlements';
import { recordCouponRedemption } from '@/lib/payment/coupons';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    // Verify webhook signature securely
    const isValid = verifyCashfreeWebhookSignature(signature, rawBody, timestamp);
    if (!isValid) {
      console.warn('[Cashfree Webhook] Unauthorized request — invalid signature');
      return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const { type, data } = payload;

    if (type === 'PAYMENT_SUCCESS_WEBHOOK' && data?.order?.order_id) {
      const orderId = data.order.order_id;
      const admin = createSupabaseAdmin();

      const { data: order } = await admin
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (order) {
        // 1. Record transaction ledger idempotently
        await admin
          .from('payment_transactions')
          .insert({
            order_id: orderId,
            cf_payment_id: String(data?.payment?.cf_payment_id || Date.now()),
            payment_status: 'SUCCESS',
            payment_amount: data?.payment?.payment_amount || order.order_amount,
            payment_currency: data?.payment?.payment_currency || 'INR',
            bank_reference: data?.payment?.bank_reference || null,
            payment_time: data?.payment?.payment_time || new Date().toISOString(),
            raw_payload: payload,
            created_at: new Date().toISOString(),
          })
          .catch((e: any) => console.error('[Webhook transaction insert notice]', e?.message));

        // 2. Mark order as PAID
        await admin
          .from('payment_orders')
          .update({ order_status: 'PAID', updated_at: new Date().toISOString() })
          .eq('order_id', orderId);

        // 3. Record coupon redemption if applicable
        const couponCode = order.metadata?.coupon_code || order.coupon_code;
        if (couponCode) {
          await recordCouponRedemption(couponCode).catch(() => {});
        }

        // 4. Important guest-payment rule:
        // Guest orders remain UNASSIGNED until an authorized admin links them.
        // Only grant sessions if student_profile_id is verified and linked.
        if (!order.is_guest && order.student_profile_id) {
          await grantStudentEntitlement(
            order.student_profile_id,
            orderId,
            order.package_id,
            order.session_count
          );
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error('[Cashfree Webhook Error]', err?.message);
    return NextResponse.json({ success: false, error: 'Internal webhook error' }, { status: 500 });
  }
}
