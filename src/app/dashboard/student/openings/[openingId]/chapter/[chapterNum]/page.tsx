import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import {
  getOpeningById,
  getOpeningChapter,
  getChapterPositions,
  getStudentChapterProgress,
  upsertChapterProgress,
  initializeOpeningForStudent,
} from '@/lib/openings';
import { createSupabaseServer } from '@/lib/supabase/server';
import LessonClient from './LessonClient';
import type { OpeningDifficulty } from '@/types/opening-teacher';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { openingId: string; chapterNum: string };
}) {
  return {
    title: `Chapter ${params.chapterNum} Lesson | ChessHub AI Opening Teacher`,
  };
}

export default async function ChapterLessonPage({
  params,
}: {
  params: { openingId: string; chapterNum: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'STUDENT') redirect('/dashboard');

  const chapterNum = parseInt(params.chapterNum, 10);
  if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 8) notFound();

  // Fetch opening, chapter, positions, and progress in parallel
  const [openingRes, chapterRes] = await Promise.all([
    getOpeningById(params.openingId),
    getOpeningChapter(params.openingId, chapterNum),
  ]);

  if (!openingRes.success || !openingRes.data) notFound();
  if (!chapterRes.success || !chapterRes.data) notFound();

  const opening = openingRes.data;
  const chapter = chapterRes.data;

  // Get chapter positions and student progress
  const [positionsRes, progressRes] = await Promise.all([
    getChapterPositions(chapter.id),
    getStudentChapterProgress(user.id, chapter.id),
  ]);

  const progress = progressRes.data;

  // Enforce chapter lock — chapter 1 is always accessible, others need unlock
  if (chapterNum > 1 && (!progress || !progress.is_unlocked)) {
    redirect(`/dashboard/student/openings/${params.openingId}`);
  }

  // Auto-initialize opening for student if first visit to chapter 1
  if (chapterNum === 1) {
    void initializeOpeningForStudent(user.id, params.openingId).catch(() => {});
  }

  // Mark as in_progress if first time entering
  if (!progress || progress.status === 'locked' || progress.status === 'unlocked') {
    void upsertChapterProgress(user.id, chapter.id, params.openingId, {
      status: 'in_progress',
      is_unlocked: true,
      started_at: progress?.started_at ?? new Date().toISOString(),
    }).catch(() => {});
  }

  // Get student level from their profile
  const supabase = createSupabaseServer();
  const { data: studentProfile } = await supabase
    .from('students')
    .select('current_track')
    .eq('id', user.id)
    .maybeSingle();

  const studentLevel: OpeningDifficulty =
    (studentProfile?.current_track as OpeningDifficulty | null) ?? 'Beginner';

  return (
    <LessonClient
      openingId={opening.id}
      openingName={opening.name}
      openingNameHindi={opening.name_hindi}
      chapter={chapter}
      positions={positionsRes.data}
      initialProgress={progress}
      studentLevel={studentLevel}
    />
  );
}
