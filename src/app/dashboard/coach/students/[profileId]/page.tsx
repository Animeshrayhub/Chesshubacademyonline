import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import StatCard from '@/components/dashboard/ui/StatCard';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentPuzzleStats, getStudentPuzzleHistory } from '@/lib/puzzles/results';
import { parseStudentStats } from '@/lib/students/stats';
import { getCoachStudentActivitySummary } from '@/lib/activity';
import type { StatCardData } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

interface StudentDetailsPageProps {
  params: {
    profileId: string;
  };
}

export default async function CoachStudentDetailsPage({ params }: StudentDetailsPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirectTo=/dashboard/coach/students/${params.profileId}`);
  }

  const admin = createSupabaseAdmin();
  const { profileId } = params;

  // 1. Fetch Student profile & user info
  const { data: profile, error: spErr } = await admin
    .from('student_profiles')
    .select('id, user_id, age, level, notes')
    .eq('id', profileId)
    .maybeSingle();

  if (spErr || !profile) {
    return (
      <div className="p-12 text-center text-slate-400">
        Student profile not found.
        <div className="mt-4">
          <Link href="/dashboard/coach/students" className="text-primary hover:underline font-bold text-xs">
            Back to Student List
          </Link>
        </div>
      </div>
    );
  }

  // Fetch user details for name/email
  const { data: studentUser } = await admin
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', profile.user_id)
    .maybeSingle();

  const studentName = studentUser
    ? `${studentUser.first_name} ${studentUser.last_name}`
    : 'Unknown Student';

  // 2. Fetch puzzle stats, audit history and activity summary
  const [statsRes, actSummaryRes, historyRes] = await Promise.all([
    getStudentPuzzleStats(profileId),
    getCoachStudentActivitySummary(profile.user_id),
    getStudentPuzzleHistory(profileId, 100),
  ]);

  const auditLogs = historyRes.success && historyRes.data ? historyRes.data : [];
  const studentStats = parseStudentStats(profile.notes);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    totalAttempts: 0,
    totalSolved: 0,
    solveRate: 0,
    averageTime: 0,
    averageAccuracy: 0,
    solvedToday: 0,
    recentResults: [],
  };

  const actSummary = actSummaryRes.success && actSummaryRes.data ? actSummaryRes.data : {
    botGames: { total: 0, wins: 0, losses: 0, draws: 0, recentGames: [] },
    puzzles: { solved: 0, attempted: 0, accuracy: 0 },
    classes: { totalAttended: 0 },
  };

  const STATS_CARDS: StatCardData[] = [
    {
      label: 'Tactics Elo Rating',
      value: String(studentStats.tacticalRating || 1200),
      iconKey: 'trophy',
      trend: 'neutral',
      trendValue: `${studentStats.puzzleStreak || 0} streak 🔥`,
      colorScheme: 'gold',
    },
    {
      label: 'Solved Today',
      value: `${studentStats.todayPuzzlesSolved ?? stats.solvedToday} / 5`,
      iconKey: 'puzzle',
      trend: 'neutral',
      trendValue: studentStats.dailyGoalAchieved ? '👑 Daily Master' : 'Daily Quota',
      colorScheme: 'green',
    },
    {
      label: 'Solve Accuracy',
      value: `${stats.averageAccuracy}%`,
      iconKey: 'target',
      trend: 'neutral',
      trendValue: `${stats.totalSolved} of ${stats.totalAttempts} solved`,
      colorScheme: 'blue',
    },
    {
      label: 'Avg Solve Speed',
      value: stats.averageTime ? `${stats.averageTime}s` : '—',
      iconKey: 'clock',
      trend: 'neutral',
      trendValue: 'Untimed Zen Calculation',
      colorScheme: 'purple',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/coach/students"
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary font-semibold transition-colors mb-2 focus:outline-none"
          >
            <DashboardIcon iconKey="arrowLeft" className="w-3.5 h-3.5" />
            Back to Student Cohort
          </Link>
          <PageHeader
            title={studentName}
            subtitle={`Overview of progress tracks, homework, and tactical solving metrics for ${studentName}.`}
          />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/coach/students/${params.profileId}/bot-training`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 transition-all"
          >
            ♟️ Bot Training & Weaknesses
          </Link>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
            {profile.level} TRACK
          </span>
        </div>
      </div>

      {/* Student Profile Info Section */}
      <div className="bg-white border border-border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wide block mb-1">
            Contact Details
          </span>
          <p className="text-xs font-semibold text-text-primary">{studentUser?.email || '—'}</p>
          <p className="text-[10px] text-text-secondary mt-0.5">Student Email Address</p>
        </div>
        <div>
          <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wide block mb-1">
            Age &amp; Info
          </span>
          <p className="text-xs font-semibold text-text-primary">{profile.age} years old</p>
          <p className="text-[10px] text-text-secondary mt-0.5">FIDE profile group</p>
        </div>
      </div>

      {/* Puzzle stats cards */}
      <div>
        <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">
          Tactical Solving Analytics
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS_CARDS.map((card, i) => (
            <StatCard key={i} data={card} />
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Full Puzzle Audit Log */}
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Full Puzzle Audit Log
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Chronological attempt registry with timestamps, error counts, and solve time ({auditLogs.length} logged)
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
              Verified DB Records
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No tactical puzzle attempts recorded for this student yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-border z-10">
                  <tr className="text-text-secondary font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Date &amp; Time</th>
                    <th className="px-5 py-3">Puzzle ID</th>
                    <th className="px-5 py-3">Rating</th>
                    <th className="px-5 py-3">Themes</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-center">Tries</th>
                    <th className="px-5 py-3 text-center">Time</th>
                    <th className="px-5 py-3 text-center">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-primary">
                  {auditLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3 text-text-secondary whitespace-nowrap text-[11px]">
                        {new Date(row.solved_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            #{row.puzzle_id.substring(0, 8)}
                          </span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase ${
                            row.puzzle_source === 'chesshub'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {row.puzzle_source === 'chesshub' ? 'Academy' : 'Lichess'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">
                        {row.puzzle_rating ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {row.puzzle_themes && row.puzzle_themes.length > 0 ? (
                            row.puzzle_themes.slice(0, 2).map((th) => (
                              <span key={th} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                #{th}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10px]">tactics</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          row.solved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span>{row.solved ? '✓ Solved' : '✕ Failed'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-semibold font-mono">
                        {row.attempts}
                      </td>
                      <td className="px-5 py-3 text-center font-semibold font-mono text-slate-600">
                        {row.time_seconds != null ? `${row.time_seconds}s` : '—'}
                      </td>
                      <td className="px-5 py-3 text-center font-bold font-mono text-accent">
                        {row.accuracy != null ? `${Math.round(Number(row.accuracy))}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Student Training Activity Overview */}
        <div className="bg-white border border-border rounded-2xl shadow-card p-6 flex flex-col justify-between min-h-[300px] space-y-4">
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2.5 flex items-center justify-between">
              <span>Training Activity Overview</span>
              <span className="text-[10px] font-bold text-purple-700">Real DB Data</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Bot Matches</span>
                  <span className="text-[10px] text-slate-500">Record: {actSummary.botGames.wins}W / {actSummary.botGames.draws}D / {actSummary.botGames.losses}L</span>
                </div>
                <span className="text-sm font-extrabold text-purple-700 font-mono">{actSummary.botGames.total}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Tactical Puzzles</span>
                  <span className="text-[10px] text-slate-500">{actSummary.puzzles.accuracy}% Accuracy</span>
                </div>
                <span className="text-sm font-extrabold text-emerald-600 font-mono">{actSummary.puzzles.solved} Solved</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Live Classes</span>
                  <span className="text-[10px] text-slate-500">Attended Sessions</span>
                </div>
                <span className="text-sm font-extrabold text-blue-600 font-mono">{actSummary.classes.totalAttended}</span>
              </div>
            </div>
          </div>
          
          <Link
            href={`/dashboard/coach/students/${params.profileId}/bot-training`}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-center font-bold text-xs rounded-xl uppercase tracking-wider transition-all shadow-md block"
          >
            ♟️ View Full Bot Analytics & Puzzles →
          </Link>
        </div>
      </div>
    </div>
  );
}
