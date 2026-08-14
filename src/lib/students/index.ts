import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  InternalServerError,
  type Result,
} from '../errors';
import type { AdminStudentRow, DbStudentProfile } from '@/types/dashboard';
import { DB_TO_APP_TRACK } from '../homework';
import { getStudentPuzzleStats } from '../puzzles/results';
import { calculateAndProtectStreak } from '../puzzles/properties';

// ─── Internal Helper: Resolve profile ID from user ID ────────────────────────

async function getStudentProfileId(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string
): Promise<string | null> {
  if (!userId) return null;
  // 1. Try by user_id
  const { data: byUserId } = await admin
    .from('student_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (byUserId?.id) return byUserId.id;

  // 2. Try by id (in case userId passed was already student_profiles.id)
  const { data: byId } = await admin
    .from('student_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (byId?.id) return byId.id;

  // 3. Auto-create student_profile if user exists in users table
  const { data: userRec } = await admin
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (userRec) {
    const { data: created, error: createErr } = await admin
      .from('student_profiles')
      .insert({ user_id: userRec.id, level: 'BEGINNER' })
      .select('id')
      .single();

    if (created?.id) return created.id;
    if (createErr) console.error('Auto-create student profile error:', createErr);
  }

  return null;
}

async function getCoachProfileId(
  admin: ReturnType<typeof createSupabaseAdmin>,
  coachUserId: string
): Promise<string | null> {
  if (!coachUserId) return null;
  // 1. Try by user_id
  const { data: byUserId } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('user_id', coachUserId)
    .maybeSingle();

  if (byUserId?.id) return byUserId.id;

  // 2. Try by id (in case coachUserId passed was already coach_profiles.id)
  const { data: byId } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('id', coachUserId)
    .maybeSingle();

  if (byId?.id) return byId.id;

  // 3. Auto-create coach_profile if user exists in users table
  const { data: userRec } = await admin
    .from('users')
    .select('id')
    .eq('id', coachUserId)
    .maybeSingle();

  if (userRec) {
    const { data: created, error: createErr } = await admin
      .from('coach_profiles')
      .insert({ user_id: userRec.id, title: 'Grandmaster / Coach' })
      .select('id')
      .single();

    if (created?.id) return created.id;
    if (createErr) console.error('Auto-create coach profile error:', createErr);
  }

  return null;
}

/**
 * Lists all active students with their profiles and assigned coach.
 */
export async function listStudents(): Promise<Result<AdminStudentRow[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('id, username, email, first_name, last_name, role, is_active, created_at, updated_at, archived_at')
      .eq('role', 'STUDENT')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (usersErr) {
      return { success: false, error: new DatabaseError('Failed to list students', usersErr) };
    }

    const studentUsers = users ?? [];
    if (studentUsers.length === 0) return { success: true, data: [] };

    const studentIds = studentUsers.map((u: any) => u.id);

    // Fetch profiles (keyed by user_id)
    const { data: profiles } = await admin
      .from('student_profiles')
      .select('*')
      .in('user_id', studentIds);

    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
    const profileIdToUserId = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.user_id]));

    // Fetch assignments using profile IDs
    const profileIds = (profiles ?? []).map((p: any) => p.id);
    let coachMap = new Map<string, { id: string; first_name: string; last_name: string }>();

    if (profileIds.length > 0) {
      const { data: assignments } = await admin
        .from('coach_student_assignments')
        .select('student_id, coach_id')
        .in('student_id', profileIds)
        .is('archived_at', null);

      // Fetch coach profiles to get coach user_id
      const coachProfileIds = [...new Set((assignments ?? []).map((a: any) => a.coach_id))];
      const assignmentMap = new Map<string, string>(); // student_profile_id → coach_profile_id

      for (const a of assignments ?? []) {
        assignmentMap.set(a.student_id, a.coach_id);
      }

      if (coachProfileIds.length > 0) {
        const { data: coachProfiles } = await admin
          .from('coach_profiles')
          .select('id, user_id')
          .in('id', coachProfileIds);

        const coachProfileToUserId = new Map<string, string>((coachProfiles ?? []).map((cp: any) => [cp.id, cp.user_id]));
        const coachUserIds = [...new Set((coachProfiles ?? []).map((cp: any) => cp.user_id))];

        if (coachUserIds.length > 0) {
          const { data: coachUsers } = await admin
            .from('users')
            .select('id, first_name, last_name')
            .in('id', coachUserIds);

          const coachUserMap = new Map<string, any>((coachUsers ?? []).map((c: any) => [c.id, c]));

          // Build studentProfileId → coach user object
          for (const [studentProfileId, coachProfileId] of assignmentMap.entries()) {
            const coachUserId = coachProfileToUserId.get(coachProfileId);
            if (coachUserId) {
              const coachUser = coachUserMap.get(coachUserId);
              if (coachUser) {
                coachMap.set(studentProfileId, coachUser);
              }
            }
          }
        }
      }

      const rows: AdminStudentRow[] = studentUsers.map((u: any) => {
        const profile = profileMap.get(u.id) ?? null;
        const assignedCoach = profile ? (coachMap.get(profile.id) ?? null) : null;
        return {
          ...u,
          role: u.role as 'STUDENT',
          profile,
          assigned_coach: assignedCoach,
        };
      });

      return { success: true, data: rows };
    }

    const rows: AdminStudentRow[] = studentUsers.map((u: any) => ({
      ...u,
      role: u.role as 'STUDENT',
      profile: profileMap.get(u.id) ?? null,
      assigned_coach: null,
    }));

    return { success: true, data: rows };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns full details for a specific student.
 */
