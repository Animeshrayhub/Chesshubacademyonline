'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import DashboardIcon from './DashboardIcon';
import Button from '@/components/ui/Button';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import { customChessPieces } from './ChessPieces';
import {
  getStudentBotProfileAction,
  startBotGameAction,
  finishBotGameAction,
  solvePersonalizedPuzzleAction,
} from '@/actions/botTraining';
import type {
  StudentColor,
  TimeControlOption,
  StudentBotProfile,
  BotGameRecord,
  RatingHistoryEntry,
  StudentWeakness,
  PersonalizedPuzzle,
  StudentBadge,
  BotLevelConfig,
  GameAnalysisSummary,
  AnalyzedMistake,
} from '@/lib/bot-training/types';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

const BOT_LEVELS: BotLevelConfig[] = [
  { level: 1, rating: 400, name: 'Level 1 — Pawn', description: 'Beginner (400)', depth: 1, skillLevel: 0, avatarIcon: '♟️' },
  { level: 2, rating: 600, name: 'Level 2 — Knight', description: 'Casual (600)', depth: 2, skillLevel: 2, avatarIcon: '♞' },
  { level: 3, rating: 800, name: 'Level 3 — Bishop', description: 'Intermediate (800)', depth: 4, skillLevel: 5, avatarIcon: '♝' },
  { level: 4, rating: 1000, name: 'Level 4 — Rook', description: 'Club Player (1000)', depth: 6, skillLevel: 8, avatarIcon: '♜' },
  { level: 5, rating: 1200, name: 'Level 5 — Queen', description: 'Advanced (1200)', depth: 8, skillLevel: 11, avatarIcon: '♛' },
  { level: 6, rating: 1400, name: 'Level 6 — CM Bot', description: 'Expert CM (1400)', depth: 10, skillLevel: 14, avatarIcon: '🏅' },
  { level: 7, rating: 1600, name: 'Level 7 — IM Bot', description: 'Master IM (1600)', depth: 12, skillLevel: 16, avatarIcon: '🎖️' },
  { level: 8, rating: 1800, name: 'Level 8 — GM Bot', description: 'Grandmaster (1800)', depth: 14, skillLevel: 18, avatarIcon: '🥇' },
  { level: 9, rating: 2000, name: 'Level 9 — Super GM', description: 'Super GM (2000)', depth: 16, skillLevel: 19, avatarIcon: '👑' },
  { level: 10, rating: 2200, name: 'Level 10 — Engine', description: 'Champion (2200)', depth: 18, skillLevel: 20, avatarIcon: '⚡' },
];

