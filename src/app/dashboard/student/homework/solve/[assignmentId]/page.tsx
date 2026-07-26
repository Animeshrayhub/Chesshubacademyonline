import React from 'react';
import HomeworkPuzzleSession from '@/features/homework/HomeworkPuzzleSession';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { assertStudent } from '@/lib/permissions';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    assignmentId: string;
  };
}

export default async function StudentHomeworkSolvePage({ params }: PageProps) {
  const { assignmentId } = params;

  try {
    await assertStudent();
    const admin = createSupabaseAdmin();

    // Fetch assignment details for header
    const { data: assignment } = await admin
      .from('homework_assignments')
      .select('id, chapter_id, status')
      .eq('id', assignmentId)
      .maybeSingle();

    if (!assignment) {
      notFound();
    }

    const { data: chapter } = await admin
      .from('homework_chapters')
      .select('title, workbook_id, chapter_number')
      .eq('id', assignment.chapter_id)
      .maybeSingle();

    const { data: workbook } = chapter
      ? await admin
          .from('homework_workbooks')
          .select('title, track')
          .eq('id', chapter.workbook_id)
          .maybeSingle()
      : { data: null };

    const workbookTitle = workbook?.title || 'Homework Workbook';
    const chapterTitle  = chapter ? `Chapter ${chapter.chapter_number}: ${chapter.title}` : 'Tactical Homework';

    return (
      <div className="space-y-6">
        <PageHeader
          title={chapterTitle}
          subtitle={`Solve interactive tactics puzzles for ${workbookTitle}. Complete all puzzles with ≥90% accuracy to unlock the next chapter.`}
        />

        <HomeworkPuzzleSession
          assignmentId={assignmentId}
          chapterTitle={chapterTitle}
          workbookTitle={workbookTitle}
        />
      </div>
    );
  } catch (err) {
    console.error('[StudentHomeworkSolvePage]', err);
    notFound();
  }
}
