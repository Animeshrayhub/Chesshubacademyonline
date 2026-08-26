import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { StudentBadge, StudentBotProfile } from './types';

export async function checkAndAwardBadges(
  studentUserId: string,
  profile: StudentBotProfile,
  latestGameResult?: 'win' | 'loss' | 'draw'
): Promise<StudentBadge[]> {
  const admin = createSupabaseAdmin();
  const awardedBadges: StudentBadge[] = [];

  const candidateKeys: { key: string; title: string; desc: string; icon: string; condition: boolean }[] = [
    {
      key: 'first_bot_win',
      title: 'First Bot Win',
      desc: 'Defeated your first chess bot!',
      icon: '🏆',
      condition: profile.wins >= 1,
    },
    {
      key: 'win_5_bots',
      title: '5 Bot Wins',
      desc: 'Defeated 5 chess bots in battle!',
      icon: '🥉',
      condition: profile.wins >= 5,
    },
    {
      key: 'win_10_bots',
      title: '10 Bot Wins',
      desc: 'Defeated 10 chess bots!',
      icon: '🥈',
      condition: profile.wins >= 10,
    },
    {
      key: 'first_level_up',
      title: 'First Level Up',
      desc: 'Reached rating required to unlock Level 2!',
      icon: '⭐',
      condition: profile.rating >= 600 || profile.current_level >= 2,
    },
    {
      key: 'beat_level_5',
      title: 'Beat Level 5',
      desc: 'Conquered Level 5 Queen Bot (1200)!',
      icon: '👑',
      condition: profile.rating >= 1200 || profile.current_level >= 5,
    },
    {
      key: 'beat_level_10',
      title: 'Beat Level 10',
      desc: 'Conquered Level 10 Super Engine (2200)!',
      icon: '⚡',
      condition: profile.rating >= 2200 || profile.current_level >= 10,
    },
    {
      key: 'streak_3',
      title: '3-Game Streak',
      desc: 'Won 3 bot games in a row!',
      icon: '🔥',
      condition: profile.win_streak >= 3,
    },
    {
      key: 'streak_5',
      title: '5-Game Streak',
      desc: 'Won 5 bot games in a row!',
      icon: '🌟',
      condition: profile.win_streak >= 5,
    },
    {
      key: 'first_puzzle_solved',
      title: 'First Personalized Puzzle',
      desc: 'Solved your first custom weakness puzzle!',
      icon: '🧩',
      condition: profile.puzzles_solved >= 1,
    },
    {
      key: 'puzzle_10_solved',
      title: '10 Puzzles Solved',
      desc: 'Mastered 10 personalized weakness puzzles!',
      icon: '🎓',
      condition: profile.puzzles_solved >= 10,
    },
  ];

  for (const item of candidateKeys) {
    if (!item.condition) continue;

    try {
      const { data: existing } = await admin
        .from('student_bot_badges')
        .select('*')
        .eq('student_id', studentUserId)
        .eq('badge_key', item.key)
        .maybeSingle();

      if (!existing) {
        const { data: inserted } = await admin
          .from('student_bot_badges')
          .insert({
            student_id: studentUserId,
            badge_key: item.key,
            title: item.title,
            description: item.desc,
            icon: item.icon,
          })
          .select()
          .single();

        if (inserted) awardedBadges.push(inserted);
      }
    } catch (e) {}
  }

  return awardedBadges;
}
