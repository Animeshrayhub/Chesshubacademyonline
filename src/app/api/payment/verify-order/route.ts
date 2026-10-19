import { NextResponse } from 'next/server';
import { fetchCashfreeOrder } from '@/lib/payment/cashfree';
import { grantStudentEntitlement } from '@/lib/payment/entitlements';
import { recordCouponRedemption } from '@/lib/payment/coupons';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: order } = await admin
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order reference not found' }, { status: 404 });
    }

    // Verify status directly with Cashfree Payment Gateway
    const cfOrder = await fetchCashfreeOrder(orderId);
    const isPaid = cfOrder?.order_status === 'PAID' || order.order_status === 'PAID';

    if (isPaid) {
      // 1. Mark order as PAID in database if still pending
      if (order.order_status !== 'PAID') {
        await admin
          .from('payment_orders')
          .update({ order_status: 'PAID', updated_at: new Date().toISOString() })
          .eq('order_id', orderId);
      }

      // 2. Record coupon redemption if coupon was applied
      const couponCode = order.metadata?.coupon_code || order.coupon_code;
      if (couponCode) {
        await recordCouponRedemption(couponCode).catch(() => {});
      }

      // 3. Check guest vs authenticated student assignment
      const isUnassignedGuest = Boolean(order.is_guest || !order.student_profile_id);

      if (isUnassignedGuest) {
        // Guest Payment: Verified and stored as PAID but UNASSIGNED
        // Entitlements are NOT granted until authorized admin assignment
        return NextResponse.json({
          success: true,
          orderId,
          orderStatus: 'PAID',
          isGuest: true,
          assigned: false,
          packageName: order.package_name,
          sessions: order.session_count,
          amount: order.order_amount,
          studentName: order.student_name,
          customerEmail: order.customer_email,
          message: 'Payment verified! Your order is safely recorded. Academy staff will assign sessions to your student account.',
        });
      }

      // Authenticated Student: Grant session entitlements immediately
      const grantResult = await grantStudentEntitlement(
        order.student_profile_id,
        orderId,
        order.package_id,
        order.session_count
      );

      return NextResponse.json({
        success: true,
        orderId,
        orderStatus: 'PAID',
        isGuest: false,
        assigned: true,
        packageName: order.package_name,
        sessionsGranted: order.session_count,
        amount: order.order_amount,
        alreadyGranted: !grantResult.entitlement,
      });
    }

    return NextResponse.json({
      success: false,
      orderId,
      orderStatus: (cfOrder?.order_status as any) || order.order_status,
      packageName: order.package_name,
      amount: order.order_amount,
      error: 'Payment has not been completed yet',
    });
  } catch (err: any) {
    console.error('[verify-order API error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Verification error' },
      { status: 500 }
    );
  }
}
