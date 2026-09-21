/**
 * Dynamic Hybrid Academy Simulation Engine for ChessHub
 * 
 * Manages 4 Division Leagues (Bronze, Silver, Gold, Diamond),
 * generates diverse, non-identical baseline stats for enrolled students,
 * simulates periodic background match activity, computes dynamic rank
 * movements (up and down), generates live activity ticker events,
 * and handles weekly Sunday season resets.
 */

export type DivisionTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface DivisionConfig {
  id: DivisionTier;
  name: string;
  badge: string;
  minElo: number;
  maxElo: number;
  promotionZone: number; // Top N ranks promote
  demotionZone: number;  // Bottom N ranks demote
  color: string;
  bgGradient: string;
}

export const DIVISIONS: Record<DivisionTier, DivisionConfig> = {
  bronze: {
    id: 'bronze',
    name: 'Bronze League',
    badge: '🥉',
    minElo: 400,
    maxElo: 799,
    promotionZone: 3,
    demotionZone: 0,
    color: '#d97706',
    bgGradient: 'from-amber-950/40 via-slate-900 to-amber-950/20',
  },
  silver: {
    id: 'silver',
    name: 'Silver League',
    badge: '🥈',
    minElo: 800,
    maxElo: 1199,
    promotionZone: 3,
    demotionZone: 3,
    color: '#94a3b8',
    bgGradient: 'from-slate-800/50 via-slate-900 to-slate-800/30',
  },
  gold: {
    id: 'gold',
    name: 'Gold League',
    badge: '🥇',
    minElo: 1200,
    maxElo: 1599,
    promotionZone: 3,
    demotionZone: 3,
    color: '#eab308',
    bgGradient: 'from-amber-500/20 via-slate-900 to-amber-500/10',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond League',
    badge: '💎',
    minElo: 1600,
    maxElo: 2600,
    promotionZone: 0,
    demotionZone: 3,
    color: '#38bdf8',
    bgGradient: 'from-sky-500/20 via-slate-900 to-sky-500/10',
  },
};

export interface SimulatedStudentPeer {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  title: string;
  rating: number;
  points: number;
  weeklyPoints: number;
  streak: number;
  bossLevel: number;
  badges: number;
  division: DivisionTier;
  rank: number;
  rankDelta: string; // e.g. "+2", "-1", "0"
  winRate: number;
  isYou: boolean;
  signatureOpening?: string;
}

export interface LiveTickerEvent {
  id: string;
  studentName: string;
  avatar: string;
  eventType: 'win' | 'streak' | 'badge' | 'promotion' | 'puzzle';
  description: string;
  timestampMinutesAgo: number;
}

export interface SeasonInfo {
  seasonNumber: number;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  nextResetIso: string;
}

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Vihaan', 'Leo', 'Tisha', 'Samar', 'Dyuti', 'Veda', 'Rajvika',
  'Rutvika', 'Advik', 'Sriramula', 'Kavya', 'Devansh', 'Ishaan', 'Meera', 'Rohan',
  'Sara', 'Kabir', 'Zoya', 'Reyansh', 'Diya', 'Arjun', 'Saanvi', 'Pranav'
];

const LAST_INITIALS = ['S.', 'N.', 'P.', 'R.', 'K.', 'M.', 'G.', 'V.', 'A.', 'B.', 'T.', 'D.'];

const TITLES = [
  'Grandmaster Slayer', 'Tactics Prodigy', 'Knight Crusher', 'Scholar Shield',
  'Fried Liver Defier', 'Endgame Master', 'Opening Explorer', 'Tactical Striker',
  'Rising Challenger', 'Puzzle Master', 'Castle Defender', 'Checkmate Hunter'
];

const AVATARS = ['👑', '🦁', '⚡', '🐉', '🎯', '🦅', '🐺', '🔥', '🛡️', '⚔️', '♟️', '♞', '♝', '♜', '♛', '♚'];

const SIGNATURE_OPENINGS = [
  "Italian Game (Giuoco Piano)",
  "Sicilian Defense (Najdorf)",
  "Queen's Gambit Accepted",
  "Ruy Lopez (Spanish Opening)",
  "King's Indian Defense",
  "French Defense (Winawer)",
  "Caro-Kann Defense",
  "English Opening"
];

/**
 * Deterministic pseudo-random number generator for consistent student traits
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Derives a division for a given rating
 */
export function getDivisionForRating(rating: number): DivisionTier {
  if (rating >= 1600) return 'diamond';
  if (rating >= 1200) return 'gold';
  if (rating >= 800) return 'silver';
  return 'bronze';
}

/**
 * Calculates current season information (weekly reset every Sunday midnight UTC)
 */
export function getSeasonInfo(): SeasonInfo {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 is Sunday
  const daysUntilSunday = (7 - dayOfWeek) % 7;

  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  nextSunday.setUTCHours(23, 59, 59, 999);

  const diffMs = Math.max(0, nextSunday.getTime() - now.getTime());
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutesRemaining = Math.floor((diffMs / (1000 * 60)) % 60);

  // Approximate season number from epoch
  const epoch = new Date('2026-01-01T00:00:00Z').getTime();
  const seasonNumber = Math.max(1, Math.floor((now.getTime() - epoch) / (7 * 24 * 60 * 60 * 1000)) + 1);

  return {
    seasonNumber,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    nextResetIso: nextSunday.toISOString(),
  };
}

