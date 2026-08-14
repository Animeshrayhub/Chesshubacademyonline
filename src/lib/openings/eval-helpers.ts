// ─────────────────────────────────────────────────────────────────────────────
// ChessHub AI Opening Teacher — Engine & Evaluation Helpers
// ─────────────────────────────────────────────────────────────────────────────

export type MoveQuality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveQualityInfo {
  quality: MoveQuality;
  label: string;
  label_hindi: string;
  badgeColor: string;
  icon: string;
  cpLoss: number;
}

/**
 * Calculates evaluation bar percentage (0% to 100% White advantage).
 * Converts centipawns into a smooth sigmoidal percentage.
 */
export function getEvalPercentage(evalStr: string | null | undefined): number {
  if (!evalStr) return 50;

  // Mate scores
  if (evalStr.startsWith('#')) {
    const mateIn = parseInt(evalStr.substring(1), 10);
    if (isNaN(mateIn)) return 50;
    return mateIn > 0 ? 100 : 0;
  }

  // Centipawns
  const val = parseFloat(evalStr.replace('+', ''));
  if (isNaN(val)) return 50;

  // Sigmoid-like scaling for chess evaluation bar:
  // eval = +1 -> 60%, +3 -> 80%, +5 -> 90%, +10 -> 98%
  // eval = -1 -> 40%, -3 -> 20%, -5 -> 10%, -10 -> 2%
  const winChance = 1 / (1 + Math.pow(10, -val / 4));
  return Math.min(Math.max(Math.round(winChance * 100), 2), 98);
}

/**
 * Parses evaluation string into centipawns or mate object
 */
export function parseEval(evalStr: string | null | undefined): {
  type: 'cp' | 'mate';
  value: number;
} {
  if (!evalStr) return { type: 'cp', value: 0 };
  if (evalStr.startsWith('#')) {
    const m = parseInt(evalStr.substring(1), 10);
    return { type: 'mate', value: isNaN(m) ? 0 : m };
  }
  const val = parseFloat(evalStr.replace('+', ''));
  return { type: 'cp', value: isNaN(val) ? 0 : Math.round(val * 100) };
}

/**
 * Computes centipawn loss and classifies move quality
 */
export function classifyMoveQuality(
  playedEval: string | null | undefined,
  bestEval: string | null | undefined,
  isWhite: boolean
): MoveQualityInfo {
  const p = parseEval(playedEval);
  const b = parseEval(bestEval);

  let cpLoss = 0;

  if (p.type === 'cp' && b.type === 'cp') {
    // For White: cpLoss = bestVal - playedVal
    // For Black: cpLoss = playedVal - bestVal (lower eval is better for Black)
    cpLoss = isWhite ? b.value - p.value : p.value - b.value;
    cpLoss = Math.max(0, cpLoss);
  } else if (b.type === 'mate' && p.type === 'cp') {
    // Missed mate or blundered into mate
    cpLoss = 300;
  } else if (p.type === 'mate') {
    cpLoss = p.value > 0 ? 0 : 500;
  }

  if (cpLoss <= 10) {
    return {
      quality: 'best',
      label: 'Best Move',
      label_hindi: 'सर्वश्रेष्ठ चाल',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: '🌟',
      cpLoss,
    };
  }
  if (cpLoss <= 35) {
    return {
      quality: 'good',
      label: 'Good Move',
      label_hindi: 'अच्छी चाल',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: '✅',
      cpLoss,
    };
  }
  if (cpLoss <= 90) {
    return {
      quality: 'inaccuracy',
      label: 'Inaccuracy',
      label_hindi: 'अशुद्धि',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: '⚠️',
      cpLoss,
    };
  }
  if (cpLoss <= 220) {
    return {
      quality: 'mistake',
      label: 'Mistake',
      label_hindi: 'गलती',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      icon: '❌',
      cpLoss,
    };
  }
  return {
    quality: 'blunder',
    label: 'Blunder',
    label_hindi: 'बड़ी भूल',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    icon: '💥',
    cpLoss,
  };
}
