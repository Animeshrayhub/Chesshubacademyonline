import { createSupabaseAdmin } from '../supabase/admin';
import { parseStudentStats, serializeStudentStats } from '../students/stats';

export interface StreakData {
  streak: number;
  xp: number;
  shields: number;
  wasProtected: boolean;
  todaySolved: boolean;
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

  // 3. Also check student_activities for real solved puzzles
  let actResults: any[] = [];
  if (profile?.user_id) {
    try {
      const { data: acts } = await admin
        .from('student_activities')
        .select('created_at, started_at')
        .eq('student_id', profile.user_id)
        .in('activity_type', ['PUZZLE', 'DAILY_PUZZLE'])
        .eq('result', 'SOLVED')
        .order('created_at', { ascending: false });
      if (acts) actResults = acts;
    } catch {}
  }

  // 4. Collect unique solved dates in ISO format (YYYY-MM-DD)
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

  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const todayLocal = now.toLocaleDateString('en-CA');
  const todaySolved = dateSet.has(todayIso) || dateSet.has(todayLocal);

  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yIso = yDate.toISOString().split('T')[0];
  const yLocal = yDate.toLocaleDateString('en-CA');
  const yesterdaySolved = dateSet.has(yIso) || dateSet.has(yLocal);

  let streak = 0;
  let wasProtected = false;

  if (todaySolved) {
    streak = 1;
    let current = new Date();
    current.setDate(current.getDate() - 1); // check backwards starting from yesterday
    while (true) {
      const checkIso = current.toISOString().split('T')[0];
      const checkLocal = current.toLocaleDateString('en-CA');
      if (dateSet.has(checkIso) || dateSet.has(checkLocal)) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
  } else if (yesterdaySolved) {
    // Solved yesterday, streak is currently active today
    streak = 1;
    let current = new Date();
    current.setDate(current.getDate() - 2); // check backwards starting from day before yesterday
    while (true) {
      const checkIso = current.toISOString().split('T')[0];
      const checkLocal = current.toLocaleDateString('en-CA');
      if (dateSet.has(checkIso) || dateSet.has(checkLocal)) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
  } else if (dateSet.size > 0) {
    // Missed yesterday! Check if Streak Shield can protect
    let shields = stats.shields;
    let xp = stats.xp;

    if (shields === 0 && xp >= 100) {
      // Auto-buy shield with real earned XP
      xp -= 100;
      shields += 1;
    }

    if (shields > 0) {
      // Consume shield to protect
      shields -= 1;
      wasProtected = true;

      // Save updated real stats back to DB
      stats.xp = xp;
      stats.shields = shields;
      const newNotes = serializeStudentStats(notes, stats);
      await admin
        .from('student_profiles')
        .update({ notes: newNotes })
        .eq('id', studentProfileId);

      // Keep streak alive as if yesterday was solved!
      streak = 1;
      let current = new Date();
      current.setDate(current.getDate() - 2); // check day before yesterday
      while (true) {
        const checkIso = current.toISOString().split('T')[0];
        const checkLocal = current.toLocaleDateString('en-CA');
        if (dateSet.has(checkIso) || dateSet.has(checkLocal)) {
          streak++;
          current.setDate(current.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  // Filter unique valid ISO dates for UI calendar
  const solvedDates = Array.from(dateSet).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  return {
    streak,
    xp: stats.xp,
    shields: stats.shields,
    wasProtected,
    todaySolved,
    solvedDates,
  };
}
