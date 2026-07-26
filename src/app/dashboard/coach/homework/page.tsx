import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import HomeworkReviewRegistry from '@/features/coach/HomeworkReviewRegistry';
import { getCoachHomeworkSubmissions } from '@/lib/homework';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function CoachHomeworkPage() {
  const user = await getCurrentUser();
  const coachUserId = user?.id || '';
  const admin = createSupabaseAdmin();

  // 1. Fetch coach homework submissions
  const submissionsRes = await getCoachHomeworkSubmissions(coachUserId);
  const submissions = submissionsRes.success && submissionsRes.data ? submissionsRes.data : [];

  // 2. Fetch coach profile id
  const { data: coachProfile } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('user_id', coachUserId)
    .maybeSingle();
  const coachProfileId = coachProfile?.id || coachUserId;

  // 3. Fetch active students
  const { data: studentProfiles } = await admin
    .from('student_profiles')
    .select('id, user_id, level');

  const studentUserIds = (studentProfiles ?? []).map((sp: any) => sp.user_id);
  let studentUsersMap = new Map<string, any>();
  if (studentUserIds.length > 0) {
    const { data: usersData } = await admin
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', studentUserIds);
    studentUsersMap = new Map((usersData ?? []).map((u: any) => [u.id, u]));
  }

  const studentsList = (studentProfiles ?? []).map((sp: any) => {
    const u = studentUsersMap.get(sp.user_id);
    return {
      id: sp.id,
      name: u ? `${u.first_name} ${u.last_name}` : 'Student',
      email: u?.email || '',
      level: sp.level || 'BEGINNER',
    };
  });

  // 4. Fetch active classes
  const { data: classesData } = await admin
    .from('classes')
    .select('id, class_type, scheduled_start')
    .is('archived_at', null)
    .order('scheduled_start', { ascending: false });

  const classesList = (classesData ?? []).map((c: any) => ({
    id: c.id,
    name: `${c.class_type} Class (${new Date(c.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
  }));

  // 5. Fetch all workbooks and chapters for assignment
  const { data: workbooksData } = await admin
    .from('homework_workbooks')
    .select('id, title, track');

  const { data: chaptersData } = await admin
    .from('homework_chapters')
    .select('id, workbook_id, chapter_number, title, questions_count, pgn_data')
    .order('chapter_number', { ascending: true });

  const chaptersList = (chaptersData ?? []).map((ch: any) => {
    const wb = (workbooksData ?? []).find((w: any) => w.id === ch.workbook_id);
    return {
      id: ch.id,
      workbookId: ch.workbook_id,
      workbookTitle: wb?.title || 'Workbook',
      chapterNumber: ch.chapter_number,
      title: ch.title,
      questionsCount: ch.questions_count || 0,
      hasPgn: !!ch.pgn_data,
      pgnData: ch.pgn_data || null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework Submissions & Assignments"
        subtitle="Review uploaded workbook sheets, verify tactical solutions, and assign puzzle homework to students."
      />

      <HomeworkReviewRegistry
        submissions={submissions}
        coachProfileId={coachProfileId}
        students={studentsList}
        classes={classesList}
        chapters={chaptersList}
        workbooks={workbooksData ?? []}
      />
    </div>
  );
}