/**
 * Generates realistic live ticker events showing recent peer activity
 */
export function generateLiveTickerEvents(peers: SimulatedStudentPeer[]): LiveTickerEvent[] {
  const eventTemplates = [
    { type: 'win' as const, text: (name: string, lvl: number) => `defeated Level ${lvl} Bot (+75 TP)` },
    { type: 'streak' as const, text: (name: string, _: number, streak: number) => `reached a 🔥 ${streak}-day training streak!` },
    { type: 'puzzle' as const, text: (name: string) => `solved 5 tactical puzzles in a row (+100 XP)` },
    { type: 'badge' as const, text: (name: string) => `unlocked prestigious 'Fried Liver Defier 🛡️' badge!` },
    { type: 'promotion' as const, text: (name: string) => `promoted into Silver League 🥈!` },
  ];

  const events: LiveTickerEvent[] = [];
  const selectedPeers = peers.slice(0, 10);

  selectedPeers.forEach((p, idx) => {
    const template = eventTemplates[idx % eventTemplates.length];
    const desc = template.text(p.name, p.bossLevel, p.streak);
    events.push({
      id: `ticker-${p.id}-${idx}`,
      studentName: p.name,
      avatar: p.avatar,
      eventType: template.type,
      description: desc,
      timestampMinutesAgo: (idx + 1) * 3 + (idx % 4),
    });
  });

  return events;
}

/**
 * Generates a vibrant, diverse academy cohort seeded from real enrolled students
 * plus realistic simulated academy peers so that:
 * 1. No student has identical 400/400/400 stats.
 * 2. Ratings and streaks are naturally distributed across all 4 divisions.
 * 3. Match simulations provide dynamic rank movement (▲/▼).
 */
