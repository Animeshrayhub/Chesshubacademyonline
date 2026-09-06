'use server';

import { revalidatePath } from 'next/cache';
import * as studentsService from '@/lib/students';

export async function updateStudentProfileAction(studentId: string, data: any) {
  const result = await studentsService.updateStudentProfile(studentId, data);
  if (result.success) {
    revalidatePath(`/dashboard/admin/students/${studentId}`);
    revalidatePath('/dashboard/admin/students');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function transferStudentAction(studentId: string, newCoachId: string) {
  const result = await studentsService.assignCoach(studentId, newCoachId);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath(`/dashboard/admin/students/${studentId}`);
    revalidatePath(`/dashboard/admin/coaches/${newCoachId}`);
  }
  return JSON.parse(JSON.stringify(result));
}

export async function updateMyStudentProfileAction(data: {
  photoUrl?: string | null;
  timezone?: string;
  phone?: string;
}) {
  const result = await studentsService.updateMyStudentProfile(data);
  if (result.success) {
    revalidatePath('/dashboard/student/settings');
    revalidatePath('/dashboard/student/settings/profile');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function getStudentEnrollmentsAction() {
  const result = await studentsService.getStudentEnrollments();
  return JSON.parse(JSON.stringify(result));
}

export async function buyCompanionGearAction(gearId: string, costXp: number) {
  try {
    const { getCurrentUser } = await import('@/lib/supabase/auth');
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { parseStudentStats, serializeStudentStats } = await import('@/lib/students/stats');

    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id, notes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return { success: false, error: 'Student profile not found' };

    const stats = parseStudentStats(profile.notes);
    const unlocked = stats.unlockedGear || ['none'];

    if (unlocked.includes(gearId)) {
      // Already unlocked! Just equip
      stats.equippedGear = gearId;
      const newNotes = serializeStudentStats(profile.notes, stats);
      await admin.from('student_profiles').update({ notes: newNotes }).eq('id', profile.id);
      revalidatePath('/dashboard/student');
      return {
        success: true,
        alreadyOwned: true,
        data: { xp: stats.xp, equippedGear: stats.equippedGear, unlockedGear: stats.unlockedGear },
      };
    }

    if (stats.xp < costXp) {
      return {
        success: false,
        error: `Insufficient XP! You have ${stats.xp} XP, but this gear costs ${costXp} XP. Solve more puzzles or minigames to earn XP!`,
      };
    }

    // Deduct real XP
    stats.xp = Math.max(0, stats.xp - costXp);
    stats.unlockedGear = Array.from(new Set([...unlocked, gearId]));
    stats.equippedGear = gearId;

    const newNotes = serializeStudentStats(profile.notes, stats);
    const { error: updateErr } = await admin
      .from('student_profiles')
      .update({ notes: newNotes })
      .eq('id', profile.id);

    if (updateErr) {
      return { success: false, error: 'Failed to update student profile.' };
    }

    revalidatePath('/dashboard/student');
    return {
      success: true,
      data: {
        xp: stats.xp,
        equippedGear: stats.equippedGear,
        unlockedGear: stats.unlockedGear,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error buying gear' };
  }
}

export async function equipCompanionGearAction(gearId: string) {
  try {
    const { getCurrentUser } = await import('@/lib/supabase/auth');
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { parseStudentStats, serializeStudentStats } = await import('@/lib/students/stats');

    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id, notes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return { success: false, error: 'Student profile not found' };

    const stats = parseStudentStats(profile.notes);
    const unlocked = stats.unlockedGear || ['none'];

    if (gearId !== 'none' && !unlocked.includes(gearId)) {
      return { success: false, error: 'You do not own this gear yet!' };
    }

    stats.equippedGear = gearId;
    const newNotes = serializeStudentStats(profile.notes, stats);
    await admin.from('student_profiles').update({ notes: newNotes }).eq('id', profile.id);

    revalidatePath('/dashboard/student');
    return { success: true, data: { equippedGear: gearId } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to equip gear' };
  }
}

export async function equipCompanionPetAction(petId: string) {
  try {
    const { getCurrentUser } = await import('@/lib/supabase/auth');
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { parseStudentStats, serializeStudentStats } = await import('@/lib/students/stats');

    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id, notes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return { success: false, error: 'Student profile not found' };

    const stats = parseStudentStats(profile.notes);
    stats.equippedPet = petId;
    const newNotes = serializeStudentStats(profile.notes, stats);
    await admin.from('student_profiles').update({ notes: newNotes }).eq('id', profile.id);

    revalidatePath('/dashboard/student');
    return { success: true, data: { equippedPet: petId } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to switch pet' };
  }
}

export async function awardPlaygroundXpAction(xpAmount: number, challengeName: string) {
  try {
    const { getCurrentUser } = await import('@/lib/supabase/auth');
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { parseStudentStats, serializeStudentStats } = await import('@/lib/students/stats');
    const { recordStudentActivity } = await import('@/lib/activity');

    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const safeXp = Math.min(50, Math.max(5, xpAmount)); // safe bounded XP award

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id, notes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return { success: false, error: 'Student profile not found' };

    const stats = parseStudentStats(profile.notes);
    stats.xp += safeXp;

    const newNotes = serializeStudentStats(profile.notes, stats);
    await admin.from('student_profiles').update({ notes: newNotes }).eq('id', profile.id);

    // Record activity
    await recordStudentActivity({
      studentId: user.id,
      activityType: 'PRACTICE',
      durationSeconds: 25,
      result: 'COMPLETED',
      score: safeXp,
      metadata: { challenge: challengeName },
    });

    revalidatePath('/dashboard/student');
    return { success: true, data: { xp: stats.xp, awarded: safeXp } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to award playground XP' };
  }
}

export async function recordDailyLoginAction() {
  try {
    const { getCurrentUser } = await import('@/lib/supabase/auth');
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { calculateAndProtectStreak } = await import('@/lib/puzzles/properties');

    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return { success: false, error: 'Student profile not found' };

    const streakData = await calculateAndProtectStreak(profile.id);
    revalidatePath('/dashboard/student');
    return { success: true, data: streakData };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record daily login' };
  }
}

