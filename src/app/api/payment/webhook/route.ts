import { NextResponse } from 'next/server';
import { verifyCashfreeWebhookSignature } from '@/lib/payment/cashfree';
import { grantStudentEntitlement } from '@/lib/payment/entitlements';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    // Verify webhook signature
    const isValid = verifyCashfreeWebhookSignature(signature, rawBody, timestamp);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
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
        // Record transaction
        await admin.from('payment_transactions').insert({
          order_id: orderId,
          cf_payment_id: String(data?.payment?.cf_payment_id || Date.now()),
          payment_status: 'SUCCESS',
          payment_amount: data?.payment?.payment_amount || order.order_amount,
          payment_currency: data?.payment?.payment_currency || 'INR',
          bank_reference: data?.payment?.bank_reference || null,
          payment_time: data?.payment?.payment_time || new Date().toISOString(),
          raw_payload: payload,
          created_at: new Date().toISOString(),
        });

        // Grant entitlement
        await grantStudentEntitlement(
          order.student_profile_id || order.user_id,
          orderId,
          order.package_id,
          order.session_count
        );
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error('[Cashfree Webhook Error]', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
