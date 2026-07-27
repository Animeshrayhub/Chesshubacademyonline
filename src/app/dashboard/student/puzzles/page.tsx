import React from 'react';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchLichessDailyPuzzle } from '@/lib/puzzles/lichess';
import { getStudentPuzzleHistory } from '@/lib/puzzles/results';
import PuzzleBoard from '@/components/dashboard/ui/PuzzleBoard';
import PlayBotBoard from '@/components/dashboard/ui/PlayBotBoard';
import CoordinateTrainer from '@/components/dashboard/ui/CoordinateTrainer';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import Link from 'next/link';
import { getStudentHomework } from '@/lib/students';
import CoachAssignedPuzzlesList from '@/features/student/CoachAssignedPuzzlesList';
import StudentLeaderboardClient, { type LeaderboardStudentData } from '@/features/student/StudentLeaderboardClient';

export const dynamic = 'force-dynamic';

interface PuzzlesPageProps {
  searchParams: {
    tab?: string;
  };
}

export default async function StudentPuzzlesPage({ searchParams }: PuzzlesPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/student/puzzles');
  }

  const admin = createSupabaseAdmin();

  // Resolve student profile or auto-provision if missing
  let studentProfile = null;
  const { data: existingProfile } = await admin
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    studentProfile = existingProfile;
  } else {
    const { data: newProfile } = await admin
      .from('student_profiles')
      .insert({ user_id: user.id, rating: 1200 })
      .select('id')
      .single();
    studentProfile = newProfile || { id: user.id };
  }

  // Fetch puzzle, history & homework parallelly
  const [puzzleRes, historyRes, homeworkRes] = await Promise.allSettled([
    fetchLichessDailyPuzzle(),
    getStudentPuzzleHistory(studentProfile.id, 50),
    getStudentHomework(),
  ]);

  const puzzle = puzzleRes.status === 'fulfilled' ? puzzleRes.value : null;
  const history =
    historyRes.status === 'fulfilled' && historyRes.value.success
      ? historyRes.value.data
      : [];
  const homework =
    homeworkRes.status === 'fulfilled' && homeworkRes.value.success
      ? homeworkRes.value.data
      : [];

  const coachAssignedPuzzles = homework.filter((h: any) => h.pgnData);

  const activeTab = searchParams.tab || 'today';

  // Filter history lists
  const solvedPuzzles = history.filter((r) => r.solved);
  const favouritePuzzles = history.filter((r) => r.is_favourite);

  // 1. Fetch data for leaderboards
  const { data: usersList } = await admin
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'STUDENT')
    .is('archived_at', null);

  const { data: studentProfiles } = await admin
    .from('student_profiles')
    .select('id, user_id');

  const { data: puzzleAggr } = await admin
    .from('puzzle_results')
    .select('student_id, solved, solved_at');

  const { data: homeworkAggr } = await admin
    .from('homework_assignments')
    .select('student_id, status')
    .in('status', ['submitted', 'reviewed']);

  const userMap = new Map((usersList ?? []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]));
  const students = (studentProfiles ?? []).map((p: any) => {
    const userId = p.user_id;
    const name = userMap.get(userId) || 'Anonymous Student';
    return { id: p.id, name };
  });

  const puzzleSolvedMap: Record<string, number> = {};
  const puzzleWeeklyXpMap: Record<string, number> = {};
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  (puzzleAggr ?? []).forEach((row: any) => {
    if (row.solved) {
      puzzleSolvedMap[row.student_id] = (puzzleSolvedMap[row.student_id] || 0) + 1;
      
      const solvedTime = new Date(row.solved_at);
      if (solvedTime >= oneWeekAgo) {
        puzzleWeeklyXpMap[row.student_id] = (puzzleWeeklyXpMap[row.student_id] || 0) + 10;
      }
    }
  });

  const homeworkCompletedMap: Record<string, number> = {};
  (homeworkAggr ?? []).forEach((row: any) => {
    homeworkCompletedMap[row.student_id] = (homeworkCompletedMap[row.student_id] || 0) + 1;
  });

  const leaderboardStudents: LeaderboardStudentData[] = students.map((s: any) => ({
    id: s.id,
    name: s.name,
    solved: puzzleSolvedMap[s.id] || 0,
    xp: puzzleWeeklyXpMap[s.id] || 0,
    homeworkCompleted: homeworkCompletedMap[s.id] || 0,
  }));

  // Tabs navigation helper
  const tabs = [
    { id: 'today', label: "Today's Puzzle", count: null },
    { id: 'coach', label: 'Coach Assigned', count: coachAssignedPuzzles.length },
    { id: 'trainer', label: 'Coordinate Trainer', count: null },
    { id: 'playbot', label: 'Play Computer Bot', count: null },
    { id: 'leaderboard', label: 'Leaderboard', count: null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="ChessHub Puzzle Center"
          subtitle="Sharpen your tactical vision with daily puzzles and assigned training."
        />
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary font-semibold transition-colors"
        >
          <DashboardIcon iconKey="arrowLeft" className="w-3.5 h-3.5" />
          Back to Overview
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex flex-wrap gap-2 -mb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/dashboard/student/puzzles?tab=${tab.id}`}
                className={`
                  py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 focus:outline-none
                  ${
                    isActive
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-300'
                  }
                `}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-text-secondary'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {activeTab === 'today' && (
          <div className="space-y-4">
            {puzzle ? (
              <PuzzleBoard puzzle={puzzle} />
            ) : (
              <div className="bg-white rounded-2xl border border-border p-8 text-center text-text-secondary">
                <p className="font-semibold text-sm">Failed to load daily puzzle.</p>
                <p className="text-xs mt-1 text-slate-500">Please check your internet connection and reload.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coach' && (
          <CoachAssignedPuzzlesList assignments={homework} />
        )}

        {activeTab === 'trainer' && (
          <CoordinateTrainer />
        )}

        {activeTab === 'leaderboard' && (
          <StudentLeaderboardClient initialStudents={leaderboardStudents} />
        )}

        {activeTab === 'playbot' && (
          <div className="space-y-4">
            <PlayBotBoard />
          </div>
        )}
      </div>
    </div>
  );
}
