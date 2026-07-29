'use server';

import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentReferralInfo } from '@/lib/referrals/referralService';

export async function getStudentReferralAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = createSupabaseAdmin();
    const { data: sp } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sp) return { success: false, error: 'Student profile not found' };

    const referralData = await getStudentReferralInfo(sp.id, user.firstName || 'Student');
    return { success: true, data: referralData };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch referral info' };
  }
}
