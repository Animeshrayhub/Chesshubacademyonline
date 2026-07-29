'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';

const Chessboard = dynamic(
  () =>
    import('react-chessboard').then((mod) => {
      const CB = mod.Chessboard;
      return function BoardWrapper(props: any) {
        const boardProps = props.options ? { ...props.options, ...props } : props;
        return <CB {...boardProps} />;
      };
    }),
  { ssr: false }
) as any;

interface CompactPuzzle {
  id: string;
  fen: string;
  moves: string; // e.g. "c8e6 c4e6"
  rating: number;
  themes: string[];
}

interface StudentBattleArenaProps {
  studentName?: string;
}

// Built-in curated speed run tactical puzzles fallback
const DEFAULT_SPEED_RUN_PUZZLES: CompactPuzzle[] = [
  {
    id: 'sp-1',
    fen: 'r1b2r1k/pp3p1p/2n2p2/4p3/2B5/4P3/PP3PPP/R1B2RK1 b - - 0 14',
    moves: 'c8e6 c4e6',
    rating: 1100,
    themes: ['pin', 'endgame'],
  },
  {
    id: 'sp-2',
    fen: '6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 1',
    moves: 'g1h1 b2b8',
    rating: 900,
    themes: ['backRank', 'mateIn1'],
  },
  {
    id: 'sp-3',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves: 'd2d3 c6d4',
    rating: 1000,
    themes: ['fork', 'tactics'],
  },
  {
    id: 'sp-4',
    fen: 'r1b1k2r/ppppqppp/2n5/4P3/2B1n3/5N2/PPP2PPP/RNBQ1RK1 b kq - 2 7',
    moves: 'e4c5 f3g5',
    rating: 1200,
    themes: ['attack', 'opening'],
  },
  {
    id: 'sp-5',
    fen: '2r3k1/5ppp/8/3Q4/8/8/5PPP/2R3K1 w - - 0 1',
    moves: 'g1h1 c1c8',
    rating: 950,
    themes: ['backRank', 'mateIn1'],
  },
  {
    id: 'sp-6',
    fen: 'r1b2rk1/ppp2ppp/2n5/3qp3/8/3P1N2/PPPQBPPP/R4RK1 b - - 1 10',
    moves: 'e5e4 d3e4',
    rating: 1050,
    themes: ['simplification'],
  },
  {
    id: 'sp-7',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P1n1/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 6',
    moves: 'c1g5 c6e7',
    rating: 1150,
    themes: ['pin', 'development'],
  },
  {
    id: 'sp-8',
    fen: '5rk1/1p3ppp/8/8/8/8/1Q3PPP/5RK1 w - - 0 1',
    moves: 'g1h1 b2f6',
    rating: 1000,
    themes: ['tactics'],
  },
  {
    id: 'sp-9',
    fen: 'r2q1rk1/ppp2ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPP2PPP/R2Q1RK1 w - - 4 8',
    moves: 'c3d5 f6d5',
    rating: 1300,
    themes: ['pin', 'center'],
  },
  {
    id: 'sp-10',
    fen: '6k1/5p1p/6p1/8/8/8/1Q3PPP/6K1 w - - 0 1',
    moves: 'g1h1 b2b8',
    rating: 900,
    themes: ['backRank'],
  },
];

