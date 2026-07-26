import React from 'react';
import Link from 'next/link';
import DashboardIcon from './DashboardIcon';
import { fetchLichessDailyPuzzle } from '@/lib/puzzles/lichess';
import { estimateSolveTime } from '@/lib/puzzles/types';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { calculateAndProtectStreak } from '@/lib/puzzles/properties';

export default async function DailyPuzzleCard() {
  let puzzle = null;
  let errorMsg = '';
  let streak = 0;
  let weeklyCount = 0;

  try {
    puzzle = await fetchLichessDailyPuzzle();
  } catch (error) {
    console.error('Failed to load daily puzzle for card:', error);
    errorMsg = 'Could not load today\'s puzzle details.';
  }

  // Calculate streak and weekly goals
  try {
    const user = await getCurrentUser();
    if (user) {
      const admin = createSupabaseAdmin();
      const { data: profile } = await admin
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const streakData = await calculateAndProtectStreak(profile.id);
        streak = streakData.streak;

        const { data: results } = await admin
          .from('puzzle_results')
          .select('solved_at')
          .eq('student_id', profile.id)
          .eq('solved', true);

        if (results) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          weeklyCount = results.filter((r: any) => new Date(r.solved_at) >= oneWeekAgo).length;
        }
      }
    }
  } catch (e) {
    console.error('Failed to calculate streak/goals:', e);
  }

  if (errorMsg || !puzzle) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 flex flex-col justify-between min-h-[220px]">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <DashboardIcon iconKey="puzzle" className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Daily Chess Tactics</h3>
          </div>
          <p className="text-xs text-text-secondary">{errorMsg || 'Tactical training is currently offline. Please try again later.'}</p>
        </div>
        <Link
          href="/dashboard/student/puzzles"
          className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-center font-bold text-xs rounded-xl transition-all block focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Go to Puzzle Center
        </Link>
      </div>
    );
  }

  const solveTime = estimateSolveTime(puzzle.numberOfMoves, puzzle.rating);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 flex flex-col justify-between min-h-[260px] transition-all hover:shadow-card-hover duration-200">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-50 border border-yellow-100 flex items-center justify-center">
              <DashboardIcon iconKey="puzzle" className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Daily Chess Tactics</h3>
              <p className="text-[10px] text-text-secondary">Improve your visualization & planning</p>
            </div>
          </div>
          {streak > 0 ? (
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-orange-100 flex items-center gap-1 animate-pulse">
              🔥 {streak} Day Streak
            </span>
          ) : (
            <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-green-100">
              Available
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 border border-border/80 p-2.5 rounded-xl">
            <span className="text-[9px] text-text-secondary uppercase font-semibold block mb-0.5">Rating / Level</span>
            <span className="text-xs font-bold text-text-primary font-mono flex items-center gap-1">
              {puzzle.rating} <span className="text-[10px] font-sans font-medium text-text-secondary">({puzzle.difficulty})</span>
            </span>
          </div>
          <div className="bg-slate-50 border border-border/80 p-2.5 rounded-xl">
            <span className="text-[9px] text-text-secondary uppercase font-semibold block mb-0.5">Estimate Solve Time</span>
            <span className="text-xs font-bold text-text-primary flex items-center gap-1">
              <DashboardIcon iconKey="clock" className="w-3.5 h-3.5 text-text-secondary" />
              {solveTime}
            </span>
          </div>
        </div>

        {/* Themes tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {puzzle.themes.slice(0, 3).map((theme) => (
            <span
              key={theme}
              className="text-[9px] bg-blue-50 text-primary font-medium px-2 py-0.5 rounded-md border border-blue-100/50 uppercase tracking-wide"
            >
              {theme.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          ))}
          {puzzle.themes.length > 3 && (
            <span className="text-[9px] text-text-secondary font-medium px-1.5 py-0.5">
              +{puzzle.themes.length - 3} more
            </span>
          )}
        </div>

        {/* Weekly Goal Progress */}
        <div className="mt-4 pt-3.5 border-t border-border/60">
          <div className="flex justify-between items-center text-[10px] text-text-secondary font-semibold mb-1.5">
            <span>Weekly Goal Progress</span>
            <span className={`font-bold text-[10px] ${weeklyCount >= 5 ? 'text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100 flex items-center gap-0.5' : 'text-text-primary'}`}>
              {weeklyCount >= 5 && '🏆 '}{weeklyCount} / 5 solved
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50 p-[1px]">
            <div 
              className="bg-gradient-to-r from-accent to-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (weeklyCount / 5) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <Link
        href="/dashboard/student/puzzles"
        className="mt-4 w-full py-2.5 bg-accent hover:bg-accent-hover text-surface-dark text-center font-bold text-xs rounded-xl shadow-gold transition-all block focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Solve Today&apos;s Puzzle
      </Link>
    </div>
  );
}
