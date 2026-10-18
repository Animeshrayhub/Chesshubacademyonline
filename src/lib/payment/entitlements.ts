import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getPackageById, PackageId } from '@/constants/PRICING';
import type { StudentSessionEntitlementRecord } from '@/types/cashfree';

/**
 * Grants session entitlement to a student upon verified payment.
 */
export async function grantStudentEntitlement(
  studentId: string,
  orderId: string,
  packageId: PackageId,
  sessionCount?: number
): Promise<{ success: boolean; entitlement?: StudentSessionEntitlementRecord; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const pkg = getPackageById(packageId);
    const sessions = sessionCount || pkg?.sessions || 12;
    const packageName = pkg?.name || 'Coaching Package';

    // Verify if entitlement already exists for this order
    const { data: existing } = await admin
      .from('student_session_entitlements')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      return { success: true, entitlement: existing };
    }

    const newEntitlement = {
      student_id: studentId,
      order_id: orderId,
      package_id: packageId,
      package_name: packageName,
      sessions_purchased: sessions,
      sessions_remaining: sessions,
      status: 'ACTIVE',
      granted_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('student_session_entitlements')
      .insert(newEntitlement)
      .select()
      .single();

    if (error) {
      console.error('[grantStudentEntitlement] Error creating entitlement:', error);
      return { success: false, error: error.message };
    }

    // Mark payment order as PAID
    await admin
      .from('payment_orders')
      .update({ order_status: 'PAID', updated_at: new Date().toISOString() })
      .eq('order_id', orderId);

    return { success: true, entitlement: data };
  } catch (err: any) {
    console.error('[grantStudentEntitlement] unexpected error:', err);
    return { success: false, error: err?.message || 'Failed to grant entitlement' };
  }
}

/**
 * Retrieves student session wallet balance and active entitlements.
 */
export async function getStudentSessionBalance(studentId: string): Promise<{
  totalPurchased: number;
  totalRemaining: number;
  activePackagesCount: number;
  entitlements: StudentSessionEntitlementRecord[];
}> {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('student_session_entitlements')
      .select('*')
      .eq('student_id', studentId)
      .order('granted_at', { ascending: false });

    if (error || !data) {
      return {
        totalPurchased: 0,
        totalRemaining: 0,
        activePackagesCount: 0,
        entitlements: [],
      };
    }

    const entitlements = data as StudentSessionEntitlementRecord[];
    const totalPurchased = entitlements.reduce((sum, e) => sum + (e.sessions_purchased || 0), 0);
    const totalRemaining = entitlements.reduce((sum, e) => sum + (e.sessions_remaining || 0), 0);
    const activePackagesCount = entitlements.filter((e) => e.status === 'ACTIVE' && e.sessions_remaining > 0).length;

    return {
      totalPurchased,
      totalRemaining,
      activePackagesCount,
      entitlements,
    };
  } catch (err) {
    console.error('[getStudentSessionBalance] error:', err);
    return {
      totalPurchased: 0,
      totalRemaining: 0,
      activePackagesCount: 0,
      entitlements: [],
    };
  }
}
