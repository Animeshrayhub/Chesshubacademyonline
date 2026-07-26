import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  InternalServerError,
  type Result,
} from '../errors';
import type { AdminCoachRow, DbCoachProfile } from '@/types/dashboard';

/**
 * Lists all active coaches with their profiles and assigned student counts.
 * Uses coach_profiles.id for the FK join to coach_student_assignments.
 */
export async function listCoaches(): Promise<Result<AdminCoachRow[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // Fetch all coach users
    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('id, username, email, first_name, last_name, role, is_active, created_at, updated_at, archived_at')
      .eq('role', 'COACH')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (usersErr) {
      return { success: false, error: new DatabaseError('Failed to list coaches', usersErr) };
    }

    const coachUsers = users ?? [];
    if (coachUsers.length === 0) return { success: true, data: [] };

    const coachUserIds = coachUsers.map((u: any) => u.id);

    // Fetch profiles (keyed by user_id)
    const { data: profiles } = await admin
      .from('coach_profiles')
      .select('*')
      .in('user_id', coachUserIds);

    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));

    // Fetch assignment counts using coach_profiles.id (not user id)
    const profileIds = (profiles ?? []).map((p: any) => p.id);
    const countMap = new Map<string, number>(); // coach_profiles.id → count

    if (profileIds.length > 0) {
      const { data: assignments } = await admin
        .from('coach_student_assignments')
        .select('coach_id')
        .in('coach_id', profileIds)
        .is('archived_at', null);

      for (const a of assignments ?? []) {
        countMap.set(a.coach_id, (countMap.get(a.coach_id) ?? 0) + 1);
      }
    }

    const rows: AdminCoachRow[] = coachUsers.map((u: any) => {
      const profile = profileMap.get(u.id) ?? null;
      const studentCount = profile ? (countMap.get(profile.id) ?? 0) : 0;
      return {
        ...u,
        role: u.role as 'COACH',
        profile,
        assigned_student_count: studentCount,
      };
    });

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
 * Returns full details for a specific coach, including their assigned students.
 */
