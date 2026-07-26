import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import StatCard from '@/components/dashboard/ui/StatCard';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentPuzzleStats } from '@/lib/puzzles/results';
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

  // 2. Fetch puzzle stats
  const statsRes = await getStudentPuzzleStats(profileId);
  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    totalAttempts: 0,
    totalSolved: 0,
    solveRate: 0,
    averageTime: 0,
    averageAccuracy: 0,
    solvedToday: 0,
    recentResults: [],
  };

  // Get current Lichess puzzle rating if synced in notes
  let lichessPuzzleRating = '—';
  if (profile.notes) {
    try {
      const parsed = JSON.parse(profile.notes);
      if (parsed.lichess?.ratings?.puzzle) {
        lichessPuzzleRating = String(parsed.lichess.ratings.puzzle);
      }
    } catch (e) {}
  }

  const STATS_CARDS: StatCardData[] = [
    {
      label: 'Lichess Puzzle Rating',
      value: lichessPuzzleRating,
      iconKey: 'trophy',
      trend: 'neutral',
      trendValue: 'Synced profile rating',
      colorScheme: 'gold',
    },
    {
      label: 'Solved Today',
      value: String(stats.solvedToday),
      iconKey: 'puzzle',
      trend: 'neutral',
      trendValue: 'Puzzles solved today',
      colorScheme: 'green',
    },
    {
      label: 'Solve Accuracy',
      value: `${stats.averageAccuracy}%`,
      iconKey: 'target',
      trend: 'neutral',
      trendValue: 'Average correctness rate',
      colorScheme: 'blue',
    },
    {
      label: 'Avg Solve Speed',
      value: stats.averageTime ? `${stats.averageTime}s` : '—',
      iconKey: 'clock',
      trend: 'neutral',
      trendValue: 'Average time per puzzle',
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
        <div className="flex items-center gap-2">
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
        {/* Solved History list */}
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Recent Solving History
            </h3>
          </div>
          {stats.recentResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No daily puzzles solved by this student yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-text-secondary font-bold uppercase tracking-wider">
                    <th className="px-6 py-3">Puzzle ID</th>
                    <th className="px-6 py-3">Rating</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Attempts</th>
                    <th className="px-6 py-3 text-center">Time</th>
                    <th className="px-6 py-3 text-center">Accuracy</th>
                    <th className="px-6 py-3">Solved Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-primary">
                  {stats.recentResults.map((row) => (
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
                        {new Date(row.solved_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Coach assigned puzzles section */}
        <div className="bg-white border border-border rounded-2xl shadow-card p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2.5">
              Assigned Custom Training
            </h3>
            <div className="text-center py-6 text-slate-400 text-xs">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2.5">
                <DashboardIcon iconKey="graduationCap" className="w-4 h-4 text-text-secondary" />
              </div>
              <p className="font-semibold text-text-primary">No assigned puzzle lists</p>
              <p className="text-[10px] text-text-secondary mt-1 max-w-[180px] mx-auto">
                ChessHub custom imports and category assigners will launch in Phase 2.
              </p>
            </div>
          </div>
          
          <button
            disabled
            className="w-full py-2.5 bg-slate-100 text-slate-400 text-center font-bold text-xs rounded-xl cursor-not-allowed uppercase tracking-wider focus:outline-none"
          >
            Assign ChessHub Puzzle
          </button>
        </div>
      </div>
    </div>
  );
}