export async function getStudentDetails(
  studentId: string
): Promise<Result<AdminStudentRow>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: user, error: userErr } = await admin
      .from('users')
      .select('*')
      .eq('id', studentId)
      .eq('role', 'STUDENT')
      .single();

    if (userErr || !user) {
      return { success: false, error: new NotFoundError('Student not found') };
    }

    const { data: profile } = await admin
      .from('student_profiles')
      .select('*')
      .eq('user_id', studentId)
      .maybeSingle();

    let assignedCoach = null;
    const studentProfileIds = [profile?.id, studentId].filter(Boolean) as string[];

    const { data: assignment } = await admin
      .from('coach_student_assignments')
      .select('coach_id')
      .in('student_id', studentProfileIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assignment?.coach_id) {
      const { data: coachByUser } = await admin
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', assignment.coach_id)
        .maybeSingle();

      if (coachByUser) {
        assignedCoach = coachByUser;
      } else {
        const { data: coachProfile } = await admin
          .from('coach_profiles')
          .select('user_id')
          .eq('id', assignment.coach_id)
          .maybeSingle();

        if (coachProfile?.user_id) {
          const { data: coach } = await admin
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', coachProfile.user_id)
            .maybeSingle();
          assignedCoach = coach ?? null;
        }
      }
    }

    return {
      success: true,
      data: {
        ...user,
        role: user.role as 'STUDENT',
        profile: profile ?? null,
        assigned_coach: assignedCoach,
      },
    };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Updates a student's extended profile.
 */
export async function updateStudentProfile(
  studentId: string,
  data: Partial<Pick<DbStudentProfile, 'age' | 'level' | 'parent_name' | 'parent_whatsapp' | 'notes'>>
): Promise<Result<DbStudentProfile>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: updated, error } = await admin
      .from('student_profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('user_id', studentId)
      .select()
      .single();

    if (error || !updated) {
      return { success: false, error: new DatabaseError('Failed to update student profile', error) };
    }

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}


/**
 * Assigns a coach to a student (creates assignment record using profile IDs).
 */
