import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getAllCoupons, createAdminCoupon, toggleCouponActive, type CouponDiscountType } from '@/lib/payment/coupons';
import type { PackageId } from '@/constants/PRICING';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const coupons = await getAllCoupons();
    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      code,
      discountType,
      discountValue,
      eligiblePackages,
      maxRedemptions,
      startDate,
      expiresAt,
      description,
    } = body;

    if (!code || !discountType || typeof discountValue !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing required coupon parameters' }, { status: 400 });
    }

    const res = await createAdminCoupon({
      code,
      discountType: discountType as CouponDiscountType,
      discountValue,
      eligiblePackages: (eligiblePackages || []) as PackageId[],
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      startDate: startDate || null,
      expiresAt: expiresAt || null,
      description: description || '',
      createdBy: user.id,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, coupon: res.coupon });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const { code, isActive } = body;

    if (!code || typeof isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const updated = await toggleCouponActive(code, isActive);
    return NextResponse.json({ success: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
