/**
 * Standard Glicko-2 / ELO Rating Adjustment Utility
 * Calculates rating changes (+/- 15 to 32 points) for students solving tactical puzzles.
 */

export interface RatingAdjustmentResult {
  newStudentRating: number;
  ratingDelta: number;
  newPuzzleRating: number;
}

/**
 * Calculates standard ELO rating adjustment after a puzzle attempt.
 * @param studentRating Current student tactical ELO
 * @param puzzleRating Current puzzle rating ELO
 * @param isCorrect Whether student solved the puzzle correctly
 * @param kFactor Rating volatility constant (default 32)
 */
export function calculateEloAdjustment(
  studentRating: number,
  puzzleRating: number,
  isCorrect: boolean,
  kFactor: number = 32
): RatingAdjustmentResult {
  // Expected score calculation
  const expectedStudentScore = 1 / (1 + Math.pow(10, (puzzleRating - studentRating) / 400));
  const actualScore = isCorrect ? 1 : 0;

  // Calculate student delta
  const rawDelta = Math.round(kFactor * (actualScore - expectedStudentScore));
  
  // Bound delta between 5 and 32
  const minDelta = isCorrect ? 5 : -32;
  const maxDelta = isCorrect ? 32 : -5;
  const ratingDelta = Math.max(minDelta, Math.min(maxDelta, rawDelta));

  const newStudentRating = Math.max(400, Math.round(studentRating + ratingDelta));
  const newPuzzleRating = Math.max(400, Math.round(puzzleRating - Math.round(ratingDelta * 0.25)));

  return {
    newStudentRating,
    ratingDelta,
    newPuzzleRating,
  };
}