export async function assignCoach(
  studentUserId: string,
  coachUserId: string
): Promise<Result<{ studentId: string; coachId: string }>> {
  try {
    const admin = createSupabaseAdmin();

    // Resolve profile IDs
    const studentProfileId = (await getStudentProfileId(admin, studentUserId)) || studentUserId;
    const coachProfileId = (await getCoachProfileId(admin, coachUserId)) || coachUserId;

    // Delete any existing assignments for this student
    await admin
      .from('coach_student_assignments')
      .delete()
      .eq('student_id', studentProfileId);

    if (studentUserId !== studentProfileId) {
      await admin
        .from('coach_student_assignments')
        .delete()
        .eq('student_id', studentUserId);
    }

    // Create new assignment
    const { error: insertErr } = await admin
      .from('coach_student_assignments')
      .insert({ coach_id: coachProfileId, student_id: studentProfileId });

    if (insertErr) {
      // 23505 is unique constraint violation (already assigned)
      if (insertErr.code === '23505') {
        return { success: true, data: { studentId: studentUserId, coachId: coachUserId } };
      }

      console.warn('Initial profile-based assignment failed, trying fallback insertion:', insertErr.message);
      // Fallback: try inserting with user IDs directly
      const { error: fallbackErr } = await admin
        .from('coach_student_assignments')
        .insert({ coach_id: coachUserId, student_id: studentUserId });

      if (fallbackErr && fallbackErr.code !== '23505') {
        return { success: false, error: new DatabaseError(`Assignment failed: ${fallbackErr.message}`, fallbackErr) };
      }
    }

    return { success: true, data: { studentId: studentUserId, coachId: coachUserId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Removes a student's coach assignment.
 */
export async function removeCoachAssignment(
  studentUserId: string
): Promise<Result<{ studentId: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const studentProfileId = await getStudentProfileId(admin, studentUserId);
    if (!studentProfileId) {
      return { success: false, error: new NotFoundError('Student profile not found') };
    }

    const { error } = await admin
      .from('coach_student_assignments')
      .delete()
      .eq('student_id', studentProfileId);

    if (error) {
      return { success: false, error: new DatabaseError('Failed to remove coach assignment', error) };
    }

    return { success: true, data: { studentId: studentUserId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

// ─── Student Dashboard Operations ──────────────────────────────────────────────

import { assertStudent } from '../permissions';

/**
 * Fetches dashboard KPIs for the currently authenticated student.
 */
export async function getStudentDashboardStats(): Promise<Result<{
  completedHomework: number;
  classesToday: number;
  activeAssignments: number;
  certificates: number;
  completedClasses: number;
  totalEnrolledClasses: number;
  attendanceRate: number;
  level: string;
  lichess: {

    username: string;
    ratings: {
      blitz: number;
      rapid: number;
      classical: number;
      bullet: number;
      puzzle: number;
    };
    gamesCount: number;
    syncedAt: string;
  } | null;
  nextClass: string;
  puzzleStats: {
    totalSolved: number;
    solveRate: number;
    streak: number;
    averageAccuracy: number;
  } | null;
}>> {
  try {
    const user = await assertStudent();
    const admin = createSupabaseAdmin();

    let { data: studentProfile } = await admin
      .from('student_profiles')
      .select('id, level, notes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!studentProfile) {
      const { data: newProfile } = await admin
        .from('student_profiles')
        .insert({ user_id: user.id, level: 'Intermediate' })
        .select('id, level, notes')
        .single();
      studentProfile = newProfile;
    }

    if (studentProfile) {
      // Ensure student has enrollments in real classes table
      const { data: existingEnrollments } = await admin
        .from('class_students')
        .select('class_id')
        .eq('student_id', studentProfile.id);

      if (!existingEnrollments || existingEnrollments.length === 0) {
        const { data: allDBClasses } = await admin
          .from('classes')
          .select('id')
          .is('archived_at', null)
          .limit(10);

        if (allDBClasses && allDBClasses.length > 0) {
          const enrollmentsToInsert = allDBClasses.map((c: any) => ({
            class_id: c.id,
            student_id: studentProfile.id,
            first_joined_at: new Date().toISOString(),
          }));
          await admin.from('class_students').upsert(enrollmentsToInsert, { onConflict: 'class_id,student_id' });
        }
      }
    }


    // Extract Lichess JSON if available
    let lichess = null;
    if (studentProfile.notes) {
      try {
        const parsed = JSON.parse(studentProfile.notes);
        if (parsed.lichess) {
          lichess = parsed.lichess;
        }
      } catch (e) {}
    }

    const studentProfileId = studentProfile.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch classes enrolled in for today
    const { data: enrollments } = await admin
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentProfileId)
      .is('archived_at', null);

    const classIds = (enrollments ?? []).map((e: any) => e.class_id);

    let classesToday = 0;
    let nextClassStr = 'None';
    if (classIds.length > 0) {
      const nowStr = new Date().toISOString();
      const [
        { count },
        { data: nextClasses }
      ] = await Promise.all([
        admin.from('classes').select('*', { count: 'exact', head: true }).in('id', classIds).gte('scheduled_start', `${todayStr}T00:00:00Z`).lte('scheduled_start', `${todayStr}T23:59:59Z`).is('archived_at', null),
        admin.from('classes').select('scheduled_start').in('id', classIds).gt('scheduled_start', nowStr).is('archived_at', null).order('scheduled_start', { ascending: true }).limit(1)
      ]);
      classesToday = count ?? 0;

      if (nextClasses && nextClasses[0]) {
        const nextDate = new Date(nextClasses[0].scheduled_start);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const timeStr = nextDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        if (nextDate.toDateString() === today.toDateString()) {
          nextClassStr = `Today, ${timeStr}`;
        } else if (nextDate.toDateString() === tomorrow.toDateString()) {
          nextClassStr = `Tomorrow, ${timeStr}`;
        } else {
          const dateStr = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          nextClassStr = `${dateStr}, ${timeStr}`;
        }
      }
    }

    const [
      { count: completedHomework },
      { count: activeAssignments },
      { count: certificates },
      { count: completedClassesCount },
      { count: totalEnrolledClassesCount },
      puzzleStatsRes,
      streakData,
    ] = await Promise.all([
      admin.from('homework_assignments').select('*', { count: 'exact', head: true }).eq('student_id', studentProfileId).eq('status', 'reviewed'),
      admin.from('homework_assignments').select('*', { count: 'exact', head: true }).eq('student_id', studentProfileId).in('status', ['assigned', 'submitted']),
      admin.from('certificates').select('*', { count: 'exact', head: true }).eq('student_id', user.id),
      admin.from('class_students').select('*', { count: 'exact', head: true }).eq('student_id', studentProfileId).not('first_joined_at', 'is', null),
      admin.from('class_students').select('*', { count: 'exact', head: true }).eq('student_id', studentProfileId),
      getStudentPuzzleStats(studentProfileId),
      calculateAndProtectStreak(studentProfileId),
    ]);

    const pStats = puzzleStatsRes.success && puzzleStatsRes.data ? puzzleStatsRes.data : null;
    const completedClasses = completedClassesCount ?? 0;
    const totalEnrolled = totalEnrolledClassesCount ?? 0;
    const attendanceRate = totalEnrolled > 0 ? Math.round((completedClasses / totalEnrolled) * 100) : 100;

    return {
      success: true,
      data: {
        completedHomework: completedHomework ?? 0,
        classesToday,
        activeAssignments: activeAssignments ?? 0,
        certificates: certificates ?? 0,
        completedClasses,
        totalEnrolledClasses: totalEnrolled,
        attendanceRate,
        level: studentProfile.level || 'Beginner',
        lichess,
        nextClass: nextClassStr,
        puzzleStats: pStats ? {
          totalSolved: pStats.totalSolved,
          solveRate: pStats.solveRate,
          streak: streakData.streak,
          averageAccuracy: pStats.averageAccuracy,
        } : null,
      },
    };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns list of scheduled classes the active student is enrolled in.
 */
export async function getStudentClasses(): Promise<Result<any[]>> {
  try {
    const user = await assertStudent();
    const admin = createSupabaseAdmin();

    const studentProfileId = await getStudentProfileId(admin, user.id);
    if (!studentProfileId) return { success: true, data: [] };

    const { data: enrollments } = await admin
      .from('class_students')
      .select('class_id, first_joined_at')
      .eq('student_id', studentProfileId)
      .is('archived_at', null);

    const enrollmentMap = new Map<string, any>((enrollments || []).map((e: any) => [e.class_id, e]));
    let classIds = (enrollments || []).map((e: any) => e.class_id).filter(Boolean);

    // Also check for classes by assigned coaches in coach_student_assignments
    const studentProfileIds = Array.from(new Set([studentProfileId, user.id])).filter(Boolean);
    const { data: coachAssignments } = await admin
      .from('coach_student_assignments')
      .select('coach_id')
      .in('student_id', studentProfileIds);

    const assignedCoachIds = (coachAssignments || []).map((a: any) => a.coach_id).filter(Boolean);

    let query = admin.from('classes').select('*').is('archived_at', null);

    if (classIds.length > 0 && assignedCoachIds.length > 0) {
      query = query.or(`id.in.(${classIds.join(',')}),coach_id.in.(${assignedCoachIds.join(',')})`);
    } else if (classIds.length > 0) {
      query = query.in('id', classIds);
    } else if (assignedCoachIds.length > 0) {
      query = query.in('coach_id', assignedCoachIds);
    } else {
      // Fallback: Return all non-archived classes so student can view upcoming/live academy classes
      query = query;
    }

    const { data: classes, error: cErr } = await query.order('scheduled_start', { ascending: true });

    if (cErr || !classes) {
      return { success: false, error: new DatabaseError('Failed to fetch student classes', cErr) };
    }

    if (classes.length === 0) return { success: true, data: [] };

    // Resolve coach names
    const rawCoachIds = [...new Set(classes.map((c: any) => c.coach_id))].filter(Boolean);
    const { data: coachProfiles } = await admin
      .from('coach_profiles')
      .select('id, user_id')
      .in('id', rawCoachIds);

    const coachProfileToUserId = new Map<string, string>((coachProfiles ?? []).map((cp: any) => [cp.id, cp.user_id]));
    const coachUserIds = Array.from(
      new Set([
        ...rawCoachIds,
        ...(coachProfiles ?? []).map((cp: any) => cp.user_id),
      ])
    ).filter(Boolean);

    let coachUserMap = new Map<string, { first_name: string; last_name: string }>();
    if (coachUserIds.length > 0) {
      const { data: coachUsers } = await admin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', coachUserIds);
      coachUserMap = new Map<string, any>((coachUsers ?? []).map((u: any) => [u.id, { first_name: u.first_name, last_name: u.last_name }]));
    }

    const result = classes.map((c: any) => {
      const coachUserId = coachProfileToUserId.get(c.coach_id) || c.coach_id;
      const coachUser = coachUserMap.get(coachUserId);
      const enr = enrollmentMap.get(c.id);
      const wasPresent = !!enr?.first_joined_at || c.status === 'COMPLETED';

      return {
        ...c,
        schedule: c.scheduled_start,
        coachName: coachUser ? `${coachUser.first_name} ${coachUser.last_name}` : 'FIDE Instructor',
        firstJoinedAt: enr?.first_joined_at || null,
        wasPresent,
      };
    });


    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns list of homework assignments assigned to the active student.
 */
export async function getStudentHomework(): Promise<Result<any[]>> {
  try {
    const user = await assertStudent();
    const admin = createSupabaseAdmin();

    const studentProfileId = await getStudentProfileId(admin, user.id);
    if (!studentProfileId) return { success: true, data: [] };

    const { data: directAssignments } = await admin
      .from('homework_assignments')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('assigned_at', { ascending: false });

    const { data: allChapters } = await admin
      .from('homework_chapters')
      .select('id, title, chapter_number, workbook_id, pgn_data, puzzle_images, created_at')
      .order('chapter_number', { ascending: true });

    if (!allChapters || allChapters.length === 0) {
      return { success: true, data: [] };
    }

    const assignedChapterIds = new Set((directAssignments ?? []).map((a: any) => a.chapter_id));

    // Combine direct assignments with synthetic assignments for any unassigned chapters
    const combinedAssignments = [...(directAssignments ?? [])];

    for (const ch of allChapters) {
      if (!assignedChapterIds.has(ch.id)) {
        combinedAssignments.push({
          id: `auto-asgn-${studentProfileId}-${ch.id}`,
          chapter_id: ch.id,
          student_id: studentProfileId,
          coach_id: null,
          assigned_at: ch.created_at || new Date().toISOString(),
          status: 'assigned',
          unlocked: true,
        });
      }
    }

    const chapterIds = combinedAssignments.map((a: any) => a.chapter_id);
    const assignmentIds = combinedAssignments.map((a: any) => a.id);

    const chapterMap = new Map<string, any>((allChapters ?? []).map((ch: any) => [ch.id, ch]));
    const workbookIds = [...new Set((allChapters ?? []).map((ch: any) => ch.workbook_id))];

    let workbookMap = new Map<string, { title: string; track: string; pdf_storage_path: string | null }>();
    if (workbookIds.length > 0) {
      const { data: workbooks } = await admin
        .from('homework_workbooks')
        .select('id, title, track, pdf_storage_path')
        .in('id', workbookIds);
      workbookMap = new Map<string, any>((workbooks ?? []).map((w: any) => [
        w.id,
        {
          title: w.title,
          track: DB_TO_APP_TRACK[w.track as keyof typeof DB_TO_APP_TRACK] || 'BEGINNER',
          pdf_storage_path: w.pdf_storage_path
        }
      ]));
    }

    // Fetch submissions
    const { data: submissions } = await admin
      .from('homework_submissions')
      .select('*')
      .in('assignment_id', assignmentIds);

    const submissionMap = new Map<string, any>((submissions ?? []).map((s: any) => [s.assignment_id, s]));

    const result = combinedAssignments.map((a: any) => {
      const sub = submissionMap.get(a.id) || null;
      const chapter = chapterMap.get(a.chapter_id);
      const workbook = chapter ? workbookMap.get(chapter.workbook_id) : null;

      return {
        id: a.id,
        chapterId: a.chapter_id,
        workbookTitle: workbook?.title || 'Tactics Workbook',
        track: workbook?.track || 'BEGINNER',
        pdfStoragePath: workbook?.pdf_storage_path || null,
        chapterTitle: chapter ? `${chapter.chapter_number}. ${chapter.title}` : 'Chapter Homework',
        pgnData: chapter?.pgn_data || null,
        puzzleImages: chapter?.puzzle_images || [],
        assignedAt: a.assigned_at,
        status: a.status,
        submission: sub ? {
          id: sub.id,
          answers: sub.answers,
          pdfSubmissionPath: sub.pdf_submission_path,
          submittedAt: sub.submitted_at,
          gradeScore: sub.grade_score,
          coachFeedback: sub.coach_feedback,
        } : null,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns class recordings for the student.
 */
export async function getStudentClassRecordings(): Promise<Result<any[]>> {
  try {
    const user = await assertStudent();
    const admin = createSupabaseAdmin();

    const studentProfileId = await getStudentProfileId(admin, user.id);
    if (!studentProfileId) return { success: true, data: [] };

    // Get coach classes
    const { data: enrollments } = await admin
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentProfileId)
      .is('archived_at', null);

    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: [] };
    }

    const classIds = enrollments.map((e: any) => e.class_id);

    const { data: classes } = await admin
      .from('classes')
      .select('id, scheduled_start, class_type')
      .in('id', classIds)
      .is('archived_at', null);

    if (!classes || classes.length === 0) {
      return { success: true, data: [] };
    }

    // Get recordings
    const { data: recordings, error: rErr } = await admin
      .from('class_recordings')
      .select('*')
      .in('class_id', classIds)
      .is('archived_at', null);

    if (rErr || !recordings) {
      return { success: false, error: new DatabaseError('Failed to fetch class recordings', rErr) };
    }

    const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]));

    const result = recordings.map((rec: any) => {
      const cls = classMap.get(rec.class_id);
      return {
        id: rec.id,
        classId: rec.class_id,
        recordingUrl: rec.recording_url,
        recordingSource: rec.recording_source,
        recordedDate: rec.recorded_date,
        durationSeconds: rec.duration_seconds,
        classType: cls ? cls.class_type : 'GROUP',
        schedule: cls ? cls.scheduled_start : rec.created_at,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Retrieves the currently logged-in student's combined profile details.
 */
export async function getMyStudentProfile(): Promise<Result<{
  id: string;
  userId: string;
  age: number;
  level: string;
  parentName: string;
  parentWhatsapp: string;
  joinedDate: string;
  notes: string | null;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  avatarUrl: string;
}>> {
  try {
    const studentUser = await assertStudent();
    const admin = createSupabaseAdmin();

    const { data: userRecord, error: userError } = await admin
      .from('users')
      .select('id, email, first_name, last_name, timezone')
      .eq('id', studentUser.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: new NotFoundError('Student user record not found') };
    }

    const { data: profileRecord, error: profileError } = await admin
      .from('student_profiles')
      .select('*')
      .eq('user_id', studentUser.id)
      .single();

    if (profileError || !profileRecord) {
      return { success: false, error: new NotFoundError('Student profile record not found') };
    }

    // Fetch avatar url from auth metadata
    const { data: authUser } = await admin.auth.admin.getUserById(studentUser.id);
    const avatarUrl = authUser?.user?.user_metadata?.avatar_url || '';

    return {
      success: true,
      data: {
        id: profileRecord.id,
        userId: profileRecord.user_id,
        age: profileRecord.age,
        level: profileRecord.level,
        parentName: profileRecord.parent_name,
        parentWhatsapp: profileRecord.parent_whatsapp,
        joinedDate: profileRecord.joined_date,
        notes: profileRecord.notes,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        timezone: userRecord.timezone || 'UTC',
        avatarUrl,
      },
    };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Allows a student to update their own editable profile fields: Photo, Timezone, and Phone.
 */
export async function updateMyStudentProfile(data: {
  photoUrl?: string | null;
  timezone?: string;
  phone?: string;
}): Promise<Result<void>> {
  try {
    const studentUser = await assertStudent();
    const admin = createSupabaseAdmin();

    // 1. Update public.users timezone
    if (data.timezone !== undefined) {
      const { error: dbError } = await admin
        .from('users')
        .update({ timezone: data.timezone, updated_at: new Date().toISOString() })
        .eq('id', studentUser.id);

      if (dbError) {
        return { success: false, error: new DatabaseError('Failed to update timezone in database', dbError) };
      }
    }

    // 2. Fetch existing profile notes to preserve/update serialized parameters
    const { data: existingProfile } = await admin
      .from('student_profiles')
      .select('notes, parent_whatsapp')
      .eq('user_id', studentUser.id)
      .maybeSingle();

    let existingNotesText = '';
    let fideRatingVal = null;
    let countryVal = null;
    let emergencyContactVal = null;
    let lichessUsernameVal = null;

    if (existingProfile?.notes) {
      try {
        const parsed = JSON.parse(existingProfile.notes);
        existingNotesText = parsed.text || '';
        fideRatingVal = parsed.fideRating || null;
        countryVal = parsed.country || null;
        emergencyContactVal = parsed.emergencyContact || null;
        lichessUsernameVal = parsed.lichessUsername || null;
      } catch (e) {
        existingNotesText = existingProfile.notes;
      }
    }

    // Update student_profiles parent_whatsapp and notes
    const studentUpdates: any = { updated_at: new Date().toISOString() };
    if (data.phone !== undefined) {
      studentUpdates.parent_whatsapp = data.phone;
    }

    // Re-serialize student notes preserving other parameters but updating phone if we track it there
    studentUpdates.notes = JSON.stringify({
      text: existingNotesText,
      fideRating: fideRatingVal,
      country: countryVal,
      emergencyContact: emergencyContactVal,
      lichessUsername: lichessUsernameVal,
      phone: data.phone !== undefined ? data.phone : undefined,
    });

    const { error: spError } = await admin
      .from('student_profiles')
      .update(studentUpdates)
      .eq('user_id', studentUser.id);

    if (spError) {
      return { success: false, error: new DatabaseError('Failed to update student profile info', spError) };
    }

    // 3. Update Auth user metadata
    const authUpdates: any = {
      user_metadata: {},
    };
    if (data.photoUrl !== undefined) authUpdates.user_metadata.avatar_url = data.photoUrl;
    if (data.timezone !== undefined) authUpdates.user_metadata.timezone = data.timezone;

    const { error: authError } = await admin.auth.admin.updateUserById(studentUser.id, authUpdates);
    if (authError) {
      return { success: false, error: new DatabaseError('Failed to sync auth user metadata', authError) };
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns list of course enrollments and syllabus for the student.
 */
export async function getStudentEnrollments(): Promise<Result<any[]>> {
  try {
    const user = await assertStudent();
    const admin = createSupabaseAdmin();

    const studentProfileId = await getStudentProfileId(admin, user.id);
    if (!studentProfileId) return { success: true, data: [] };

    // Fetch enrollments and all workbooks
    const [
      { data: enrollments },
      { data: allWorkbooks }
    ] = await Promise.all([
      admin.from('lms_course_enrollments').select('*').eq('student_id', studentProfileId),
      admin.from('homework_workbooks').select('id, title, track, description')
    ]);

    const enrolledCourseIds = new Set((enrollments ?? []).map((e: any) => e.course_id));
    const result: any[] = [];

    // Add existing explicit enrollments
    for (const enroll of enrollments ?? []) {
      const course = (allWorkbooks ?? []).find((w: any) => w.id === enroll.course_id);
      if (course) {
        result.push({
          id: enroll.id,
          courseId: course.id,
          courseTitle: course.title,
          track: DB_TO_APP_TRACK[course.track as keyof typeof DB_TO_APP_TRACK] || 'BEGINNER',
          description: course.description,
          currentChapterId: enroll.current_chapter_id,
          enrolledAt: enroll.enrolled_at,
          completedAt: enroll.completed_at,
        });
      }
    }

    // Auto-include any remaining workbooks so students have full access to syllabus & chapters
    for (const wb of allWorkbooks ?? []) {
      if (!enrolledCourseIds.has(wb.id)) {
        result.push({
          id: `auto-enroll-${wb.id}`,
          courseId: wb.id,
          courseTitle: wb.title,
          track: DB_TO_APP_TRACK[wb.track as keyof typeof DB_TO_APP_TRACK] || 'BEGINNER',
          description: wb.description,
          currentChapterId: null,
          enrolledAt: new Date().toISOString(),
          completedAt: null,
        });
      }
    }

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}
