import { createServerClient } from '@/utils/supabaseServer';

export interface AttendanceRecord {
  enrollmentId: string;
  attended: boolean;
  notes?: string;
}

/**
 * Coach API service layer. Authenticated sessions verified by RLS policies.
 */
export async function fetchAssignedStudents(coachId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      parent_name,
      parent_phone,
      fide_rating,
      lichess_username,
      lichess_rating,
      lichess_puzzle_rating,
      current_track,
      profiles (
        display_name,
        email,
        avatar_url
      )
    `)
    .eq('assigned_coach_id', coachId);

  if (error) {
    throw new Error(`Failed to fetch assigned students: ${error.message}`);
  }

  return data;
}

export async function logAttendance(record: AttendanceRecord) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('class_enrollments')
    .update({
      attended: record.attended,
      attendance_notes: record.notes,
    })
    .eq('id', record.enrollmentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update attendance log: ${error.message}`);
  }

  return data;
}

export async function gradeHomeworkSubmission(submissionId: string, score: number, feedback: string) {
  const supabase = createServerClient();

  // Begin transaction via client update
  const { data: submission, error: subError } = await supabase
    .from('homework_submissions')
    .update({
      grade_score: score,
      coach_feedback: feedback,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (subError) {
    throw new Error(`Failed to submit grade details: ${subError.message}`);
  }

  // Auto update parent assignment status to reviewed
  const { error: assignError } = await supabase
    .from('homework_assignments')
    .update({ status: 'reviewed' })
    .eq('id', submission.assignment_id);

  if (assignError) {
    console.error(`Failed to cascade update assignment status: ${assignError.message}`);
  }

  return submission;
}

export async function saveLessonNote(studentId: string, coachId: string, content: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('lesson_notes')
    .insert([
      {
        student_id: studentId,
        coach_id: coachId,
        content,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create lesson note: ${error.message}`);
  }

  return data;
}
