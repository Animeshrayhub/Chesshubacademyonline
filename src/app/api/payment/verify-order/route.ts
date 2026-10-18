import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { fetchCashfreeOrder } from '@/lib/payment/cashfree';
import { grantStudentEntitlement } from '@/lib/payment/entitlements';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: order } = await admin
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Verify status with Cashfree
    const cfOrder = await fetchCashfreeOrder(orderId);
    const isPaid = cfOrder?.order_status === 'PAID' || order.order_status === 'PAID';

    if (isPaid) {
      const grantResult = await grantStudentEntitlement(
        order.student_profile_id || user.id,
        orderId,
        order.package_id,
        order.session_count
      );

      return NextResponse.json({
        success: true,
        orderId,
        orderStatus: 'PAID',
        sessionsGranted: order.session_count,
        alreadyGranted: !grantResult.entitlement,
      });
    }

    return NextResponse.json({
      success: false,
      orderId,
      orderStatus: (cfOrder?.order_status as any) || order.order_status,
      error: 'Order payment has not completed yet',
    });
  } catch (err: any) {
    console.error('[verify-order API error]', err);
    return NextResponse.json({ success: false, error: err?.message || 'Verification error' }, { status: 500 });
  }
}
