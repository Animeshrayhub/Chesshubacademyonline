'use server';

import { revalidatePath } from 'next/cache';
import * as lichessService from '@/lib/lichess';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Syncs and saves Lichess rating history/puzzle scores into a student's profile notes.
 */
export async function syncStudentLichessAction(studentUserId: string, lichessUsername: string) {
  try {
    const res = await lichessService.fetchLichessProfile(lichessUsername);
    if (!res.success) return JSON.parse(JSON.stringify(res));

    const data = res.data;
    const admin = createSupabaseAdmin();

    // Fetch existing profile notes to update/merge Lichess stats
    const { data: profile } = await admin
      .from('student_profiles')
      .select('notes')
      .eq('user_id', studentUserId)
      .maybeSingle();

    let notesObj: any = {};
    if (profile?.notes) {
      try {
        notesObj = JSON.parse(profile.notes);
      } catch (e) {
        notesObj = { text: profile.notes };
      }
    }

    // Embed Lichess data block
    notesObj.lichess = {
      username: data.username,
      ratings: data.ratings,
      gamesCount: data.gamesCount,
      syncedAt: new Date().toISOString(),
    };

    // Update student profile notes with the serialized JSON block
    const { error: updateErr } = await admin
      .from('student_profiles')
      .update({
        notes: JSON.stringify(notesObj),
      })
      .eq('user_id', studentUserId);

    if (updateErr) {
      return { success: false, error: { message: `Failed to update profile notes: ${updateErr.message}` } };
    }

    revalidatePath(`/dashboard/admin/students/${studentUserId}`);
    revalidatePath('/dashboard/admin/students');

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: { message: err.message } };
  }
}
