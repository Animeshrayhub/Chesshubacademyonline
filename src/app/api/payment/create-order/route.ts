import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getPackageById, isValidPackageId } from '@/constants/PRICING';
import { createCashfreeOrder } from '@/lib/payment/cashfree';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { packageId } = body;

    if (!packageId || !isValidPackageId(packageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coaching package selected' },
        { status: 400 }
      );
    }

    const pkg = getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: 'Coaching package not found' },
        { status: 404 }
      );
    }

    const orderId = `order_ch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Call Cashfree API
    const cashfreeOrder = await createCashfreeOrder({
      order_id: orderId,
      order_amount: pkg.amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id,
        customer_name: `${user.firstName || 'Student'} ${user.lastName || ''}`.trim(),
        customer_email: user.email,
        customer_phone: '9876543210',
      },
      order_note: `Enrollment in ${pkg.name} (${pkg.sessions} Live Sessions)`,
    });

    // Save order in database
    const admin = createSupabaseAdmin();
    await admin.from('payment_orders').insert({
      order_id: orderId,
      user_id: user.id,
      student_profile_id: user.id,
      package_id: pkg.id,
      package_name: pkg.name,
      session_count: pkg.sessions,
      order_amount: pkg.amount,
      order_currency: 'INR',
      payment_session_id: cashfreeOrder.payment_session_id,
      order_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cashfreeOrder.payment_session_id,
      amount: pkg.amount,
      currency: 'INR',
      packageName: pkg.name,
      sessions: pkg.sessions,
    });
  } catch (err: any) {
    console.error('[create-order API Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal payment error' },
      { status: 500 }
    );
  }
}
