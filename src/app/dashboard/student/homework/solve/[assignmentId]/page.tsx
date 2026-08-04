import React from 'react';
import HomeworkPuzzleSession from '@/features/homework/HomeworkPuzzleSession';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { assertStudent } from '@/lib/permissions';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import Link from 'next/link';

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
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-xl text-white space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto">
            🧩
          </div>
          <h3 className="font-heading font-bold text-lg text-amber-400">Homework Chapter Not Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            This specific homework chapter ID does not exist or may have been updated by your coach. You can train with the Central Tactical Puzzle Hub below!
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/dashboard/student/puzzles"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all"
            >
              ⚡ Go to Central Tactical Puzzle Bank
            </Link>
            <Link
              href="/dashboard/student/homework"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors"
            >
              📋 My Homework
            </Link>
          </div>
        </div>
      );
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
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-xl text-white space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto">
          🧩
        </div>
        <h3 className="font-heading font-bold text-lg text-amber-400">Tactical Puzzle Hub</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Train with thousands of tactical positions across all difficulty levels.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/dashboard/student/puzzles"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all"
          >
            ⚡ Open Central Tactical Puzzle Hub
          </Link>
        </div>
      </div>
    );
  }
}
