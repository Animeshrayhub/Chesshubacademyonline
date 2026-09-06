'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import { recordStudentActivityAction } from '@/actions/activity';
import { playChessSound } from '@/utils/chessAudio';
import {
  recordPuzzleAttempt,
  getStudentPuzzleStats,
  hydrateStatsFromDb,
} from '@/lib/puzzles/progress';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

export type PuzzleCategory = 'TACTICS' | 'CHECKMATE' | 'CALCULATION' | 'ENDGAME' | 'MIXED';

export interface LichessPuzzle {
  id: string;
  rating: number;
  fen: string;
  solution: string[];
  themes: string[];
  category: string;
  sideToMove: 'white' | 'black';
  title?: string;
  source?: 'ACADEMY' | 'LICHESS';
  hint1?: string;
  explanation?: string;
}

function buildSolutionFens(initialFen: string, solutionMoves: string[]): string[] {
  try {
    const tempGame = new Chess(initialFen);
    const fens: string[] = [initialFen];
    for (const moveStr of solutionMoves) {
      const from = moveStr.substring(0, 2);
      const to = moveStr.substring(2, 4);
      const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;
      tempGame.move({ from: from as any, to: to as any, promotion: promotion as any });
      fens.push(tempGame.fen());
    }
    return fens;
  } catch {
    return [initialFen];
  }
}

