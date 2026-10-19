import { NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/payment/coupons';
import { getPackageById, isValidPackageId } from '@/constants/PRICING';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = body.code || body.couponCode || body.coupon || '';
    const { packageId } = body;

    if (!packageId || !isValidPackageId(packageId)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid coaching package specified' },
        { status: 400 }
      );
    }

    const pkg = getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { valid: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    const result = await validateCoupon(code || '', packageId, pkg.amount);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Coupon Validation Error]', err);
    return NextResponse.json(
      { valid: false, error: err?.message || 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
