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

  const leaderboardSolved = students.map((s: any) => ({
    name: s.name,
    value: puzzleSolvedMap[s.id] || 0,
    detail: `${puzzleSolvedMap[s.id] || 0} solved`,
  })).sort((a: any, b: any) => b.value - a.value).slice(0, 10);

  const leaderboardXp = students.map((s: any) => ({
    name: s.name,
    value: puzzleWeeklyXpMap[s.id] || 0,
    detail: `${puzzleWeeklyXpMap[s.id] || 0} XP`,
  })).sort((a: any, b: any) => b.value - a.value).slice(0, 10);

  const leaderboardHomework = students.map((s: any) => ({
    name: s.name,
    value: homeworkCompletedMap[s.id] || 0,
    detail: `${homeworkCompletedMap[s.id] || 0} completed`,
  })).sort((a: any, b: any) => b.value - a.value).slice(0, 10);

  // Tabs navigation helper
  const tabs = [
    { id: 'today', label: "Today's Puzzle", count: null },
    { id: 'history', label: 'Puzzle History', count: history.length },
    { id: 'coach', label: 'Coach Assigned', count: coachAssignedPuzzles.length },
    { id: 'solved', label: 'Solved Puzzles', count: solvedPuzzles.length },
    { id: 'favourites', label: 'Favourite Puzzles', count: favouritePuzzles.length },
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

        {activeTab === 'history' && (
          <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Solving History
              </h3>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No puzzles attempted yet. Solve today&apos;s puzzle to start your history!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-text-secondary font-bold uppercase tracking-wider">
                      <th className="px-6 py-3">Puzzle ID</th>
                      <th className="px-6 py-3">Source</th>
                      <th className="px-6 py-3">Rating</th>
                      <th className="px-6 py-3">Solved Status</th>
                      <th className="px-6 py-3 text-center">Attempts</th>
                      <th className="px-6 py-3 text-center">Time</th>
                      <th className="px-6 py-3 text-center">Accuracy</th>
                      <th className="px-6 py-3">Attempted Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-primary">
                    {history.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-mono text-[11px] font-medium">
                          #{row.puzzle_id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-3.5 uppercase text-[10px] font-bold text-slate-500">
                          {row.puzzle_source}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold">
                          {row.puzzle_rating ?? '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.solved
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {row.solved ? 'Solved ✓' : 'Failed ✗'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-semibold font-mono">
                          {row.attempts}
                        </td>
                        <td className="px-6 py-3.5 text-center font-semibold font-mono">
                          {row.time_seconds ? `${row.time_seconds}s` : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold font-mono text-accent">
                          {row.accuracy != null ? `${Math.round(Number(row.accuracy))}%` : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-text-secondary">
                          {new Date(row.solved_at).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'solved' && (
          <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Successfully Solved Puzzles
              </h3>
            </div>
            {solvedPuzzles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No puzzles solved successfully yet. Keep practicing!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-text-secondary font-bold uppercase tracking-wider">
                      <th className="px-6 py-3">Puzzle ID</th>
                      <th className="px-6 py-3">Rating</th>
                      <th className="px-6 py-3 text-center">Attempts</th>
                      <th className="px-6 py-3 text-center">Time</th>
                      <th className="px-6 py-3 text-center">Accuracy</th>
                      <th className="px-6 py-3">Solved Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-primary">
                    {solvedPuzzles.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-mono text-[11px] font-medium">
                          #{row.puzzle_id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold">
                          {row.puzzle_rating ?? '—'}
                        </td>
                        <td className="px-6 py-3.5 text-center font-semibold font-mono">
                          {row.attempts}
                        </td>
                        <td className="px-6 py-3.5 text-center font-semibold font-mono">
                          {row.time_seconds ? `${row.time_seconds}s` : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold font-mono text-accent">
                          {row.accuracy != null ? `${Math.round(Number(row.accuracy))}%` : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-text-secondary">
                          {new Date(row.solved_at).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favourites' && (
          <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Favourited Puzzles
              </h3>
            </div>
            {favouritePuzzles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No puzzles favourited yet. Favouriting lets you save puzzles for later review.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-text-secondary font-bold uppercase tracking-wider">
                      <th className="px-6 py-3">Puzzle ID</th>
                      <th className="px-6 py-3">Rating</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-center">Accuracy</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-primary">
                    {favouritePuzzles.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-mono text-[11px] font-medium">
                          #{row.puzzle_id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold">
                          {row.puzzle_rating ?? '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.solved ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {row.solved ? 'Solved' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold font-mono text-accent">
                          {row.accuracy != null ? `${Math.round(Number(row.accuracy))}%` : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-text-secondary">
                          {new Date(row.solved_at).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Puzzles Solved Card */}
            <div className="bg-white border border-border rounded-2xl shadow-card p-5">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-border/60 pb-2">
                🔥 Tactics Solved
              </h4>
              <div className="space-y-3">
                {leaderboardSolved.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-secondary w-5">{idx + 1}.</span>
                    <span className="flex-grow font-medium text-text-primary">{item.name}</span>
                    <span className="font-bold text-primary">{item.detail}</span>
                  </div>
                ))}
                {leaderboardSolved.length === 0 && (
                  <p className="text-xs italic text-slate-400">No solve data recorded.</p>
                )}
              </div>
            </div>

            {/* Weekly XP Card */}
            <div className="bg-white border border-border rounded-2xl shadow-card p-5">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-border/60 pb-2">
                ⚡ Weekly XP (7 Days)
              </h4>
              <div className="space-y-3">
                {leaderboardXp.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-secondary w-5">{idx + 1}.</span>
                    <span className="flex-grow font-medium text-text-primary">{item.name}</span>
                    <span className="font-bold text-green-600">{item.detail}</span>
                  </div>
                ))}
                {leaderboardXp.length === 0 && (
                  <p className="text-xs italic text-slate-400">No XP accumulated this week.</p>
                )}
              </div>
            </div>

            {/* Homework Champions Card */}
            <div className="bg-white border border-border rounded-2xl shadow-card p-5">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-border/60 pb-2">
                📝 Homework Champions
              </h4>
              <div className="space-y-3">
                {leaderboardHomework.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-secondary w-5">{idx + 1}.</span>
                    <span className="flex-grow font-medium text-text-primary">{item.name}</span>
                    <span className="font-bold text-orange-600">{item.detail}</span>
                  </div>
                ))}
                {leaderboardHomework.length === 0 && (
                  <p className="text-xs italic text-slate-400">No homework submissions yet.</p>
                )}
              </div>
            </div>
          </div>
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
