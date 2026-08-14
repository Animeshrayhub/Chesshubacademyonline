import { createSupabaseAdmin } from '../supabase/admin';

export interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  xpEarned: number;
}

/**
 * Generates or retrieves student referral information.
 */
export async function getStudentReferralInfo(studentProfileId: string, studentName: string): Promise<ReferralInfo> {
  const cleanName = studentName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'STUDENT';
  const referralCode = `REF-${cleanName}-${studentProfileId.slice(0, 4).toUpperCase()}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chesshub.academy';
  const referralLink = `${baseUrl}/book-demo?ref=${referralCode}`;

  try {
    const admin = createSupabaseAdmin();
    const { count, data } = await admin
      .from('referrals')
      .select('xp_awarded', { count: 'exact' })
      .eq('referrer_student_id', studentProfileId)
      .eq('status', 'enrolled');

    const totalReferrals = count || 0;
    const xpEarned = data ? data.reduce((sum: number, r: { xp_awarded?: number }) => sum + (r.xp_awarded || 250), 0) : totalReferrals * 250;

    return {
      referralCode,
      referralLink,
      totalReferrals,
      xpEarned,
    };
  } catch {
    return {
      referralCode,
      referralLink,
      totalReferrals: 0,
      xpEarned: 0,
    };
  }
}

