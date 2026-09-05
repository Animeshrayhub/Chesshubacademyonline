export interface StudentStats {
  xp: number;
  shields: number;
  equippedPet?: string;
  equippedGear?: string;
  unlockedGear?: string[];
}

export function parseStudentStats(notes: string | null): StudentStats {
  const defaultStats: StudentStats = {
    xp: 0,
    shields: 0,
    equippedPet: 'dragon',
    equippedGear: 'none',
    unlockedGear: ['none'],
  };
  if (!notes) return defaultStats;

  const parts = notes.split('=== CHESSHUB_STATS ===');
  if (parts.length < 2) return defaultStats;

  try {
    const parsed = JSON.parse(parts[1].trim());
    return {
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      shields: typeof parsed.shields === 'number' ? parsed.shields : 0,
      equippedPet: typeof parsed.equippedPet === 'string' ? parsed.equippedPet : 'dragon',
      equippedGear: typeof parsed.equippedGear === 'string' ? parsed.equippedGear : 'none',
      unlockedGear: Array.isArray(parsed.unlockedGear) ? parsed.unlockedGear : ['none'],
    };
  } catch {
    return defaultStats;
  }
}

export function serializeStudentStats(notes: string | null, stats: StudentStats): string {
  const baseNotes = notes ? notes.split('=== CHESSHUB_STATS ===')[0].trim() : '';
  const jsonStr = JSON.stringify(stats);
  return baseNotes ? `${baseNotes}\n\n=== CHESSHUB_STATS ===\n${jsonStr}` : `=== CHESSHUB_STATS ===\n${jsonStr}`;
}
