'use server';

import { revalidatePath } from 'next/cache';
import { analyzeGamePgn } from '@/lib/gameReview/aiGameReviewService';
import { saveSavedGame } from '@/lib/games';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function requestGameReviewAction(pgnText: string, userColor: 'white' | 'black' = 'white') {
  try {
    const result = await analyzeGamePgn(pgnText, userColor);

    if (result.success) {
      // Save analysis to database if logged in as student
      const user = await getCurrentUser();
      if (user) {
        const admin = createSupabaseAdmin();
        const { data: sp } = await admin
          .from('student_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (sp) {
          await saveSavedGame(
            sp.id,
            `AI Review - ${result.openingName || 'Chess Game'}`,
            pgnText,
            null
          );
        }
      }
      revalidatePath('/dashboard/student/review-bot');
    }

    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to process AI game review.',
    };
  }
}
