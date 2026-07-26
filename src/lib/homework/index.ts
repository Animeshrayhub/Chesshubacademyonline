import { createSupabaseAdmin } from '../supabase/admin';
import { getCurrentUser } from '../supabase/auth';
import { assertAdmin, assertStudent, assertCoach, assertAdminOrCoach } from '../permissions';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  ForbiddenError,
  InternalServerError,
  AuthenticationError,
  type Result,
} from '../errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbHomeworkWorkbook {
  id: string;
  title: string;
  description: string | null;
  track: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  pdf_storage_path: string | null;
  created_at: string;
}

export interface AdminHomeworkRow extends DbHomeworkWorkbook {
  chapter_count: number;
  assignment_count: number;
}

export interface CreateHomeworkInput {
  title: string;
  description?: string;
  track: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  pdfStoragePath?: string;
}

export const APP_TO_DB_TRACK = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const;

export const DB_TO_APP_TRACK = {
  Beginner: 'BEGINNER',
  Intermediate: 'INTERMEDIATE',
  Advanced: 'ADVANCED',
} as const;

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Lists all homework workbooks with chapter and assignment counts.
 */
export async function listHomework(): Promise<Result<AdminHomeworkRow[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    const { data: workbooks, error: wbErr } = await admin
      .from('homework_workbooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (wbErr) {
      return { success: false, error: new DatabaseError('Failed to list homework workbooks', wbErr) };
    }

    const workbookList = workbooks ?? [];
    if (workbookList.length === 0) return { success: true, data: [] };

    const workbookIds = workbookList.map((w: any) => w.id);

    // Fetch chapter counts per workbook
    const { data: chapters } = await admin
      .from('homework_chapters')
      .select('id, workbook_id')
      .in('workbook_id', workbookIds);

    const chapterCountMap = new Map<string, number>();
    const chapterIds: string[] = [];
    for (const ch of chapters ?? []) {
      chapterCountMap.set(ch.workbook_id, (chapterCountMap.get(ch.workbook_id) ?? 0) + 1);
      chapterIds.push(ch.id);
    }

    // Fetch assignment counts per workbook (via chapters)
    const assignmentCountMap = new Map<string, number>();
    if (chapterIds.length > 0) {
      const { data: assignments } = await admin
        .from('homework_assignments')
        .select('id, chapter_id')
        .in('chapter_id', chapterIds);

      // Build chapter → workbook reverse map
      const chapterToWorkbook = new Map<string, string>(
        (chapters ?? []).map((ch: any) => [ch.id, ch.workbook_id])
      );

      for (const asgn of assignments ?? []) {
        const workbookId = chapterToWorkbook.get(asgn.chapter_id);
        if (workbookId) {
          assignmentCountMap.set(workbookId, (assignmentCountMap.get(workbookId) ?? 0) + 1);
        }
      }
    }

    const rows: AdminHomeworkRow[] = workbookList.map((w: any) => ({
      ...w,
      track: (DB_TO_APP_TRACK[w.track as keyof typeof DB_TO_APP_TRACK] || 'BEGINNER') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
      chapter_count: chapterCountMap.get(w.id) ?? 0,
      assignment_count: assignmentCountMap.get(w.id) ?? 0,
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
 * Creates a new homework workbook.
 */
export async function createHomework(data: CreateHomeworkInput): Promise<Result<DbHomeworkWorkbook>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const dbTrack = APP_TO_DB_TRACK[data.track] || 'Beginner';

    const { data: inserted, error } = await admin
      .from('homework_workbooks')
      .insert({
        title: data.title,
        description: data.description ?? null,
        track: dbTrack,
        pdf_storage_path: data.pdfStoragePath ?? null,
      })
      .select()
      .single();

    if (error || !inserted) {
      return { success: false, error: new DatabaseError('Failed to create homework workbook', error) };
    }

    const formattedInserted: DbHomeworkWorkbook = {
      ...inserted,
      track: (DB_TO_APP_TRACK[inserted.track as keyof typeof DB_TO_APP_TRACK] || 'BEGINNER') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    };

    return { success: true, data: formattedInserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Updates a homework workbook.
 */
export async function updateHomework(
  id: string,
  data: Partial<CreateHomeworkInput>
): Promise<Result<DbHomeworkWorkbook>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.track !== undefined) {
      updates.track = APP_TO_DB_TRACK[data.track] || 'Beginner';
    }
    if (data.pdfStoragePath !== undefined) updates.pdf_storage_path = data.pdfStoragePath;

    const { data: updated, error } = await admin
      .from('homework_workbooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      return { success: false, error: new DatabaseError('Failed to update homework workbook', error) };
    }

    const formattedUpdated: DbHomeworkWorkbook = {
      ...updated,
      track: (DB_TO_APP_TRACK[updated.track as keyof typeof DB_TO_APP_TRACK] || 'BEGINNER') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    };

    return { success: true, data: formattedUpdated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Deletes a homework workbook (and cascade deletes chapters/assignments).
 */
export async function deleteHomework(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // Verify workbook exists
    const { data: workbook } = await admin
      .from('homework_workbooks')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!workbook) {
      return { success: false, error: new NotFoundError('Homework workbook not found') };
    }

    const { error } = await admin
      .from('homework_workbooks')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: new DatabaseError('Failed to delete homework workbook', error) };
    }

    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Returns homework submissions for students assigned to this coach.
 */
export async function getCoachHomeworkSubmissions(coachUserId: string): Promise<Result<any[]>> {
  try {
    const admin = createSupabaseAdmin();

    // Get coach profile ID
    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', coachUserId)
      .maybeSingle();

    if (!profile) return { success: true, data: [] };

    // Get homework assignments for this coach's students
    const { data: assignments, error: aErr } = await admin
      .from('homework_assignments')
      .select('*')
      .eq('coach_id', profile.id);

    if (aErr || !assignments || assignments.length === 0) {
      return { success: true, data: [] };
    }

    const assignmentIds = assignments.map((a: any) => a.id);
    const chapterIds = [...new Set(assignments.map((a: any) => a.chapter_id))];
    const studentProfileIds = [...new Set(assignments.map((a: any) => a.student_id))];

    // Fetch submissions
    const { data: submissions } = await admin
      .from('homework_submissions')
      .select('*')
      .in('assignment_id', assignmentIds);

    const submissionMap = new Map<string, any>((submissions ?? []).map((s: any) => [s.assignment_id, s]));

    // Fetch chapters and workbooks
    const { data: chapters } = await admin
      .from('homework_chapters')
      .select('id, title, chapter_number, workbook_id, pgn_data')
      .in('id', chapterIds);

    const chapterMap = new Map<string, any>((chapters ?? []).map((ch: any) => [ch.id, ch]));
    const workbookIds = [...new Set((chapters ?? []).map((ch: any) => ch.workbook_id))];

    let workbookMap = new Map<string, string>();
    if (workbookIds.length > 0) {
      const { data: workbooks } = await admin
        .from('homework_workbooks')
        .select('id, title')
        .in('id', workbookIds);
      workbookMap = new Map<string, string>((workbooks ?? []).map((w: any) => [w.id, w.title]));
    }

    // Fetch student users names
    const { data: studentProfiles } = await admin
      .from('student_profiles')
      .select('id, user_id')
      .in('id', studentProfileIds);

    const studentProfileToUserId = new Map<string, string>((studentProfiles ?? []).map((sp: any) => [sp.id, sp.user_id]));
    const studentUserIds = [...new Set((studentProfiles ?? []).map((sp: any) => sp.user_id))];

    let studentUserMap = new Map<string, { id: string; first_name: string; last_name: string }>();
    if (studentUserIds.length > 0) {
      const { data: studentUsers } = await admin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', studentUserIds);
      studentUserMap = new Map<string, any>((studentUsers ?? []).map((u: any) => [u.id, u]));
    }

    const result = assignments.map((a: any) => {
      const sub = submissionMap.get(a.id) || null;
      const chapter = chapterMap.get(a.chapter_id);
      const workbookTitle = chapter ? workbookMap.get(chapter.workbook_id) : '';
      const studentUserId = studentProfileToUserId.get(a.student_id);
      const studentUser = studentUserId ? studentUserMap.get(studentUserId) : null;

      return {
        id: a.id,
        chapterId: a.chapter_id,
        studentId: a.student_id,
        pgnData: chapter?.pgn_data || null,
        studentName: studentUser ? `${studentUser.first_name} ${studentUser.last_name}` : 'Unknown Student',
        workbookTitle,
        chapterTitle: chapter ? `${chapter.chapter_number}. ${chapter.title}` : '',
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
 * Grades a student's homework submission.
 */
export async function gradeHomeworkSubmission(
  assignmentId: string,
  gradeScore: number,
  feedback: string,
  approveAndUnlock: boolean = true
): Promise<Result<{ assignmentId: string }>> {
  try {
    const admin = createSupabaseAdmin();

    // Update submission
    const { error: subErr } = await admin
      .from('homework_submissions')
      .update({
        grade_score: gradeScore,
        coach_feedback: feedback,
        reviewed_at: new Date().toISOString(),
      })
      .eq('assignment_id', assignmentId);

    if (subErr) {
      return { success: false, error: new DatabaseError('Failed to update homework grade', subErr) };
    }

    // Update assignment status
    const { error: asgnErr } = await admin
      .from('homework_assignments')
      .update({ status: 'reviewed' })
      .eq('id', assignmentId);

    if (asgnErr) {
      return { success: false, error: new DatabaseError('Failed to update assignment status', asgnErr) };
    }

    // --- LMS Sequential Unlock Logic ---
    const { data: currentAsgn } = await admin
      .from('homework_assignments')
      .select('chapter_id, student_id')
      .eq('id', assignmentId)
      .single();

    if (currentAsgn) {
      const { data: currentChapter } = await admin
        .from('homework_chapters')
        .select('*')
        .eq('id', currentAsgn.chapter_id)
        .single();

      if (currentChapter) {
        const courseId = currentChapter.workbook_id;
        const studentProfileId = currentAsgn.student_id;

        // Check if unlocked criteria met
        let shouldUnlockNext = false;
        if (currentChapter.unlock_type === 'coach_approval') {
          shouldUnlockNext = approveAndUnlock;
        } else if (currentChapter.unlock_type === 'auto_score') {
          shouldUnlockNext = approveAndUnlock && (gradeScore >= currentChapter.unlock_score);
        }

        if (shouldUnlockNext) {
          // Fetch all modules of this course to order chapters
          const { data: modules } = await admin
            .from('lms_modules')
            .select('id, module_number')
            .eq('course_id', courseId);

          const { data: chapters } = await admin
            .from('homework_chapters')
            .select('id, module_id, chapter_number')
            .eq('workbook_id', courseId);

          const moduleOrder = new Map<string, number>((modules ?? []).map((m: any) => [m.id, m.module_number]));

          const sortedChapters = (chapters ?? []).sort((a: any, b: any) => {
            const aMod = a.module_id ? (moduleOrder.get(a.module_id) ?? 0) : 0;
            const bMod = b.module_id ? (moduleOrder.get(b.module_id) ?? 0) : 0;
            if (aMod !== bMod) return aMod - bMod;
            return a.chapter_number - b.chapter_number;
          });

          const currentIdx = sortedChapters.findIndex((c: any) => c.id === currentChapter.id);
          const nextChapter = currentIdx !== -1 && currentIdx + 1 < sortedChapters.length ? sortedChapters[currentIdx + 1] : null;

          if (nextChapter) {
            // Find coach profile ID of this student
            const { data: student } = await admin
              .from('student_profiles')
              .select('coach_id')
              .eq('id', studentProfileId)
              .single();

            const coachId = student?.coach_id || null;

            // Check if next chapter already has assignment
            const { data: existingNext } = await admin
              .from('homework_assignments')
              .select('id')
              .eq('chapter_id', nextChapter.id)
              .eq('student_id', studentProfileId)
              .maybeSingle();

            if (!existingNext) {
              await admin.from('homework_assignments').insert({
                chapter_id: nextChapter.id,
                student_id: studentProfileId,
                coach_id: coachId,
                status: 'assigned',
                unlocked: true,
              });
            } else {
              await admin.from('homework_assignments').update({ unlocked: true }).eq('id', existingNext.id);
            }

            // Update enrollment progress
            await admin
              .from('lms_course_enrollments')
              .update({ current_chapter_id: nextChapter.id })
              .eq('student_id', studentProfileId)
              .eq('course_id', courseId);
          } else {
            // No next chapter, course completed!
            await admin
              .from('lms_course_enrollments')
              .update({ completed_at: new Date().toISOString() })
              .eq('student_id', studentProfileId)
              .eq('course_id', courseId);
          }
        }
      }
    }

    return { success: true, data: { assignmentId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Submits a student's homework answers.
 */
export async function submitHomeworkSubmission(
  assignmentId: string,
  answers: string,
  pdfSubmissionPath?: string
): Promise<Result<{ assignmentId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: new AuthenticationError('User is not authenticated.') };
    const admin = createSupabaseAdmin();

    let { data: studentProfile } = await admin
      .from('student_profiles')
      .select('id, coach_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!studentProfile) {
      const { data: newProfile } = await admin
        .from('student_profiles')
        .insert({ user_id: user.id, rating: 1200 })
        .select('id, coach_id')
        .single();
      studentProfile = newProfile || { id: user.id, coach_id: null };
    }

    let realAssignmentId = assignmentId;
    let assignment = null;

    if (assignmentId.startsWith('auto-asgn-')) {
      const chapterId = assignmentId.replace(`auto-asgn-${studentProfile.id}-`, '');
      const { data: existingAsgn } = await admin
        .from('homework_assignments')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('student_id', studentProfile.id)
        .maybeSingle();

      if (existingAsgn) {
        assignment = existingAsgn;
        realAssignmentId = existingAsgn.id;
      } else {
        const { data: createdAsgn } = await admin
          .from('homework_assignments')
          .insert({
            chapter_id: chapterId,
            student_id: studentProfile.id,
            coach_id: studentProfile.coach_id,
            status: 'submitted',
            unlocked: true,
          })
          .select('*')
          .single();

        if (createdAsgn) {
          assignment = createdAsgn;
          realAssignmentId = createdAsgn.id;
        }
      }
    } else {
      const { data: fetchedAsgn } = await admin
        .from('homework_assignments')
        .select('*')
        .eq('id', assignmentId)
        .maybeSingle();
      assignment = fetchedAsgn;
    }

    if (!assignment) {
      return { success: false, error: new NotFoundError('Homework assignment not found.') };
    }

    // Insert or update submission
    const { data: existing } = await admin
      .from('homework_submissions')
      .select('id')
      .eq('assignment_id', realAssignmentId)
      .maybeSingle();

    if (existing) {
      const { error: updErr } = await admin
        .from('homework_submissions')
        .update({
          answers,
          pdf_submission_path: pdfSubmissionPath || null,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updErr) {
        return { success: false, error: new DatabaseError('Failed to update homework submission', updErr) };
      }
    } else {
      const { error: insErr } = await admin
        .from('homework_submissions')
        .insert({
          assignment_id: realAssignmentId,
          answers,
          pdf_submission_path: pdfSubmissionPath || null,
        });

      if (insErr) {
        return { success: false, error: new DatabaseError('Failed to create homework submission', insErr) };
      }
    }

    // Update assignment status to 'submitted'
    const { error: statusErr } = await admin
      .from('homework_assignments')
      .update({ status: 'submitted' })
      .eq('id', realAssignmentId);

    if (statusErr) {
      return { success: false, error: new DatabaseError('Failed to update assignment status', statusErr) };
    }

    return { success: true, data: { assignmentId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

// ─── Chapter Management ───────────────────────────────────────────────────────

export interface DbHomeworkChapter {
  id: string;
  workbook_id: string;
  chapter_number: number;
  title: string;
  description: string | null;
  pgn_data: string | null;
  pdf_storage_path: string | null;
  questions_count: number;
  created_at: string;
  updated_at: string | null;
  module_id: string | null;
  video_url: string | null;
  pdf_page_range: string | null;
  notes: string | null;
  unlock_type: 'coach_approval' | 'auto_score';
  unlock_score: number;
  puzzle_images: any[];
  questions: any[];
}

export interface CreateChapterInput {
  workbookId: string;
  title: string;
  description?: string;
  pgnData?: string;
  pdfStoragePath?: string;
  moduleId?: string;
  videoUrl?: string;
  pdfPageRange?: string;
  notes?: string;
  unlockType?: 'coach_approval' | 'auto_score';
  unlockScore?: number;
  puzzleImages?: any[];
  questions?: any[];
}

/**
 * Lists all chapters for a given workbook.
 */
export async function listChapters(workbookId: string): Promise<Result<DbHomeworkChapter[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('homework_chapters')
      .select('*')
      .eq('workbook_id', workbookId)
      .order('chapter_number', { ascending: true });
    if (error) return { success: false, error: new DatabaseError('Failed to list chapters', error) };
    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

/**
 * Creates a new chapter in a workbook. Auto-increments chapter_number.
 */
export async function createChapter(data: CreateChapterInput): Promise<Result<DbHomeworkChapter>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { data: existing } = await admin
      .from('homework_chapters')
      .select('chapter_number')
      .eq('workbook_id', data.workbookId)
      .order('chapter_number', { ascending: false })
      .limit(1);
    const nextNumber = existing && existing.length > 0 ? (existing[0].chapter_number + 1) : 1;
    const { data: inserted, error } = await admin
      .from('homework_chapters')
      .insert({
        workbook_id: data.workbookId,
        chapter_number: nextNumber,
        title: data.title,
        description: data.description ?? null,
        pgn_data: data.pgnData ?? null,
        pdf_storage_path: data.pdfStoragePath ?? null,
        module_id: data.moduleId ?? null,
        video_url: data.videoUrl ?? null,
        pdf_page_range: data.pdfPageRange ?? null,
        notes: data.notes ?? null,
        unlock_type: data.unlockType ?? 'coach_approval',
        unlock_score: data.unlockScore ?? 80,
        puzzle_images: data.puzzleImages ?? [],
        questions: data.questions ?? [],
      })
      .select()
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create chapter', error) };

    // Auto-extract & generate interactive puzzles if PGN / Lichess study is provided
    if (data.pgnData && data.pgnData.trim()) {
      try {
        const { importPgnToChapter } = await import('./puzzles');
        await importPgnToChapter(inserted.id, data.pgnData);
      } catch (err) {
        console.error('Failed to auto-import puzzles from PGN:', err);
      }
    }

    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

/**
 * Updates a chapter.
 */
export async function updateChapter(
  id: string,
  data: Partial<Omit<CreateChapterInput, 'workbookId'>>
): Promise<Result<DbHomeworkChapter>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.pgnData !== undefined) updates.pgn_data = data.pgnData;
    if (data.pdfStoragePath !== undefined) updates.pdf_storage_path = data.pdfStoragePath;
    if (data.moduleId !== undefined) updates.module_id = data.moduleId;
    if (data.videoUrl !== undefined) updates.video_url = data.videoUrl;
    if (data.pdfPageRange !== undefined) updates.pdf_page_range = data.pdfPageRange;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.unlockType !== undefined) updates.unlock_type = data.unlockType;
    if (data.unlockScore !== undefined) updates.unlock_score = data.unlockScore;
    if (data.puzzleImages !== undefined) updates.puzzle_images = data.puzzleImages;
    if (data.questions !== undefined) updates.questions = data.questions;

    const { data: updated, error } = await admin
      .from('homework_chapters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error || !updated) return { success: false, error: new DatabaseError('Failed to update chapter', error) };
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

/**
 * Deletes a chapter (cascades to assignments).
 */
export async function deleteChapter(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('homework_chapters').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete chapter', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

/**
 * Assigns a chapter as homework to a specific student profile.
 */
export async function assignChapterToStudent(data: {
  chapterId: string;
  studentProfileId: string;
  coachProfileId: string;
  dueAt?: string;
  assignedClassId?: string;
}): Promise<Result<{ assignmentId: string }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data: existing } = await admin
      .from('homework_assignments')
      .select('id')
      .eq('chapter_id', data.chapterId)
      .eq('student_id', data.studentProfileId)
      .maybeSingle();
    if (existing) return { success: true, data: { assignmentId: existing.id } };
    const { data: inserted, error } = await admin
      .from('homework_assignments')
      .insert({
        chapter_id: data.chapterId,
        student_id: data.studentProfileId,
        coach_id: data.coachProfileId,
        due_at: data.dueAt ?? null,
        assigned_class_id: data.assignedClassId ?? null,
        status: 'assigned',
      })
      .select('id')
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to assign chapter', error) };
    return { success: true, data: { assignmentId: inserted.id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

/**
 * Assigns a chapter as homework to all students enrolled in a class.
 */
export async function assignChapterToClass(data: {
  chapterId: string;
  classId: string;
  coachProfileId: string;
  dueAt?: string;
}): Promise<Result<{ count: number }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data: classStudents, error: csErr } = await admin
      .from('class_students')
      .select('student_id')
      .eq('class_id', data.classId)
      .is('archived_at', null);
    if (csErr || !classStudents || classStudents.length === 0) {
      return { success: false, error: new NotFoundError('No students found in this class') };
    }
    let count = 0;
    for (const cs of classStudents) {
      const { data: existing } = await admin
        .from('homework_assignments')
        .select('id')
        .eq('chapter_id', data.chapterId)
        .eq('student_id', cs.student_id)
        .maybeSingle();
      if (!existing) {
        await admin.from('homework_assignments').insert({
          chapter_id: data.chapterId,
          student_id: cs.student_id,
          coach_id: data.coachProfileId,
          due_at: data.dueAt ?? null,
          assigned_class_id: data.classId,
          status: 'assigned',
        });
        count++;
      }
    }
    return { success: true, data: { count } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Module Management Types & Actions ────────────────────────────────────────
export interface DbLmsModule {
  id: string;
  course_id: string;
  module_number: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateModuleInput {
  courseId: string;
  title: string;
  description?: string;
  moduleNumber?: number;
}

export async function listModules(courseId: string): Promise<Result<DbLmsModule[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('lms_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('module_number', { ascending: true });
    if (error) return { success: false, error: new DatabaseError('Failed to list modules', error) };
    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function createModule(data: CreateModuleInput): Promise<Result<DbLmsModule>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    
    let targetNumber = data.moduleNumber;
    if (targetNumber === undefined || targetNumber === null) {
      const { data: existing } = await admin
        .from('lms_modules')
        .select('module_number')
        .eq('course_id', data.courseId)
        .order('module_number', { ascending: false })
        .limit(1);
      targetNumber = existing && existing.length > 0 ? (existing[0].module_number + 1) : 1;
    }

    const { data: inserted, error } = await admin
      .from('lms_modules')
      .insert({
        course_id: data.courseId,
        module_number: targetNumber,
        title: data.title,
        description: data.description ?? null,
      })
      .select()
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create module', error) };
    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function updateModule(
  id: string,
  data: Partial<Omit<CreateModuleInput, 'courseId'>>
): Promise<Result<DbLmsModule>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.moduleNumber !== undefined) updates.module_number = data.moduleNumber;

    const { data: updated, error } = await admin
      .from('lms_modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error || !updated) return { success: false, error: new DatabaseError('Failed to update module', error) };
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function deleteModule(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('lms_modules').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete module', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Course Enrollments & Progress Types & Actions ───────────────────────────
export interface DbLmsEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  current_chapter_id: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

export async function enrollStudentInCourse(
  studentProfileId: string,
  courseId: string
): Promise<Result<DbLmsEnrollment>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    // Check if enrollment already exists
    const { data: existing } = await admin
      .from('lms_course_enrollments')
      .select('*')
      .eq('student_id', studentProfileId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existing) return { success: true, data: existing };

    // Find the first chapter of this course
    const { data: chapters } = await admin
      .from('homework_chapters')
      .select('id, module_id, chapter_number')
      .eq('workbook_id', courseId);

    const { data: modules } = await admin
      .from('lms_modules')
      .select('id, module_number')
      .eq('course_id', courseId);

    const moduleOrder = new Map<string, number>((modules ?? []).map((m: any) => [m.id, m.module_number]));

    const sortedChapters = (chapters ?? []).sort((a: any, b: any) => {
      const aMod = a.module_id ? (moduleOrder.get(a.module_id) ?? 0) : 0;
      const bMod = b.module_id ? (moduleOrder.get(b.module_id) ?? 0) : 0;
      if (aMod !== bMod) return aMod - bMod;
      return a.chapter_number - b.chapter_number;
    });

    const firstChapterId = sortedChapters[0]?.id || null;

    // Create enrollment
    const { data: enrolled, error } = await admin
      .from('lms_course_enrollments')
      .insert({
        student_id: studentProfileId,
        course_id: courseId,
        current_chapter_id: firstChapterId,
      })
      .select()
      .single();

    if (error || !enrolled) {
      return { success: false, error: new DatabaseError('Failed to enroll student in course', error) };
    }

    // Auto-create assignment for the first chapter and set unlocked = true
    if (firstChapterId) {
      const { data: student } = await admin
        .from('student_profiles')
        .select('coach_id')
        .eq('id', studentProfileId)
        .single();

      const coachId = student?.coach_id || null;

      const { data: existingAsgn } = await admin
        .from('homework_assignments')
        .select('id')
        .eq('chapter_id', firstChapterId)
        .eq('student_id', studentProfileId)
        .maybeSingle();

      if (!existingAsgn) {
        await admin.from('homework_assignments').insert({
          chapter_id: firstChapterId,
          student_id: studentProfileId,
          coach_id: coachId,
          status: 'assigned',
          unlocked: true,
        });
      } else {
        await admin.from('homework_assignments').update({ unlocked: true }).eq('id', existingAsgn.id);
      }
    }

    return { success: true, data: enrolled };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function getStudentEnrollmentsById(studentProfileId: string): Promise<Result<any[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    const { data: enrollments, error: eErr } = await admin
      .from('lms_course_enrollments')
      .select('*')
      .eq('student_id', studentProfileId);

    if (eErr) {
      return { success: false, error: new DatabaseError('Failed to fetch student enrollments', eErr) };
    }

    const result = [];
    for (const enroll of enrollments ?? []) {
      const { data: course } = await admin
        .from('homework_workbooks')
        .select('id, title, track, description')
        .eq('id', enroll.course_id)
        .maybeSingle();

      if (course) {
        result.push({
          id: enroll.id,
          courseId: course.id,
          courseTitle: course.title,
          track: course.track,
          description: course.description,
          currentChapterId: enroll.current_chapter_id,
          enrolledAt: enroll.enrolled_at,
          completedAt: enroll.completed_at,
        });
      }
    }

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function unenrollStudentFromCourse(
  studentProfileId: string,
  courseId: string
): Promise<Result<void>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    // 1. Delete course enrollment
    const { error: eErr } = await admin
      .from('lms_course_enrollments')
      .delete()
      .eq('student_id', studentProfileId)
      .eq('course_id', courseId);

    if (eErr) {
      return { success: false, error: new DatabaseError('Failed to delete course enrollment', eErr) };
    }

    // 2. Clean up assignments for chapters in this course
    const { data: chapters } = await admin
      .from('homework_chapters')
      .select('id')
      .eq('workbook_id', courseId);

    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    if (chapterIds.length > 0) {
      await admin
        .from('homework_assignments')
        .delete()
        .eq('student_id', studentProfileId)
        .in('chapter_id', chapterIds);
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function getCourseSyllabus(
  courseId: string,
  studentProfileId?: string
): Promise<Result<any>> {
  try {
    const admin = createSupabaseAdmin();
    let targetStudentId = studentProfileId;

    if (!targetStudentId) {
      const user = await assertStudent();
      const { data: profile } = await admin
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile) return { success: false, error: new NotFoundError('Student profile not found') };
      targetStudentId = profile.id;
    }

    const { data: modules, error: mErr } = await admin
      .from('lms_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('module_number', { ascending: true });

    if (mErr) return { success: false, error: new DatabaseError('Failed to fetch modules', mErr) };

    const { data: chapters, error: cErr } = await admin
      .from('homework_chapters')
      .select('*')
      .eq('workbook_id', courseId)
      .order('chapter_number', { ascending: true });

    if (cErr) return { success: false, error: new DatabaseError('Failed to fetch chapters', cErr) };

    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    let assignments: any[] = [];
    if (chapterIds.length > 0) {
      const { data: asgns } = await admin
        .from('homework_assignments')
        .select('*')
        .eq('student_id', targetStudentId)
        .in('chapter_id', chapterIds);
      assignments = asgns ?? [];
    }

    let submissions: any[] = [];
    const assignmentIds = assignments.map((a: any) => a.id);
    if (assignmentIds.length > 0) {
      const { data: subs } = await admin
        .from('homework_submissions')
        .select('*')
        .in('assignment_id', assignmentIds);
      submissions = subs ?? [];
    }

    const assignmentMap = new Map<string, any>(assignments.map((a: any) => [a.chapter_id, a]));
    const submissionMap = new Map<string, any>(submissions.map((s: any) => [s.assignment_id, s]));

    const syllabus = (modules ?? []).map((m: any) => {
      const modChapters = (chapters ?? [])
        .filter((c: any) => c.module_id === m.id)
        .map((c: any) => {
          const asgn = assignmentMap.get(c.id) || null;
          const sub = asgn ? submissionMap.get(asgn.id) : null;
          return {
            id: c.id,
            chapter_number: c.chapter_number,
            title: c.title,
            description: c.description,
            pgn_data: c.pgn_data,
            pdf_storage_path: c.pdf_storage_path,
            video_url: c.video_url,
            pdf_page_range: c.pdf_page_range,
            notes: c.notes,
            unlock_type: c.unlock_type,
            unlock_score: c.unlock_score,
            puzzle_images: c.puzzle_images,
            questions: c.questions,
            assignment: asgn ? {
              id: asgn.id,
              status: asgn.status,
              unlocked: asgn.unlocked,
              assigned_at: asgn.assigned_at,
              due_at: asgn.due_at,
              submission: sub ? {
                id: sub.id,
                answers: sub.answers,
                pdf_submission_path: sub.pdf_submission_path,
                submitted_at: sub.submitted_at,
                grade_score: sub.grade_score,
                coach_feedback: sub.coach_feedback,
              } : null
            } : {
              id: `auto-asgn-${targetStudentId}-${c.id}`,
              status: 'assigned',
              unlocked: true,
              assigned_at: c.created_at || new Date().toISOString(),
              due_at: null,
              submission: null,
            }
          };
        });

      return {
        id: m.id,
        module_number: m.module_number,
        title: m.title,
        description: m.description,
        chapters: modChapters
      };
    });

    const orphanChapters = (chapters ?? [])
      .filter((c: any) => !c.module_id)
      .map((c: any) => {
        const asgn = assignmentMap.get(c.id) || null;
        const sub = asgn ? submissionMap.get(asgn.id) : null;
        return {
          id: c.id,
          chapter_number: c.chapter_number,
          title: c.title,
          description: c.description,
          pgn_data: c.pgn_data,
          pdf_storage_path: c.pdf_storage_path,
          video_url: c.video_url,
          pdf_page_range: c.pdf_page_range,
          notes: c.notes,
          unlock_type: c.unlock_type,
          unlock_score: c.unlock_score,
          puzzle_images: c.puzzle_images,
          questions: c.questions,
          assignment: asgn ? {
            id: asgn.id,
            status: asgn.status,
            unlocked: asgn.unlocked,
            assigned_at: asgn.assigned_at,
            due_at: asgn.due_at,
            submission: sub ? {
              id: sub.id,
              answers: sub.answers,
              pdf_submission_path: sub.pdf_submission_path,
              submitted_at: sub.submitted_at,
              grade_score: sub.grade_score,
              coach_feedback: sub.coach_feedback,
            } : null
          } : {
            id: `auto-asgn-${targetStudentId}-${c.id}`,
            status: 'assigned',
            unlocked: true,
            assigned_at: c.created_at || new Date().toISOString(),
            due_at: null,
            submission: null,
          }
        };
      });

    return {
      success: true,
      data: {
        syllabus,
        orphanChapters
      }
    };
  } catch (error) {
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

/**
 * Records a blunder/failed puzzle attempt into the student's personal review bank.
 */
export async function recordFailedPuzzle(
  studentProfileId: string,
  chapterId: string,
  fen: string,
  attemptedMove: string,
  bestMove: string
): Promise<Result<{ recorded: boolean }>> {
  try {
    const admin = createSupabaseAdmin();
    // Insert audit record of blunder
    await admin.from('audit_logs').insert({
      action: 'PUZZLE_BLUNDER_LOGGED',
      user_id: studentProfileId,
      details: {
        chapterId,
        fen,
        attemptedMove,
        bestMove,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, data: { recorded: true } };
  } catch (error) {
    return { success: false, error: new InternalServerError('Failed to record puzzle blunder') };
  }
}

/**
 * Quick-creates a chapter with a custom FEN position and assigns it to a class or student.
 */
export async function assignCustomPositionHomework(data: {
  title: string;
  fen: string;
  classId?: string;
  studentProfileId?: string;
  coachProfileId?: string;
}): Promise<Result<{ assignmentId: string }>> {

  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    // 1. Find or create a default "Live Classroom Assignments" workbook
    let workbookId = '';
    const { data: existingWb } = await admin
      .from('homework_workbooks')
      .select('id')
      .eq('title', 'Live Classroom Practice')
      .maybeSingle();

    if (existingWb) {
      workbookId = existingWb.id;
    } else {
      const { data: newWb } = await admin
        .from('homework_workbooks')
        .insert({
          title: 'Live Classroom Practice',
          description: 'Custom positions assigned directly from live classroom sessions.',
          track: 'Beginner',
        })
        .select('id')
        .single();
      workbookId = newWb?.id || '';
    }

    if (!workbookId) return { success: false, error: new InternalServerError('Failed to resolve workbook') };

    // 2. Create chapter with custom FEN pgn_data
    const { data: chapter, error: chErr } = await admin
      .from('homework_chapters')
      .insert({
        workbook_id: workbookId,
        chapter_number: 99,
        title: data.title || 'Classroom Tactical Challenge',
        description: `Custom practice position: ${data.fen}`,
        pgn_data: data.fen,
        unlock_type: 'coach_approval',
        unlock_score: 80,
      })
      .select('id')
      .single();

    if (chErr || !chapter) {
      return { success: false, error: new DatabaseError('Failed to create custom chapter', chErr) };
    }

    // 3. Assign chapter to class or student
    if (data.classId) {
      await assignChapterToClass({
        chapterId: chapter.id,
        classId: data.classId,
        coachProfileId: data.coachProfileId || '',
      });
    } else if (data.studentProfileId) {
      await assignChapterToStudent({
        chapterId: chapter.id,
        studentProfileId: data.studentProfileId,
        coachProfileId: data.coachProfileId || '',
      });
    }

    return { success: true, data: { assignmentId: chapter.id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}




// ═══════════════════════════════════════════════════════════════════════════
// HOMEWORK LIBRARY MODULE
// New tables: homework_categories, homework_themes, homework_library_templates,
// homework_template_sections, homework_template_tags, homework_template_versions,
// hw_collections, hw_collection_items, hw_courses, hw_course_collections,
// hw_template_assignments, hw_template_submissions
// ═══════════════════════════════════════════════════════════════════════════

// ─── Library Types ─────────────────────────────────────────────────────────

export type HomeworkStatus = 'draft' | 'published' | 'archived';
export type HomeworkLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type HomeworkDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type TemplateSectionType =
  | 'introduction' | 'objectives' | 'video' | 'pdf' | 'image'
  | 'puzzle' | 'fen' | 'pgn' | 'notes' | 'solution' | 'explanation'
  | 'summary' | 'coach_instructions' | 'hint';

export type TemplateAssignmentStatus =
  | 'assigned' | 'in_progress' | 'submitted'
  | 'reviewed' | 'approved' | 'reassigned' | 'archived';

export interface DbHomeworkCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface DbHomeworkTheme {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface DbHomeworkLibraryTemplate {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  theme_id: string | null;
  level: HomeworkLevel;
  difficulty: HomeworkDifficulty;
  estimated_time: number;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  status: HomeworkStatus;
  version: number;
  parent_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  category_name?: string;
  theme_name?: string;
  tags?: string[];
  sections_count?: number;
}

export interface DbTemplateSection {
  id: string;
  template_id: string;
  section_type: TemplateSectionType;
  title: string | null;
  content: string | null;
  media_url: string | null;
  media_path: string | null;
  fen_position: string | null;
  pgn_data: string | null;
  sort_order: number;
  created_at: string;
}

export interface DbHwCollection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  status: HomeworkStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface DbHwCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  level: HomeworkLevel;
  status: HomeworkStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  collection_count?: number;
}

export interface DbTemplateAssignment {
  id: string;
  template_id: string;
  student_id: string;
  coach_id: string | null;
  collection_id: string | null;
  course_id: string | null;
  status: TemplateAssignmentStatus;
  coach_notes: string | null;
  available_at: string | null;
  due_at: string | null;
  assigned_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  title: string;
  description?: string;
  categoryId?: string;
  themeId?: string;
  level?: HomeworkLevel;
  difficulty?: HomeworkDifficulty;
  estimatedTime?: number;
  thumbnailUrl?: string;
  coverImageUrl?: string;
  tags?: string[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  status?: HomeworkStatus;
}

export interface CreateSectionInput {
  templateId: string;
  sectionType: TemplateSectionType;
  title?: string;
  content?: string;
  mediaUrl?: string;
  mediaPath?: string;
  fenPosition?: string;
  pgnData?: string;
  sortOrder?: number;
}

export interface CreateCollectionInput {
  title: string;
  description?: string;
  coverUrl?: string;
  status?: HomeworkStatus;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  coverUrl?: string;
  level?: HomeworkLevel;
  status?: HomeworkStatus;
}

export interface AssignTemplateInput {
  templateId: string;
  studentProfileId: string;
  coachProfileId?: string;
  collectionId?: string;
  courseId?: string;
  coachNotes?: string;
  availableAt?: string;
  dueAt?: string;
}

// ─── Helper: generate slug ──────────────────────────────────────────────────
function generateSlug(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return suffix ? `${base}-${suffix}` : base;
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function listCategories(): Promise<Result<DbHomeworkCategory[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('homework_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return { success: false, error: new DatabaseError('Failed to list categories', error) };
    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function createCategory(data: { name: string; slug?: string; color?: string; description?: string }): Promise<Result<DbHomeworkCategory>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const slug = data.slug || generateSlug(data.name);
    const { data: inserted, error } = await admin
      .from('homework_categories')
      .insert({ name: data.name, slug, color: data.color ?? '#3B82F6', description: data.description ?? null })
      .select()
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create category', error) };
    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function updateCategory(id: string, data: { name?: string; color?: string; description?: string; sortOrder?: number }): Promise<Result<DbHomeworkCategory>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.color !== undefined) updates.color = data.color;
    if (data.description !== undefined) updates.description = data.description;
    if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder;
    const { data: updated, error } = await admin.from('homework_categories').update(updates).eq('id', id).select().single();
    if (error || !updated) return { success: false, error: new DatabaseError('Failed to update category', error) };
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function deleteCategory(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('homework_categories').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete category', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Themes ─────────────────────────────────────────────────────────────────

export async function listThemes(categoryId?: string): Promise<Result<DbHomeworkTheme[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    let q = admin.from('homework_themes').select('*').order('sort_order', { ascending: true });
    if (categoryId) q = q.eq('category_id', categoryId);
    const { data, error } = await q;
    if (error) return { success: false, error: new DatabaseError('Failed to list themes', error) };
    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function createTheme(data: { name: string; slug?: string; categoryId?: string }): Promise<Result<DbHomeworkTheme>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const slug = data.slug || generateSlug(data.name);
    const { data: inserted, error } = await admin
      .from('homework_themes')
      .insert({ name: data.name, slug, category_id: data.categoryId ?? null })
      .select()
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create theme', error) };
    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function deleteTheme(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('homework_themes').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete theme', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Homework Library Templates ─────────────────────────────────────────────

export interface ListLibraryFilters {
  search?: string;
  categoryId?: string;
  themeId?: string;
  level?: HomeworkLevel;
  difficulty?: HomeworkDifficulty;
  status?: HomeworkStatus;
  page?: number;
  pageSize?: number;
}

export async function listHomeworkLibrary(filters: ListLibraryFilters = {}): Promise<Result<{ templates: DbHomeworkLibraryTemplate[]; total: number }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { page = 1, pageSize = 20, search, categoryId, themeId, level, difficulty, status } = filters;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = admin
      .from('homework_library_templates')
      .select('*, homework_categories(name), homework_themes(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) q = q.ilike('title', `%${search}%`);
    if (categoryId) q = q.eq('category_id', categoryId);
    if (themeId) q = q.eq('theme_id', themeId);
    if (level) q = q.eq('level', level);
    if (difficulty) q = q.eq('difficulty', difficulty);
    if (status) q = q.eq('status', status);
    else q = q.neq('status', 'archived');

    const { data, error, count } = await q;
    if (error) return { success: false, error: new DatabaseError('Failed to list homework library', error) };

    const templateIds = (data ?? []).map((t: any) => t.id);
    let tagsMap = new Map<string, string[]>();
    if (templateIds.length > 0) {
      const { data: tags } = await admin.from('homework_template_tags').select('template_id, tag').in('template_id', templateIds);
      for (const tag of tags ?? []) {
        const existing = tagsMap.get(tag.template_id) ?? [];
        existing.push(tag.tag);
        tagsMap.set(tag.template_id, existing);
      }
    }

    const templates: DbHomeworkLibraryTemplate[] = (data ?? []).map((t: any) => ({
      ...t,
      category_name: t.homework_categories?.name ?? null,
      theme_name: t.homework_themes?.name ?? null,
      tags: tagsMap.get(t.id) ?? [],
    }));

    return { success: true, data: { templates, total: count ?? 0 } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function getHomeworkTemplate(id: string): Promise<Result<DbHomeworkLibraryTemplate & { sections: DbTemplateSection[] }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    const { data: template, error } = await admin
      .from('homework_library_templates')
      .select('*, homework_categories(name), homework_themes(name)')
      .eq('id', id)
      .single();

    if (error || !template) return { success: false, error: new NotFoundError('Template not found') };

    const { data: sections } = await admin
      .from('homework_template_sections')
      .select('*')
      .eq('template_id', id)
      .order('sort_order', { ascending: true });

    const { data: tags } = await admin
      .from('homework_template_tags')
      .select('tag')
      .eq('template_id', id);

    return {
      success: true,
      data: {
        ...template,
        category_name: (template as any).homework_categories?.name ?? null,
        theme_name: (template as any).homework_themes?.name ?? null,
        tags: (tags ?? []).map((t: any) => t.tag),
        sections: sections ?? [],
      },
    };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function createHomeworkTemplate(data: CreateTemplateInput, createdByUserId: string): Promise<Result<DbHomeworkLibraryTemplate>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const slug = generateSlug(data.title, Date.now().toString(36));

    const { data: inserted, error } = await admin
      .from('homework_library_templates')
      .insert({
        title: data.title,
        slug,
        description: data.description ?? null,
        category_id: data.categoryId ?? null,
        theme_id: data.themeId ?? null,
        level: data.level ?? 'BEGINNER',
        difficulty: data.difficulty ?? 'easy',
        estimated_time: data.estimatedTime ?? 30,
        thumbnail_url: data.thumbnailUrl ?? null,
        cover_image_url: data.coverImageUrl ?? null,
        status: 'draft',
        version: 1,
        created_by: createdByUserId,
        updated_by: createdByUserId,
      })
      .select()
      .single();

    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create homework template', error) };

    // Insert tags
    if (data.tags && data.tags.length > 0) {
      await admin.from('homework_template_tags').insert(
        data.tags.map(tag => ({ template_id: inserted.id, tag: tag.toLowerCase().trim() }))
      );
    }

    return { success: true, data: { ...inserted, tags: data.tags ?? [] } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function updateHomeworkTemplate(id: string, data: UpdateTemplateInput, updatedByUserId: string): Promise<Result<DbHomeworkLibraryTemplate>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // Check current status
    const { data: current } = await admin
      .from('homework_library_templates')
      .select('status, version, title')
      .eq('id', id)
      .single();

    if (!current) return { success: false, error: new NotFoundError('Template not found') };

    // If published, snapshot it as a version record before updating
    if (current.status === 'published') {
      const { data: fullTemplate } = await admin
        .from('homework_library_templates')
        .select('*')
        .eq('id', id)
        .single();
      await admin.from('homework_template_versions').insert({
        template_id: id,
        version: current.version,
        snapshot: fullTemplate ?? {},
        changed_by: updatedByUserId,
      });
    }

    const updates: Record<string, unknown> = { updated_by: updatedByUserId };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId;
    if (data.themeId !== undefined) updates.theme_id = data.themeId;
    if (data.level !== undefined) updates.level = data.level;
    if (data.difficulty !== undefined) updates.difficulty = data.difficulty;
    if (data.estimatedTime !== undefined) updates.estimated_time = data.estimatedTime;
    if (data.thumbnailUrl !== undefined) updates.thumbnail_url = data.thumbnailUrl;
    if (data.coverImageUrl !== undefined) updates.cover_image_url = data.coverImageUrl;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'published' && current.status === 'draft') {
        updates.version = current.version + 1;
      }
    }

    const { data: updated, error } = await admin
      .from('homework_library_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) return { success: false, error: new DatabaseError('Failed to update homework template', error) };

    // Update tags if provided
    if (data.tags !== undefined) {
      await admin.from('homework_template_tags').delete().eq('template_id', id);
      if (data.tags.length > 0) {
        await admin.from('homework_template_tags').insert(
          data.tags.map(tag => ({ template_id: id, tag: tag.toLowerCase().trim() }))
        );
      }
    }

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function publishHomeworkTemplate(id: string, publishedByUserId: string): Promise<Result<DbHomeworkLibraryTemplate>> {
  return updateHomeworkTemplate(id, { status: 'published' }, publishedByUserId);
}

export async function archiveHomeworkTemplate(id: string, archivedByUserId: string): Promise<Result<DbHomeworkLibraryTemplate>> {
  return updateHomeworkTemplate(id, { status: 'archived' }, archivedByUserId);
}

export async function duplicateHomeworkTemplate(id: string, duplicatedByUserId: string): Promise<Result<DbHomeworkLibraryTemplate>> {
  try {
    await assertAdmin();
    const templateResult = await getHomeworkTemplate(id);
    if (!templateResult.success || !templateResult.data) {
      return { success: false, error: new NotFoundError('Template not found') };
    }
    const src = templateResult.data;

    const newResult = await createHomeworkTemplate(
      {
        title: `${src.title} (Copy)`,
        description: src.description ?? undefined,
        categoryId: src.category_id ?? undefined,
        themeId: src.theme_id ?? undefined,
        level: src.level,
        difficulty: src.difficulty,
        estimatedTime: src.estimated_time,
        thumbnailUrl: src.thumbnail_url ?? undefined,
        coverImageUrl: src.cover_image_url ?? undefined,
        tags: src.tags,
      },
      duplicatedByUserId
    );

    if (!newResult.success || !newResult.data) return newResult;

    // Duplicate sections
    if (src.sections && src.sections.length > 0) {
      const admin = createSupabaseAdmin();
      await admin.from('homework_template_sections').insert(
        src.sections.map(s => ({
          template_id: newResult.data!.id,
          section_type: s.section_type,
          title: s.title,
          content: s.content,
          media_url: s.media_url,
          media_path: s.media_path,
          fen_position: s.fen_position,
          pgn_data: s.pgn_data,
          sort_order: s.sort_order,
        }))
      );
    }

    return newResult;
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function deleteHomeworkTemplate(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    // Check not published
    const { data: tmpl } = await admin.from('homework_library_templates').select('status').eq('id', id).single();
    if (tmpl?.status === 'published') {
      return { success: false, error: new ForbiddenError('Cannot delete a published template. Archive it first.') };
    }
    const { error } = await admin.from('homework_library_templates').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete template', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Template Sections ───────────────────────────────────────────────────────

export async function listTemplateSections(templateId: string): Promise<Result<DbTemplateSection[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('homework_template_sections')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });
    if (error) return { success: false, error: new DatabaseError('Failed to list sections', error) };
    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function createTemplateSection(data: CreateSectionInput): Promise<Result<DbTemplateSection>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { data: inserted, error } = await admin
      .from('homework_template_sections')
      .insert({
        template_id: data.templateId,
        section_type: data.sectionType,
        title: data.title ?? null,
        content: data.content ?? null,
        media_url: data.mediaUrl ?? null,
        media_path: data.mediaPath ?? null,
        fen_position: data.fenPosition ?? null,
        pgn_data: data.pgnData ?? null,
        sort_order: data.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create section', error) };
    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function updateTemplateSection(id: string, data: Partial<Omit<CreateSectionInput, 'templateId'>>): Promise<Result<DbTemplateSection>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (data.sectionType !== undefined) updates.section_type = data.sectionType;
    if (data.title !== undefined) updates.title = data.title;
    if (data.content !== undefined) updates.content = data.content;
    if (data.mediaUrl !== undefined) updates.media_url = data.mediaUrl;
    if (data.mediaPath !== undefined) updates.media_path = data.mediaPath;
    if (data.fenPosition !== undefined) updates.fen_position = data.fenPosition;
    if (data.pgnData !== undefined) updates.pgn_data = data.pgnData;
    if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder;
    const { data: updated, error } = await admin.from('homework_template_sections').update(updates).eq('id', id).select().single();
    if (error || !updated) return { success: false, error: new DatabaseError('Failed to update section', error) };
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function deleteTemplateSection(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('homework_template_sections').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete section', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Collections ─────────────────────────────────────────────────────────────

export async function listHwCollections(): Promise<Result<DbHwCollection[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data: collections, error } = await admin
      .from('hw_collections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { success: false, error: new DatabaseError('Failed to list collections', error) };

    const ids = (collections ?? []).map((c: any) => c.id);
    const countMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: items } = await admin.from('hw_collection_items').select('collection_id').in('collection_id', ids);
      for (const item of items ?? []) {
        countMap.set(item.collection_id, (countMap.get(item.collection_id) ?? 0) + 1);
      }
    }

    const result: DbHwCollection[] = (collections ?? []).map((c: any) => ({
      ...c,
      item_count: countMap.get(c.id) ?? 0,
    }));
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function createHwCollection(data: CreateCollectionInput, createdByUserId: string): Promise<Result<DbHwCollection>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const slug = generateSlug(data.title, Date.now().toString(36));
    const { data: inserted, error } = await admin
      .from('hw_collections')
      .insert({ title: data.title, slug, description: data.description ?? null, cover_url: data.coverUrl ?? null, status: data.status ?? 'draft', created_by: createdByUserId })
      .select()
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create collection', error) };
    return { success: true, data: { ...inserted, item_count: 0 } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function updateHwCollection(id: string, data: Partial<CreateCollectionInput>): Promise<Result<DbHwCollection>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.coverUrl !== undefined) updates.cover_url = data.coverUrl;
    if (data.status !== undefined) updates.status = data.status;
    const { data: updated, error } = await admin.from('hw_collections').update(updates).eq('id', id).select().single();
    if (error || !updated) return { success: false, error: new DatabaseError('Failed to update collection', error) };
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function deleteHwCollection(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('hw_collections').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete collection', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function addTemplateToCollection(collectionId: string, templateId: string, sortOrder?: number): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { data: inserted, error } = await admin
      .from('hw_collection_items')
      .insert({ collection_id: collectionId, template_id: templateId, sort_order: sortOrder ?? 0 })
      .select('id')
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to add template to collection', error) };
    return { success: true, data: { id: inserted.id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function removeTemplateFromCollection(collectionId: string, templateId: string): Promise<Result<void>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('hw_collection_items').delete().eq('collection_id', collectionId).eq('template_id', templateId);
    if (error) return { success: false, error: new DatabaseError('Failed to remove template from collection', error) };
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function getCollectionWithTemplates(collectionId: string): Promise<Result<DbHwCollection & { templates: DbHomeworkLibraryTemplate[] }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data: collection, error } = await admin.from('hw_collections').select('*').eq('id', collectionId).single();
    if (error || !collection) return { success: false, error: new NotFoundError('Collection not found') };

    const { data: items } = await admin.from('hw_collection_items').select('template_id, sort_order').eq('collection_id', collectionId).order('sort_order', { ascending: true });
    const templateIds = (items ?? []).map((i: any) => i.template_id);
    let templates: DbHomeworkLibraryTemplate[] = [];
    if (templateIds.length > 0) {
      const { data: tmplData } = await admin.from('homework_library_templates').select('*, homework_categories(name), homework_themes(name)').in('id', templateIds);
      const sortOrder = new Map<string, number>((items ?? []).map((i: any) => [i.template_id, Number(i.sort_order) || 0]));
      templates = ((tmplData ?? []) as any[])
        .sort((a, b) => (sortOrder.get(a.id) || 0) - (sortOrder.get(b.id) || 0))
        .map(t => ({ ...t, category_name: t.homework_categories?.name ?? null, theme_name: t.homework_themes?.name ?? null, tags: [] }));
    }
    return { success: true, data: { ...collection, item_count: templates.length, templates } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export async function listHwCourses(): Promise<Result<DbHwCourse[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data: courses, error } = await admin
      .from('hw_courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { success: false, error: new DatabaseError('Failed to list courses', error) };

    const ids = (courses ?? []).map((c: any) => c.id);
    const countMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: cc } = await admin.from('hw_course_collections').select('course_id').in('course_id', ids);
      for (const item of cc ?? []) {
        countMap.set(item.course_id, (countMap.get(item.course_id) ?? 0) + 1);
      }
    }

    const result: DbHwCourse[] = (courses ?? []).map((c: any) => ({
      ...c,
      collection_count: countMap.get(c.id) ?? 0,
    }));
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function createHwCourse(data: CreateCourseInput, createdByUserId: string): Promise<Result<DbHwCourse>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const slug = generateSlug(data.title, Date.now().toString(36));
    const { data: inserted, error } = await admin
      .from('hw_courses')
      .insert({ title: data.title, slug, description: data.description ?? null, cover_url: data.coverUrl ?? null, level: data.level ?? 'BEGINNER', status: data.status ?? 'draft', created_by: createdByUserId })
      .select()
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to create course', error) };
    return { success: true, data: { ...inserted, collection_count: 0 } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function updateHwCourse(id: string, data: Partial<CreateCourseInput>): Promise<Result<DbHwCourse>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.coverUrl !== undefined) updates.cover_url = data.coverUrl;
    if (data.level !== undefined) updates.level = data.level;
    if (data.status !== undefined) updates.status = data.status;
    const { data: updated, error } = await admin.from('hw_courses').update(updates).eq('id', id).select().single();
    if (error || !updated) return { success: false, error: new DatabaseError('Failed to update course', error) };
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function deleteHwCourse(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('hw_courses').delete().eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to delete course', error) };
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function addCollectionToCourse(courseId: string, collectionId: string, sortOrder?: number): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { data: inserted, error } = await admin
      .from('hw_course_collections')
      .insert({ course_id: courseId, collection_id: collectionId, sort_order: sortOrder ?? 0 })
      .select('id')
      .single();
    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to add collection to course', error) };
    return { success: true, data: { id: inserted.id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function removeCollectionFromCourse(courseId: string, collectionId: string): Promise<Result<void>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('hw_course_collections').delete().eq('course_id', courseId).eq('collection_id', collectionId);
    if (error) return { success: false, error: new DatabaseError('Failed to remove collection from course', error) };
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

// ─── Template Assignments (Coach assigns Library templates to students) ────

export async function assignTemplate(data: AssignTemplateInput): Promise<Result<DbTemplateAssignment>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    // Check if already assigned
    const { data: existing } = await admin
      .from('hw_template_assignments')
      .select('id')
      .eq('template_id', data.templateId)
      .eq('student_id', data.studentProfileId)
      .maybeSingle();

    if (existing) return { success: false, error: new DatabaseError('This template is already assigned to this student.') };

    const { data: inserted, error } = await admin
      .from('hw_template_assignments')
      .insert({
        template_id: data.templateId,
        student_id: data.studentProfileId,
        coach_id: data.coachProfileId ?? null,
        collection_id: data.collectionId ?? null,
        course_id: data.courseId ?? null,
        status: 'assigned',
        coach_notes: data.coachNotes ?? null,
        available_at: data.availableAt ?? null,
        due_at: data.dueAt ?? null,
      })
      .select()
      .single();

    if (error || !inserted) return { success: false, error: new DatabaseError('Failed to assign template', error) };
    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function assignCollectionToStudent(data: {
  collectionId: string;
  studentProfileId: string;
  coachProfileId?: string;
  dueAt?: string;
  coachNotes?: string;
}): Promise<Result<{ count: number }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data: items } = await admin.from('hw_collection_items').select('template_id, sort_order').eq('collection_id', data.collectionId).order('sort_order', { ascending: true });
    let count = 0;
    for (const item of items ?? []) {
      const res = await assignTemplate({
        templateId: item.template_id,
        studentProfileId: data.studentProfileId,
        coachProfileId: data.coachProfileId,
        collectionId: data.collectionId,
        coachNotes: data.coachNotes,
        dueAt: data.dueAt,
      });
      if (res.success) count++;
    }
    return { success: true, data: { count } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function assignCourseToStudent(data: {
  courseId: string;
  studentProfileId: string;
  coachProfileId?: string;
  coachNotes?: string;
}): Promise<Result<{ count: number }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data: cc } = await admin.from('hw_course_collections').select('collection_id').eq('course_id', data.courseId).order('sort_order', { ascending: true });
    let count = 0;
    for (const cc_item of cc ?? []) {
      const res = await assignCollectionToStudent({
        collectionId: cc_item.collection_id,
        studentProfileId: data.studentProfileId,
        coachProfileId: data.coachProfileId,
        courseId: data.courseId,
        coachNotes: data.coachNotes,
      } as any);
      if (res.success) count += (res.data as any).count;
    }
    return { success: true, data: { count } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function getStudentTemplateAssignments(studentProfileId: string): Promise<Result<any[]>> {
  try {
    const admin = createSupabaseAdmin();
    const { data: assignments, error } = await admin
      .from('hw_template_assignments')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('assigned_at', { ascending: false });

    if (error) return { success: false, error: new DatabaseError('Failed to fetch template assignments', error) };

    const templateIds = [...new Set((assignments ?? []).map((a: any) => a.template_id))];
    let templatesMap = new Map<string, any>();
    if (templateIds.length > 0) {
      const { data: templates } = await admin.from('homework_library_templates').select('id, title, level, difficulty, estimated_time, status, thumbnail_url').in('id', templateIds);
      templatesMap = new Map((templates ?? []).map((t: any) => [t.id, t]));
    }

    const assignmentIds = (assignments ?? []).map((a: any) => a.id);
    let submissionsMap = new Map<string, any>();
    if (assignmentIds.length > 0) {
      const { data: subs } = await admin
        .from('hw_template_submissions')
        .select('*')
        .in('assignment_id', assignmentIds)
        .order('attempt_number', { ascending: false });
      for (const sub of subs ?? []) {
        if (!submissionsMap.has(sub.assignment_id)) submissionsMap.set(sub.assignment_id, sub);
      }
    }

    const result = (assignments ?? []).map((a: any) => ({
      ...a,
      template: templatesMap.get(a.template_id) ?? null,
      latestSubmission: submissionsMap.get(a.id) ?? null,
    }));

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function getCoachTemplateSubmissions(coachProfileId: string): Promise<Result<any[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    const { data: assignments, error } = await admin
      .from('hw_template_assignments')
      .select('*')
      .eq('coach_id', coachProfileId)
      .in('status', ['submitted', 'reviewed', 'approved', 'reassigned']);

    if (error || !assignments || assignments.length === 0) return { success: true, data: [] };

    const templateIds = [...new Set(assignments.map((a: any) => a.template_id))];
    const studentIds = [...new Set(assignments.map((a: any) => a.student_id))];
    const assignmentIds = assignments.map((a: any) => a.id);

    const [templatesRes, studentsRes, submissionsRes] = await Promise.all([
      admin.from('homework_library_templates').select('id, title, level').in('id', templateIds),
      admin.from('student_profiles').select('id, user_id').in('id', studentIds),
      admin.from('hw_template_submissions').select('*').in('assignment_id', assignmentIds).order('attempt_number', { ascending: false }),
    ]);

    const templatesMap = new Map((templatesRes.data ?? []).map((t: any) => [t.id, t]));
    const studentProfileToUserId = new Map((studentsRes.data ?? []).map((s: any) => [s.id, s.user_id]));
    const studentUserIds = [...new Set((studentsRes.data ?? []).map((s: any) => s.user_id))];

    let usersMap = new Map<string, any>();
    if (studentUserIds.length > 0) {
      const { data: users } = await admin.from('users').select('id, first_name, last_name').in('id', studentUserIds);
      usersMap = new Map((users ?? []).map((u: any) => [u.id, u]));
    }

    const submissionsMap = new Map<string, any>();
    for (const sub of submissionsRes.data ?? []) {
      if (!submissionsMap.has(sub.assignment_id)) submissionsMap.set(sub.assignment_id, sub);
    }

    const result = assignments.map((a: any) => {
      const userId = studentProfileToUserId.get(a.student_id);
      const user = userId != null ? usersMap.get(userId as string) : null;
      return {
        id: a.id,
        templateId: a.template_id,
        templateTitle: (templatesMap.get(a.template_id) as any)?.title ?? 'Unknown',
        studentName: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
        studentId: a.student_id,
        status: a.status,
        assignedAt: a.assigned_at,
        dueAt: a.due_at,
        coachNotes: a.coach_notes,
        submission: submissionsMap.get(a.id) ?? null,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function submitTemplateHomework(assignmentId: string, answers: string, filePath?: string): Promise<Result<{ assignmentId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: new AuthenticationError('User is not authenticated.') };
    const admin = createSupabaseAdmin();

    let { data: studentProfile } = await admin.from('student_profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (!studentProfile) {
      const { data: newProfile } = await admin.from('student_profiles').insert({ user_id: user.id, rating: 1200 }).select('id').single();
      studentProfile = newProfile || { id: user.id };
    }

    // Get current attempt number
    const { data: existingSubs } = await admin
      .from('hw_template_submissions')
      .select('attempt_number')
      .eq('assignment_id', assignmentId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const attemptNumber = (existingSubs?.[0]?.attempt_number ?? 0) + 1;

    await admin.from('hw_template_submissions').insert({
      assignment_id: assignmentId,
      answers,
      file_path: filePath ?? null,
      attempt_number: attemptNumber,
    });

    await admin.from('hw_template_assignments').update({ status: 'submitted' }).eq('id', assignmentId);

    return { success: true, data: { assignmentId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function reviewTemplateSubmission(
  assignmentId: string,
  gradeScore: number,
  feedback: string,
  approve: boolean
): Promise<Result<{ assignmentId: string }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    // Update latest submission
    const { data: subs } = await admin
      .from('hw_template_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (subs && subs.length > 0) {
      await admin.from('hw_template_submissions').update({
        grade_score: gradeScore,
        coach_feedback: feedback,
        reviewed_at: new Date().toISOString(),
      }).eq('id', subs[0].id);
    }

    await admin.from('hw_template_assignments').update({
      status: approve ? 'approved' : 'reviewed',
    }).eq('id', assignmentId);

    return { success: true, data: { assignmentId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function reassignTemplateHomework(assignmentId: string, coachNotes?: string): Promise<Result<{ assignmentId: string }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    await admin.from('hw_template_assignments').update({
      status: 'reassigned',
      coach_notes: coachNotes ?? null,
    }).eq('id', assignmentId);
    return { success: true, data: { assignmentId } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}

export async function getTemplateVersionHistory(templateId: string): Promise<Result<any[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('homework_template_versions')
      .select('id, version, created_at, changed_by, users(first_name, last_name)')
      .eq('template_id', templateId)
      .order('version', { ascending: false });
    if (error) return { success: false, error: new DatabaseError('Failed to fetch version history', error) };
    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return { success: false, error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error') };
  }
}