export function buildDynamicAcademyCohort(
  realStudents: Array<{
    id: string;
    userId: string;
    name: string;
    username: string;
    avatar?: string;
    rating?: number;
    trainingPoints?: number;
    streak?: number;
    botLevel?: number;
    badges?: number;
    isYou?: boolean;
  }>,
  currentUserId?: string,
  currentUserStats?: {
    rating: number;
    trainingPoints: number;
    streak: number;
    botLevel: number;
    badges: number;
  }
): {
  cohort: SimulatedStudentPeer[];
  divisions: Record<DivisionTier, SimulatedStudentPeer[]>;
  tickerEvents: LiveTickerEvent[];
  seasonInfo: SeasonInfo;
} {
  const cohort: SimulatedStudentPeer[] = [];
  const seasonInfo = getSeasonInfo();

  // 1. Process real students with realistic, diverse baselines if fresh
  realStudents.forEach((st, idx) => {
    // Generate deterministic variation based on user ID hash
    let hash = 0;
    const str = st.userId || st.id || `student-${idx}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const rng = seededRandom(Math.abs(hash) + 42);

    const isYou = Boolean(st.isYou || (currentUserId && (st.userId === currentUserId || st.id === currentUserId)));

    let rating = st.rating && st.rating > 400 ? st.rating : 400;
    let points = st.trainingPoints ?? (rating * 2);
    let streak = st.streak && st.streak > 1 ? st.streak : 1;
    let bossLevel = st.botLevel && st.botLevel > 1 ? st.botLevel : 1;
    let badgesCount = st.badges && st.badges > 0 ? st.badges : 4;

    if (isYou && currentUserStats) {
      rating = currentUserStats.rating;
      points = currentUserStats.trainingPoints;
      streak = currentUserStats.streak;
      bossLevel = currentUserStats.botLevel;
      badgesCount = currentUserStats.badges;
    } else if (rating <= 400) {
      // Seed realistic unique variation for existing 400-rated accounts so they don't look identical
      const ratingBonus = Math.floor(rng() * 450); // 400 - 850
      rating = 400 + ratingBonus;
      points = Math.floor(rating * 1.8 + rng() * 300);
      streak = Math.max(1, Math.floor(rng() * 7) + 1);
      bossLevel = rating >= 800 ? 3 : rating >= 600 ? 2 : 1;
      badgesCount = Math.max(2, Math.floor(rating / 120) + Math.floor(rng() * 3));
    }

    const weeklyPoints = Math.round(points * (0.2 + rng() * 0.15));
    const winRate = Math.round(45 + rng() * 40); // 45% - 85%
    const title = TITLES[Math.abs(hash) % TITLES.length];
    const avatar = st.avatar || AVATARS[Math.abs(hash) % AVATARS.length];
    const signatureOpening = SIGNATURE_OPENINGS[Math.abs(hash) % SIGNATURE_OPENINGS.length];

    // Dynamic rank delta: e.g. "+2", "+1", "-1", "0"
    const deltaNum = Math.floor(rng() * 5) - 2; // -2 to +2
    const rankDelta = deltaNum > 0 ? `+${deltaNum}` : deltaNum < 0 ? `${deltaNum}` : '0';

    const division = getDivisionForRating(rating);

    cohort.push({
      id: st.id,
      userId: st.userId,
      name: isYou ? 'You (Current Student)' : st.name,
      username: st.username,
      avatar,
      title,
      rating,
      points,
      weeklyPoints,
      streak,
      bossLevel,
      badges: badgesCount,
      division,
      rank: 1, // calculated after sorting
      rankDelta: isYou ? '+1' : rankDelta,
      winRate,
      isYou,
      signatureOpening,
    });
  });

  // Ensure current user is in the cohort
  if (currentUserId && !cohort.some((c) => c.isYou)) {
    const userRating = currentUserStats?.rating || 400;
    const userPoints = currentUserStats?.trainingPoints || 380;
    cohort.push({
      id: `current-${currentUserId}`,
      userId: currentUserId,
      name: 'You (Current Student)',
      username: 'you',
      avatar: '🛡️',
      title: 'Aspiring Arena Champion',
      rating: userRating,
      points: userPoints,
      weeklyPoints: Math.min(userPoints, 290),
      streak: currentUserStats?.streak || 3,
      bossLevel: currentUserStats?.botLevel || 1,
      badges: currentUserStats?.badges || 4,
      division: getDivisionForRating(userRating),
      rank: 1,
      rankDelta: '+1',
      winRate: 65,
      isYou: true,
      signatureOpening: "Italian Game (Giuoco Piano)",
    });
  }

  // 2. Expand cohort with realistic synthetic peers if fewer than 24 students
  // to ensure each of the 4 divisions has active, competitive rivals!
  const targetPerDivision = 8;
  const existingByDivision: Record<DivisionTier, number> = {
    bronze: cohort.filter((c) => c.division === 'bronze').length,
    silver: cohort.filter((c) => c.division === 'silver').length,
    gold: cohort.filter((c) => c.division === 'gold').length,
    diamond: cohort.filter((c) => c.division === 'diamond').length,
  };

  const divisionRanges: Record<DivisionTier, { min: number; max: number; baseLvl: number }> = {
    bronze: { min: 450, max: 780, baseLvl: 2 },
    silver: { min: 820, max: 1180, baseLvl: 4 },
    gold: { min: 1220, max: 1560, baseLvl: 6 },
    diamond: { min: 1620, max: 2150, baseLvl: 8 },
  };

  let syntheticCounter = 1;
  (Object.keys(divisionRanges) as DivisionTier[]).forEach((div) => {
    const needed = Math.max(0, targetPerDivision - existingByDivision[div]);
    const cfg = divisionRanges[div];

    for (let i = 0; i < needed; i++) {
      const seedVal = syntheticCounter * 997 + div.charCodeAt(0) * 31;
      const rng = seededRandom(seedVal);

      const fName = FIRST_NAMES[syntheticCounter % FIRST_NAMES.length];
      const lInit = LAST_INITIALS[(syntheticCounter * 3) % LAST_INITIALS.length];
      const name = `${fName} ${lInit}`;
      const rating = Math.floor(cfg.min + rng() * (cfg.max - cfg.min));
      const points = Math.floor(rating * 2.1 + rng() * 400);
      const weeklyPoints = Math.round(points * (0.2 + rng() * 0.15));
      const streak = Math.max(1, Math.floor(rng() * 14) + 1);
      const bossLevel = Math.min(10, Math.max(1, cfg.baseLvl + Math.floor(rng() * 2) - 1));
      const badges = Math.max(3, Math.floor(rating / 110) + Math.floor(rng() * 4));
      const avatar = AVATARS[syntheticCounter % AVATARS.length];
      const title = TITLES[syntheticCounter % TITLES.length];
      const signatureOpening = SIGNATURE_OPENINGS[syntheticCounter % SIGNATURE_OPENINGS.length];
      const delta = Math.floor(rng() * 5) - 2;
      const rankDelta = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0';

      cohort.push({
        id: `synthetic-${div}-${syntheticCounter}`,
        userId: `user-syn-${div}-${syntheticCounter}`,
        name,
        username: `${fName.toLowerCase()}${syntheticCounter}`,
        avatar,
        title,
        rating,
        points,
        weeklyPoints,
        streak,
        bossLevel,
        badges,
        division: div,
        rank: 1,
        rankDelta,
        winRate: Math.round(50 + rng() * 35),
        isYou: false,
        signatureOpening,
      });

      syntheticCounter++;
    }
  });

  // 3. Group and sort by division (descending points)
  const divisions: Record<DivisionTier, SimulatedStudentPeer[]> = {
    bronze: [],
    silver: [],
    gold: [],
    diamond: [],
  };

  cohort.forEach((p) => {
    divisions[p.division].push(p);
  });

  (Object.keys(divisions) as DivisionTier[]).forEach((div) => {
    divisions[div].sort((a, b) => b.points - a.points || b.rating - a.rating);
    divisions[div].forEach((p, idx) => {
      p.rank = idx + 1;
    });
  });

  const tickerEvents = generateLiveTickerEvents(cohort);

  return {
    cohort,
    divisions,
    tickerEvents,
    seasonInfo,
  };
}
