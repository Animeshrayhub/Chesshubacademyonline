import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getPackageById, isValidPackageId } from '@/constants/PRICING';
import { createCashfreeOrder } from '@/lib/payment/cashfree';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { validateCoupon } from '@/lib/payment/coupons';

export const dynamic = 'force-dynamic';

function cleanPhone(phone?: string): string {
  if (!phone) return '9876543210';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return '9876543210';
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      packageId,
      payerName,
      studentName,
      parentName,
      phone,
      email,
      notes,
      couponCode,
      policyAccepted,
    } = body;

    // 1. Validate coaching package
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

    // 2. Resolve customer information
    // If authenticated student, prefer verified identity
    const isGuest = !user;
    const resolvedPayerName = (payerName || parentName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Parent/Guardian').trim();
    const resolvedStudentName = (studentName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || resolvedPayerName).trim();
    const resolvedParentName = (parentName || resolvedPayerName).trim();
    const resolvedEmail = (email || user?.email || '').trim().toLowerCase();
    const resolvedPhone = cleanPhone(phone);

    if (!resolvedEmail || !resolvedEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required for receipt and order confirmation.' },
        { status: 400 }
      );
    }

    if (isGuest && (!resolvedStudentName || resolvedStudentName.length < 2)) {
      return NextResponse.json(
        { success: false, error: 'Student full name is required.' },
        { status: 400 }
      );
    }

    // 3. Server-authoritative price & coupon calculation
    const originalAmount = pkg.amount;
    let finalAmount = originalAmount;
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const couponResult = await validateCoupon(couponCode, packageId, originalAmount);
      if (!couponResult.valid) {
        return NextResponse.json(
          { success: false, error: couponResult.error || 'Invalid or expired coupon code' },
          { status: 400 }
        );
      }
      finalAmount = couponResult.finalAmount;
      discountAmount = couponResult.discountAmount;
      appliedCouponCode = couponResult.coupon?.code || couponCode.trim().toUpperCase();
    }

    // 4. Generate unique order ID
    const orderId = `order_ch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 5. Build return and notify URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chesshubacademy.online';
    const returnUrl = `${baseUrl}/payment/status?order_id={order_id}`;
    const notifyUrl = `${baseUrl}/api/payment/webhook`;

    // 6. Create Cashfree Gateway Order
    const customerId = user ? user.id : `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const cashfreeOrder = await createCashfreeOrder({
      order_id: orderId,
      order_amount: finalAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: customerId,
        customer_name: resolvedStudentName || resolvedPayerName,
        customer_email: resolvedEmail,
        customer_phone: resolvedPhone,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: `Enrollment in ${pkg.name} (${pkg.sessions} Live Sessions)${appliedCouponCode ? ` [Coupon: ${appliedCouponCode}]` : ''}`,
    });

    const isProd = process.env.CASHFREE_ENV === 'PRODUCTION';
    const hostedCheckoutUrl = cashfreeOrder.payment_session_id
      ? isProd
        ? `https://payments.cashfree.com/order/#${cashfreeOrder.payment_session_id}`
        : `https://payments-test.cashfree.com/order/#${cashfreeOrder.payment_session_id}`
      : `${baseUrl}/payment/status?order_id=${orderId}`;

    // 7. Save order in database with all customer identification & metadata
    const admin = createSupabaseAdmin();
    
    // Find student profile ID if user is authenticated student
    let studentProfileId: string | null = null;
    if (user) {
      const { data: sp } = await admin
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      studentProfileId = sp?.id || user.id;
    }

    const orderRecord: Record<string, any> = {
      order_id: orderId,
      user_id: user ? user.id : null,
      student_profile_id: studentProfileId,
      package_id: pkg.id,
      package_name: pkg.name,
      session_count: pkg.sessions,
      order_amount: finalAmount,
      order_currency: 'INR',
      payment_session_id: cashfreeOrder.payment_session_id,
      order_status: 'PENDING',
      is_guest: isGuest,
      customer_name: resolvedPayerName,
      customer_email: resolvedEmail,
      customer_phone: resolvedPhone,
      student_name: resolvedStudentName,
      parent_name: resolvedParentName,
      parent_phone: resolvedPhone,
      payment_source: 'CASHFREE',
      policy_terms_accepted: Boolean(policyAccepted ?? true),
      policy_accepted_at: new Date().toISOString(),
      policy_version: 'v1_no_refunds',
      metadata: {
        coupon_code: appliedCouponCode,
        discount_amount: discountAmount,
        original_amount: originalAmount,
        notes: notes || '',
        payer_name: resolvedPayerName,
        is_guest: isGuest,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await admin.from('payment_orders').insert(orderRecord);
    if (insertError) {
      console.error('[create-order DB insert error]', insertError);
      throw new Error(`Database error saving order: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cashfreeOrder.payment_session_id,
      hostedCheckoutUrl,
      amount: finalAmount,
      originalAmount,
      discountAmount,
      couponCode: appliedCouponCode,
      currency: 'INR',
      packageName: pkg.name,
      sessions: pkg.sessions,
      isGuest,
    });
  } catch (err: any) {
    console.error('[create-order API Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal payment error' },
      { status: 500 }
    );
  }
}