export async function getCoachDetails(
  coachUserId: string
): Promise<Result<AdminCoachRow & { students: Array<{ id: string; first_name: string; last_name: string; email: string }> }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: user, error: userErr } = await admin
      .from('users')
      .select('*')
      .eq('id', coachUserId)
      .eq('role', 'COACH')
      .single();

    if (userErr || !user) {
      return { success: false, error: new NotFoundError('Coach not found') };
    }

    const { data: profile } = await admin
      .from('coach_profiles')
      .select('*')
      .eq('user_id', coachUserId)
      .maybeSingle();

    let students: Array<{ id: string; first_name: string; last_name: string; email: string }> = [];

    if (profile?.id) {
      // Assignments use coach_profiles.id
      const { data: assignments } = await admin
        .from('coach_student_assignments')
        .select('student_id')
        .eq('coach_id', profile.id)
        .is('archived_at', null);

      const studentProfileIds = (assignments ?? []).map((a: any) => a.student_id);

      if (studentProfileIds.length > 0) {
        // Resolve student_profiles → user_ids
        const { data: studentProfiles } = await admin
          .from('student_profiles')
          .select('id, user_id')
          .in('id', studentProfileIds);

        const studentUserIds = (studentProfiles ?? []).map((sp: any) => sp.user_id);

        if (studentUserIds.length > 0) {
          const { data: studentUsers } = await admin
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', studentUserIds);
          students = studentUsers ?? [];
        }
      }
    }

    return {
      success: true,
      data: {
        ...user,
        role: user.role as 'COACH',
        profile: profile ?? null,
        assigned_student_count: students.length,
        students,
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
 * Updates a coach's extended profile.
 */
export async function updateCoachProfile(
  coachUserId: string,
  data: Partial<Pick<DbCoachProfile, 'title' | 'photo_url' | 'whatsapp' | 'languages' | 'experience_years' | 'bio'>>
): Promise<Result<DbCoachProfile>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data: updated, error } = await admin
      .from('coach_profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('user_id', coachUserId)
      .select()
      .single();

    if (error || !updated) {
      return { success: false, error: new DatabaseError('Failed to update coach profile', error) };
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

// ─── Coach Dashboard Operations ────────────────────────────────────────────────

import { createSupabaseServer } from '../supabase/server';
import { assertCoach } from '../permissions';

export interface CoachSelfProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  photoUrl: string | null;
  whatsapp: string | null;
  languages: string[];
  experienceYears: number | null;
  bio: string | null;
  /** Extra metadata stored as JSON in the bio field by admin (fideId, fideRating, country) */
  fideId: string | null;
  fideRating: number | null;
  country: string | null;
}

/**
 * Fetches the authenticated coach's own merged profile.
 * Readable by coach only. Parses JSON metadata stored in bio field.
 */
export async function getMyCoachProfile(): Promise<Result<CoachSelfProfile>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin
      .from('coach_profiles')
      .select('title, photo_url, whatsapp, languages, experience_years, bio')
      .eq('user_id', user.id)
      .maybeSingle();

    // Parse JSON metadata from bio field (stored by admin via CoachProfileDetail)
    let plainBio: string | null = null;
    let fideId: string | null = null;
    let fideRating: number | null = null;
    let country: string | null = null;

    if (profile?.bio) {
      try {
        const parsed = JSON.parse(profile.bio);
        plainBio = parsed.text ?? null;
        fideId = parsed.fideId ?? null;
        fideRating = parsed.fideRating ? Number(parsed.fideRating) : null;
        country = parsed.country ?? null;
      } catch {
        // bio is plain text, not JSON
        plainBio = profile.bio;
      }
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        title: profile?.title ?? null,
        photoUrl: profile?.photo_url ?? null,
        whatsapp: profile?.whatsapp ?? null,
        languages: profile?.languages ?? [],
        experienceYears: profile?.experience_years ?? null,
        bio: plainBio,
        fideId,
        fideRating,
        country,
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
 * Lets the authenticated coach update their own editable profile fields.
 * Coach-editable: bio (plaintext), languages, whatsapp, experience_years, photo_url.
 * Admin-only fields (title, fideId, fideRating, country) are NOT touched.
 */
export async function updateMyCoachProfile(data: {
  bio?: string;
  languages?: string[];
  whatsapp?: string;
  experienceYears?: number;
  photoUrl?: string | null;
  country?: string | null;
  timezone?: string;
}): Promise<Result<void>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    // 1. Update public.users timezone
    if (data.timezone !== undefined) {
      const { error: dbError } = await admin
        .from('users')
        .update({ timezone: data.timezone, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (dbError) {
        return { success: false, error: new DatabaseError('Failed to update timezone in database', dbError) };
      }
    }

    // 2. Read current bio JSON to preserve/update metadata
    const { data: existing } = await admin
      .from('coach_profiles')
      .select('bio')
      .eq('user_id', user.id)
      .maybeSingle();

    let adminMeta: Record<string, unknown> = {};
    let bioText = '';
    if (existing?.bio) {
      try {
        const parsed = JSON.parse(existing.bio);
        bioText = parsed.text || '';
        adminMeta = {
          fideId: parsed.fideId ?? null,
          fideRating: parsed.fideRating ?? null,
          country: parsed.country ?? null,
        };
      } catch {
        bioText = existing.bio;
      }
    }

    // Overwrite country if provided by coach
    if (data.country !== undefined) {
      adminMeta.country = data.country;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Merge coach's plain text bio with admin meta (and updated country if any)
    const finalBioText = data.bio !== undefined ? data.bio : bioText;
    updates.bio = JSON.stringify({ text: finalBioText, ...adminMeta });

    if (data.languages !== undefined) updates.languages = data.languages;
    if (data.whatsapp !== undefined) updates.whatsapp = data.whatsapp;
    if (data.experienceYears !== undefined) updates.experience_years = data.experienceYears;
    if (data.photoUrl !== undefined) updates.photo_url = data.photoUrl;

    const { error } = await admin
      .from('coach_profiles')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });

    if (error) {
      return { success: false, error: new DatabaseError('Failed to update coach profile', error) };
    }

    // 3. Update Auth user metadata
    const authUpdates: any = {
      user_metadata: {},
    };
    if (data.photoUrl !== undefined) authUpdates.user_metadata.avatar_url = data.photoUrl;
    if (data.timezone !== undefined) authUpdates.user_metadata.timezone = data.timezone;

    const { error: authError } = await admin.auth.admin.updateUserById(user.id, authUpdates);
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
 * Fetches dashboard KPIs for the currently authenticated coach.
 */
export async function getCoachDashboardStats(): Promise<Result<{
  activeStudents: number;
  classesToday: number;
  pendingHomework: number;
  weeklySessions: number;
  nextClass: string;
}>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    // Get coach profile ID
    const { data: profile, error: pErr } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pErr || !profile) {
      return { success: true, data: { activeStudents: 0, classesToday: 0, pendingHomework: 0, weeklySessions: 0, nextClass: 'None' } };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

    const [
      { count: activeStudents },
      { count: classesToday },
      { count: pendingHomework },
      { count: weeklySessions },
    ] = await Promise.all([
      admin.from('coach_student_assignments').select('*', { count: 'exact', head: true }).eq('coach_id', profile.id).is('archived_at', null),
      admin.from('classes').select('*', { count: 'exact', head: true }).eq('coach_id', profile.id).gte('scheduled_start', `${todayStr}T00:00:00Z`).lte('scheduled_start', `${todayStr}T23:59:59Z`).is('archived_at', null),
      admin.from('homework_assignments').select('*', { count: 'exact', head: true }).eq('coach_id', profile.id).eq('status', 'submitted'),
      admin.from('classes').select('*', { count: 'exact', head: true }).eq('coach_id', profile.id).gte('scheduled_start', startOfWeek.toISOString()).lte('scheduled_start', endOfWeek.toISOString()).is('archived_at', null),
    ]);

    // Fetch next upcoming class
    const nowStr = new Date().toISOString();
    const { data: nextClasses } = await admin
      .from('classes')
      .select('scheduled_start')
      .eq('coach_id', profile.id)
      .gt('scheduled_start', nowStr)
      .is('archived_at', null)
      .order('scheduled_start', { ascending: true })
      .limit(1);

    let nextClassStr = 'None';
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

    return {
      success: true,
      data: {
        activeStudents: activeStudents ?? 0,
        classesToday: classesToday ?? 0,
        pendingHomework: pendingHomework ?? 0,
        weeklySessions: weeklySessions ?? 0,
        nextClass: nextClassStr,
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
 * Returns list of students assigned to the active coach.
 */
export async function getCoachCohort(): Promise<Result<any[]>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return { success: true, data: [] };

    const { data: assignments, error: assignErr } = await admin
      .from('coach_student_assignments')
      .select('student_id')
      .eq('coach_id', profile.id)
      .is('archived_at', null);

    if (assignErr || !assignments || assignments.length === 0) {
      return { success: true, data: [] };
    }

    const studentProfileIds = assignments.map((a: any) => a.student_id);

    const { data: studentProfiles, error: spErr } = await admin
      .from('student_profiles')
      .select('id, user_id, age, level, notes')
      .in('id', studentProfileIds);

    if (spErr || !studentProfiles || studentProfiles.length === 0) {
      return { success: true, data: [] };
    }

    const studentUserIds = studentProfiles.map((sp: any) => sp.user_id);

    const { data: users, error: uErr } = await admin
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', studentUserIds);

    if (uErr || !users) {
      return { success: true, data: [] };
    }

    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

    const cohort = studentProfiles.map((sp: any) => {
      const u = userMap.get(sp.user_id);
      return {
        profileId: sp.id,
        userId: sp.user_id,
        firstName: u?.first_name || '',
        lastName: u?.last_name || '',
        email: u?.email || '',
        age: sp.age,
        level: sp.level,
        notes: sp.notes,
      };
    });

    return { success: true, data: cohort };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Lists classes assigned to the active coach.
 */
export async function getCoachClasses(): Promise<Result<any[]>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return { success: true, data: [] };

    const { data: classes, error: cErr } = await admin
      .from('classes')
      .select('*')
      .eq('coach_id', profile.id)
      .is('archived_at', null)
      .order('scheduled_start', { ascending: true });

    if (cErr || !classes) {
      return { success: false, error: new DatabaseError('Failed to fetch coach classes', cErr) };
    }

    if (classes.length === 0) return { success: true, data: [] };

    // Resolve student names
    const classIds = classes.map((c: any) => c.id);
    const { data: mappings } = await admin
      .from('class_students')
      .select('class_id, student_id, first_joined_at')
      .in('class_id', classIds)
      .is('archived_at', null);

    const studentProfileIds = [...new Set(mappings?.map((m: any) => m.student_id) ?? [])];
    
    let studentUserMap = new Map<string, { first_name: string; last_name: string }>();
    let studentProfileToUserId = new Map<string, string>();

    if (studentProfileIds.length > 0) {
      const { data: studentProfiles } = await admin
        .from('student_profiles')
        .select('id, user_id')
        .in('id', studentProfileIds);

      if (studentProfiles) {
        studentProfileToUserId = new Map<string, string>(studentProfiles.map((sp: any) => [sp.id, sp.user_id]));
        const userIds = [...new Set(studentProfiles.map((sp: any) => sp.user_id))];

        if (userIds.length > 0) {
          const { data: studentUsers } = await admin
            .from('users')
            .select('id, first_name, last_name')
            .in('id', userIds);

          if (studentUsers) {
            studentUserMap = new Map<string, any>(studentUsers.map((u: any) => [u.id, { first_name: u.first_name, last_name: u.last_name }]));
          }
        }
      }
    }

    // Map student names and attendance counts to each class
    const mapped = classes.map((c: any) => {
      const classMappings = mappings?.filter((m: any) => m.class_id === c.id) ?? [];
      const studentNames = classMappings.map((m: any) => {
        const uId = studentProfileToUserId.get(m.student_id);
        const u = uId ? studentUserMap.get(uId) : null;
        return u ? `${u.first_name} ${u.last_name}` : 'Student';
      });

      const totalStudents = classMappings.length;
      const attendanceCount = classMappings.filter((m: any) => !!m.first_joined_at).length;

      return {
        ...c,
        schedule: c.scheduled_start,
        studentNames: studentNames.length > 0 ? studentNames : ['No student assigned'],
        attendanceCount,
        totalStudents,
      };
    });

    return { success: true, data: mapped };

  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Appends or saves notes for a student profile.
 */
export async function saveStudentNoteAction(
  studentProfileId: string,
  notes: string
): Promise<Result<{ studentProfileId: string }>> {
  try {
    await assertCoach();
    const admin = createSupabaseAdmin();

    // Fetch existing profile notes to safely merge updates without erasing Lichess integration data
    const { data: profile, error: fetchErr } = await admin
      .from('student_profiles')
      .select('notes')
      .eq('id', studentProfileId)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, error: new DatabaseError('Failed to fetch existing student profile', fetchErr) };
    }

    let notesObj: any = {
      text: notes,
      fideRating: null,
      country: '',
      emergencyContact: '',
      lichess: null,
    };

    if (profile?.notes) {
      try {
        const parsed = JSON.parse(profile.notes);
        if (typeof parsed === 'object' && parsed !== null) {
          notesObj = { ...parsed, text: notes };
        } else {
          notesObj.text = profile.notes;
        }
      } catch (e) {
        // Fallback if existing notes is plain text
        notesObj.text = profile.notes;
      }
    }

    const { error } = await admin
      .from('student_profiles')
      .update({ 
        notes: JSON.stringify(notesObj), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', studentProfileId);

    if (error) {
      return { success: false, error: new DatabaseError('Failed to save student note', error) };
    }

    return { success: true, data: { studentProfileId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns attendance logs for classes assigned to the active coach.
 */
export async function getCoachAttendanceLogs(): Promise<Result<any[]>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return { success: true, data: [] };

    // Get reports
    const { data: reports, error: rErr } = await admin
      .from('class_reports')
      .select('*')
      .eq('coach_id', profile.id);

    if (rErr || !reports || reports.length === 0) {
      return { success: true, data: [] };
    }

    const reportIds = reports.map((r: any) => r.id);
    const classIds = reports.map((r: any) => r.class_id);

    // Fetch classes schedule
    const { data: classes } = await admin
      .from('classes')
      .select('id, scheduled_start')
      .in('id', classIds);

    const classMap = new Map<string, string>((classes ?? []).map((c: any) => [c.id, c.scheduled_start]));

    // Fetch attendance
    const { data: attendance, error: attErr } = await admin
      .from('class_attendance')
      .select('*')
      .in('class_report_id', reportIds);

    if (attErr || !attendance || attendance.length === 0) {
      return { success: true, data: [] };
    }

    // Resolve student names
    const studentProfileIds = [...new Set(attendance.map((a: any) => a.student_id))];
    const { data: studentProfiles } = await admin
      .from('student_profiles')
      .select('id, user_id')
      .in('id', studentProfileIds);

    const studentProfileToUserId = new Map<string, string>((studentProfiles ?? []).map((sp: any) => [sp.id, sp.user_id]));
    const studentUserIds = [...new Set((studentProfiles ?? []).map((sp: any) => sp.user_id))];

    const { data: users } = await admin
      .from('users')
      .select('id, first_name, last_name')
      .in('id', studentUserIds);

    const userMap = new Map<string, any>((users ?? []).map((u: any) => [u.id, u]));

    const logs = attendance.map((a: any) => {
      const report = reports.find((r: any) => r.id === a.class_report_id);
      const schedule = report ? classMap.get(report.class_id) : null;
      const studentUserId = studentProfileToUserId.get(a.student_id);
      const studentUser = studentUserId ? userMap.get(studentUserId) : null;

      return {
        id: a.id,
        date: schedule || new Date().toISOString(),
        studentName: studentUser ? `${studentUser.first_name} ${studentUser.last_name}` : 'Unknown Student',
        status: a.status,
        feedback: a.feedback,
      };
    });

    return { success: true, data: logs };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Saves/logs attendance for a class session.
 */
export async function markClassAttendance(
  classId: string,
  studentAttendance: Array<{ studentProfileId: string; status: 'PRESENT' | 'ABSENT'; feedback?: string }>,
  notes: string
): Promise<Result<{ success: boolean }>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: new NotFoundError('Coach profile not found.') };
    }

    // Check if class report exists
    let { data: report } = await admin
      .from('class_reports')
      .select('id')
      .eq('class_id', classId)
      .maybeSingle();

    if (!report) {
      const { data: insertedReport, error: rErr } = await admin
        .from('class_reports')
        .insert({
          class_id: classId,
          coach_id: profile.id,
          notes: notes,
        })
        .select('id')
        .single();

      if (rErr || !insertedReport) {
        return { success: false, error: new DatabaseError('Failed to create class report', rErr) };
      }
      report = insertedReport;
    } else {
      // Update existing notes
      await admin
        .from('class_reports')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', report.id);
    }

    // Upsert attendance records
    for (const s of studentAttendance) {
      // Check if attendance already logged
      const { data: existing } = await admin
        .from('class_attendance')
        .select('id')
        .eq('class_report_id', report.id)
        .eq('student_id', s.studentProfileId)
        .maybeSingle();

      if (existing) {
        await admin
          .from('class_attendance')
          .update({
            status: s.status,
            feedback: s.feedback || null,
          })
          .eq('id', existing.id);
      } else {
        await admin
          .from('class_attendance')
          .insert({
            class_report_id: report.id,
            student_id: s.studentProfileId,
            status: s.status,
            feedback: s.feedback || null,
          });
      }
    }

    return { success: true, data: { success: true } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns class video recordings for classes assigned to the active coach.
 */
export async function getCoachClassRecordings(): Promise<Result<any[]>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return { success: true, data: [] };

    // Get coach classes
    const { data: classes } = await admin
      .from('classes')
      .select('id, scheduled_start, class_type')
      .eq('coach_id', profile.id)
      .is('archived_at', null);

    if (!classes || classes.length === 0) {
      return { success: true, data: [] };
    }

    const classIds = classes.map((c: any) => c.id);

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

