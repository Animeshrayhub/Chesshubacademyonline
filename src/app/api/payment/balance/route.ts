import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getStudentSessionBalance } from '@/lib/payment/entitlements';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        totalPurchased: 0,
        totalRemaining: 0,
        activePackagesCount: 0,
        entitlements: [],
      });
    }

    const balanceData = await getStudentSessionBalance(user.id);

    return NextResponse.json({
      success: true,
      ...balanceData,
    });
  } catch (err: any) {
    console.error('[payment balance API error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve session balance' },
      { status: 500 }
    );
  }
}
