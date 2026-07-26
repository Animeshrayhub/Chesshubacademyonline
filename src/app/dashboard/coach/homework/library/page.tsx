import React from 'react';
import CoachLibraryBrowser from '@/features/coach/CoachLibraryBrowser';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { listHomeworkLibrary, listCategories, listHwCollections, listHwCourses } from '@/lib/homework';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Homework Library — Coach | ChessHub Academy' };

export default async function CoachLibraryPage() {
  const user = await getCurrentUser();
  const admin = createSupabaseAdmin();

  // Get coach profile ID
  const { data: coachProfile } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user?.id ?? '')
    .maybeSingle();
  const coachProfileId = coachProfile?.id ?? '';

  // Fetch library data — published only for coaches
  const [libraryRes, catsRes, collsRes, coursesRes] = await Promise.all([
    listHomeworkLibrary({ status: 'published', pageSize: 20 }),
    listCategories(),
    listHwCollections(),
    listHwCourses(),
  ]);

  const templates  = libraryRes.success && libraryRes.data  ? libraryRes.data.templates : [];
  const total      = libraryRes.success && libraryRes.data  ? libraryRes.data.total      : 0;
  const categories = catsRes.success    && catsRes.data     ? catsRes.data               : [];
  const collections= collsRes.success   && collsRes.data    ? collsRes.data.filter((c: any) => c.status === 'published' || c.status === 'draft') : [];
  const courses    = coursesRes.success  && coursesRes.data  ? coursesRes.data.filter((c: any) => c.status === 'published' || c.status === 'draft') : [];

  // Fetch students
  const { data: studentProfiles } = await admin
    .from('student_profiles')
    .select('id, user_id, level')
    .is('archived_at', null);

  const studentUserIds = (studentProfiles ?? []).map((sp: any) => sp.user_id);
  let studentUsersMap = new Map<string, any>();
  if (studentUserIds.length > 0) {
    const { data: usersData } = await admin
      .from('users')
      .select('id, first_name, last_name')
      .in('id', studentUserIds);
    studentUsersMap = new Map((usersData ?? []).map((u: any) => [u.id, u]));
  }

  const studentsList = (studentProfiles ?? []).map((sp: any) => {
    const u = studentUsersMap.get(sp.user_id);
    return { id: sp.id, name: u ? `${u.first_name} ${u.last_name}` : 'Student', level: sp.level || 'BEGINNER' };
  });

  return (
    <CoachLibraryBrowser
      initialTemplates={templates}
      initialTotal={total}
      categories={categories}
      collections={collections}
      courses={courses}
      students={studentsList}
      coachProfileId={coachProfileId}
    />
  );
}