export default function StudentBattleArena({ studentName = 'Student' }: StudentBattleArenaProps) {
  const [inBattle, setInBattle] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [puzzleList, setPuzzleList] = useState<CompactPuzzle[]>(DEFAULT_SPEED_RUN_PUZZLES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [boardKey, setBoardKey] = useState(0);

  const currentPuzzle = puzzleList[currentIndex] || DEFAULT_SPEED_RUN_PUZZLES[0];

  // Board & game state for active puzzle
  const [game, setGame] = useState<Chess>(new Chess());
  const [solution, setSolution] = useState<string[]>([]);
  const [turnColor, setTurnColor] = useState<'white' | 'black'>('white');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch puzzles from local API or fallback to curated list
  const loadPuzzles = useCallback(async () => {
    try {
      const res = await fetch('/api/puzzles/local?count=40');
      if (res.ok) {
        const data = await res.json();
        if (data.puzzles && Array.isArray(data.puzzles) && data.puzzles.length > 0) {
          // Filter valid puzzles
          const valid = data.puzzles.filter((p: any) => p && p.fen && p.moves && p.moves.split(' ').length >= 2);
          if (valid.length > 0) {
            setPuzzleList(valid);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load battle arena puzzles:', err);
    }
    // Fallback to default
    setPuzzleList(DEFAULT_SPEED_RUN_PUZZLES);
  }, []);

  useEffect(() => {
    loadPuzzles();
  }, [loadPuzzles]);

  // Setup current puzzle position safely
  useEffect(() => {
    if (!currentPuzzle) return;

    try {
      const moves = currentPuzzle.moves ? currentPuzzle.moves.trim().split(/\s+/) : [];

      // If puzzle is invalid, auto advance
      if (moves.length < 2) {
        setCurrentIndex((prev) => (prev + 1) % Math.max(1, puzzleList.length));
        return;
      }

      const oppMoveUci = moves[0];
      const sol = moves.slice(1);

      const c = new Chess(currentPuzzle.fen);
      const from = oppMoveUci.substring(0, 2);
      const to = oppMoveUci.substring(2, 4);
      const promo = oppMoveUci.length > 4 ? oppMoveUci.substring(4, 5) : undefined;

      const moveRes = c.move({ from, to, promotion: promo });
      if (!moveRes) {
        // Fallback if move fails to apply
        setCurrentIndex((prev) => (prev + 1) % Math.max(1, puzzleList.length));
        return;
      }

      setGame(c);
      setSolution(sol);
      const activeTurn = c.turn() === 'w' ? 'white' : 'black';
      setTurnColor(activeTurn);
      setBoardKey((prev) => prev + 1);
      setFeedback({
        text: `Your turn! (${activeTurn === 'white' ? 'White' : 'Black'} to move)`,
        type: 'info',
      });
    } catch (err) {
      console.error('Error initializing speed puzzle position:', err);
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, puzzleList.length));
    }
  }, [currentPuzzle, puzzleList.length]);

  // 60s Timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (inBattle && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && inBattle) {
      setInBattle(false);
      setGameOver(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [inBattle, timeLeft]);

  // Start 60s Speed Run
  const handleStartDuel = async () => {
    await loadPuzzles();
    setInBattle(true);
    setTimeLeft(60);
    setPuzzlesSolved(0);
    setTotalAttempts(0);
    setCurrentIndex(0);
    setGameOver(false);
  };

  // Handle Skip Puzzle
  const handleSkipPuzzle = useCallback(() => {
    if (!inBattle) return;
    setTotalAttempts((prev) => prev + 1);
    setFeedback({ text: '⏭️ Puzzle skipped! Loading next tactic...', type: 'info' });
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, puzzleList.length));
  }, [inBattle, puzzleList.length]);

  // Handle User Piece Move Drop
  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!inBattle || !currentPuzzle || solution.length === 0) return false;

    setTotalAttempts((prev) => prev + 1);

    const expectedNextUci = solution[0];
    const expectedFrom = expectedNextUci.substring(0, 2);
    const expectedTo = expectedNextUci.substring(2, 4);

    // Validate if move matches expected solution
    if (sourceSquare === expectedFrom && targetSquare === expectedTo) {
      try {
        const temp = new Chess(game.fen());
        const moveRes = temp.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

        if (moveRes) {
          setGame(temp);
          setPuzzlesSolved((prev) => prev + 1);
          setFeedback({ text: '✓ Correct! Next puzzle loading...', type: 'success' });

          setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % Math.max(1, puzzleList.length));
          }, 350);
          return true;
        }
      } catch (err) {
        console.error('Error handling move drop:', err);
      }
    }

    // Incorrect move
    setFeedback({ text: '❌ Incorrect move! Try another tactic or click Skip.', type: 'error' });
    return false;
  };

  const accuracyPercent = totalAttempts > 0 ? Math.round((puzzlesSolved / totalAttempts) * 100) : 100;

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-5 shadow-xl text-white space-y-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-2xl shadow-lg">
            ⚔️
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-indigo-300 flex items-center gap-2">
              <span>60-Second Tactical Speed Run</span>
              <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                Live Rush
              </span>
            </h3>
            <p className="text-xs text-slate-400">Solve as many tactical puzzles as you can in 60 seconds!</p>
          </div>
        </div>

        {inBattle && (
          <div className="bg-slate-950 border border-indigo-500/40 px-3.5 py-1.5 rounded-2xl text-center shadow-inner">
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">TIME REMAINING</span>
            <span className="text-base font-extrabold text-amber-400 font-mono">⏱️ {timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Pre-game lobby */}
      {!inBattle && !gameOver && (
        <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold text-slate-200">Ready for the 60-Second Puzzle Sprint?</h4>
            <p className="text-xs text-slate-400">
              Clean interactive board — solve tactics continuously against the clock to set your daily record!
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartDuel}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-gold transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
          >
            <span>⚔️ Start 60s Speed Run</span>
          </button>
        </div>
      )}

      {/* Active Battle Board */}
      {inBattle && (
        <div className="space-y-4">
          {/* Live Scorebar */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Puzzles Solved:</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">🎯 {puzzlesSolved}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Accuracy:</span>
              <span className="text-xs font-mono font-bold text-amber-400">{accuracyPercent}%</span>
            </div>
            <button
              type="button"
              onClick={handleSkipPuzzle}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold rounded-xl border border-indigo-500/40 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>⏭️ Skip Puzzle</span>
            </button>
          </div>

          {/* Feedback bar */}
          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all shadow-inner ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
                  : feedback.type === 'error'
                  ? 'bg-red-950/70 border border-red-500/50 text-red-300'
                  : 'bg-indigo-950/70 border border-indigo-500/50 text-indigo-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* CLEAN CHESSBOARD ONLY */}
          <div className="flex justify-center items-center py-2 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3">
            <div className="w-full max-w-[420px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-700/60">
              <Chessboard
                key={boardKey}
                position={game.fen()}
                onPieceDrop={(source: string, target: string) => handlePieceDrop(source, target)}
                boardOrientation={turnColor}
                options={{
                  position: game.fen(),
                  onPieceDrop: ({ sourceSquare, targetSquare }: any) => handlePieceDrop(sourceSquare, targetSquare),
                  boardOrientation: turnColor,
                  boardStyle: {
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  },
                }}
                customBoardStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Over Summary Modal */}
      {gameOver && (
        <div className="p-6 bg-slate-950 border border-indigo-500/40 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="text-5xl animate-bounce">⏱️</div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-indigo-300">Time&apos;s Up! 60s Speed Run Complete</h4>
            <p className="text-xs text-slate-400">Here is how you performed under time pressure:</p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-center py-2">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Puzzles Solved</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">{puzzlesSolved}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Accuracy</span>
              <span className="text-2xl font-extrabold text-amber-400 font-mono">{accuracyPercent}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartDuel}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-gold transition-all"
          >
            🔄 Start New 60s Speed Run
          </button>
        </div>
      )}
    </div>
  );
}
