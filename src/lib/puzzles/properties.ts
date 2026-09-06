import { createSupabaseAdmin } from '../supabase/admin';
import { parseStudentStats, serializeStudentStats } from '../students/stats';

export interface StreakMilestone {
  days: number;
  bonusXp: number;
  bonusShields: number;
  title: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, bonusXp: 50, bonusShields: 1, title: '3-Day Fire Starter' },
  { days: 7, bonusXp: 100, bonusShields: 1, title: '7-Day Master Cadet' },
  { days: 14, bonusXp: 150, bonusShields: 1, title: '14-Day Tactical Champion' },
  { days: 30, bonusXp: 250, bonusShields: 2, title: '30-Day Grandmaster Legend' },
];

export interface StreakData {
  streak: number;
  xp: number;
  shields: number;
  wasProtected: boolean;
  todaySolved: boolean;
  todayLoggedIn: boolean;
  isFirstLoginToday: boolean;
  loginBonusXp: number;
  unlockedMilestone: StreakMilestone | null;
  solvedDates: string[];
}

export async function calculateAndProtectStreak(studentProfileId: string): Promise<StreakData> {
  const admin = createSupabaseAdmin();

  // 1. Fetch student profile to read notes (which holds stats) and user_id
  const { data: profile } = await admin
    .from('student_profiles')
    .select('id, user_id, notes')
    .eq('id', studentProfileId)
    .single();

  const notes = profile?.notes || '';
  const stats = parseStudentStats(notes);

  // 2. Fetch solved puzzles from puzzle_results
  const { data: results } = await admin
    .from('puzzle_results')
    .select('solved_at')
    .eq('student_id', studentProfileId)
    .eq('solved', true)
    .order('solved_at', { ascending: false });

  // 3. Also check student_activities for real solved puzzles and logins
  let actResults: any[] = [];
  if (profile?.user_id) {
    try {
      const { data: acts } = await admin
        .from('student_activities')
        .select('created_at, started_at, activity_type, result')
        .eq('student_id', profile.user_id)
        .order('created_at', { ascending: false });
      if (acts) actResults = acts;
    } catch {}
  }

  // 4. Collect unique active dates in ISO format (YYYY-MM-DD)
  const dateSet = new Set<string>();

  if (results && results.length > 0) {
    for (const r of results) {
      if (r.solved_at) {
        const d = new Date(r.solved_at);
        if (!isNaN(d.getTime())) {
          dateSet.add(d.toISOString().split('T')[0]);
          dateSet.add(d.toLocaleDateString('en-CA'));
        }
      }
    }
  }

  if (actResults && actResults.length > 0) {
    for (const a of actResults) {
      const ts = a.created_at || a.started_at;
      if (ts) {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          dateSet.add(d.toISOString().split('T')[0]);
          dateSet.add(d.toLocaleDateString('en-CA'));
        }
      }
    }
  }

  // Also include past recorded login dates from student stats
  if (stats.loginDates && stats.loginDates.length > 0) {
    for (const ld of stats.loginDates) {
      if (typeof ld === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ld)) {
        dateSet.add(ld);
      }
    }
  }
  if (stats.lastLoginDate) {
    dateSet.add(stats.lastLoginDate);
  }

  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const todayLocal = now.toLocaleDateString('en-CA');

  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yIso = yDate.toISOString().split('T')[0];
  const yLocal = yDate.toLocaleDateString('en-CA');
  const yesterdayActive = dateSet.has(yIso) || dateSet.has(yLocal);

  const alreadyLoggedInToday = stats.lastLoginDate === todayIso || stats.lastLoginDate === todayLocal;
  let isFirstLoginToday = false;
  let loginBonusXp = 0;
  let unlockedMilestone: StreakMilestone | null = null;
  let wasProtected = false;
  let streak = stats.loginStreak && stats.loginStreak > 0 ? stats.loginStreak : 0;
  let shields = stats.shields;
  let xp = stats.xp;

  // Add today to active dateSet right away
  dateSet.add(todayIso);
  dateSet.add(todayLocal);

  if (!alreadyLoggedInToday) {
    // ── First Login of Today ───────────────────────────────────────────────────
    isFirstLoginToday = true;

    if (yesterdayActive) {
      // Streak continues consecutively!
      streak = (streak > 0 ? streak : 0) + 1;
    } else if (dateSet.size > 2) {
      // Missed yesterday! Check if Streak Shield can protect
      if (shields === 0 && xp >= 100) {
        // Auto-buy shield with real earned XP
        xp -= 100;
        shields += 1;
      }

      if (shields > 0) {
        shields -= 1;
        wasProtected = true;
        streak = (streak > 0 ? streak : 1) + 1; // Preserve streak
      } else {
        streak = 1; // Reset to Day 1
      }
    } else {
      streak = 1;
    }

    // Award +15 XP base for daily login attendance
    loginBonusXp = 15;
    xp += 15;

    // Check streak milestones
    const claimed = stats.milestonesClaimed || [];
    for (const m of STREAK_MILESTONES) {
      if (streak >= m.days && !claimed.includes(m.days)) {
        xp += m.bonusXp;
        shields += m.bonusShields;
        claimed.push(m.days);
        unlockedMilestone = m;
        loginBonusXp += m.bonusXp;
        break;
      }
    }

    // Save updated stats to DB
    stats.xp = xp;
    stats.shields = shields;
    stats.loginStreak = streak;
    stats.lastLoginDate = todayIso;
    stats.loginDates = Array.from(new Set([...(stats.loginDates || []), todayIso]));
    stats.milestonesClaimed = claimed;

    const newNotes = serializeStudentStats(notes, stats);
    await admin
      .from('student_profiles')
      .update({ notes: newNotes })
      .eq('id', studentProfileId);

    // Record verified student activity
    if (profile?.user_id) {
      try {
        await admin.from('student_activities').insert({
          student_id: profile.user_id,
          activity_type: 'LOGIN',
          started_at: now.toISOString(),
          completed_at: now.toISOString(),
          result: 'SUCCESS',
          score: 15,
          metadata: { streak, milestone: unlockedMilestone },
          created_at: now.toISOString(),
        });
      } catch {}
    }
  } else {
    // Already logged in today, ensure streak is at least 1
    if (streak === 0) streak = 1;
  }

  // Determine if a tactical puzzle has been solved today
  const todaySolved =
    (results &&
      results.some((r: any) => {
        if (!r.solved_at) return false;
        const d = new Date(r.solved_at);
        const iso = d.toISOString().split('T')[0];
        const loc = d.toLocaleDateString('en-CA');
        return iso === todayIso || loc === todayLocal;
      })) ||
    (actResults &&
      actResults.some((a: any) => {
        const ts = a.created_at || a.started_at;
        if (!ts) return false;
        const d = new Date(ts);
        const iso = d.toISOString().split('T')[0];
        const loc = d.toLocaleDateString('en-CA');
        return (
          (iso === todayIso || loc === todayLocal) &&
          ['PUZZLE', 'DAILY_PUZZLE'].includes(a.activity_type) &&
          a.result === 'SOLVED'
        );
      })) ||
    false;

  // Filter unique valid ISO dates for UI calendar
  const solvedDates = Array.from(dateSet).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  return {
    streak,
    xp,
    shields,
    wasProtected,
    todaySolved,
    todayLoggedIn: true,
    isFirstLoginToday,
    loginBonusXp,
    unlockedMilestone,
    solvedDates,
  };
}
