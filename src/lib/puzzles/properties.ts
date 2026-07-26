import { createSupabaseAdmin } from '../supabase/admin';
import { parseStudentStats, serializeStudentStats } from '../students/stats';

export interface StreakData {
  streak: number;
  xp: number;
  shields: number;
  wasProtected: boolean;
}

export async function calculateAndProtectStreak(studentProfileId: string): Promise<StreakData> {
  const admin = createSupabaseAdmin();

  // 1. Fetch student profile to read notes (which holds stats)
  const { data: profile } = await admin
    .from('student_profiles')
    .select('notes')
    .eq('id', studentProfileId)
    .single();

  const notes = profile?.notes || '';
  const stats = parseStudentStats(notes);

  // 2. Fetch solved puzzles
  const { data: results } = await admin
    .from('puzzle_results')
    .select('solved_at')
    .eq('student_id', studentProfileId)
    .eq('solved', true)
    .order('solved_at', { ascending: false });

  let streak = 0;
  let wasProtected = false;

  if (results && results.length > 0) {
    const dates = Array.from(new Set(results.map((r: any) => new Date(r.solved_at).toDateString())));
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toDateString();

    if (dates.includes(today)) {
      streak = 1;
      let current = new Date();
      while (true) {
        current.setDate(current.getDate() - 1);
        const checkStr = current.toDateString();
        if (dates.includes(checkStr)) {
          streak++;
        } else {
          break;
        }
      }
    } else if (dates.includes(yesterday)) {
      streak = 1;
      let current = new Date();
      current.setDate(current.getDate() - 1);
      while (true) {
        current.setDate(current.getDate() - 1);
        const checkStr = current.toDateString();
        if (dates.includes(checkStr)) {
          streak++;
        } else {
          break;
        }
      }
    } else {
      // Missed yesterday! Check if we can trigger Streak Shield
      // If we have a shield, or we have >= 100 XP to auto-buy one:
      let shields = stats.shields;
      let xp = stats.xp;

      if (shields === 0 && xp >= 100) {
        // Auto-buy shield
        xp -= 100;
        shields += 1;
      }

      if (shields > 0) {
        // Use shield to protect
        shields -= 1;
        wasProtected = true;
        
        // Save updated stats back to DB
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
        current.setDate(current.getDate() - 1); // Yesterday
        while (true) {
          current.setDate(current.toDateString() === yesterday ? current.getDate() : current.getDate() - 1);
          const checkStr = current.toDateString();
          if (dates.includes(checkStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }
  }

  return {
    streak,
    xp: stats.xp,
    shields: stats.shields,
    wasProtected,
  };
}