export default function StudentPuzzleTrainer() {
  const [practiceMode, setPracticeMode] = useState<'daily' | 'unlimited' | 'mistakes'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<PuzzleCategory>('TACTICS');
  const [categoryIndex, setCategoryIndex] = useState(0);

  const [currentPuzzle, setCurrentPuzzle] = useState<LichessPuzzle | null>(null);
  const [loading, setLoading] = useState(true);

  // Chessboard state
  const [boardFen, setBoardFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [solutionStep, setSolutionStep] = useState(0);
  const [userMoveInput, setUserMoveInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'neutral' | 'warn'; text: string }>({
    type: 'neutral',
    text: 'Analyze the position and play your move on the board or enter UCI notation (e.g. f3f7).',
  });

  // Solving stats & metrics
  const [attempts, setAttempts] = useState(1);
  const [lives, setLives] = useState(3);
  const [solveStartTime, setSolveStartTime] = useState<number>(Date.now());
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isReplayingSolution, setIsReplayingSolution] = useState(false);
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [streak, setStreak] = useState(0);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [puzzlesAttempted, setPuzzlesAttempted] = useState(0);
  const [studentRating, setStudentRating] = useState<number>(1200);
  const [mistakesQueue, setMistakesQueue] = useState<string[]>([]);
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [petReaction, setPetReaction] = useState<string>('Ready to calculate tactics? Look for checks and captures!');
  const [customSquareStyles, setCustomSquareStyles] = useState<Record<string, React.CSSProperties>>({});

  // Interactive solution step review state
  const [solutionFens, setSolutionFens] = useState<string[]>([]);
  const [stepReviewIndex, setStepReviewIndex] = useState<number>(0);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAnimationInterval = useCallback(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAnimationInterval();
    };
  }, [clearAnimationInterval]);

  const chessRef = useRef<Chess>(new Chess());

  // Fetch puzzle from proxy route with adaptive matchmaking & mistakes queue support
  const fetchPuzzle = useCallback(
    async (
      mode: 'daily' | 'unlimited' | 'mistakes',
      category: PuzzleCategory,
      idx: number,
      currentRating: number
    ) => {
      setLoading(true);
      setIsSolved(false);
      setIsFailed(false);
      setIsReplayingSolution(false);
      setRatingDelta(null);
      setHintLevel(0);
      setCustomSquareStyles({});
      setSolutionStep(0);
      setAttempts(1);
      setLives(3);
      setUserMoveInput('');

      try {
        let url = '';
        if (mode === 'daily') {
          url = '/api/puzzles/lichess?type=daily';
        } else if (mode === 'mistakes') {
          const currentStats = getStudentPuzzleStats();
          const mistakes = currentStats.reviewMistakes || [];
          if (mistakes.length === 0) {
            setCurrentPuzzle(null);
            setFeedback({
              type: 'success',
              text: '🎉 Great job! You have zero failed puzzles in your mistake review queue.',
            });
            setPetReaction('All mistakes conquered! Switch to Unlimited Practice or Daily Challenge.');
            setLoading(false);
            return;
          }
          const targetId = mistakes[idx % mistakes.length];
          url = `/api/puzzles/lichess?puzzleId=${targetId}`;
        } else {
          // Adaptive: pass rating for difficulty matching
          url = `/api/puzzles/lichess?category=${category}&index=${idx}&rating=${currentRating}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.puzzle) {
          const p: LichessPuzzle = data.puzzle;
          setCurrentPuzzle(p);
          setBoardFen(p.fen);
          const fens = buildSolutionFens(p.fen, p.solution || []);
          setSolutionFens(fens);
          setStepReviewIndex(0);

          try {
            chessRef.current = new Chess(p.fen);
          } catch (e) {
            chessRef.current = new Chess();
          }

          setSolveStartTime(Date.now());
          setFeedback({
            type: 'neutral',
            text: `Find the best move for ${p.sideToMove === 'white' ? 'White ⚪' : 'Black ⬛'}! (3 tries remaining)`,
          });
          setPetReaction(
            p.source === 'ACADEMY'
              ? '♟️ Academy Curated Lesson Puzzle! Find the coach-assigned tactical sequence.'
              : '⚡ Rated tactical position loaded! Calculate all defensive replies.'
          );
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          text: 'Failed to load puzzle. Please check your connection.',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load & Hydration from Database
  useEffect(() => {
    // 1. Initial local stats hydration
    const stats = getStudentPuzzleStats();
    if (stats) {
      if (stats.currentStreak > 0) setStreak(stats.currentStreak);
      if (stats.tacticalRating > 0) setStudentRating(stats.tacticalRating);
      if (stats.totalSolved > 0) setPuzzlesSolved(stats.totalSolved);
      if (stats.totalAttempted > 0) setPuzzlesAttempted(stats.totalAttempted);
      if (Array.isArray(stats.reviewMistakes)) setMistakesQueue(stats.reviewMistakes);
    }

    // 2. Fetch server database sync
    fetch('/api/puzzles/result')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.stats) {
          const dbStats = data.stats;
          const hydrated = hydrateStatsFromDb(dbStats);
          setStudentRating(hydrated.tacticalRating);
          setPuzzlesSolved(hydrated.totalSolved);
          setPuzzlesAttempted(hydrated.totalAttempted);
          setStreak(hydrated.currentStreak);
          setMistakesQueue(hydrated.reviewMistakes || []);
        }
      })
      .catch((e) => console.warn('Could not sync DB puzzle stats on mount:', e));
  }, []);

  // Fetch puzzle when mode, category, or index changes
  useEffect(() => {
    fetchPuzzle(practiceMode, selectedCategory, categoryIndex, studentRating);
  }, [practiceMode, selectedCategory, categoryIndex, fetchPuzzle]);

  // Handle move validation
  const checkMoveUci = (uciMove: string): boolean => {
    if (!currentPuzzle || isSolved || isFailed || isReplayingSolution) return false;

    const cleanMove = uciMove.trim().toLowerCase();
    const expectedMove = currentPuzzle.solution[solutionStep]?.toLowerCase();

    if (!expectedMove) return false;

    if (cleanMove === expectedMove) {
      // Execute move on chess engine
      try {
        const from = cleanMove.substring(0, 2);
        const to = cleanMove.substring(2, 4);
        const promotion = cleanMove.length > 4 ? cleanMove.substring(4, 5) : undefined;
        chessRef.current.move({ from: from as any, to: to as any, promotion: promotion as any });
        setBoardFen(chessRef.current.fen());
        playChessSound('move');
      } catch (e) {}

      const nextStep = solutionStep + 1;
      setSolutionStep(nextStep);

      // Check if puzzle is fully solved
      if (nextStep >= currentPuzzle.solution.length) {
        handlePuzzleSolved();
        return true;
      }

      // Play opponent automated reply if there are more moves in solution
      const opponentReply = currentPuzzle.solution[nextStep];
      if (opponentReply) {
        setTimeout(() => {
          try {
            const oppFrom = opponentReply.substring(0, 2);
            const oppTo = opponentReply.substring(2, 4);
            const oppProm = opponentReply.length > 4 ? opponentReply.substring(4, 5) : undefined;
            chessRef.current.move({ from: oppFrom as any, to: oppTo as any, promotion: oppProm as any });
            setBoardFen(chessRef.current.fen());
            setSolutionStep(nextStep + 1);
            playChessSound('capture');
          } catch (e) {}
        }, 400);
      }

      setFeedback({
        type: 'success',
        text: 'Best move! Continue the combination...',
      });
      setPetReaction('Excellent! Now find the following blow!');
      return true;
    } else {
      const remainingLives = lives - 1;
      setLives(remainingLives);
      setAttempts((a) => a + 1);
      playChessSound('quiz_wrong');

      if (remainingLives > 0) {
        setFeedback({
          type: 'error',
          text: `❌ Move ${uciMove} is not best. ${remainingLives} ${remainingLives === 1 ? 'life' : 'lives'} remaining! Try again.`,
        });
        setPetReaction(
          remainingLives === 1
            ? '⚠️ One try left! Double-check king safety and undefended pieces.'
            : 'Not the strongest move. Look for forcing lines!'
        );
        return false;
      } else {
        // 0 lives left -> fail the puzzle
        handlePuzzleFailed(false);
        return false;
      }
    }
  };

  // Automated solution playback when puzzle fails or is forfeited
  const playSolutionAnimation = (solutionMoves: string[]) => {
    clearAnimationInterval();
    setIsReplayingSolution(true);
    let currentPly = 0;

    try {
      chessRef.current = new Chess(currentPuzzle!.fen);
      setBoardFen(chessRef.current.fen());
      setStepReviewIndex(0);
    } catch {}

    animationIntervalRef.current = setInterval(() => {
      if (currentPly >= solutionMoves.length) {
        clearAnimationInterval();
        setIsReplayingSolution(false);
        setStepReviewIndex(solutionMoves.length);
        return;
      }

      const moveStr = solutionMoves[currentPly];
      try {
        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;
        chessRef.current.move({ from: from as any, to: to as any, promotion: promotion as any });
        setBoardFen(chessRef.current.fen());
        setStepReviewIndex(currentPly + 1);
        playChessSound(currentPly % 2 === 0 ? 'move' : 'capture');
      } catch {}

      currentPly++;
    }, 700);
  };

  // Step-by-step interactive inspection controls
  const handleStepBack = () => {
    clearAnimationInterval();
    setIsReplayingSolution(false);
    if (stepReviewIndex > 0) {
      const newIdx = stepReviewIndex - 1;
      setStepReviewIndex(newIdx);
      setBoardFen(solutionFens[newIdx]);
      playChessSound('move');
    }
  };

  const handleStepForward = () => {
    clearAnimationInterval();
    setIsReplayingSolution(false);
    if (stepReviewIndex < solutionFens.length - 1) {
      const newIdx = stepReviewIndex + 1;
      setStepReviewIndex(newIdx);
      setBoardFen(solutionFens[newIdx]);
      playChessSound('move');
    }
  };

  const handleStepToStart = () => {
    clearAnimationInterval();
    setIsReplayingSolution(false);
    setStepReviewIndex(0);
    setBoardFen(solutionFens[0]);
    playChessSound('move');
  };

  const handleStepToEnd = () => {
    clearAnimationInterval();
    setIsReplayingSolution(false);
    const last = solutionFens.length - 1;
    setStepReviewIndex(last);
    setBoardFen(solutionFens[last]);
    playChessSound('move');
  };

  const handleReplayAnimation = () => {
    if (currentPuzzle?.solution) {
      playSolutionAnimation(currentPuzzle.solution);
    }
  };

  // On Complete Solve
  const handlePuzzleSolved = async () => {
    setIsSolved(true);
    playChessSound('victory');
    setStepReviewIndex(currentPuzzle?.solution ? currentPuzzle.solution.length : 0);

    const durationSec = Math.max(1, Math.round((Date.now() - solveStartTime) / 1000));
    const accuracyVal = attempts === 1 ? 100 : Math.max(50, Math.round(100 / attempts));

    if (currentPuzzle) {
      const recordRes = recordPuzzleAttempt(
        currentPuzzle.id,
        currentPuzzle.rating,
        true,
        currentPuzzle.themes,
        { hintsUsed: hintLevel }
      );
      setStreak(recordRes.newStats.currentStreak);
      setPuzzlesSolved(recordRes.newStats.totalSolved);
      setPuzzlesAttempted(recordRes.newStats.totalAttempted);
      setStudentRating(recordRes.newStats.tacticalRating);
      setRatingDelta(recordRes.ratingDelta);
      setMistakesQueue(recordRes.newStats.reviewMistakes || []);

      setFeedback({
        type: 'success',
        text: `🎉 PUZZLE SOLVED in ${durationSec}s! (+${recordRes.ratingDelta} ⭐, +${recordRes.xpGain} XP)`,
      });
      setPetReaction('Masterful tactical vision! Keep this winning streak alive!');

      // Record real activity in database & save puzzle result with tactical stats
      try {
        recordStudentActivityAction({
          activityType: practiceMode === 'daily' ? 'DAILY_PUZZLE' : 'PUZZLE',
          activityId: currentPuzzle.id,
          durationSeconds: durationSec,
          result: 'SOLVED',
          accuracy: accuracyVal,
          metadata: {
            puzzleRating: currentPuzzle.rating,
            category: selectedCategory,
            attempts,
            themes: currentPuzzle.themes,
            hintsUsed: hintLevel,
          },
        }).catch(() => {});

        const syncRes = await fetch('/api/puzzles/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzleId: currentPuzzle.id,
            puzzleSource: currentPuzzle.source || 'LICHESS',
            puzzleRating: currentPuzzle.rating,
            puzzleThemes: currentPuzzle.themes,
            solved: true,
            attempts,
            timeSeconds: durationSec,
            accuracy: accuracyVal,
            hintsUsed: hintLevel,
          }),
        });

        if (syncRes.ok) {
          const sData = await syncRes.json();
          if (typeof sData.tacticalRating === 'number') {
            setStudentRating(sData.tacticalRating);
            setRatingDelta(sData.ratingDelta);
            setStreak(sData.streak);
            setPuzzlesSolved(sData.puzzlesSolved);
            setPuzzlesAttempted(sData.puzzlesAttempted);
            setMistakesQueue(sData.reviewMistakes || []);
            hydrateStatsFromDb({
              tacticalRating: sData.tacticalRating,
              totalSolved: sData.puzzlesSolved,
              totalAttempted: sData.puzzlesAttempted,
              currentStreak: sData.streak,
              reviewMistakes: sData.reviewMistakes,
            });
            setFeedback({
              type: 'success',
              text: `🎉 PUZZLE SOLVED in ${durationSec}s! (${sData.ratingDelta >= 0 ? '+' : ''}${sData.ratingDelta} ⭐, +${sData.xpGain} XP)`,
            });
          }
        }
      } catch (err) {
        console.error('Failed to sync puzzle result to database:', err);
      }
    }
  };

  // On Puzzle Failed or Forfeited
  const handlePuzzleFailed = async (isForfeit = false) => {
    if (!currentPuzzle) return;

    setIsFailed(true);
    playChessSound('quiz_wrong');

    const durationSec = Math.max(1, Math.round((Date.now() - solveStartTime) / 1000));
    const recordRes = recordPuzzleAttempt(
      currentPuzzle.id,
      currentPuzzle.rating,
      false,
      currentPuzzle.themes,
      { isForfeit }
    );

    setStreak(0);
    setStudentRating(recordRes.newStats.tacticalRating);
    setRatingDelta(recordRes.ratingDelta);
    setPuzzlesAttempted(recordRes.newStats.totalAttempted);
    setMistakesQueue(recordRes.newStats.reviewMistakes || []);

    setFeedback({
      type: 'error',
      text: isForfeit
        ? `🏳️ Forfeited (${recordRes.ratingDelta} ⭐). Solution is replaying on the board:`
        : `❌ 3 Strikes! Puzzle failed (${recordRes.ratingDelta} ⭐). Solution is replaying on the board:`,
    });
    setPetReaction('Don&apos;t worry! Analyzing missed tactics is how champions learn.');

    try {
      recordStudentActivityAction({
        activityType: practiceMode === 'daily' ? 'DAILY_PUZZLE' : 'PUZZLE',
        activityId: currentPuzzle.id,
        durationSeconds: durationSec,
        result: 'FAILED',
        accuracy: 0,
        metadata: {
          puzzleRating: currentPuzzle.rating,
          category: selectedCategory,
          attempts,
          themes: currentPuzzle.themes,
          forfeit: isForfeit,
        },
      }).catch(() => {});

      const syncRes = await fetch('/api/puzzles/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId: currentPuzzle.id,
          puzzleSource: currentPuzzle.source || 'LICHESS',
          puzzleRating: currentPuzzle.rating,
          puzzleThemes: currentPuzzle.themes,
          solved: false,
          attempts,
          timeSeconds: durationSec,
          accuracy: 0,
          forfeit: isForfeit,
        }),
      });

      if (syncRes.ok) {
        const sData = await syncRes.json();
        if (typeof sData.tacticalRating === 'number') {
          setStudentRating(sData.tacticalRating);
          setRatingDelta(sData.ratingDelta);
          setStreak(sData.streak);
          setPuzzlesSolved(sData.puzzlesSolved);
          setPuzzlesAttempted(sData.puzzlesAttempted);
          setMistakesQueue(sData.reviewMistakes || []);
          hydrateStatsFromDb({
            tacticalRating: sData.tacticalRating,
            totalSolved: sData.puzzlesSolved,
            totalAttempted: sData.puzzlesAttempted,
            currentStreak: sData.streak,
            reviewMistakes: sData.reviewMistakes,
          });
          setFeedback({
            type: 'error',
            text: isForfeit
              ? `🏳️ Forfeited (${sData.ratingDelta} ⭐). Solution is replaying on the board:`
              : `❌ 3 Strikes! Puzzle failed (${sData.ratingDelta} ⭐). Solution is replaying on the board:`,
          });
        }
      }
    } catch (err) {
      console.error('Failed to sync failed puzzle to database:', err);
    }

    // Playback winning solution on the board
    playSolutionAnimation(currentPuzzle.solution);
  };

  // Progressive Hint Handler
  const handleRequestHint = () => {
    if (!currentPuzzle || isSolved || isFailed || isReplayingSolution) return;
    const currentExpected = currentPuzzle.solution[solutionStep];
    if (!currentExpected) return;

    const fromSquare = currentExpected.substring(0, 2);
    const toSquare = currentExpected.substring(2, 4);

    if (hintLevel === 0) {
      setHintLevel(1);
      setCustomSquareStyles({
        [fromSquare]: {
          backgroundColor: 'rgba(234, 179, 8, 0.45)',
          borderRadius: '50%',
        },
      });
      setFeedback({
        type: 'warn',
        text: `💡 Hint 1 (Half Elo/XP): Look closely at the piece on ${fromSquare.toUpperCase()}!`,
      });
      setPetReaction(`Take a close look at the ${fromSquare.toUpperCase()} square!`);
    } else if (hintLevel === 1) {
      setHintLevel(2);
      setCustomSquareStyles({
        [fromSquare]: {
          backgroundColor: 'rgba(234, 179, 8, 0.45)',
          borderRadius: '50%',
        },
        [toSquare]: {
          backgroundColor: 'rgba(34, 197, 94, 0.55)',
          borderRadius: '50%',
        },
      });
      setFeedback({
        type: 'warn',
        text: `💡 Hint 2: Move to ${toSquare.toUpperCase()} to execute the tactical strike!`,
      });
      setPetReaction(`Move the piece to ${toSquare.toUpperCase()} to win material or mate!`);
    }
  };

  // Piece drop handler on board
  const handlePieceDrop = (sourceOrObj: any, targetArg?: string): boolean => {
    if (isSolved || isFailed || isReplayingSolution || loading || !currentPuzzle) return false;

    let source = '';
    let target = '';
    if (sourceOrObj && typeof sourceOrObj === 'object' && sourceOrObj.sourceSquare) {
      source = sourceOrObj.sourceSquare;
      target = sourceOrObj.targetSquare;
    } else if (typeof sourceOrObj === 'string' && targetArg) {
      source = sourceOrObj;
      target = targetArg;
    }

    if (!source || !target) return false;

    const uci = `${source}${target}`.toLowerCase();
    return checkMoveUci(uci);
  };

  const canAdvance = isSolved || isFailed;

  const handleNextPuzzle = () => {
    clearAnimationInterval();

    if (!canAdvance) {
      setFeedback({
        type: 'warn',
        text: '🔒 Puzzle in progress! You must solve it or click "Give Up" to advance.',
      });
      return;
    }

    if (practiceMode === 'daily') {
      setPracticeMode('unlimited');
      setCategoryIndex((prev) => prev + 1);
      fetchPuzzle('unlimited', selectedCategory, categoryIndex + 1, studentRating);
    } else if (practiceMode === 'mistakes') {
      setCategoryIndex((prev) => prev + 1);
      fetchPuzzle('mistakes', selectedCategory, categoryIndex + 1, studentRating);
    } else {
      setCategoryIndex((prev) => prev + 1);
      fetchPuzzle('unlimited', selectedCategory, categoryIndex + 1, studentRating);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode & Category Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPracticeMode('daily');
              fetchPuzzle('daily', selectedCategory, 0, studentRating);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              practiceMode === 'daily'
                ? 'bg-amber-500 text-slate-950 shadow-gold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>⭐</span>
            <span>Daily Puzzle</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPracticeMode('unlimited');
              fetchPuzzle('unlimited', selectedCategory, categoryIndex, studentRating);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              practiceMode === 'unlimited'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>♾️</span>
            <span>Unlimited Practice</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPracticeMode('mistakes');
              setCategoryIndex(0);
              fetchPuzzle('mistakes', selectedCategory, 0, studentRating);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              practiceMode === 'mistakes'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🔁</span>
            <span>Review Mistakes ({mistakesQueue.length})</span>
          </button>
        </div>

        {/* Category Selector (Only active in Unlimited mode) */}
        {practiceMode === 'unlimited' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(['TACTICS', 'CHECKMATE', 'CALCULATION', 'ENDGAME', 'MIXED'] as PuzzleCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setCategoryIndex(0);
                  fetchPuzzle('unlimited', cat, 0, studentRating);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tactics Rating</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-amber-400">{studentRating}</span>
              {ratingDelta !== null && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    ratingDelta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta}
                </span>
              )}
            </div>
          </div>
          <span className="text-2xl">⭐</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solving Streak</p>
            <p className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">{streak} 🔥</p>
          </div>
          <span className="text-2xl">🔥</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solved / Total</p>
            <p className="text-xl font-extrabold font-mono text-blue-400 mt-0.5">
              {puzzlesSolved} / {puzzlesAttempted}
            </p>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puzzle Difficulty</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-purple-400">
                {currentPuzzle?.rating || '—'}
              </span>
              {currentPuzzle?.source === 'ACADEMY' && (
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded uppercase">
                  Academy
                </span>
              )}
            </div>
          </div>
          <span className="text-2xl">⚡</span>
        </div>
      </div>

      {/* Main Solver Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Board Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col items-center justify-center">
          <div className="w-full max-w-[500px] aspect-square relative rounded-xl overflow-hidden shadow-2xl">
            {loading ? (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-3 z-10">
                <span className="text-3xl animate-spin">⏳</span>
                <span>Selecting skill-matched puzzle...</span>
              </div>
            ) : null}

            {isReplayingSolution && (
              <div className="absolute top-2 left-2 z-20 px-3 py-1 rounded-lg bg-red-600/90 text-white text-[11px] font-bold shadow-lg animate-pulse flex items-center gap-1.5">
                <span>▶️</span>
                <span>Demonstrating Winning Solution...</span>
              </div>
            )}

            <ChessboardComponent
              position={boardFen}
              onPieceDrop={handlePieceDrop}
              boardOrientation={currentPuzzle?.sideToMove === 'black' ? 'black' : 'white'}
              customSquareStyles={customSquareStyles}
              customBoardStyle={{ borderRadius: '0.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
            />
          </div>

          {/* Interactive Step-by-Step Solution Walkthrough Controls */}
          {canAdvance && solutionFens.length > 1 && (
            <div className="w-full max-w-[500px] mt-3 p-2 bg-slate-950/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleStepToStart}
                  disabled={isReplayingSolution || stepReviewIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold transition"
                  title="Go to starting position"
                >
                  ⏮️
                </button>
                <button
                  type="button"
                  onClick={handleStepBack}
                  disabled={isReplayingSolution || stepReviewIndex === 0}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold transition flex items-center gap-1"
                  title="Previous move"
                >
                  <span>◀</span>
                  <span className="hidden sm:inline text-[11px]">Prev</span>
                </button>
              </div>

              <div className="text-center">
                <span className="text-[11px] font-mono font-bold text-amber-400">
                  Move {stepReviewIndex} / {solutionFens.length - 1}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {stepReviewIndex === 0
                    ? 'Puzzle Start'
                    : stepReviewIndex === solutionFens.length - 1
                    ? 'Solution Complete'
                    : 'Tactical Line'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleStepForward}
                  disabled={isReplayingSolution || stepReviewIndex >= solutionFens.length - 1}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold transition flex items-center gap-1"
                  title="Next move"
                >
                  <span className="hidden sm:inline text-[11px]">Next</span>
                  <span>▶</span>
                </button>
                <button
                  type="button"
                  onClick={handleStepToEnd}
                  disabled={isReplayingSolution || stepReviewIndex >= solutionFens.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold transition"
                  title="Go to final position"
                >
                  ⏭️
                </button>
                <button
                  type="button"
                  onClick={handleReplayAnimation}
                  disabled={isReplayingSolution}
                  className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition ml-1"
                  title="Replay animated walkthrough"
                >
                  🔁
                </button>
              </div>
            </div>
          )}

          {/* Pet Companion Dialogue Banner */}
          <div className="w-full max-w-[500px] mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-base shrink-0">
              🐾
            </div>
            <p className="text-xs text-slate-300 italic leading-snug">
              &ldquo;{petReaction}&rdquo;
            </p>
          </div>
        </div>

        {/* Puzzle Details & Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">
                  {practiceMode === 'daily'
                    ? 'Official Daily Challenge'
                    : practiceMode === 'mistakes'
                    ? 'Reviewing Failed Mistake'
                    : `${selectedCategory} Practice`}
                </span>

                {/* Lives Hearts */}
                <div className="flex items-center gap-0.5 text-sm" title={`${lives} attempts remaining`}>
                  {lives === 3 ? (
                    <><span>❤️</span><span>❤️</span><span>❤️</span></>
                  ) : lives === 2 ? (
                    <><span>❤️</span><span>❤️</span><span className="opacity-25">🖤</span></>
                  ) : lives === 1 ? (
                    <><span>❤️</span><span className="opacity-25">🖤</span><span className="opacity-25">🖤</span></>
                  ) : (
                    <><span className="opacity-25">🖤</span><span className="opacity-25">🖤</span><span className="opacity-25">🖤</span></>
                  )}
                </div>
              </div>

              <h3 className="font-heading font-extrabold text-lg text-white mt-1">
                {currentPuzzle?.sideToMove === 'white' ? 'White to Play & Win' : 'Black to Play & Win'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Puzzle ID:</span>
                <strong className="text-slate-300 font-mono">{currentPuzzle?.id || '—'}</strong>
                {currentPuzzle?.source === 'ACADEMY' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    Coach Curated
                  </span>
                )}
              </p>
            </div>

            {/* Themes */}
            {currentPuzzle?.themes && currentPuzzle.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentPuzzle.themes.slice(0, 4).map((th) => (
                  <span key={th} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold">
                    #{th}
                  </span>
                ))}
              </div>
            )}

            {/* Move Input Form (Alternative to drag & drop) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkMoveUci(userMoveInput);
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userMoveInput}
                  disabled={isSolved || isFailed || isReplayingSolution}
                  onChange={(e) => setUserMoveInput(e.target.value)}
                  placeholder="Or enter move (e.g. e2e4)..."
                  className="flex-grow px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSolved || isFailed || isReplayingSolution}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </form>

            {/* Feedback Alert */}
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : feedback.type === 'error'
                  ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                  : feedback.type === 'warn'
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'bg-slate-800/60 border border-slate-700/60 text-slate-300'
              }`}
            >
              {feedback.text}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRequestHint}
                disabled={isSolved || isFailed || isReplayingSolution || hintLevel >= 2}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>💡</span>
                <span>
                  {hintLevel === 0
                    ? 'Hint 1 (Piece)'
                    : hintLevel === 1
                    ? 'Hint 2 (Target)'
                    : 'Hints Revealed'}
                </span>
              </button>

              {!canAdvance && (
                <button
                  type="button"
                  onClick={() => setShowForfeitModal(true)}
                  disabled={loading || isReplayingSolution}
                  className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <span>🏳️</span>
                  <span>Give Up</span>
                </button>
              )}
            </div>

            {/* Next Puzzle Button: Strictly locked until puzzle is solved or forfeited */}
            <button
              type="button"
              onClick={handleNextPuzzle}
              disabled={!canAdvance}
              className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                canAdvance
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-gold cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <span>{canAdvance ? 'Next Puzzle →' : '🔒 Solve or Give Up to Advance'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Give Up / Forfeit Confirmation Modal */}
      {showForfeitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h4 className="font-bold text-sm">Give Up & View Solution?</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Forfeiting this puzzle will count as an unsolved attempt, apply a small tactical rating penalty, and queue this puzzle in your <strong>Review Mistakes</strong> tab. The winning solution will then be demonstrated on the board.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForfeitModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Keep Trying
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForfeitModal(false);
                  handlePuzzleFailed(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
              >
                Confirm Give Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