export default function StudentBotTrainingView() {
  const [activeTab, setActiveTab] = useState<'play' | 'rating' | 'weaknesses' | 'plan' | 'badges' | 'history'>('play');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<StudentBotProfile | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryEntry[]>([]);
  const [weaknesses, setWeaknesses] = useState<StudentWeakness[]>([]);
  const [puzzles, setPuzzles] = useState<PersonalizedPuzzle[]>([]);
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [recentGames, setRecentGames] = useState<BotGameRecord[]>([]);

  // Setup state
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<StudentColor>('white');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>('10+0');
  const [isStartingGame, setIsStartingGame] = useState(false);

  // Active Game State
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [inGame, setInGame] = useState(false);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [gameStatus, setGameStatus] = useState<'active' | 'completed'>('active');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  // Timed game clocks
  const [studentTimeSec, setStudentTimeSec] = useState<number>(600);
  const [botTimeSec, setBotTimeSec] = useState<number>(600);
  const [clockIncrementSec, setClockIncrementSec] = useState<number>(0);
  const [isTimed, setIsTimed] = useState<boolean>(true);

  // Post-Game Analysis Modal
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showEngineDetails, setShowEngineDetails] = useState(false);

  // Puzzle Solver Modal
  const [activePuzzle, setActivePuzzle] = useState<PersonalizedPuzzle | null>(null);
  const [puzzleFen, setPuzzleFen] = useState<string>('');
  const [puzzleMsg, setPuzzleMsg] = useState<string>('');
  const [puzzleSolved, setPuzzleSolved] = useState(false);

  const gameRef = useRef<Chess>(new Chess());
  const stockfishRef = useRef<Worker | null>(null);

  // Fetch initial profile
  const fetchProfile = async () => {
    setLoadingProfile(true);
    const res = await getStudentBotProfileAction();
    if (res.success && res.data) {
      setProfile(res.data.profile);
      setRatingHistory(res.data.ratingHistory || []);
      setWeaknesses(res.data.weaknesses || []);
      setPuzzles(res.data.puzzles || []);
      setBadges(res.data.badges || []);
      setRecentGames(res.data.recentGames || []);

      // Auto select highest unlocked level
      const unlocked = res.data.profile.unlocked_levels || [1];
      const maxUnlocked = Math.max(...unlocked, 1);
      setSelectedLevel(maxUnlocked);
    }
    setLoadingProfile(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Terminate Stockfish on unmount
  useEffect(() => {
    return () => {
      stockfishRef.current?.terminate();
    };
  }, []);

  // Clock countdown timer
  useEffect(() => {
    if (!inGame || gameStatus !== 'active' || !isTimed) return;

    const interval = setInterval(() => {
      const turn = gameRef.current.turn();
      const isStudentTurn = (turn === 'w' && playerColor === 'white') || (turn === 'b' && playerColor === 'black');

      if (isStudentTurn) {
        setStudentTimeSec((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleGameEnd('loss', 'timeout');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBotTimeSec((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleGameEnd('win', 'timeout');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inGame, gameStatus, isTimed, playerColor, fen]);

  // Start game handler
  const handleStartGame = async () => {
    setIsStartingGame(true);
    const res = await startBotGameAction({
      botLevel: selectedLevel,
      color: selectedColor,
      timeControl: selectedTimeControl,
    });

    if (!res.success || !res.data) {
      alert(res.error?.message || 'Could not start bot game.');
      setIsStartingGame(false);
      return;
    }

    const gData = res.data;
    setActiveGameId(gData.gameId);
    setPlayerColor(gData.color);
    setFen(gData.initialFen);
    gameRef.current = new Chess(gData.initialFen);
    setMoveHistory([]);
    setGameStatus('active');
    setInGame(true);

    // Setup Clocks
    if (gData.timeControl === 'unlimited') {
      setIsTimed(false);
    } else {
      setIsTimed(true);
      if (gData.timeControl === '10+0') { setStudentTimeSec(600); setBotTimeSec(600); setClockIncrementSec(0); }
      else if (gData.timeControl === '10+5') { setStudentTimeSec(600); setBotTimeSec(600); setClockIncrementSec(5); }
      else if (gData.timeControl === '15+10') { setStudentTimeSec(900); setBotTimeSec(900); setClockIncrementSec(10); }
      else if (gData.timeControl === '5+0') { setStudentTimeSec(300); setBotTimeSec(300); setClockIncrementSec(0); }
    }

    setIsStartingGame(false);
  };

  // Stockfish Bot turn trigger
  useEffect(() => {
    if (!inGame || gameStatus !== 'active') return;

    const activeTurnColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeTurnColor !== playerColor && !isBotThinking) {
      const timeout = setTimeout(() => {
        triggerBotMove();
      }, 700);
      return () => clearTimeout(timeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, inGame, gameStatus, playerColor]);

  // Execute Bot move via Stockfish Worker
  const triggerBotMove = () => {
    if (gameStatus !== 'active') return;
    setIsBotThinking(true);

    stockfishRef.current?.terminate();
    const worker = new Worker('/stockfish/stockfish.js');
    stockfishRef.current = worker;

    const botCfg = BOT_LEVELS.find((b) => b.level === selectedLevel) || BOT_LEVELS[0];

    worker.onmessage = (event) => {
      const line = event.data;
      if (typeof line === 'string' && line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMoveUci = parts[1];

        if (bestMoveUci && bestMoveUci !== '(none)') {
          const game = gameRef.current;
          try {
            const from = bestMoveUci.substring(0, 2);
            const to = bestMoveUci.substring(2, 4);
            const promotion = bestMoveUci.substring(4, 5) || undefined;

            game.move({ from, to, promotion });
            const nextFen = game.fen();
            setFen(nextFen);
            setMoveHistory(game.history());

            if (isTimed && clockIncrementSec > 0) {
              setBotTimeSec((prev) => prev + clockIncrementSec);
            }

            checkGameEndState();
          } catch (e) {}
        }
        setIsBotThinking(false);
        worker.terminate();
      }
    };

    worker.postMessage('uci');
    worker.postMessage(`setoption name Skill Level value ${botCfg.skillLevel}`);
    worker.postMessage('ucinewgame');
    worker.postMessage(`position fen ${gameRef.current.fen()}`);
    worker.postMessage(`go depth ${botCfg.depth}`);
  };

  // Helper to extract square string from string or object param
  const extractSquareString = (param: any): string => {
    if (!param) return '';
    if (typeof param === 'string') return param;
    if (typeof param === 'object' && param !== null) {
      if ('square' in param && typeof param.square === 'string') return param.square;
      if ('sourceSquare' in param && typeof param.sourceSquare === 'string') return param.sourceSquare;
      if ('targetSquare' in param && typeof param.targetSquare === 'string') return param.targetSquare;
    }
    return String(param);
  };

  const extractDropSquares = (sourceOrObj: any, targetArg?: string): { source: string; target: string } => {
    if (typeof sourceOrObj === 'object' && sourceOrObj !== null) {
      const s = sourceOrObj.sourceSquare || sourceOrObj.from || sourceOrObj.square || '';
      const t = sourceOrObj.targetSquare || sourceOrObj.to || targetArg || '';
      return { source: String(s), target: String(t) };
    }
    return { source: String(sourceOrObj || ''), target: String(targetArg || '') };
  };

  // Handle square click for click-to-move piece selection
  const handleSquareClick = (squareParam: any) => {
    if (!inGame || gameStatus !== 'active' || isBotThinking) return;

    const square = extractSquareString(squareParam);
    if (!square) return;

    const activeTurnColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeTurnColor !== playerColor) return;

    // 1. If clicked on a target option square, execute move
    if (optionSquares[square]) {
      try {
        const move = gameRef.current.move({
          from: selectedSquare!,
          to: square,
          promotion: 'q',
        });

        if (move) {
          const nextFen = gameRef.current.fen();
          setFen(nextFen);
          setMoveHistory(gameRef.current.history());
          setSelectedSquare(null);
          setOptionSquares({});

          if (isTimed && clockIncrementSec > 0) {
            setStudentTimeSec((prev) => prev + clockIncrementSec);
          }

          checkGameEndState();
          return;
        }
      } catch (e) {}
    }

    // 2. Otherwise select piece and show legal move hints
    const piece = gameRef.current.get(square as any);
    if (piece && piece.color === gameRef.current.turn()) {
      setSelectedSquare(square);

      const moves = gameRef.current.moves({ square: square as any, verbose: true });
      const newOptionSquares: Record<string, React.CSSProperties> = {};

      newOptionSquares[square] = {
        boxShadow: 'inset 0 0 0 3.5px #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      };

      moves.forEach((m) => {
        const targetPiece = gameRef.current.get(m.to as any);
        if (targetPiece) {
          newOptionSquares[m.to] = {
            boxShadow: 'inset 0 0 0 3.5px #ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
          };
        } else {
          newOptionSquares[m.to] = {
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 25%, transparent 26%)',
          };
        }
      });

      setOptionSquares(newOptionSquares);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  // Handle student piece drop
  const handlePieceDrop = (sourceOrObj: any, targetArg?: string): boolean => {
    if (!inGame || gameStatus !== 'active' || isBotThinking) return false;

    const { source, target } = extractDropSquares(sourceOrObj, targetArg);
    if (!source || !target) return false;

    const activeTurnColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeTurnColor !== playerColor) return false;

    try {
      const move = gameRef.current.move({
        from: source,
        to: target,
        promotion: 'q',
      });

      if (move === null) return false;

      const nextFen = gameRef.current.fen();
      setFen(nextFen);
      setMoveHistory(gameRef.current.history());
      setSelectedSquare(null);
      setOptionSquares({});

      if (isTimed && clockIncrementSec > 0) {
        setStudentTimeSec((prev) => prev + clockIncrementSec);
      }

      checkGameEndState();
      return true;
    } catch (e) {
      return false;
    }
  };

  // Check checkmates, stalemates, draws
  const checkGameEndState = () => {
    const game = gameRef.current;
    if (!game.isGameOver()) return;

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'black' : 'white';
      const result = winner === playerColor ? 'win' : 'loss';
      handleGameEnd(result, 'checkmate');
    } else if (game.isStalemate()) {
      handleGameEnd('draw', 'stalemate');
    } else if (game.isThreefoldRepetition()) {
      handleGameEnd('draw', 'repetition');
    } else if (game.isInsufficientMaterial()) {
      handleGameEnd('draw', 'insufficient_material');
    } else if (game.isDraw()) {
      handleGameEnd('draw', '50_move');
    }
  };

  // Finish Game & Run Server Analysis
  const handleGameEnd = async (result: 'win' | 'loss' | 'draw', termination: any) => {
    if (gameStatus === 'completed') return;
    setGameStatus('completed');

    // Guard: if the game was never started server-side, bail out
    if (!activeGameId) {
      console.error('[handleGameEnd] No active game ID — game may not have been saved to DB.');
      return;
    }

    const res = await finishBotGameAction({
      gameId: activeGameId,
      botLevel: selectedLevel,
      result,
      termination,
      pgn: gameRef.current.pgn(),
      finalFen: gameRef.current.fen(),
      moveCount: moveHistory.length,
      studentColor: playerColor,
      timeControl: selectedTimeControl,
    });

    if (res.success && res.data) {
      // 1. Set analysis modal data immediately from server response
      setAnalysisData(res.data);
      setShowAnalysisModal(true);

      // 2. Instantly update profile stats from server response (no waiting for fetchProfile)
      if (profile) {
        setProfile((prev) => prev ? {
          ...prev,
          rating: res.data.ratingAfter,
          wins: result === 'win' ? (prev.wins + 1) : prev.wins,
          losses: result === 'loss' ? (prev.losses + 1) : prev.losses,
          draws: result === 'draw' ? (prev.draws + 1) : prev.draws,
          games_played: prev.games_played + 1,
          unlocked_levels: res.data.unlockedLevels || prev.unlocked_levels,
        } : prev);
      }

      // 3. Append new weaknesses from this game to the weakness list
      if (Array.isArray(res.data.newWeaknesses) && res.data.newWeaknesses.length > 0) {
        setWeaknesses((prev) => {
          const existingIds = new Set(prev.map((w) => w.id));
          const merged = [...prev];
          for (const w of res.data.newWeaknesses) {
            const idx = merged.findIndex((x) => x.weakness_type === w.weakness_type);
            if (idx >= 0) {
              merged[idx] = w; // Update existing
            } else {
              merged.push(w); // Add new
            }
          }
          return merged;
        });
      }

      // 4. Append newly generated puzzles
      if (Array.isArray(res.data.generatedPuzzles) && res.data.generatedPuzzles.length > 0) {
        setPuzzles((prev) => [
          ...res.data.generatedPuzzles,
          ...prev.filter((p) => !res.data.generatedPuzzles.some((np: any) => np.id === p.id)),
        ]);
      }

      // 5. Append awarded badges
      if (Array.isArray(res.data.awardedBadges) && res.data.awardedBadges.length > 0) {
        setBadges((prev) => [
          ...prev,
          ...res.data.awardedBadges.filter((b: any) => !prev.some((pb) => pb.id === b.id)),
        ]);
      }

      // 6. Full profile refresh to sync everything from DB (runs in background)
      fetchProfile();
    } else if (!res.success) {
      console.error('[handleGameEnd] finishBotGameAction failed:', (res as any).error?.message);
      // Still show some result UI even on error
      setAnalysisData({
        result,
        ratingBefore: profile?.rating || 400,
        ratingAfter: profile?.rating || 400,
        ratingChange: 0,
        analysisSummary: { accuracy: 0, blunders: 0, keyMoments: [] },
      });
      setShowAnalysisModal(true);
    }
  };

  const formatClock = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Solve Personalized Puzzle
  const handleStartPuzzle = (p: PersonalizedPuzzle) => {
    setActivePuzzle(p);
    setPuzzleFen(p.fen);
    setPuzzleMsg('Find the best move for your training topic!');
    setPuzzleSolved(false);
  };

  const handlePuzzleDrop = (source: string, target: string): boolean => {
    if (!activePuzzle || puzzleSolved) return false;

    const pGame = new Chess(puzzleFen);
    try {
      const m = pGame.move({ from: source, to: target, promotion: 'q' });
      if (!m) return false;

      const isCorrect = m.san.toLowerCase() === activePuzzle.solution.toLowerCase() ||
        `${m.from}${m.to}`.toLowerCase() === activePuzzle.solution.toLowerCase();

      setPuzzleFen(pGame.fen());

      if (isCorrect) {
        setPuzzleMsg('🎉 Excellent! You solved this weakness puzzle!');
        setPuzzleSolved(true);
        solvePersonalizedPuzzleAction({ puzzleId: activePuzzle.id, isCorrect: true }).then(() => fetchProfile());
      } else {
        setPuzzleMsg('❌ Not quite right. Try again or view explanation.');
        solvePersonalizedPuzzleAction({ puzzleId: activePuzzle.id, isCorrect: false });
      }
      return true;
    } catch {
      return false;
    }
  };

  if (loadingProfile) {
    return (
      <div className="p-12 text-center text-slate-400">
        <DashboardIcon iconKey="brain" className="w-10 h-10 animate-bounce mx-auto text-primary mb-3" />
        <p className="font-bold text-sm">Loading Student Bot Training Dashboard...</p>
      </div>
    );
  }

  const unlockedSet = new Set(profile?.unlocked_levels || [1]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
            ♟️
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Bot Training & Improvement</h1>
            <p className="text-xs text-slate-400 mt-1">
              Train against 10 difficulty bots, analyze game mistakes, and solve personalized weakness puzzles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-xl px-5 py-3 text-center">
          <div>
            <div className="text-2xl font-black text-amber-400">{profile?.rating || 400}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ChessHub Rating</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-2xl font-black text-emerald-400">Level {profile?.current_level || 1}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bot Rank</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-2xl font-black text-sky-400">{profile?.puzzles_solved || 0}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puzzles Solved</div>
          </div>
        </div>
      </div>
      {/* DEV DIAGNOSTICS — only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 text-[10px] font-mono text-slate-400 space-y-1.5">
          <div className="font-bold text-amber-400 uppercase text-xs mb-2">🔧 Development Diagnostics (hidden in production)</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <div><span className="text-slate-500">Profile ID:</span> <span className="text-slate-200 break-all">{profile?.id?.slice(0, 8) || 'none'}…</span></div>
            <div><span className="text-slate-500">Student ID:</span> <span className="text-slate-200 break-all">{profile?.student_id?.slice(0, 8) || 'none'}…</span></div>
            <div><span className="text-slate-500">Rating:</span> <span className="text-emerald-400 font-bold">{profile?.rating ?? '?'}</span></div>
            <div><span className="text-slate-500">Level:</span> <span className="text-emerald-400 font-bold">{profile?.current_level ?? '?'}</span></div>
            <div><span className="text-slate-500">Active Game:</span> <span className="text-sky-400">{activeGameId?.slice(0, 8) || 'none'}…</span></div>
            <div><span className="text-slate-500">Recent Games:</span> <span className="text-white font-bold">{recentGames.length}</span></div>
            <div><span className="text-slate-500">Rating History:</span> <span className="text-white font-bold">{ratingHistory.length}</span></div>
            <div><span className="text-slate-500">Weaknesses:</span> <span className="text-white font-bold">{weaknesses.length}</span></div>
            <div><span className="text-slate-500">Puzzles:</span> <span className="text-white font-bold">{puzzles.length}</span></div>
            <div><span className="text-slate-500">Badges:</span> <span className="text-white font-bold">{badges.length}</span></div>
            <div><span className="text-slate-500">Unlocked Levels:</span> <span className="text-amber-400">{(profile?.unlocked_levels || []).join(', ')}</span></div>
            <div><span className="text-slate-500">Games Played (DB):</span> <span className="text-white font-bold">{profile?.games_played ?? 0}</span></div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'play', label: '♟️ Play Bot', badge: inGame ? 'LIVE' : null },
          { id: 'rating', label: '📈 My Rating & Graph' },
          { id: 'weaknesses', label: `🎯 Weakness Profile (${weaknesses.length})` },
          { id: 'plan', label: `📋 My Training Plan (${puzzles.length})` },
          { id: 'badges', label: `🏅 Achievements (${badges.length})` },
          { id: 'history', label: `📜 Recent Games (${recentGames.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {t.label}
            {t.badge && <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* TAB 1: PLAY BOT */}
      {activeTab === 'play' && (
        <div className="space-y-6">
          {!inGame ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Level Selector */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DashboardIcon iconKey="trophy" className="w-5 h-5 text-amber-400" />
                  Select Bot Difficulty (10 Levels)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {BOT_LEVELS.map((b) => {
                    const isUnlocked = unlockedSet.has(b.level);
                    const isCoachUnlocked = profile?.coach_unlocked_levels?.includes(b.level);
                    const isSelected = selectedLevel === b.level;

                    return (
                      <div
                        key={b.level}
                        onClick={() => isUnlocked && setSelectedLevel(b.level)}
                        className={`relative rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                            : isUnlocked
                            ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
                            : 'border-slate-900 bg-slate-950/40 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{b.avatarIcon}</span>
                          {isUnlocked ? (
                            isCoachUnlocked ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded" title="Coach unlocked">
                                🔓 Coach
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                                Unlocked
                              </span>
                            )
                          ) : (
                            <span className="text-xs">🔒</span>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="font-bold text-xs text-white">{b.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">Rating Target: {b.rating}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Game Settings */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <DashboardIcon iconKey="settings" className="w-5 h-5 text-sky-400" />
                    Match Settings
                  </h2>

                  {/* Color Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Choose Side:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'white', label: '♔ White' },
                        { id: 'black', label: '♚ Black' },
                        { id: 'random', label: '🎲 Random' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedColor(c.id as any)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                            selectedColor === c.id
                              ? 'border-primary bg-primary/20 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Control Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Time Control:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '10+0', label: '10+0 (Blitz)' },
                        { id: '10+5', label: '10+5 (Rapid)' },
                        { id: '15+10', label: '15+10 (Rapid)' },
                        { id: '5+0', label: '5+0 (Speed)' },
                        { id: 'unlimited', label: 'Unlimited ♾️' },
                      ].map((tc) => (
                        <button
                          key={tc.id}
                          onClick={() => setSelectedTimeControl(tc.id as any)}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                            selectedTimeControl === tc.id
                              ? 'border-emerald-500 bg-emerald-500/20 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {tc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleStartGame}
                  loading={isStartingGame}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700"
                >
                  🚀 START MATCH
                </Button>
              </div>
            </div>
          ) : (
            /* ACTIVE GAME SCREEN */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
              {/* Development Diagnostics Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 flex flex-wrap gap-4 items-center justify-between">
                <div><span className="text-slate-500 font-bold uppercase">Color:</span> <strong className="text-amber-400">{playerColor.toUpperCase()}</strong></div>
                <div><span className="text-slate-500 font-bold uppercase">Turn:</span> <strong className="text-emerald-400">{gameRef.current.turn() === 'w' ? 'WHITE' : 'BLACK'}</strong></div>
                <div><span className="text-slate-500 font-bold uppercase">Board:</span> <strong className={inGame && gameStatus === 'active' && !isBotThinking ? 'text-emerald-400' : 'text-rose-400'}>{inGame && gameStatus === 'active' && !isBotThinking ? 'ENABLED ✅' : 'DISABLED 🔒'}</strong></div>
                <div><span className="text-slate-500 font-bold uppercase">Bot Thinking:</span> <strong className="text-sky-400">{isBotThinking ? 'YES ⏳' : 'NO'}</strong></div>
                <div><span className="text-slate-500 font-bold uppercase">Moves:</span> <strong className="text-white">{moveHistory.length}</strong></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chessboard */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center">
                <div className="w-full max-w-[480px] sm:max-w-[520px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-800 mx-auto">
                  <ChessboardComponent
                    position={fen}
                    onPieceDrop={handlePieceDrop}
                    onSquareClick={handleSquareClick}
                    arePiecesDraggable={true}
                    boardOrientation={playerColor}
                    customSquareStyles={optionSquares}
                    customBoardStyle={{ borderRadius: '12px' }}
                    customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                    customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                    customPieces={customChessPieces}
                  />
                </div>
              </div>

              {/* Sidebar Info & Controls */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Opponent Bot Info */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{BOT_LEVELS.find((b) => b.level === selectedLevel)?.avatarIcon}</span>
                      <div>
                        <div className="font-extrabold text-sm text-white">{BOT_LEVELS.find((b) => b.level === selectedLevel)?.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">Bot Rating: {BOT_LEVELS.find((b) => b.level === selectedLevel)?.rating}</div>
                      </div>
                    </div>
                    {isTimed && (
                      <div className="text-xl font-black text-amber-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                        {formatClock(botTimeSec)}
                      </div>
                    )}
                  </div>

                  {/* Student Player Info */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">
                        YOU
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-white">Student (You)</div>
                        <div className="text-[10px] text-slate-400 font-bold">Rating: {profile?.rating || 400}</div>
                      </div>
                    </div>
                    {isTimed && (
                      <div className="text-xl font-black text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                        {formatClock(studentTimeSec)}
                      </div>
                    )}
                  </div>

                  {/* Thinking Status */}
                  {isBotThinking && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 font-bold flex items-center gap-2 animate-pulse">
                      <DashboardIcon iconKey="brain" className="w-4 h-4 text-amber-400 animate-spin" />
                      Bot is calculating move...
                    </div>
                  )}

                  {/* Move History Log */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-48 overflow-y-auto">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Move History</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                      {moveHistory.reduce((acc: any[], move: string, index: number) => {
                        if (index % 2 === 0) {
                          acc.push({ moveNum: Math.floor(index / 2) + 1, white: move, black: '' });
                        } else {
                          acc[acc.length - 1].black = move;
                        }
                        return acc;
                      }, []).map((row: any) => (
                        <React.Fragment key={row.moveNum}>
                          <span className="text-slate-400">{row.moveNum}. {row.white}</span>
                          <span className="text-slate-200">{row.black}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleGameEnd('loss', 'resignation')}
                    variant="outline"
                    className="flex-1 py-2 text-xs font-bold text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    🏳️ Resign
                  </Button>
                  <Button
                    onClick={() => handleGameEnd('draw', 'draw_agreement')}
                    variant="outline"
                    className="flex-1 py-2 text-xs font-bold text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    🤝 Offer Draw
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {/* TAB 2: MY RATING & GRAPH */}
      {activeTab === 'rating' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <DashboardIcon iconKey="activity" className="w-5 h-5 text-amber-400" />
              Rating Progression History
            </h2>
            <span className="text-xs text-slate-400 font-bold">Starting Rating: 400 | Current: {profile?.rating}</span>
          </div>

          {ratingHistory.length > 0 ? (
            <div className="space-y-4">
              <div className="h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-end gap-2 overflow-x-auto">
                {ratingHistory.map((rh, idx) => {
                  const maxRating = Math.max(...ratingHistory.map((r) => r.after_rating), 1200);
                  const heightPct = Math.max(10, Math.min(100, Math.round((rh.after_rating / maxRating) * 100)));
                  const isPositive = rh.rating_change >= 0;

                  return (
                    <div key={rh.id || idx} className="flex-1 min-w-[30px] flex flex-col items-center gap-1 group relative">
                      <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-800 text-[10px] text-white p-2 rounded shadow-lg z-10 whitespace-nowrap">
                        Rating: {rh.after_rating} ({rh.rating_change >= 0 ? `+${rh.rating_change}` : rh.rating_change})
                        <br />
                        Result: {rh.result.toUpperCase()} (Level {rh.bot_level})
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-all ${
                          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-[9px] text-slate-500">{idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No rating history yet. Play your first match against a bot to start tracking your rating graph!
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WEAKNESS PROFILE */}
      {activeTab === 'weaknesses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DashboardIcon iconKey="puzzle" className="w-5 h-5 text-rose-400" />
            Detected Weakness Profile ({weaknesses.length})
          </h2>

          {weaknesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weaknesses.map((w) => {
                if (!w) return null;
                const status = String(w.status || 'NEEDS_PRACTICE');
                const typeLabel = String(w.weakness_type || 'general').replace(/_/g, ' ').toUpperCase();
                const statusColor =
                  status === 'MASTERED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : status === 'STRONG'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : status === 'IMPROVING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                return (
                  <div key={w.id || Math.random()} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">{typeLabel}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${statusColor}`}>
                        {status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 font-medium">
                      <div>Occurrences: <strong className="text-slate-200">{w.occurrences ?? 1} games</strong></div>
                      <div>Puzzles Solved: <strong className="text-slate-200">{w.puzzles_correct ?? 0} / {w.puzzles_completed ?? 0}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No weaknesses detected yet. As you play bot matches, Stockfish will automatically track mistake patterns here!
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MY TRAINING PLAN */}
      {activeTab === 'plan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DashboardIcon iconKey="target" className="w-5 h-5 text-amber-400" />
            My Personalized Training Plan ({puzzles.length} Custom Puzzles)
          </h2>

          {puzzles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {puzzles.map((p) => {
                if (!p) return null;
                const titleStr = String(p.title || 'Personalized Puzzle');
                const statusStr = String(p.status || 'active').toUpperCase();
                const explanationStr = typeof p.explanation === 'string' ? p.explanation : String(p.explanation || '');

                return (
                  <div key={p.id || Math.random()} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white">{titleStr}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          statusStr === 'SOLVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {statusStr}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{explanationStr}</p>
                    </div>

                    <Button
                      onClick={() => handleStartPuzzle(p)}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                    >
                      🧩 Solve Personalized Puzzle
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No custom puzzles generated yet. When Stockfish detects repeated mistake patterns (3 occurrences), custom puzzles are created automatically!
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ACHIEVEMENTS */}
      {activeTab === 'badges' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DashboardIcon iconKey="award" className="w-5 h-5 text-amber-400" />
            Unlocked Achievements & Badges ({badges.length})
          </h2>

          {badges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {badges.map((b) => {
                if (!b) return null;
                const iconStr = typeof b.icon === 'string' ? b.icon : '🏆';
                const titleStr = String(b.title || 'Badge');
                const descStr = String(b.description || '');

                return (
                  <div key={b.id || Math.random()} className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                    <div className="text-4xl">{iconStr}</div>
                    <div className="font-extrabold text-xs text-white">{titleStr}</div>
                    <div className="text-[10px] text-slate-400">{descStr}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No badges unlocked yet. Win matches, level up, and solve weakness puzzles to earn trophies!
            </div>
          )}
        </div>
      )}

      {/* TAB 6: RECENT GAMES */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DashboardIcon iconKey="calendarDays" className="w-5 h-5 text-sky-400" />
            Recent Bot Games History
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Color</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Rating Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentGames.map((g) => {
                  if (!g) return null;
                  const rawDate = g.started_at || g.created_at;
                  const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : 'Recent';
                  const resultStr = String(g.result || 'completed').toUpperCase();
                  const colorStr = String(g.student_color || 'white');
                  const levelNum = g.bot_level ?? 1;
                  const botRating = g.bot_rating ?? 400;
                  const ratingChange = g.rating_change ?? 0;
                  const ratingAfter = g.student_rating_after ?? 400;
                  const timeCtrl = g.time_control || 'unlimited';

                  return (
                    <tr key={g.id || Math.random()} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-300">{dateStr}</td>
                      <td className="p-3 font-bold text-white">Level {levelNum} ({botRating})</td>
                      <td className="p-3 capitalize text-slate-300">{colorStr}</td>
                      <td className="p-3 text-slate-400">{timeCtrl}</td>
                      <td className="p-3 font-extrabold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          resultStr === 'WIN' ? 'bg-emerald-500/20 text-emerald-300' : resultStr === 'LOSS' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {resultStr}
                        </span>
                      </td>
                      <td className="p-3 font-bold">
                        {ratingChange >= 0 ? `+${ratingChange}` : ratingChange} ({ratingAfter})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANALYSIS MODAL */}
      {showAnalysisModal && analysisData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="text-4xl">{analysisData.result === 'win' ? '🏆' : '❌'}</div>
              <h2 className="text-xl font-extrabold text-white">
                {analysisData.result === 'win' ? 'YOU WON!' : 'GAME COMPLETED'}
              </h2>
              <div className="text-sm font-bold text-amber-400">
                Rating: {analysisData.ratingBefore ?? 400} → {analysisData.ratingAfter ?? 400} ({(analysisData.ratingChange ?? 0) >= 0 ? `+${analysisData.ratingChange ?? 0}` : analysisData.ratingChange})
              </div>
            </div>

            {/* Child-Friendly Advice Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Accuracy: {analysisData.analysisSummary?.accuracy ?? 85}%</span>
                <span>Blunders: {analysisData.analysisSummary?.blunders ?? 0}</span>
              </div>

              {Array.isArray(analysisData.analysisSummary?.keyMoments) && analysisData.analysisSummary.keyMoments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Key Moment Advice:</div>
                  {analysisData.analysisSummary.keyMoments.slice(0, 2).map((km: any, idx: number) => {
                    const expl = typeof km?.explanation === 'string' ? km.explanation : typeof km?.explanation === 'object' ? JSON.stringify(km.explanation) : String(km?.explanation || 'Tactical moment detected');
                    const idea = typeof km?.better_idea === 'string' ? km.better_idea : typeof km?.better_idea === 'object' ? JSON.stringify(km.better_idea) : String(km?.better_idea || 'Consider alternative defensive moves');

                    return (
                      <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                        <div className="font-bold text-amber-300">💡 {expl}</div>
                        <div className="text-slate-400 text-[11px]">{idea}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setShowAnalysisModal(false);
                setInGame(false);
              }}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs"
            >
              Back to Training Overview
            </Button>
          </div>
        </div>
      )}

      {/* PUZZLE SOLVER MODAL */}
      {activePuzzle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl flex flex-col items-center">
            <h2 className="text-base font-extrabold text-white">{activePuzzle.title}</h2>
            <p className="text-xs text-amber-300 text-center font-bold">{puzzleMsg}</p>

            <div className="w-full max-w-[320px] aspect-square rounded-xl overflow-hidden border border-slate-800">
              <ChessboardComponent
                position={puzzleFen}
                onPieceDrop={handlePuzzleDrop}
                arePiecesDraggable={true}
                boardOrientation={activePuzzle.side_to_move === 'white' ? 'white' : 'black'}
                customPieces={customChessPieces}
              />
            </div>

            <Button
              onClick={() => setActivePuzzle(null)}
              variant="outline"
              className="w-full py-2 text-xs font-bold text-slate-300 border-slate-800 hover:bg-slate-800"
            >
              Close Puzzle
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
