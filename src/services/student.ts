import { createServerClient } from '@/utils/supabaseServer';

export interface HomeworkSubmissionData {
  assignmentId: string;
  answersJson: string;
  pdfPath?: string;
}

/**
 * Student API service layer. Authenticated sessions verified by RLS policies.
 */
export async function fetchStudentDashboard(studentId: string) {
  const supabase = createServerClient();

  // 1. Fetch Student profile parameters
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select(`
      parent_name,
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
    .eq('id', studentId)
    .single();

  if (studentError) {
    throw new Error(`Failed to load student details: ${studentError.message}`);
  }

  // 2. Fetch upcoming class
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select(`
      class_id,
      classes (
        topic,
        scheduled_start,
        duration_minutes,
        zoom_meeting_url,
        status
      )
    `)
    .eq('student_id', studentId)
    .eq('classes.status', 'scheduled')
    .order('classes.scheduled_start' as any, { ascending: true })
    .limit(1);

  // 3. Fetch active assignments
  const { data: assignments } = await supabase
    .from('homework_assignments')
    .select(`
      id,
      assigned_at,
      due_at,
      status,
      chapters:homework_chapters (
        chapter_number,
        title,
        questions_count,
        workbooks:homework_workbooks (
          title,
          track
        )
      )
    `)
    .eq('student_id', studentId)
    .neq('status', 'reviewed')
    .limit(5);

  return {
    student,
    nextClass: enrollments && enrollments[0] ? enrollments[0].classes : null,
    assignments: assignments || [],
  };
}

export async function submitHomeworkAnswers(submission: HomeworkSubmissionData) {
  const supabase = createServerClient();

  // 1. Write submission record
  const { data: dataSub, error: subError } = await supabase
    .from('homework_submissions')
    .insert([
      {
        assignment_id: submission.assignmentId,
        answers: submission.answersJson,
        pdf_submission_path: submission.pdfPath,
        submitted_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (subError) {
    throw new Error(`Homework submission write failed: ${subError.message}`);
  }

  // 2. Cascade flip assignment status
  const { error: assignError } = await supabase
    .from('homework_assignments')
    .update({ status: 'submitted' })
    .eq('id', submission.assignmentId);

  if (assignError) {
    console.error(`Failed to cascade update assignment state: ${assignError.message}`);
  }

  return dataSub;
}

export async function fetchClassroomUrl(classId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('classes')
    .select('id, zoom_meeting_url, status')
    .eq('id', classId)
    .single();

  if (error) {
    throw new Error(`Failed to resolve class URL: ${error.message}`);
  }

  return data;
}
