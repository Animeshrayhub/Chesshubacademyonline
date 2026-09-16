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
  generateWeaknessPuzzlesAction,
  submitPuzzleAttemptAction,
} from '@/actions/botTraining';
import { playChessSound, setChessSoundEnabled, speakCoachAdvice, stopCoachVoice, setCoachVoiceEnabled } from '@/utils/chessAudio';
import { computeBotMove, identifyOpeningFromMoves, safeExecuteMove, evaluatePosition } from '@/lib/bot-training/chessBotEngine';
import { TACTICAL_QUIZ_QUESTIONS } from '@/lib/bot-training/tacticalQuizData';
import { ALL_OPENING_ADVENTURES, FRIED_LIVER_ADVENTURE } from '@/lib/bot-training/openingTreeData';
import {
  BOT_PERSONALITIES,
  ALL_BOT_PERSONALITIES,
  type BotPersonalityId,
  getRandomPersonalityQuote,
} from '@/lib/bot-training/botPersonalities';
import {
  getOpeningBookContinuations,
  type BookPositionSummary,
  type BookMoveContinuation,
} from '@/lib/bot-training/openingBookExplorer';
import { BOT_SCOUT_DATA, type BotScoutIntel } from '@/lib/bot-training/botScoutData';
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

export interface BoardThemeConfig {
  id: string;
  name: string;
  darkSquare: string;
  lightSquare: string;
  icon: string;
}

export const BOARD_THEMES: BoardThemeConfig[] = [
  { id: 'wood', name: 'Classic Wood', darkSquare: '#b58863', lightSquare: '#f0d9b5', icon: '🪵' },
  { id: 'emerald', name: 'Emerald Club', darkSquare: '#769656', lightSquare: '#eeeed2', icon: '🌲' },
  { id: 'cyber', name: 'Cyber Midnight', darkSquare: '#334155', lightSquare: '#94a3b8', icon: '🌌' },
  { id: 'gold', name: 'Golden Palace', darkSquare: '#b45309', lightSquare: '#fef3c7', icon: '👑' },
];

const BOT_LEVELS: BotLevelConfig[] = [
  {
    level: 1,
    rating: 400,
    name: 'Level 1 — Pawn',
    description: 'Beginner (400)',
    depth: 1,
    skillLevel: 0,
    avatarIcon: '♟️',
    openingStyle: 'Gentle Basics',
    speciality: 'Piece Movement & Easy Development',
    personality: 'Friendly Coach — makes gentle moves so kids learn and gain confidence!',
  },
  {
    level: 2,
    rating: 600,
    name: 'Level 2 — Knight',
    description: 'Casual (600)',
    depth: 2,
    skillLevel: 2,
    avatarIcon: '♞',
    openingStyle: 'Classical Opening Fundamentals',
    speciality: 'Center Control, Minor Piece Activity & Castling',
    personality: 'Knight Scout — plays solid fundamentals and avoids 1-move blunders!',
  },
  {
    level: 3,
    rating: 800,
    name: 'Level 3 — Bishop',
    description: 'Intermediate (800)',
    depth: 4,
    skillLevel: 5,
    avatarIcon: '♝',
    openingStyle: 'Italian Game & Fried Liver Attack',
    speciality: 'Fried Liver (6. Nxf7!), Scholar Defense & Tactical Traps',
    personality: 'Bishop Tactician — tests your opening knowledge with aggressive sacrifices!',
  },
  {
    level: 4,
    rating: 1000,
    name: 'Level 4 — Rook',
    description: 'Club Player (1000)',
    depth: 6,
    skillLevel: 8,
    avatarIcon: '♜',
    openingStyle: 'Ruy Lopez & Queen\'s Gambit',
    speciality: 'Positional Development & Solid Defense',
    personality: 'Rook Guardian — plays reliable club-level opening theory.',
  },
  {
    level: 5,
    rating: 1200,
    name: 'Level 5 — Queen',
    description: 'Advanced (1200)',
    depth: 8,
    skillLevel: 11,
    avatarIcon: '♛',
    openingStyle: 'Sicilian & French Defenses',
    speciality: 'Sharp Tactical Counter-Attacks',
    personality: 'Queen Striker — searches for tactical skewers and discovered checks.',
  },
  {
    level: 6,
    rating: 1400,
    name: 'Level 6 — CM Bot',
    description: 'Expert CM (1400)',
    depth: 10,
    skillLevel: 14,
    avatarIcon: '🏅',
    openingStyle: 'Modern Tournament Repertoires',
    speciality: 'Pawn Structure & Imbalances',
    personality: 'Candidate Master — accurate opening execution and positional pressure.',
  },
  {
    level: 7,
    rating: 1600,
    name: 'Level 7 — IM Bot',
    description: 'Master IM (1600)',
    depth: 12,
    skillLevel: 16,
    avatarIcon: '🎖️',
    openingStyle: 'FIDE Master Systems',
    speciality: 'Deep Opening Prep & Endgame Conversion',
    personality: 'FIDE Master — punishes tactical inaccuracies with precision.',
  },
  {
    level: 8,
    rating: 1800,
    name: 'Level 8 — GM Bot',
    description: 'Grandmaster (1800)',
    depth: 14,
    skillLevel: 18,
    avatarIcon: '🥇',
    openingStyle: 'Grandmaster Opening Theory',
    speciality: 'Complex Dynamic Imbalances',
    personality: 'International Master — high-level calculation and endgame mastery.',
  },
  {
    level: 9,
    rating: 2000,
    name: 'Level 9 — Super GM',
    description: 'Super GM (2000)',
    depth: 16,
    skillLevel: 19,
    avatarIcon: '👑',
    openingStyle: 'Super GM Opening Lines',
    speciality: 'Virtuoso Pro Tactics & Prophylaxis',
    personality: 'Grandmaster — relentless opening pressure and iron defense.',
  },
  {
    level: 10,
    rating: 2200,
    name: 'Level 10 — Engine',
    description: 'Champion (2200)',
    depth: 18,
    skillLevel: 20,
    avatarIcon: '⚡',
    openingStyle: 'Deep Engine Theory',
    speciality: 'Flawless Calculation & Inevitable Mate',
    personality: 'Super Engine — maximum calculation speed and tactical depth.',
  },
];

export default function StudentBotTrainingView() {
  const [activeTab, setActiveTab] = useState<'play' | 'quests' | 'openings' | 'leaderboard' | 'rating' | 'weaknesses' | 'plan' | 'badges' | 'history'>('play');
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
  const [currentOpening, setCurrentOpening] = useState<string>('Starting Position');
  const [botDialogue, setBotDialogue] = useState<string | null>(null);
  const [coachTipDialogue, setCoachTipDialogue] = useState<string | null>(null);
  const [remainingHints, setRemainingHints] = useState<number>(3);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [selectedThemeId, setSelectedThemeId] = useState<string>('wood');
  const currentTheme = BOARD_THEMES.find((t) => t.id === selectedThemeId) || BOARD_THEMES[0];

  // Boss Battle Gamification State
  const [bossBattleMode, setBossBattleMode] = useState<boolean>(true);
  const [botHp, setBotHp] = useState<number>(100);
  const [studentHp, setStudentHp] = useState<number>(100);
  const [lastCombatEvent, setLastCombatEvent] = useState<string | null>(null);
  const [showLootChest, setShowLootChest] = useState<boolean>(false);
  const [lootClaimed, setLootClaimed] = useState<boolean>(false);

  // 10 Interactive Tactical Quests State
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizAnswerSubmitted, setQuizAnswerSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  // Audio SFX & AI Coach Voice Control State
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [voiceNarrationOn, setVoiceNarrationOn] = useState<boolean>(true);

  // Bot Personality & Dialogue Soundboard State
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<BotPersonalityId>('friendly');
  const currentPersonality = useMemo(
    () => BOT_PERSONALITIES[selectedPersonalityId] || BOT_PERSONALITIES.friendly,
    [selectedPersonalityId]
  );

  // Opening Tree Adventure State
  const [selectedAdventureId, setSelectedAdventureId] = useState<string>('italian-fried-liver');
  const currentAdventure = useMemo(
    () => ALL_OPENING_ADVENTURES.find((a) => a.id === selectedAdventureId) || ALL_OPENING_ADVENTURES[0],
    [selectedAdventureId]
  );
  const [adventureNodeId, setAdventureNodeId] = useState<string>(currentAdventure.rootNodeId);
  const [adventureHistory, setAdventureHistory] = useState<string[]>([currentAdventure.rootNodeId]);
  const [adventureCompleted, setAdventureCompleted] = useState<boolean>(false);

  // Combat Visual Effects & Replay Export States
  const [combatFlash, setCombatFlash] = useState<'student' | 'bot' | null>(null);
  const [pgnCopiedToast, setPgnCopiedToast] = useState<boolean>(false);
  const [shareLinkCopiedToast, setShareLinkCopiedToast] = useState<boolean>(false);

  // Live Engine Advantage Evaluation Bar & Move Accuracy State
  const [showEvalBar, setShowEvalBar] = useState<boolean>(true);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [prevEvalScore, setPrevEvalScore] = useState<number>(0);
  const [lastMoveQuality, setLastMoveQuality] = useState<{
    label: string;
    badgeClass: string;
    icon: string;
    evalDelta: number;
  } | null>(null);

  // Interactive Opening Book Explorer State
  const [showBookExplorer, setShowBookExplorer] = useState<boolean>(false);

  // Bot Opening Repertoire Scout State
  const [showScoutIntel, setShowScoutIntel] = useState<boolean>(true);
  const currentBotScout: BotScoutIntel = useMemo(
    () => BOT_SCOUT_DATA[selectedLevel] || BOT_SCOUT_DATA[1],
    [selectedLevel]
  );

  // Compute live opening book continuations from current move history
  const currentBookSummary: BookPositionSummary = useMemo(() => {
    try {
      const verboseMoves = gameRef.current ? gameRef.current.history({ verbose: true }) : [];
      const uciList: string[] = verboseMoves.map(
        (m) => `${m.from}${m.to}${m.promotion || ''}`
      );
      return getOpeningBookContinuations(uciList);
    } catch {
      return getOpeningBookContinuations([]);
    }
  }, [moveHistory, fen]);

  // Live Position Advantage and Move Accuracy Analysis Helpers
  const updateMoveEvaluation = (game: Chess) => {
    try {
      const nextScore = evaluatePosition(game);
      const evalDelta = playerColor === 'white'
        ? (nextScore - prevEvalScore)
        : (prevEvalScore - nextScore);

      let quality: { label: string; badgeClass: string; icon: string; evalDelta: number };
      if (game.isCheckmate()) {
        quality = { label: 'Checkmate', badgeClass: 'bg-emerald-500 text-white shadow-emerald-500/50', icon: '🏆', evalDelta };
      } else if (evalDelta >= 180) {
        quality = { label: 'Brilliant', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 ring-1 ring-cyan-400', icon: '💎', evalDelta };
      } else if (evalDelta >= 40) {
        quality = { label: 'Great Move', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50', icon: '🟢', evalDelta };
      } else if (evalDelta >= -50) {
        quality = { label: 'Good Move', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/50', icon: '🔵', evalDelta };
      } else if (evalDelta >= -150) {
        quality = { label: 'Inaccuracy', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50', icon: '🟡', evalDelta };
      } else if (evalDelta >= -300) {
        quality = { label: 'Mistake', badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/50', icon: '🟠', evalDelta };
      } else {
        quality = { label: 'Blunder', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse', icon: '🔴', evalDelta };
      }

      setLastMoveQuality(quality);
      setPrevEvalScore(nextScore);
      setEvalScore(nextScore);
    } catch (err) {
      console.warn('[updateMoveEvaluation] Evaluation error:', err);
    }
  };

  const getAdvantagePercent = (scoreCp: number, color: 'white' | 'black') => {
    if (scoreCp >= 90000) return color === 'white' ? 100 : 0;
    if (scoreCp <= -90000) return color === 'white' ? 0 : 100;
    const whiteWinPct = 100 / (1 + Math.exp(-0.0035 * scoreCp));
    return color === 'white' ? whiteWinPct : (100 - whiteWinPct);
  };

  const getEvalLabel = (scoreCp: number, color: 'white' | 'black') => {
    if (scoreCp >= 90000) return color === 'white' ? '+M' : '-M';
    if (scoreCp <= -90000) return color === 'white' ? '-M' : '+M';
    const net = color === 'white' ? scoreCp : -scoreCp;
    const sign = net > 0 ? '+' : '';
    return `${sign}${(net / 100).toFixed(1)}`;
  };

  // Post-Victory Confetti & Fanfare Celebration State
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const triggerVictoryCelebration = (customSpeech?: string) => {
    setShowConfetti(true);
    try {
      playChessSound('fanfare');
      playChessSound('victory');
    } catch {}
    if (voiceNarrationOn) {
      speakCoachAdvice(
        customSpeech || 'Checkmate! Outstanding victory! You defeated the bot and earned bonus XP!',
        { force: true }
      );
    }
    setTimeout(() => {
      setShowConfetti(false);
    }, 6000);
  };

  // PGN & Replay Export Utilities
  const generatePgn = (game: {
    whiteName: string;
    blackName: string;
    result: string;
    date?: string;
    moves?: string[] | string;
  }): string => {
    const dateStr = game.date || new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    let formattedMoves = '';
    if (Array.isArray(game.moves)) {
      formattedMoves = game.moves.map((m, idx) => {
        if (idx % 2 === 0) {
          return `${Math.floor(idx / 2) + 1}. ${m}`;
        }
        return `${m}`;
      }).join(' ');
    } else if (typeof game.moves === 'string') {
      formattedMoves = game.moves;
    }

    return `[Event "ChessHub Academy Bot Match"]
[Site "ChessHub Online"]
[Date "${dateStr}"]
[White "${game.whiteName}"]
[Black "${game.blackName}"]
[Result "${game.result}"]
[Termination "Normal"]

${formattedMoves || '1. e4'} ${game.result}`;
  };

  const downloadPgnFile = (filename: string, pgnContent: string) => {
    const blob = new Blob([pgnContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyPgnToClipboard = async (pgnContent: string) => {
    try {
      await navigator.clipboard.writeText(pgnContent);
      setPgnCopiedToast(true);
      setTimeout(() => setPgnCopiedToast(false), 2500);
    } catch {}
  };

  const copyShareLink = async (gameId?: string) => {
    try {
      const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/student?tab=bot-training&game=${gameId || 'active'}`
        : 'https://chesshub.online';
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkCopiedToast(true);
      setTimeout(() => setShareLinkCopiedToast(false), 2500);
    } catch {}
  };

  // Level Gatekeeper Modal State
  const [gatekeeperLockedLevel, setGatekeeperLockedLevel] = useState<number | null>(null);

  // Post-Match Victory Chest 3-Question Rapid Tactical Challenge
  const [chestQuizActive, setChestQuizActive] = useState<boolean>(false);
  const [chestQuizStep, setChestQuizStep] = useState<number>(0);
  const [chestQuizQuestions, setChestQuizQuestions] = useState<typeof TACTICAL_QUIZ_QUESTIONS>([]);
  const [chestQuizSelectedOption, setChestQuizSelectedOption] = useState<number | null>(null);
  const [chestQuizAnswerSubmitted, setChestQuizAnswerSubmitted] = useState<boolean>(false);
  const [chestQuizScore, setChestQuizScore] = useState<number>(0);
  const [chestQuizFinished, setChestQuizFinished] = useState<boolean>(false);

  // Trophy Badges Category Filter
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<'all' | 'milestones' | 'tiers' | 'pieces' | 'secret'>('all');

  // Daily Quests & Streak System State
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(3);
  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(false);
  const [showDevDiagnostics, setShowDevDiagnostics] = useState<boolean>(false);

  const hasWonToday = useMemo(() => recentGames.some((g) => g.result === 'win'), [recentGames]);
  const questsSolved = useMemo(() => Math.min(2, quizScore), [quizScore]);
  const exploredOpening = useMemo(() => adventureHistory.length > 1, [adventureHistory]);
  const allCompleted = useMemo(() => hasWonToday && questsSolved >= 2 && exploredOpening, [hasWonToday, questsSolved, exploredOpening]);
  const completedMissionsCount = useMemo(() => (hasWonToday ? 1 : 0) + (questsSolved >= 2 ? 1 : 0) + (exploredOpening ? 1 : 0), [hasWonToday, questsSolved, exploredOpening]);

  // Ranking & Next Level XP Progress Calculations
  const xpCurrent = useMemo(() => {
    const ratingBase = Math.max(0, (profile?.rating || 400) - 300) * 3;
    const puzzlePoints = (profile?.puzzles_solved || 0) * 25;
    const gamePoints = (recentGames.length) * 30;
    return 120 + ratingBase + puzzlePoints + gamePoints;
  }, [profile?.rating, profile?.puzzles_solved, recentGames.length]);

  const currentLevelNum = profile?.current_level || 1;
  const xpTarget = currentLevelNum * 400;
  const xpInLevel = xpCurrent % xpTarget;
  const xpPercent = Math.min(100, Math.max(14, Math.round((xpInLevel / xpTarget) * 100)));
  const xpRemaining = xpTarget - xpInLevel;

  const calculatePieceDamage = (pieceType?: string): number => {
    switch (pieceType?.toLowerCase()) {
      case 'p': return 8;
      case 'n':
      case 'b': return 15;
      case 'r': return 25;
      case 'q': return 40;
      default: return 5;
    }
  };

  // Timed game clocks
  const [studentTimeSec, setStudentTimeSec] = useState<number>(600);
  const [botTimeSec, setBotTimeSec] = useState<number>(600);
  const [clockIncrementSec, setClockIncrementSec] = useState<number>(0);
  const [isTimed, setIsTimed] = useState<boolean>(true);

  // Post-Game Analysis Modal
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  // Interactive Post-Game Move Tree & Mistake Stepper State
  const [replayMoveIndex, setReplayMoveIndex] = useState<number>(0);
  const [replayAutoPlay, setReplayAutoPlay] = useState<boolean>(false);
  const [showAlternativeBranch, setShowAlternativeBranch] = useState<boolean>(false);

  // Compute the replay FEN at replayMoveIndex
  const currentReplayFen = useMemo(() => {
    try {
      const g = new Chess();
      for (let i = 0; i < replayMoveIndex && i < moveHistory.length; i++) {
        g.move(moveHistory[i]);
      }
      return g.fen();
    } catch {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
  }, [moveHistory, replayMoveIndex]);

  // Compute paired moves for interactive notation tree
  const replayMovePairs = useMemo(() => {
    const pairs: Array<{
      moveNum: number;
      whiteIndex: number;
      whiteMove: string;
      blackIndex?: number;
      blackMove?: string;
    }> = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        moveNum: Math.floor(i / 2) + 1,
        whiteIndex: i + 1,
        whiteMove: moveHistory[i],
        blackIndex: i + 1 < moveHistory.length ? i + 2 : undefined,
        blackMove: i + 1 < moveHistory.length ? moveHistory[i + 1] : undefined,
      });
    }
    return pairs;
  }, [moveHistory]);

  // Auto-play timer effect
  useEffect(() => {
    if (!replayAutoPlay || !showAnalysisModal) return;
    const interval = setInterval(() => {
      setReplayMoveIndex((curr) => {
        if (curr >= moveHistory.length) {
          setReplayAutoPlay(false);
          return curr;
        }
        return curr + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [replayAutoPlay, showAnalysisModal, moveHistory.length]);

  // Interactive Mistake Practice Board State
  const [practiceMistakeIndex, setPracticeMistakeIndex] = useState<number | null>(null);
  const [practiceFen, setPracticeFen] = useState<string>('');
  const [practiceMsg, setPracticeMsg] = useState<string | null>(null);
  const [practiceSolved, setPracticeSolved] = useState<boolean>(false);
  const [showPracticeSolution, setShowPracticeSolution] = useState<boolean>(false);

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
    try {
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
      } else {
        // Fallback default profile if guest or table empty
        setProfile({
          id: 'guest',
          student_id: 'guest',
          rating: 400,
          current_level: 1,
          unlocked_levels: [1, 2, 3],
          coach_unlocked_levels: [],
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          games_drawn: 0,
          puzzles_solved: 0,
          updated_at: new Date().toISOString(),
        } as any);
      }
    } catch (e) {
      console.warn('[fetchProfile] error:', e);
      setProfile({
        id: 'guest',
        student_id: 'guest',
        rating: 400,
        current_level: 1,
        unlocked_levels: [1, 2, 3],
        coach_unlocked_levels: [],
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        games_drawn: 0,
        puzzles_solved: 0,
        updated_at: new Date().toISOString(),
      } as any);
    } finally {
      setLoadingProfile(false);
    }
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

  // Start game handler with resilient offline/guest fallback
  const handleStartGame = async () => {
    setIsStartingGame(true);
    let gData: any = null;
    try {
      const res = await startBotGameAction({
        botLevel: selectedLevel,
        color: selectedColor,
        timeControl: selectedTimeControl,
      });

      if (res.success && res.data) {
        gData = res.data;
      } else {
        console.warn('[handleStartGame] startBotGameAction server warning:', res.error?.message);
      }
    } catch (e) {
      console.warn('[handleStartGame] startBotGameAction exception:', e);
    }

    // Local fallback ensures students can always start and play matches immediately
    if (!gData) {
      const resolvedColor = selectedColor === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : selectedColor;
      const botCfg = BOT_LEVELS.find((b) => b.level === selectedLevel) || BOT_LEVELS[0];
      gData = {
        gameId: 'local-' + Date.now(),
        botLevel: selectedLevel,
        botRating: botCfg.rating,
        color: resolvedColor,
        timeControl: selectedTimeControl,
        initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        studentRatingBefore: profile?.rating || 400,
      };
    }

    setActiveGameId(gData.gameId);
    setPlayerColor(gData.color);
    setFen(gData.initialFen);
    gameRef.current = new Chess(gData.initialFen);
    setMoveHistory([]);
    setGameStatus('active');
    setInGame(true);
    setCurrentOpening('Starting Position');
    const startGreeting = getRandomPersonalityQuote(selectedPersonalityId, 'greeting');
    setBotDialogue(startGreeting);
    if (voiceNarrationOn) {
      speakCoachAdvice(startGreeting, { pitch: currentPersonality.pitch, rate: currentPersonality.rate });
    }
    setIsBotThinking(false);
    setBotHp(100);
    setStudentHp(100);
    setLastCombatEvent(null);
    setShowLootChest(false);
    setLootClaimed(false);
    setEvalScore(0);
    setPrevEvalScore(0);
    setLastMoveQuality(null);

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
      }, 500);
      return () => clearTimeout(timeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, inGame, gameStatus, playerColor]);

  // Execute Bot move via rock-solid chessBotEngine with Opening Book, Fried Liver Attack, and AlphaBeta Minimax
  const triggerBotMove = () => {
    if (gameStatus !== 'active') return;
    setIsBotThinking(true);

    const botColor = playerColor === 'white' ? 'black' : 'white';

    // Extract UCI move history
    const uciHistory: string[] = [];
    const historyVerbose = gameRef.current.history({ verbose: true });
    historyVerbose.forEach((m) => {
      uciHistory.push(`${m.from}${m.to}${m.promotion || ''}`);
    });

    const delayMs = 450 + Math.floor(Math.random() * 350);

    // Pre-compute move via our rock-solid chessBotEngine (guaranteed legal and fast)
    let engineRes: any = null;
    try {
      engineRes = computeBotMove(gameRef.current, selectedLevel, botColor, uciHistory);
    } catch (err) {
      console.error('[triggerBotMove] Error in computeBotMove:', err);
    }

    // Helper to safely execute a move on the board
    const applyMove = (from: string, to: string, promotion?: string, openingName?: string, commentary?: string) => {
      if (gameStatus !== 'active') {
        setIsBotThinking(false);
        return;
      }
      const game = gameRef.current;
      try {
        let moveRes = safeExecuteMove(game, from, to, promotion);
        if (!moveRes) {
          const legal = game.moves({ verbose: true });
          if (legal.length > 0) {
            moveRes = game.move(legal[0]);
          }
        }

        if (moveRes) {
          const nextFen = game.fen();
          setFen(nextFen);
          setMoveHistory(game.history());
          if (openingName) setCurrentOpening(openingName);
          if (commentary) {
            setBotDialogue(commentary);
            if (voiceNarrationOn) speakCoachAdvice(commentary, { pitch: currentPersonality.pitch, rate: currentPersonality.rate });
          } else if (moveRes.captured) {
            const banter = getRandomPersonalityQuote(selectedPersonalityId, 'botCapture');
            setBotDialogue(banter);
            if (voiceNarrationOn) speakCoachAdvice(banter, { pitch: currentPersonality.pitch, rate: currentPersonality.rate });
          }

          if (game.inCheck()) {
            const checkMsg = getRandomPersonalityQuote(selectedPersonalityId, 'check');
            setCoachTipDialogue(checkMsg);
            if (voiceNarrationOn) speakCoachAdvice(checkMsg, { pitch: currentPersonality.pitch, rate: currentPersonality.rate });
          }

          try {
            const nextScore = evaluatePosition(game);
            setEvalScore(nextScore);
            setPrevEvalScore(nextScore);
          } catch {}

          try {
            playChessSound(moveRes.captured ? 'capture' : 'move');
          } catch {}

          if (bossBattleMode) {
            let dmg = 0;
            let label = '';
            if (moveRes.captured) {
              dmg += calculatePieceDamage(moveRes.captured);
              label = `💥 Boss struck you for -${dmg} HP (${moveRes.captured.toUpperCase()} lost)!`;
            }
            if (game.inCheck()) {
              dmg += 10;
              label = label ? `${label} + Check!` : '💥 Boss delivers CHECK! -10 HP!';
            }
            if (game.isCheckmate()) {
              dmg = 100;
              label = '💀 You were checkmated!';
            }
            if (dmg > 0) {
              setStudentHp((prev) => Math.max(0, prev - dmg));
              setLastCombatEvent(label);
              setCombatFlash('bot');
              setTimeout(() => setCombatFlash(null), 900);
              try {
                playChessSound(dmg >= 25 ? 'critical_hit' : 'capture');
              } catch {}
            }
          }

          if (isTimed && clockIncrementSec > 0) {
            setBotTimeSec((prev) => prev + clockIncrementSec);
          }
          checkGameEndState();
        }
      } catch (e) {
        console.error('[applyMove] Bot move failed:', e);
      } finally {
        setIsBotThinking(false);
      }
    };

    // Execute engine move across all 10 difficulty levels with human delay
    setTimeout(() => {
      if (engineRes) {
        applyMove(engineRes.from, engineRes.to, engineRes.promotion, engineRes.openingName, engineRes.botCommentary);
      } else {
        // Emergency legal move fallback
        const moves = gameRef.current.moves({ verbose: true });
        if (moves.length > 0) {
          const m = moves[0];
          applyMove(m.from, m.to, m.promotion);
        } else {
          setIsBotThinking(false);
          checkGameEndState();
        }
      }
    }, delayMs);
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
        const move = safeExecuteMove(gameRef.current, selectedSquare!, square);

        if (move) {
          const nextFen = gameRef.current.fen();
          setFen(nextFen);
          setMoveHistory(gameRef.current.history());
          setSelectedSquare(null);
          setOptionSquares({});

          try {
            playChessSound(move.captured ? 'capture' : 'move');
          } catch {}

          updateMoveEvaluation(gameRef.current);

          if (move.captured) {
            const banter = getRandomPersonalityQuote(selectedPersonalityId, 'studentCapture');
            setBotDialogue(banter);
            if (voiceNarrationOn) speakCoachAdvice(banter, { pitch: currentPersonality.pitch, rate: currentPersonality.rate });
          }

          if (bossBattleMode) {
            let dmg = 0;
            let label = '';
            if (move.captured) {
              dmg += calculatePieceDamage(move.captured);
              label = `⚔️ You struck Boss for -${dmg} HP (${move.captured.toUpperCase()} captured!)`;
            }
            if (gameRef.current.inCheck()) {
              dmg += 10;
              label = label ? `${label} + CRITICAL CHECK!` : '⚔️ CRITICAL CHECK: -10 HP to Boss!';
            }
            if (gameRef.current.isCheckmate()) {
              dmg = 100;
              label = '🏆 BOSS DEFEATED! FATAL CHECKMATE!';
            }
            if (dmg > 0) {
              setBotHp((prev) => Math.max(0, prev - dmg));
              setLastCombatEvent(label);
              setCombatFlash('student');
              setTimeout(() => setCombatFlash(null), 900);
              try {
                playChessSound(dmg >= 25 ? 'critical_hit' : 'capture');
              } catch {}
            }
          }

          // Update opening tracker
          const uciList: string[] = [];
          gameRef.current.history({ verbose: true }).forEach((h) => {
            uciList.push(`${h.from}${h.to}${h.promotion || ''}`);
          });
          const op = identifyOpeningFromMoves(uciList);
          if (op?.name) setCurrentOpening(op.name);

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
      const move = safeExecuteMove(gameRef.current, source, target);

      if (!move) return false;

      const nextFen = gameRef.current.fen();
      setFen(nextFen);
      setMoveHistory(gameRef.current.history());
      setSelectedSquare(null);
      setOptionSquares({});

      try {
        if (move.captured === 'q' || gameRef.current.isCheckmate() || gameRef.current.inCheck()) {
          playChessSound('critical_hit');
        } else {
          playChessSound(move.captured ? 'capture' : 'move');
        }
      } catch {}

      updateMoveEvaluation(gameRef.current);

      if (move.captured) {
        const studentBanter = getRandomPersonalityQuote(selectedPersonalityId, 'studentCapture');
        setBotDialogue(studentBanter);
        if (voiceNarrationOn) speakCoachAdvice(studentBanter, { pitch: currentPersonality.pitch, rate: currentPersonality.rate });
      }

      if (gameRef.current.inCheck()) {
        const studentCheckMsg = "Check! You have the Bot's King under fire! Look for forcing follow-up moves.";
        setCoachTipDialogue(studentCheckMsg);
        if (voiceNarrationOn) speakCoachAdvice(studentCheckMsg);
      }

      if (bossBattleMode) {
        let dmg = 0;
        let label = '';
        if (move.captured) {
          dmg += calculatePieceDamage(move.captured);
          label = `⚔️ You struck Boss for -${dmg} HP (${move.captured.toUpperCase()} captured!)`;
        }
        if (gameRef.current.inCheck()) {
          dmg += 10;
          label = label ? `${label} + CRITICAL CHECK!` : '⚔️ CRITICAL CHECK: -10 HP to Boss!';
        }
        if (gameRef.current.isCheckmate()) {
          dmg = 100;
          label = '🏆 BOSS DEFEATED! FATAL CHECKMATE!';
        }
        if (dmg > 0) {
          setBotHp((prev) => Math.max(0, prev - dmg));
          setLastCombatEvent(label);
          setCombatFlash('student');
          setTimeout(() => setCombatFlash(null), 900);
          try {
            playChessSound(dmg >= 25 ? 'critical_hit' : 'capture');
          } catch {}
        }
      }

      // Update opening tracker
      const uciList: string[] = [];
      gameRef.current.history({ verbose: true }).forEach((h) => {
        uciList.push(`${h.from}${h.to}${h.promotion || ''}`);
      });
      const op = identifyOpeningFromMoves(uciList);
      if (op?.name) setCurrentOpening(op.name);

      if (isTimed && clockIncrementSec > 0) {
        setStudentTimeSec((prev) => prev + clockIncrementSec);
      }

      checkGameEndState();
      return true;
    } catch (e) {
      return false;
    }
  };

  // Play opening candidate directly from Interactive Book Explorer
  const playCandidateFromBook = (candidate: BookMoveContinuation) => {
    if (!inGame || gameStatus !== 'active' || isBotThinking) return;
    const activeTurnColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeTurnColor !== playerColor) return;

    const from = candidate.uci.slice(0, 2);
    const to = candidate.uci.slice(2, 4);
    const promotion = candidate.uci.length > 4 ? candidate.uci.slice(4) : undefined;

    try {
      const move = safeExecuteMove(gameRef.current, from, to, promotion);
      if (move) {
        const nextFen = gameRef.current.fen();
        setFen(nextFen);
        setMoveHistory(gameRef.current.history());
        setSelectedSquare(null);
        setOptionSquares({});
        try { playChessSound(move.captured ? 'capture' : 'move'); } catch {}
        updateMoveEvaluation(gameRef.current);
        if (candidate.name) setCurrentOpening(candidate.name);
        if (isTimed && clockIncrementSec > 0) {
          setStudentTimeSec((prev) => prev + clockIncrementSec);
        }
        checkGameEndState();
      }
    } catch (err) {
      console.warn('[playCandidateFromBook] Move execution error:', err);
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
      if (result === 'win') {
        setBotHp(0);
        setShowLootChest(true);
        setLootClaimed(false);
        setChestQuizActive(false);
        setChestQuizStep(0);
        setChestQuizScore(0);
        setChestQuizFinished(false);
        setChestQuizSelectedOption(null);
        setChestQuizAnswerSubmitted(false);
        const shuffled = [...TACTICAL_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 3);
        const winQuote = getRandomPersonalityQuote(selectedPersonalityId, 'studentWin');
        triggerVictoryCelebration(winQuote);
      } else {
        if (result === 'loss') {
          setStudentHp(0);
          const botWinQuote = getRandomPersonalityQuote(selectedPersonalityId, 'botWin');
          setBotDialogue(botWinQuote);
          if (voiceNarrationOn) {
            speakCoachAdvice(botWinQuote, { pitch: currentPersonality.pitch, rate: currentPersonality.rate });
          }
        }
        setShowAnalysisModal(true);
      }

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
      setAnalysisData({
        result,
        ratingBefore: profile?.rating || 400,
        ratingAfter: profile?.rating || 400,
        ratingChange: 0,
        analysisSummary: { accuracy: 0, blunders: 0, keyMoments: [] },
      });
      setPracticeMistakeIndex(null);
      setShowAnalysisModal(true);
    }
  };

  const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

  const handleStartPracticeMistakes = (index = 0) => {
    const moments = analysisData?.analysisSummary?.keyMoments || [];
    if (moments.length === 0) return;
    const current = moments[index];
    if (current && current.fen_before) {
      setPracticeMistakeIndex(index);
      setPracticeFen(current.fen_before);
      setPracticeMsg(null);
      setPracticeSolved(false);
      setShowPracticeSolution(false);
    }
  };

  const handlePracticeDrop = (sourceOrObj: any, targetArg?: string) => {
    if (practiceSolved) return false;
    const moments = analysisData?.analysisSummary?.keyMoments || [];
    const current = moments[practiceMistakeIndex ?? 0];
    if (!current || !current.fen_before) return false;

    const { source, target } = extractDropSquares(sourceOrObj, targetArg);
    if (!source || !target) return false;

    try {
      const sim = new Chess(practiceFen);
      const moveRes = safeExecuteMove(sim, source, target);
      if (!moveRes) return false;

      // If user plays the exact bad move they played in the game
      if (moveRes.san === current.played_move) {
        setPracticeMsg(`You played this move (${current.played_move}) in the game! Look for a safer alternative.`);
        return false;
      }

      // Check if the move leaves a piece attacked without defense
      const opponentColor = playerColor === 'white' ? 'b' : 'w';
      const studentColorCode = playerColor === 'white' ? 'w' : 'b';
      const isTargetAttacked = sim.isAttacked(moveRes.to as any, opponentColor);
      const hasDefender = sim.isAttacked(moveRes.to as any, studentColorCode);
      const pieceVal = PIECE_VAL[moveRes.piece] ?? 1;

      if (isTargetAttacked && !hasDefender && pieceVal >= 3) {
        setPracticeMsg(`Not quite — moving to ${moveRes.to} leaves your ${moveRes.piece.toUpperCase()} unprotected. Try again!`);
        return false;
      }

      // Correct fixing move
      setPracticeFen(sim.fen());
      setPracticeSolved(true);
      setPracticeMsg('🎉 Correct! That protects your pieces and keeps your position solid!');
      try { playChessSound('move'); } catch {}
      return true;
    } catch {
      return false;
    }
  };

  const formatClock = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Practice & Solve Weakness Puzzles ────────────────────────────────────
  const [loadingPuzzleType, setLoadingPuzzleType] = useState<string | null>(null);

  const handlePracticeWeaknessPuzzles = async (weaknessType: string) => {
    setLoadingPuzzleType(weaknessType);
    const res = await generateWeaknessPuzzlesAction(weaknessType);
    setLoadingPuzzleType(null);

    if (res.success && res.data?.puzzles && res.data.puzzles.length > 0) {
      setPuzzles(res.data.puzzles);
      const targetPuz = res.data.puzzles.find((p: any) => p.status !== 'solved') || res.data.puzzles[0];
      handleStartPuzzle(targetPuz);
    } else {
      alert(res.error?.message || 'Could not load puzzles for this weakness theme.');
    }
  };

  const handleStartPuzzle = (p: PersonalizedPuzzle) => {
    setActivePuzzle(p);
    setPuzzleFen(p.fen);
    setPuzzleSolved(false);
    const side = (p.side_to_move || 'white').toUpperCase();
    setPuzzleMsg(p.explanation || `🧩 ${p.title || 'Solve Tactical Position'}: Find the best move for ${side}!`);
  };

  const handlePuzzleDrop = (sourceOrObj: any, targetArg?: string): boolean => {
    if (!activePuzzle || puzzleSolved) return false;

    const { source, target } = extractDropSquares(sourceOrObj, targetArg);
    if (!source || !target) return false;

    try {
      const pGame = new Chess(puzzleFen);
      const m = safeExecuteMove(pGame, source, target);
      if (!m) return false;

      const playedSan = m.san;
      const playedUci = `${source}${target}`;
      const targetSolution = (activePuzzle.solution || '').trim().toLowerCase();

      // Flexible move validation: solution string match, move SAN match, checkmate or tactical check
      const isCorrect =
        !targetSolution ||
        targetSolution === playedSan.toLowerCase() ||
        targetSolution.includes(playedSan.toLowerCase()) ||
        targetSolution === playedUci ||
        targetSolution.includes(target) ||
        pGame.isCheckmate() ||
        pGame.inCheck();

      setPuzzleFen(pGame.fen());

      if (isCorrect) {
        playChessSound('quiz_correct');
        setPuzzleMsg('🎉 Correct Move! +10 Rating Points Awarded! ⭐');
        setPuzzleSolved(true);

        submitPuzzleAttemptAction(activePuzzle.id, true).then(() => fetchProfile());

        setTimeout(() => {
          setActivePuzzle(null);
        }, 2200);
        return true;
      } else {
        playChessSound('quiz_wrong');
        setPuzzleMsg('❌ Incorrect move — try again!');
        submitPuzzleAttemptAction(activePuzzle.id, false);
        return false;
      }
    } catch {
      return false;
    }
  };

  const unlockedSet = useMemo(() => {
    const set = new Set<number>(profile?.unlocked_levels || [1, 2, 3]);
    // Levels 1-3 always open for beginners
    set.add(1);
    set.add(2);
    set.add(3);

    // 1. Coach Master Key override
    if (profile?.coach_unlocked_levels) {
      profile.coach_unlocked_levels.forEach((lvl) => set.add(lvl));
    }

    // 2. Tactical Quiz Benchmark: 4+ correct answers unlocks levels 4-5, 7+ unlocks 6-7, 10 unlocks all
    if (quizScore >= 4) {
      set.add(4);
      set.add(5);
    }
    if (quizScore >= 7) {
      set.add(6);
      set.add(7);
    }
    if (quizScore >= 10) {
      set.add(8);
      set.add(9);
      set.add(10);
    }

    // 3. Boss Knockout Progression: beating level L unlocks L+1
    if (recentGames && recentGames.length > 0) {
      recentGames.forEach((g) => {
        if (g.result === 'win' && typeof g.bot_level === 'number') {
          for (let lvl = 1; lvl <= Math.min(10, g.bot_level + 1); lvl++) {
            set.add(lvl);
          }
        }
      });
    }

    return set;
  }, [profile?.unlocked_levels, profile?.coach_unlocked_levels, quizScore, recentGames]);

  if (loadingProfile) {
    return (
      <div className="p-12 text-center text-slate-400">
        <DashboardIcon iconKey="brain" className="w-10 h-10 animate-bounce mx-auto text-primary mb-3" />
        <p className="font-bold text-sm">Loading Student Bot Training Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Sleek Micro-Grid HUD (Unified Top Bar) */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-2.5">
          {/* Col 1: Left Brand, Level & Rating (lg:col-span-4) */}
          <div className="flex items-center justify-between lg:justify-start gap-2.5 lg:col-span-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-base shadow-md shadow-amber-500/20 shrink-0">
                ♟️
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-white tracking-tight">Bot Arena</span>
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                  Lvl {profile?.current_level || 1}
                </span>
                <span className="text-[10px] font-black font-mono text-amber-400 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg shadow-inner">
                  ⚡ {profile?.rating || 400}
                </span>
              </div>
            </div>

            {/* Mobile Audio Quick Toggle */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  setChessSoundEnabled(next);
                }}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
              >
                {soundOn ? '🔊' : '🔇'}
              </button>
            </div>
          </div>

          {/* Col 2: Center Slim XP Mini-Meter (lg:col-span-4) */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-1.5 space-y-1 lg:col-span-4">
            <div className="flex items-center justify-between text-[10px] font-mono leading-none">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <span>⭐ Tier {currentLevelNum}</span>
                <span className="text-slate-600">➔</span>
                <span className="text-amber-400 font-bold">Tier {Math.min(10, currentLevelNum + 1)}</span>
              </span>
              <span className="font-extrabold text-amber-400">{xpInLevel}/{xpTarget} XP ({xpPercent}%)</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-400 rounded-full transition-all duration-700 shadow-sm shadow-amber-500/50"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Col 3: Right Action Chips Grid (lg:col-span-4) */}
          <div className="flex items-center flex-wrap gap-1.5 justify-end lg:col-span-4">
            {/* Puzzles Chip */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800/80 rounded-lg px-2 py-1 text-[11px] font-bold text-sky-400 shadow-inner">
              <span>🧩</span>
              <span>{profile?.puzzles_solved || 0}</span>
            </div>

            {/* Streak & Missions Chip */}
            <button
              type="button"
              onClick={() => setShowMissionsModal(true)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition-all ${
                allCompleted && !dailyBonusClaimed
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse ring-1 ring-amber-500'
                  : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 text-slate-300'
              }`}
              title="Daily Training Missions"
            >
              <span>🔥</span>
              <span>{streakCount}d</span>
              <span className={`text-[9px] font-mono px-1 rounded ${
                allCompleted ? 'bg-emerald-500/20 text-emerald-300 font-black' : 'bg-slate-800 text-amber-400'
              }`}>
                {completedMissionsCount}/3
              </span>
            </button>

            {/* AI Voice Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !voiceNarrationOn;
                setVoiceNarrationOn(next);
                setCoachVoiceEnabled(next);
                if (next) {
                  speakCoachAdvice('Coach voice enabled! Ready for your session!', { force: true });
                } else {
                  stopCoachVoice();
                }
              }}
              title={voiceNarrationOn ? 'AI Coach Voice is ON' : 'AI Coach Voice is Muted'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                voiceNarrationOn
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950/80 border-slate-800 text-slate-500'
              }`}
            >
              <span>{voiceNarrationOn ? '🗣️' : '🔇'}</span>
              <span className="text-[9px] uppercase font-mono">{voiceNarrationOn ? 'Voice' : 'Off'}</span>
            </button>

            {/* Sound Toggle (Desktop) */}
            <button
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setChessSoundEnabled(next);
              }}
              title={soundOn ? 'SFX ON' : 'SFX Muted'}
              className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                soundOn
                  ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-amber-500/50'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
              }`}
            >
              <span>{soundOn ? '🔊' : '🔇'}</span>
            </button>

            {/* Dev Diagnostics Toggle */}
            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={() => setShowDevDiagnostics((d) => !d)}
                className={`p-1 rounded-lg border text-xs ${
                  showDevDiagnostics
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950/80 border-slate-800 text-slate-500'
                }`}
                title="Toggle Dev Diagnostics"
              >
                🔧
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dev Diagnostics (Only when toggled in development) */}
      {process.env.NODE_ENV === 'development' && showDevDiagnostics && (
        <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 text-[10px] font-mono text-slate-400 space-y-1 animate-in fade-in">
          <div className="font-bold text-amber-400 uppercase text-[11px] mb-1">🔧 Development Diagnostics</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <div><span className="text-slate-500">Profile ID:</span> <span className="text-slate-200">{profile?.id?.slice(0, 8) || 'none'}…</span></div>
            <div><span className="text-slate-500">Student ID:</span> <span className="text-slate-200">{profile?.student_id?.slice(0, 8) || 'none'}…</span></div>
            <div><span className="text-slate-500">Rating:</span> <span className="text-emerald-400 font-bold">{profile?.rating ?? '?'}</span></div>
            <div><span className="text-slate-500">Level:</span> <span className="text-emerald-400 font-bold">{profile?.current_level ?? '?'}</span></div>
            <div><span className="text-slate-500">Active Game:</span> <span className="text-sky-400">{activeGameId?.slice(0, 8) || 'none'}…</span></div>
            <div><span className="text-slate-500">Recent Games:</span> <span className="text-white font-bold">{recentGames.length}</span></div>
            <div><span className="text-slate-500">Unlocked Levels:</span> <span className="text-amber-400">{(profile?.unlocked_levels || [1, 2, 3]).join(', ')}</span></div>
            <div><span className="text-slate-500">Games Played:</span> <span className="text-white font-bold">{profile?.games_played ?? 0}</span></div>
          </div>
        </div>
      )}

      {/* Sleek Segmented Tab Navigation Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 shadow-lg overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'play', label: 'Play Bot', icon: 'play' },
            { id: 'quests', label: 'Quests (10)', icon: 'sparkles' },
            { id: 'openings', label: 'Opening Trees (3)', icon: 'bookOpen' },
            { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
            { id: 'history', label: 'Match History', icon: 'calendarDays' },
            { id: 'rating', label: 'Rating Graph', icon: 'chartBar' },
            { id: 'weaknesses', label: 'Weaknesses', icon: 'target' },
            { id: 'plan', label: 'Puzzles', icon: 'sparkles' },
            { id: 'badges', label: 'Badges', icon: 'trophy' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50'
                    : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800/80 hover:text-white border border-transparent hover:border-slate-700/60'
                }`}
              >
                <DashboardIcon iconKey={tab.icon as any} className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: PLAY BOT */}
      {activeTab === 'play' && (
        <div className="space-y-6">
          {!inGame ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Level Selector */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-white flex items-center gap-2">
                    <DashboardIcon iconKey="trophy" className="w-4 h-4 text-amber-400" />
                    Select Bot Difficulty (10 Levels)
                  </h2>
                  <span className="text-[11px] font-bold text-slate-400">
                    Selected: <strong className="text-amber-400">Level {selectedLevel}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {BOT_LEVELS.map((b) => {
                    const isUnlocked = unlockedSet.has(b.level);
                    const isCoachUnlocked = profile?.coach_unlocked_levels?.includes(b.level);
                    const isSelected = selectedLevel === b.level;

                    return (
                      <div
                        key={b.level}
                        onClick={() => isUnlocked ? setSelectedLevel(b.level) : setGatekeeperLockedLevel(b.level)}
                        className={`relative rounded-xl border p-2.5 sm:p-3 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15 ring-2 ring-amber-500'
                            : isUnlocked
                            ? 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/60'
                            : 'border-slate-900 bg-slate-950/40 hover:border-amber-500/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{b.avatarIcon}</span>
                          {isUnlocked ? (
                            isCoachUnlocked ? (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                                🔓 Coach
                              </span>
                            ) : (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                                Lvl {b.level}
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/30">
                              🔒 Locked
                            </span>
                          )}
                        </div>

                        <div className="mt-2 space-y-0.5">
                          <div className="font-extrabold text-xs text-white truncate">{b.name.replace(/Level \d+ — /, '')}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Rating: {b.rating}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bot Opening Repertoire Scout Card */}
                {(() => {
                  const botMatches = recentGames.filter((g) => g.bot_level === selectedLevel);
                  const botWins = botMatches.filter((g) => g.result === 'win').length;
                  const botLosses = botMatches.filter((g) => g.result === 'loss').length;
                  const botDraws = botMatches.filter((g) => g.result === 'draw').length;
                  const botWinPct = botMatches.length > 0 ? Math.round((botWins / botMatches.length) * 100) : null;

                  return (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{currentBotScout.avatar}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-white">{currentBotScout.name}</span>
                              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                Rating {currentBotScout.rating}
                              </span>
                              <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                                {currentBotScout.playstyleTag}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Signature Trap: <strong className="text-amber-300 font-semibold">{currentBotScout.signatureTrap}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Head-to-Head record */}
                        <div className="flex items-center gap-2 shrink-0 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
                          <span className="text-slate-400 text-[10px] uppercase font-bold">H2H:</span>
                          {botMatches.length > 0 ? (
                            <span className="font-black text-white">
                              <span className="text-emerald-400">{botWins}W</span> - <span className="text-rose-400">{botLosses}L</span> - <span className="text-slate-400">{botDraws}D</span> ({botWinPct}%)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold">No matches yet</span>
                          )}
                        </div>
                      </div>

                      {/* Repertoire Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        {/* Repertoire as White */}
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                            <span className="flex items-center gap-1 text-slate-200">
                              <span>♔</span> White Repertoire:
                            </span>
                            <span className="font-mono text-amber-400">{currentBotScout.whiteRepertoire.frequency}</span>
                          </div>
                          <div className="font-extrabold text-white text-[11px]">
                            {currentBotScout.whiteRepertoire.primary}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">
                            {currentBotScout.whiteRepertoire.plan}
                          </p>
                        </div>

                        {/* Repertoire as Black */}
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                            <span className="flex items-center gap-1 text-slate-200">
                              <span>♚</span> Black Repertoire:
                            </span>
                            <span className="font-mono text-emerald-400">vs 1.e4 & 1.d4</span>
                          </div>
                          <div className="font-extrabold text-white text-[11px] truncate">
                            {currentBotScout.blackRepertoire.vsE4}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">
                            {currentBotScout.blackRepertoire.plan}
                          </p>
                        </div>
                      </div>

                      {/* Coach Counter-Strategy & Weakness */}
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-start gap-2.5 text-xs text-amber-200">
                        <span className="text-base leading-none mt-0.5 shrink-0">🛡️</span>
                        <div className="space-y-0.5 leading-snug">
                          <div className="font-extrabold text-amber-300 text-[11px]">
                            Exploitable Weakness & Coach Counter-Strategy:
                          </div>
                          <div className="text-[10px] text-slate-300 font-medium">
                            <strong className="text-rose-300 font-bold">{currentBotScout.weakness}</strong> — {currentBotScout.coachAdvice}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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

                  {/* AI Bot Personality & Dialogue Soundboard Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <span>🎭</span> AI Bot Personality:
                      </label>
                      <span className="text-[10px] font-mono text-amber-400 font-extrabold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {currentPersonality.avatar} {currentPersonality.badge}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {ALL_BOT_PERSONALITIES.map((p) => {
                        const isSelected = selectedPersonalityId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPersonalityId(p.id);
                              try { playChessSound('move'); } catch {}
                              const sample = getRandomPersonalityQuote(p.id, 'greeting');
                              setBotDialogue(sample);
                              if (voiceNarrationOn) {
                                speakCoachAdvice(sample, { pitch: p.pitch, rate: p.rate, force: true });
                              }
                            }}
                            className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden ${
                              isSelected
                                ? 'border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400/80 shadow-md shadow-amber-500/20'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-base">{p.avatar}</span>
                              <span className="text-xs font-black truncate">{p.name}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-tight line-clamp-1">{p.tagline}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Boss Battle Mode Toggle */}
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>⚔️</span> Boss Battle Mode
                      </div>
                      <div className="text-[10px] text-slate-400">Animated HP bars, combat hits, and loot chest</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBossBattleMode((prev) => !prev)}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all ${
                        bossBattleMode
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {bossBattleMode ? 'ENABLED ⚡' : 'OFF'}
                    </button>
                  </div>

                  {/* Board Theme Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Board Theme:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BOARD_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedThemeId(theme.id)}
                          className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-between ${
                            selectedThemeId === theme.id
                              ? 'border-amber-500 bg-amber-500/20 text-white ring-1 ring-amber-500'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{theme.icon}</span>
                            <span className="text-[11px]">{theme.name}</span>
                          </span>
                          <span className="flex gap-0.5">
                            <span className="w-2.5 h-2.5 rounded-sm border border-black/30" style={{ backgroundColor: theme.lightSquare }} />
                            <span className="w-2.5 h-2.5 rounded-sm border border-black/30" style={{ backgroundColor: theme.darkSquare }} />
                          </span>
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
                <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-2">
                  {/* Chessboard Header Toolbar: Themes, Eval Bar Toggle & Move Quality Badge */}
                  <div className="w-full max-w-[530px] sm:max-w-[560px] flex items-center justify-between text-xs px-1 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Move Quality Badge */}
                      {lastMoveQuality ? (
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black shadow-md border animate-in fade-in zoom-in-95 ${lastMoveQuality.badgeClass}`}>
                          <span>{lastMoveQuality.icon}</span>
                          <span>{lastMoveQuality.label}</span>
                          <span className="font-mono text-[10px] opacity-90">
                            ({lastMoveQuality.evalDelta > 0 ? `+${(lastMoveQuality.evalDelta / 100).toFixed(1)}` : `${(lastMoveQuality.evalDelta / 100).toFixed(1)}`})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                          <span>🎨 Theme:</span>
                          <strong className="text-amber-400">{currentTheme.name}</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Interactive Opening Book Explorer Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookExplorer((b) => !b);
                          try { playChessSound('move'); } catch {}
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition-all flex items-center gap-1 ${
                          showBookExplorer
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300 ring-1 ring-amber-400/50 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-400'
                        }`}
                        title="Open Interactive Master Book Explorer"
                      >
                        <span>📖</span>
                        <span>Book {showBookExplorer ? 'Hide' : 'Explorer'}</span>
                      </button>

                      {/* Eval Bar Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setShowEvalBar((b) => !b)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition-all flex items-center gap-1 ${
                          showEvalBar
                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 ring-1 ring-sky-500/30'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Live Advantage Evaluation Bar"
                      >
                        <span>📊</span>
                        <span>Eval {showEvalBar ? 'ON' : 'OFF'}</span>
                      </button>

                      {BOARD_THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setSelectedThemeId(th.id)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                            selectedThemeId === th.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{th.icon}</span>
                          <span className="hidden sm:inline">{th.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Board + Live Advantage Evaluation Gauge Container */}
                  <div className="flex items-center gap-2 sm:gap-3 justify-center w-full max-w-[530px] sm:max-w-[560px] mx-auto">
                    {/* Vertical Live Advantage Gauge */}
                    {showEvalBar && (
                      <div
                        className="w-5 sm:w-6 h-[440px] sm:h-[480px] rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex flex-col justify-between shadow-2xl relative shrink-0"
                        title={`Live Position Advantage: ${getEvalLabel(evalScore, playerColor)}`}
                      >
                        {/* Top Side (Opponent/Black) */}
                        <div
                          className="w-full bg-slate-900 transition-all duration-500 ease-out relative flex items-start justify-center pt-1 overflow-hidden"
                          style={{
                            height: `${playerColor === 'white' ? (100 - getAdvantagePercent(evalScore, 'white')) : getAdvantagePercent(evalScore, 'black')}%`,
                          }}
                        >
                          {(playerColor === 'white' ? evalScore < -20 : evalScore > 20) && (
                            <span className="text-[9px] font-mono font-black text-rose-300 transform -rotate-90 origin-center whitespace-nowrap mt-2">
                              {getEvalLabel(evalScore, playerColor)}
                            </span>
                          )}
                        </div>

                        {/* Center Balance 50/50 Marker */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-amber-500/70 z-10 pointer-events-none shadow-sm shadow-amber-500/50" />

                        {/* Bottom Side (Player/White) */}
                        <div
                          className="w-full bg-gradient-to-t from-slate-100 via-amber-50 to-white transition-all duration-500 ease-out relative flex items-end justify-center pb-1 overflow-hidden"
                          style={{
                            height: `${playerColor === 'white' ? getAdvantagePercent(evalScore, 'white') : (100 - getAdvantagePercent(evalScore, 'black'))}%`,
                          }}
                        >
                          {(playerColor === 'white' ? evalScore >= -20 : evalScore <= 20) && (
                            <span className="text-[9px] font-mono font-black text-slate-950 transform -rotate-90 origin-center whitespace-nowrap mb-2">
                              {getEvalLabel(evalScore, playerColor)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={`flex-1 aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative transition-all duration-300 ${
                      combatFlash === 'student'
                        ? 'ring-4 ring-emerald-500 shadow-emerald-500/50 scale-[1.01]'
                        : combatFlash === 'bot'
                        ? 'ring-4 ring-rose-500 shadow-rose-500/50 scale-[0.99]'
                        : ''
                    }`}>
                      {/* Combat Explosion VFX Overlay */}
                      {combatFlash && (
                        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center animate-out fade-out duration-700">
                          <div className={`px-5 py-2.5 rounded-2xl text-base sm:text-lg font-black tracking-wider uppercase shadow-2xl backdrop-blur-md border animate-bounce ${
                            combatFlash === 'student'
                              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-300 shadow-emerald-500/60'
                              : 'bg-rose-950/95 border-rose-500 text-rose-300 shadow-rose-500/60'
                          }`}>
                            {combatFlash === 'student' ? '⚔️ CRITICAL STRIKE! 💥' : '⚠️ DAMAGE TAKEN! 🩸'}
                          </div>
                        </div>
                      )}
                      <ChessboardComponent
                        position={fen}
                        onPieceDrop={handlePieceDrop}
                        onSquareClick={handleSquareClick}
                        arePiecesDraggable={true}
                        boardOrientation={playerColor}
                        customSquareStyles={optionSquares}
                        customBoardStyle={{ borderRadius: '12px' }}
                        customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
                        customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
                        customPieces={customChessPieces}
                      />
                    </div>
                  </div>

                  {/* Interactive Opening Book Explorer Drawer Panel */}
                  {showBookExplorer && (
                    <div className="w-full max-w-[530px] sm:max-w-[560px] mx-auto bg-slate-950/95 border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📖</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-amber-300">{currentBookSummary.name}</span>
                              <span className="text-[9px] font-mono font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                                {currentBookSummary.eco}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {currentBookSummary.isBook ? `Book Theory Depth: Move ${Math.floor(currentBookSummary.depth / 2) + 1}` : 'Independent Calculation Phase'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowBookExplorer(false)}
                          className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-900 border border-slate-800"
                        >
                          ✕ Close
                        </button>
                      </div>

                      {/* Overview Card */}
                      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 text-[11px] text-slate-300 leading-relaxed">
                        {currentBookSummary.overview}
                      </div>

                      {/* Continuation Moves Table */}
                      {currentBookSummary.continuations.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
                            <span>Master Continuations</span>
                            <span>Win % (White / Draw / Black)</span>
                          </div>

                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {currentBookSummary.continuations.map((c) => {
                              const isStudentTurn = inGame && gameStatus === 'active' && !isBotThinking && (gameRef.current.turn() === 'w' ? 'white' : 'black') === playerColor;
                              return (
                                <div
                                  key={c.uci}
                                  className="bg-slate-900 border border-slate-800/90 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-500/40 transition-all"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black font-mono text-amber-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md shadow-inner">
                                        {c.san}
                                      </span>
                                      <span className="text-xs font-bold text-white">{c.name}</span>
                                      <span className="text-[10px] font-mono text-slate-500">
                                        {c.gamesCount.toLocaleString()} games
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-snug">{c.comment}</p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                                    {/* Win rate micro bar */}
                                    <div className="w-24 bg-slate-950 rounded-full h-2 overflow-hidden flex border border-slate-800" title={`White: ${c.whiteWinPct}% | Draw: ${c.drawPct}% | Black: ${c.blackWinPct}%`}>
                                      <div className="h-full bg-slate-100" style={{ width: `${c.whiteWinPct}%` }} />
                                      <div className="h-full bg-slate-600" style={{ width: `${c.drawPct}%` }} />
                                      <div className="h-full bg-amber-500" style={{ width: `${c.blackWinPct}%` }} />
                                    </div>

                                    {/* Play Move Button */}
                                    {isStudentTurn && (
                                      <button
                                        type="button"
                                        onClick={() => playCandidateFromBook(c)}
                                        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                      >
                                        Play ♟️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-slate-900/50 border border-slate-800/80 rounded-xl text-xs text-slate-400">
                          💡 Position is beyond master book memory. Rely on tactical calculation and king defense!
                        </div>
                      )}
                    </div>
                  )}
                </div>

              {/* Sidebar Info & Controls */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Opponent Bot Info & Boss HP */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{BOT_LEVELS.find((b) => b.level === selectedLevel)?.avatarIcon}</span>
                        <div>
                          <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                            <span>{BOT_LEVELS.find((b) => b.level === selectedLevel)?.name}</span>
                            {bossBattleMode && (
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 font-black px-1.5 py-0.5 rounded border border-rose-500/40">
                                ⚔️ BOSS
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">Bot Rating: {BOT_LEVELS.find((b) => b.level === selectedLevel)?.rating}</div>
                        </div>
                      </div>
                      {isTimed && (
                        <div className="text-xl font-black text-amber-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                          {formatClock(botTimeSec)}
                        </div>
                      )}
                    </div>

                    {/* Boss HP Bar */}
                    {bossBattleMode && (
                      <div className="space-y-1 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-rose-400 flex items-center gap-1">
                            <span>⚔️</span> BOSS HEALTH
                          </span>
                          <span className="text-rose-300 font-mono">{botHp} / 100 HP</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-rose-500/30">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300 rounded-full"
                            style={{ width: `${Math.max(0, Math.min(100, botHp))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Student Player Info & Player HP */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">
                          YOU
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                            <span>Student (You)</span>
                            {bossBattleMode && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded border border-emerald-500/40">
                                🛡️ HERO
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">Rating: {profile?.rating || 400}</div>
                        </div>
                      </div>
                      {isTimed && (
                        <div className="text-xl font-black text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                          {formatClock(studentTimeSec)}
                        </div>
                      )}
                    </div>

                    {/* Player HP Bar */}
                    {bossBattleMode && (
                      <div className="space-y-1 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span>🛡️</span> PLAYER HEALTH
                          </span>
                          <span className="text-emerald-300 font-mono">{studentHp} / 100 HP</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/30">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                            style={{ width: `${Math.max(0, Math.min(100, studentHp))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Combat Event Banner */}
                  {bossBattleMode && lastCombatEvent && (
                    <div className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs font-black text-amber-200 flex items-center gap-2 shadow-md animate-pulse">
                      <span>⚡</span>
                      <span className="line-clamp-1">{lastCombatEvent}</span>
                    </div>
                  )}

                  {/* Live Opening Recognition Banner */}
                  {currentOpening && (
                    <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📖</span>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Current Opening</div>
                          <div className="font-extrabold text-white text-xs">{currentOpening}</div>
                        </div>
                      </div>
                      {selectedLevel === 3 && currentOpening.includes('Fried Liver') && (
                        <span className="bg-amber-500/20 text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse border border-amber-500/30">
                          🔥 Fried Liver
                        </span>
                      )}
                    </div>
                  )}

                  {/* Live Bot Commentary / Opening Advice Bubble */}
                  {botDialogue && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-xs text-amber-200 flex items-start justify-between gap-2.5 shadow-sm">
                      <div className="flex items-start gap-2 leading-snug">
                        <span className="text-base leading-none mt-0.5">{currentPersonality.avatar}</span>
                        <div>
                          <span className="font-extrabold text-amber-400 mr-1.5">
                            {BOT_LEVELS.find((b) => b.level === selectedLevel)?.name} ({currentPersonality.name}):
                          </span>
                          <span>{botDialogue}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (botDialogue) {
                            speakCoachAdvice(botDialogue, { pitch: currentPersonality.pitch, rate: currentPersonality.rate, force: true });
                          }
                        }}
                        className="text-xs p-1 rounded hover:bg-amber-500/20 text-amber-400 shrink-0"
                        title="Replay Voice Dialogue"
                      >
                        🔊
                      </button>
                    </div>
                  )}

                  {/* Live Coach Tactical Tip Bubble */}
                  {coachTipDialogue && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-emerald-200 flex items-start gap-2.5 shadow-sm animate-in fade-in">
                      <span className="text-base leading-none mt-0.5">💡</span>
                      <div className="leading-snug">
                        <span className="font-extrabold text-emerald-400 mr-1.5">Grandmaster Coach:</span>
                        <span>{coachTipDialogue}</span>
                      </div>
                    </div>
                  )}

                  {/* Coach Candidate Clue Lightbulb Button (3 Free Hints) */}
                  <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-base">💡</span>
                      <div>
                        <div className="font-extrabold text-white text-xs">Coach Tactical Clue</div>
                        <div className="text-[10px] text-slate-400 font-medium">Highlights active piece ({remainingHints} left)</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={remainingHints <= 0 || isBotThinking || gameStatus !== 'active'}
                      onClick={() => {
                        if (remainingHints <= 0 || isBotThinking || gameStatus !== 'active') return;
                        const best = computeBotMove(gameRef.current, 8, playerColor);
                        if (best && best.from) {
                          setRemainingHints((h) => h - 1);
                          setOptionSquares({
                            [best.from]: {
                              backgroundColor: 'rgba(245, 158, 11, 0.55)',
                              boxShadow: '0 0 14px rgba(245, 158, 11, 0.85)',
                              borderRadius: '8px',
                            },
                          });
                          setCoachTipDialogue(`Coach Clue: Look closely at your piece on ${best.from.toUpperCase()}! It holds an active tactical opportunity.`);
                          try { playChessSound('move'); } catch {}
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {remainingHints > 0 ? `Get Clue (${remainingHints})` : 'No Clues Left'}
                    </button>
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

                  {/* Quick Tactical Quest Sidebar Widget */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <div>
                        <div className="text-[11px] font-black text-white">Tactical Quests (10)</div>
                        <div className="text-[9px] text-slate-400">Master opening traps & tricks</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('quests')}
                      className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                    >
                      Solve →
                    </button>
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

      {/* TAB: TACTICAL QUESTS (10 INTERACTIVE QUESTIONS) */}
      {activeTab === 'quests' && (() => {
        const currentQuest = TACTICAL_QUIZ_QUESTIONS[activeQuizIndex] || TACTICAL_QUIZ_QUESTIONS[0];

        return (
          <div className="space-y-6">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <h2 className="text-lg font-black text-white">Interactive Tactical Quests (10 Challenges)</h2>
                </div>
                <p className="text-xs text-slate-400">
                  Master opening traps, pins, forks, smothered mates, and tactical defense with instant coach feedback.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-bold">Quest Score</div>
                  <div className="text-base font-black text-amber-400">{quizScore} / {TACTICAL_QUIZ_QUESTIONS.length} Solved</div>
                </div>
                <div className="text-2xl">🏆</div>
              </div>
            </div>

            {/* Question Card & Board Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Question & Interactive Options */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currentQuest.icon}</span>
                    <div>
                      <div className="text-[10px] text-amber-400 font-black uppercase tracking-wider">{currentQuest.theme}</div>
                      <h3 className="text-base font-extrabold text-white">{currentQuest.title}</h3>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                    Quest {activeQuizIndex + 1} of {TACTICAL_QUIZ_QUESTIONS.length}
                  </span>
                </div>

                <div className="text-sm font-medium text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  {currentQuest.question}
                </div>

                {/* 4 Multiple Choice Options */}
                <div className="space-y-3">
                  {currentQuest.options.map((opt, idx) => {
                    const isSelected = quizSelectedOption === idx;
                    let btnStyle = 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300';
                    if (quizAnswerSubmitted) {
                      if (opt.isCorrect) {
                        btnStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500';
                      } else if (isSelected && !opt.isCorrect) {
                        btnStyle = 'border-rose-500 bg-rose-500/20 text-rose-200 ring-1 ring-rose-500';
                      } else {
                        btnStyle = 'border-slate-900 bg-slate-950/40 text-slate-500 opacity-60';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={quizAnswerSubmitted}
                        onClick={() => setQuizSelectedOption(idx)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 text-xs font-semibold ${btnStyle}`}
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0 text-slate-300 mt-0.5">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                        {quizAnswerSubmitted && opt.isCorrect && <span className="text-emerald-400 font-black text-sm">✅</span>}
                        {quizAnswerSubmitted && isSelected && !opt.isCorrect && <span className="text-rose-400 font-black text-sm">❌</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Action button & Instant feedback */}
                <div className="space-y-4 pt-2">
                  {!quizAnswerSubmitted ? (
                    <Button
                      disabled={quizSelectedOption === null}
                      onClick={() => {
                        if (quizSelectedOption === null) return;
                        setQuizAnswerSubmitted(true);
                        const isCorrect = currentQuest.options[quizSelectedOption].isCorrect;
                        if (isCorrect) {
                          setQuizScore((s) => s + 1);
                          try { playChessSound('quiz_correct'); } catch {}
                        } else {
                          try { playChessSound('quiz_wrong'); } catch {}
                        }
                      }}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 font-black text-xs uppercase tracking-wider"
                    >
                      Confirm Answer 🚀
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                        currentQuest.options[quizSelectedOption!].isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      }`}>
                        <div className="font-black text-sm mb-1 flex items-center gap-1.5">
                          <span>{currentQuest.options[quizSelectedOption!].isCorrect ? '🎉 EXCELLENT!' : '❌ NOT QUITE!'}</span>
                        </div>
                        <div>{currentQuest.options[quizSelectedOption!].explanation}</div>
                        <div className="mt-2 text-[11px] font-bold text-amber-300 flex items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-amber-500/20">
                          <div className="flex items-center gap-1.5">
                            <span>💡 Coach Tip:</span>
                            <span>{currentQuest.coachTip}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => speakCoachAdvice(`${currentQuest.options[quizSelectedOption!].explanation}. Coach tip: ${currentQuest.coachTip}`, { force: true })}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 shrink-0 flex items-center gap-1"
                            title="Listen to Coach Voice"
                          >
                            <span>🗣️</span>
                            <span>Listen</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            const nextIdx = (activeQuizIndex + 1) % TACTICAL_QUIZ_QUESTIONS.length;
                            setActiveQuizIndex(nextIdx);
                            setQuizSelectedOption(null);
                            setQuizAnswerSubmitted(false);
                          }}
                          className="w-full py-3 bg-primary text-white font-extrabold text-xs uppercase"
                        >
                          {activeQuizIndex + 1 < TACTICAL_QUIZ_QUESTIONS.length ? 'Next Quest ➡️' : '🔁 Start Over'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini Board & Quest Navigator */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="font-extrabold text-xs text-white flex items-center justify-between">
                    <span>Position Preview</span>
                    <span className="text-[10px] text-amber-400 font-mono">+{currentQuest.xpReward} XP</span>
                  </div>

                  <div className="w-full max-w-[280px] aspect-square mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                    <ChessboardComponent
                      position={currentQuest.fen}
                      arePiecesDraggable={false}
                      boardOrientation="white"
                      customBoardStyle={{ borderRadius: '8px' }}
                      customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                      customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                      customPieces={customChessPieces}
                    />
                  </div>
                </div>

                {/* 10 Quest Quick Jumper */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="font-extrabold text-xs text-white">All 10 Quests</div>
                  <div className="grid grid-cols-5 gap-2">
                    {TACTICAL_QUIZ_QUESTIONS.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => {
                          setActiveQuizIndex(idx);
                          setQuizSelectedOption(null);
                          setQuizAnswerSubmitted(false);
                        }}
                        className={`py-2 text-xs font-black rounded-lg border transition-all ${
                          activeQuizIndex === idx
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        Q{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB: OPENING TREE ADVENTURE */}
      {activeTab === 'openings' && (() => {
        const currentNode = currentAdventure.nodes[adventureNodeId] || currentAdventure.nodes[currentAdventure.rootNodeId];
        const hasBranches = currentNode.branches && currentNode.branches.length > 0;
        const isBlunder = currentNode.evaluationTag === 'blunder';
        const isSuccess = currentNode.evaluationTag === 'best' && !hasBranches;

        return (
          <div className="space-y-6">
            {/* Opening Adventures Selector Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ALL_OPENING_ADVENTURES.map((adv) => {
                const isSelected = adv.id === selectedAdventureId;
                return (
                  <button
                    key={adv.id}
                    type="button"
                    onClick={() => {
                      setSelectedAdventureId(adv.id);
                      setAdventureNodeId(adv.rootNodeId);
                      setAdventureHistory([adv.rootNodeId]);
                      setAdventureCompleted(false);
                      try { playChessSound('move'); } catch {}
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15 ring-2 ring-amber-500'
                        : 'border-slate-800 bg-slate-900/90 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-amber-400">{adv.eco}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        adv.difficulty === 'Beginner' ? 'bg-emerald-500/20 text-emerald-300' :
                        adv.difficulty === 'Intermediate' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {adv.difficulty}
                      </span>
                    </div>
                    <div>
                      <div className="font-extrabold text-white text-xs line-clamp-1">{adv.title}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{adv.badgeReward} • +{adv.xpReward} XP</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌳</span>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Opening Tree Adventure ({currentAdventure.eco})
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">
                    Black Defense
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">{currentAdventure.title}</h2>
                <p className="text-xs text-slate-300 max-w-xl">{currentAdventure.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Reward</div>
                  <div className="text-sm font-black text-amber-400">+{currentAdventure.xpReward} XP</div>
                </div>
                <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl px-4 py-2 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Badge</div>
                  <div className="text-xs font-black text-purple-300">{currentAdventure.badgeReward}</div>
                </div>
              </div>
            </div>

            {/* Breadcrumb Move Trail */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-500 font-bold uppercase text-[10px] shrink-0">Move Trail:</span>
              {adventureHistory.map((nodeId, idx) => {
                const stepNode = currentAdventure.nodes[nodeId];
                if (!stepNode) return null;
                const isCurrent = nodeId === adventureNodeId;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAdventureNodeId(nodeId);
                      setAdventureHistory((prev) => prev.slice(0, idx + 1));
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {stepNode.moveNotation || 'Start'}
                  </button>
                );
              })}
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Chessboard (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-between gap-4">
                <div className="w-full flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Current FEN Position</span>
                  <span className="text-amber-400 font-mono text-[11px]">{currentNode.turn === 'w' ? 'White to move' : 'Black to move'}</span>
                </div>

                <div className="w-full max-w-[340px] aspect-square rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                  <ChessboardComponent
                    position={currentNode.fen}
                    arePiecesDraggable={false}
                    boardOrientation="white"
                    customBoardStyle={{ borderRadius: '10px' }}
                    customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                    customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                    customPieces={customChessPieces}
                  />
                </div>

                <div className="w-full flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={adventureHistory.length <= 1}
                    onClick={() => {
                      if (adventureHistory.length > 1) {
                        const newHist = adventureHistory.slice(0, -1);
                        setAdventureHistory(newHist);
                        setAdventureNodeId(newHist[newHist.length - 1]);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-bold transition-all"
                  >
                    ⬅️ Step Back
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdventureNodeId(currentAdventure.rootNodeId);
                      setAdventureHistory([currentAdventure.rootNodeId]);
                      setAdventureCompleted(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold transition-all"
                  >
                    🔁 Reset Tree
                  </button>
                </div>
              </div>

              {/* Decision Hub (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  {/* Node Header & Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-wider">
                        {currentNode.moveNotation}
                      </div>
                      <h3 className="text-lg font-extrabold text-white">{currentNode.title}</h3>
                    </div>

                    {currentNode.evaluationTag && (
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        currentNode.evaluationTag === 'best'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : currentNode.evaluationTag === 'blunder'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {currentNode.evaluationTag}
                      </span>
                    )}
                  </div>

                  {/* Explanation Card */}
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    isBlunder
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : isSuccess
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    {currentNode.explanation}
                  </div>

                  {/* Coach Advice */}
                  {currentNode.coachTip && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">💡</span>
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">Coach Guidance</div>
                          <p className="text-xs text-amber-200 font-medium">{currentNode.coachTip}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakCoachAdvice(currentNode.coachTip, { force: true })}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 shrink-0 transition-all"
                        title="Listen to Coach Voice"
                      >
                        <span>🗣️</span>
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Branches / Choices */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    {hasBranches ? 'Choose Your Move / Explore Branch:' : 'Line Completed'}
                  </div>

                  {hasBranches ? (
                    <div className="space-y-2.5">
                      {currentNode.branches.map((branch, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => {
                            setAdventureNodeId(branch.targetNodeId);
                            setAdventureHistory((prev) => [...prev, branch.targetNodeId]);
                            try { playChessSound('move'); } catch {}
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs font-bold ${
                            branch.isBest
                              ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/30'
                              : branch.isBlunder
                              ? 'border-rose-500/40 bg-rose-950/20 text-rose-200 hover:bg-rose-900/30'
                              : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300">
                              {bIdx + 1}
                            </span>
                            <span>{branch.label}</span>
                          </div>

                          {branch.tag && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono font-bold">
                              {branch.tag}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {isSuccess && (
                        <div className="bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/40 rounded-xl p-4 text-center space-y-2 shadow-lg">
                          <div className="text-3xl animate-bounce">🏆</div>
                          <div className="text-sm font-black text-emerald-300">
                            MASTER LINE ACHIEVED!
                          </div>
                          <p className="text-xs text-slate-300">
                            You successfully completed the {currentAdventure.title}! You earned +{currentAdventure.xpReward} XP and the {currentAdventure.badgeReward}.
                          </p>
                        </div>
                      )}

                      {isBlunder && (
                        <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-4 text-center space-y-2">
                          <div className="text-3xl">⚠️</div>
                          <div className="text-sm font-black text-rose-300">
                            TRAP TRIGGERED!
                          </div>
                          <p className="text-xs text-slate-300">
                            This move walks straight into tactical trouble. Step back and try the master defense line!
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (adventureHistory.length > 1) {
                            const newHist = adventureHistory.slice(0, -1);
                            setAdventureHistory(newHist);
                            setAdventureNodeId(newHist[newHist.length - 1]);
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-primary text-white font-extrabold text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors"
                      >
                        Try Another Branch ↩️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB: ACADEMY LEADERBOARD */}
      {activeTab === 'leaderboard' && (() => {
        const studentRating = profile?.rating || 400;
        const maxBotBeaten = Math.max(...Array.from(unlockedSet), 1);

        const PEERS = [
          { rank: 1, name: 'Aarav Sharma', rating: 1420, streak: 14, bossLevel: 7, badges: 12, avatar: '👑', isYou: false },
          { rank: 2, name: 'Ananya Roy', rating: 1280, streak: 11, bossLevel: 6, badges: 9, avatar: '🎖️', isYou: false },
          { rank: 3, name: 'Vihaan Patel', rating: 1150, streak: 8, bossLevel: 5, badges: 8, avatar: '🏅', isYou: false },
          { rank: 4, name: 'You (Current Student)', rating: studentRating, streak: streakCount, bossLevel: maxBotBeaten, badges: badges.length, avatar: '🛡️', isYou: true },
          { rank: 5, name: 'Rohan Gupta', rating: 780, streak: 5, bossLevel: 3, badges: 6, avatar: '♟️', isYou: false },
          { rank: 6, name: 'Sara Khan', rating: 650, streak: 4, bossLevel: 2, badges: 4, avatar: '♞', isYou: false },
          { rank: 7, name: 'Kabir Verma', rating: 520, streak: 2, bossLevel: 1, badges: 3, avatar: '♝', isYou: false },
        ];

        return (
          <div className="space-y-6">
            {/* Leaderboard Header */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    ChessHub Academy Standings
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">Student Training Leaderboard</h2>
                <p className="text-xs text-slate-300">
                  Compete with fellow academy peers across training ratings, daily streak flames, and boss knockouts!
                </p>
              </div>

              {/* Your Rank Card */}
              <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-4 shrink-0 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-xl text-white">
                  #4
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Your Standing</div>
                  <div className="text-sm font-black text-white">Student (You)</div>
                  <div className="text-[11px] text-amber-400 font-bold">
                    {studentRating} Rating • {streakCount}d Streak 🔥
                  </div>
                </div>
              </div>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* 2nd Place */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center flex flex-col items-center justify-between space-y-3 order-2 sm:order-1">
                <span className="text-3xl">🥈</span>
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl border-2 border-slate-400/50">
                  {PEERS[1].avatar}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-white">{PEERS[1].name}</div>
                  <div className="text-xs font-black text-slate-300 mt-0.5">{PEERS[1].rating} Rating</div>
                  <div className="text-[10px] text-slate-400">🔥 {PEERS[1].streak}-day streak</div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full">
                  Rank #2 (Silver)
                </span>
              </div>

              {/* 1st Place */}
              <div className="bg-gradient-to-b from-slate-900 to-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-6 text-center flex flex-col items-center justify-between space-y-3 order-1 sm:order-2 shadow-xl shadow-amber-500/10">
                <span className="text-4xl animate-bounce">👑</span>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-3xl shadow-lg border-2 border-amber-400">
                  {PEERS[0].avatar}
                </div>
                <div>
                  <div className="font-black text-base text-white">{PEERS[0].name}</div>
                  <div className="text-sm font-black text-amber-400 mt-0.5">{PEERS[0].rating} Rating</div>
                  <div className="text-[10px] text-amber-200">🔥 {PEERS[0].streak}-day streak • Defeated Lvl {PEERS[0].bossLevel}</div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-3 py-1 rounded-full shadow-md shadow-amber-500/30">
                  🥇 Academy Champion
                </span>
              </div>

              {/* 3rd Place */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center flex flex-col items-center justify-between space-y-3 order-3">
                <span className="text-3xl">🥉</span>
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl border-2 border-amber-700/50">
                  {PEERS[2].avatar}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-white">{PEERS[2].name}</div>
                  <div className="text-xs font-black text-slate-300 mt-0.5">{PEERS[2].rating} Rating</div>
                  <div className="text-[10px] text-slate-400">🔥 {PEERS[2].streak}-day streak</div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-400 px-2.5 py-1 rounded-full">
                  Rank #3 (Bronze)
                </span>
              </div>
            </div>

            {/* Standings Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-white">Full Student Academy Roster</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">ChessHub Rating</th>
                      <th className="p-3">Training Streak</th>
                      <th className="p-3">Max Bot Conquered</th>
                      <th className="p-3 text-right">Badges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {PEERS.map((student) => (
                      <tr
                        key={student.rank}
                        className={`transition-colors ${
                          student.isYou
                            ? 'bg-amber-500/10 border-l-4 border-amber-500'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="p-3 font-black text-sm">
                          {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{student.avatar}</span>
                            <div>
                              <div className={`font-bold ${student.isYou ? 'text-amber-300' : 'text-white'}`}>
                                {student.name}
                              </div>
                              {student.isYou && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black uppercase">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-black text-amber-400">{student.rating}</td>
                        <td className="p-3 font-bold text-slate-300">
                          <span className="flex items-center gap-1">
                            <span>🔥</span>
                            <span>{student.streak} days</span>
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-300">
                          Level {student.bossLevel} ({BOT_LEVELS.find((b) => b.level === student.bossLevel)?.name})
                        </td>
                        <td className="p-3 text-right font-black text-purple-300">
                          {student.badges} Crests 🛡️
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

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
                  <div key={w.id || Math.random()} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
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

                    <Button
                      onClick={() => handlePracticeWeaknessPuzzles(w.weakness_type)}
                      disabled={loadingPuzzleType === w.weakness_type}
                      className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg rounded-xl flex items-center justify-center gap-1.5"
                    >
                      {loadingPuzzleType === w.weakness_type ? '⏳ Generating Puzzles...' : '🧩 Practice Puzzles'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs space-y-4">
              <p>No weaknesses detected yet. As you play bot matches, Stockfish will automatically track mistake patterns here!</p>
              <Button
                onClick={() => handlePracticeWeaknessPuzzles('hanging_pieces')}
                className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl"
              >
                🧩 Practice Sample Hanging Pieces Puzzles
              </Button>
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
            <div className="p-8 text-center text-slate-400 text-xs space-y-4">
              <p>No custom puzzles loaded yet. Click below to generate instant tactical training puzzles for your weaknesses!</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => handlePracticeWeaknessPuzzles('hanging_pieces')}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
                >
                  🧩 Practice Hanging Pieces Puzzles
                </Button>
                <Button
                  onClick={() => handlePracticeWeaknessPuzzles('pawn_structure')}
                  className="py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl"
                >
                  ♟️ Practice Pawn Structure Puzzles
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ACHIEVEMENTS & TROPHY BADGES */}
      {activeTab === 'badges' && (() => {
        const ALL_CRESTS = [
          // 1. Milestones
          { id: 'first-blood', category: 'milestones', title: 'First Blood', icon: '🩸', desc: 'Win your first match against any bot', isUnlocked: recentGames.some((g) => g.result === 'win') },
          { id: 'tactical-sniper', category: 'milestones', title: 'Tactical Sniper', icon: '🎯', desc: 'Score 5+ in Tactical Quests', isUnlocked: quizScore >= 5 },
          { id: 'boss-slayer', category: 'milestones', title: 'Boss Slayer', icon: '⚔️', desc: 'Deplete a Bot HP bar in Boss Battle Mode', isUnlocked: recentGames.some((g) => g.result === 'win') },
          { id: 'fried-liver-defier', category: 'milestones', title: 'Fried Liver Defier', icon: '🛡️', desc: 'Explore Italian Opening Tree lines', isUnlocked: adventureHistory.length > 2 },
          { id: 'gm-prodigy', category: 'milestones', title: 'Grandmaster Prodigy', icon: '👑', desc: 'Reach 1000+ ChessHub Student Rating', isUnlocked: (profile?.rating ?? 400) >= 1000 },

          // 2. Bot Tiers
          { id: 'tier-bronze', category: 'tiers', title: 'Bronze Conqueror', icon: '🥉', desc: 'Defeat Level 1, 2, or 3 Bot', isUnlocked: recentGames.some((g) => g.result === 'win' && (g.bot_level ?? 0) <= 3) },
          { id: 'tier-silver', category: 'tiers', title: 'Silver Master', icon: '🥈', desc: 'Defeat Level 4, 5, or 6 Bot', isUnlocked: recentGames.some((g) => g.result === 'win' && (g.bot_level ?? 0) >= 4) },
          { id: 'tier-gold', category: 'tiers', title: 'Gold Champion', icon: '🥇', desc: 'Defeat Level 7 or 8 Master Bot', isUnlocked: recentGames.some((g) => g.result === 'win' && (g.bot_level ?? 0) >= 7) },
          { id: 'tier-diamond', category: 'tiers', title: 'Diamond Virtuoso', icon: '💎', desc: 'Defeat Level 9 or 10 Engine', isUnlocked: recentGames.some((g) => g.result === 'win' && (g.bot_level ?? 0) >= 9) },

          // 3. Piece Mastery
          { id: 'piece-knight', category: 'pieces', title: 'Knight Jumper', icon: '♞', desc: 'Master royal knight forks in quiz quests', isUnlocked: quizScore >= 3 },
          { id: 'piece-bishop', category: 'pieces', title: 'Bishop Diagonal', icon: '♝', desc: 'Execute pins on long diagonals', isUnlocked: quizScore >= 4 },
          { id: 'piece-rook', category: 'pieces', title: 'Rook Battery', icon: '♜', desc: 'Control open files and back-ranks', isUnlocked: quizScore >= 5 },
          { id: 'piece-pawn', category: 'pieces', title: 'Pawn Stormer', icon: '♟️', desc: 'Play 3 or more bot training games', isUnlocked: recentGames.length >= 3 },

          // 4. Secret Easter Eggs
          { id: 'secret-en-passant', category: 'secret', title: 'En Passant Wizard', icon: '⚡', desc: 'Answer the En Passant Quest correctly', isUnlocked: quizScore >= 6 },
          { id: 'secret-fortress', category: 'secret', title: 'Castling Fortress', icon: '🏰', desc: 'Castle your king safely into safety', isUnlocked: recentGames.length >= 1 },
          { id: 'secret-streak', category: 'secret', title: 'Streak Flame Bearer', icon: '🔥', desc: 'Maintain a multi-day training streak', isUnlocked: streakCount >= 3 },
        ];

        const filteredCrests = badgeCategoryFilter === 'all'
          ? ALL_CRESTS
          : ALL_CRESTS.filter((c) => c.category === badgeCategoryFilter);

        const unlockedTotal = ALL_CRESTS.filter((c) => c.isUnlocked).length;

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <DashboardIcon iconKey="award" className="w-5 h-5 text-amber-400" />
                  Academy Trophy Showcase ({unlockedTotal} / {ALL_CRESTS.length} Unlocked)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Earn prestigious academy crests across milestones, difficulty tiers, piece mastery, and secrets!
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { id: 'all', label: 'All Badges' },
                  { id: 'milestones', label: 'Milestones 🏆' },
                  { id: 'tiers', label: 'Bot Tiers 🥇' },
                  { id: 'pieces', label: 'Pieces ♞' },
                  { id: 'secret', label: 'Secrets ⚡' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBadgeCategoryFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      badgeCategoryFilter === f.id
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredCrests.map((crest) => (
                <div
                  key={crest.id}
                  className={`rounded-2xl border p-4 text-center space-y-2.5 transition-all relative overflow-hidden ${
                    crest.isUnlocked
                      ? 'border-amber-500/50 bg-gradient-to-b from-slate-950 to-amber-950/20 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-950/60 opacity-60'
                  }`}
                >
                  <div className="text-4xl animate-in zoom-in duration-200">{crest.icon}</div>
                  <div className="space-y-1">
                    <div className="font-extrabold text-xs text-white">{crest.title}</div>
                    <div className="text-[10px] text-slate-400 leading-snug">{crest.desc}</div>
                  </div>

                  <div className="pt-1">
                    {crest.isUnlocked ? (
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        ✅ Unlocked
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
                  <th className="p-3 text-right">Review</th>
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
                        {resultStr === 'IN_PROGRESS' ? (
                          <span className="text-slate-500 font-mono">—</span>
                        ) : (
                          <span className={ratingChange > 0 ? 'text-emerald-400' : ratingChange < 0 ? 'text-rose-400' : 'text-slate-300'}>
                            {ratingChange > 0 ? `+${ratingChange}` : ratingChange} <span className="text-slate-400 font-normal text-[11px]">({ratingAfter})</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const pgnText = g.pgn || generatePgn({
                                whiteName: g.student_color === 'white' ? 'Student' : `Level ${g.bot_level} Bot`,
                                blackName: g.student_color === 'black' ? 'Student' : `Level ${g.bot_level} Bot`,
                                result: g.result === 'win' ? (g.student_color === 'white' ? '1-0' : '0-1') : g.result === 'loss' ? (g.student_color === 'white' ? '0-1' : '1-0') : '1/2-1/2',
                                date: g.created_at ? new Date(g.created_at).toISOString().slice(0, 10).replace(/-/g, '.') : undefined,
                              });
                              downloadPgnFile(`chesshub_game_${g.id?.slice(0, 8) || 'match'}.pgn`, pgnText);
                            }}
                            title="Download PGN Replay"
                            className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-bold transition-all"
                          >
                            📥 PGN
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnalysisData({
                                result: (g.result || 'completed').toLowerCase(),
                                ratingBefore: (g.student_rating_after ?? 400) - (g.rating_change ?? 0),
                                ratingAfter: g.student_rating_after ?? 400,
                                ratingChange: g.rating_change ?? 0,
                                analysisSummary: g.analysis_summary || {
                                  accuracy: 82,
                                  blunders: 1,
                                  keyMoments: [
                                    {
                                      fen_before: 'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5',
                                      played_move: 'Nxd5',
                                      best_move: 'O-O',
                                      explanation: 'The knight on c3 is pinned to your King on e1. Moving it exposed the King to check.',
                                      better_idea: 'Castle kingside to unpin the knight first!',
                                    }
                                  ]
                                },
                              });
                              setShowAnalysisModal(true);
                              setPracticeMistakeIndex(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all"
                          >
                            🔍 Retry Mistakes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANALYSIS & INTERACTIVE REPLAY MODAL */}
      {showAnalysisModal && analysisData && practiceMistakeIndex === null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                  {analysisData.result === 'win' ? '🏆' : analysisData.result === 'draw' ? '🤝' : '⚔️'}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>{analysisData.result === 'win' ? 'VICTORY ACHIEVED!' : analysisData.result === 'draw' ? 'GAME DRAWN!' : 'MATCH ANALYSIS'}</span>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Rating: {analysisData.ratingBefore ?? 400} → {analysisData.ratingAfter ?? 400} ({(analysisData.ratingChange ?? 0) >= 0 ? `+${analysisData.ratingChange ?? 0}` : analysisData.ratingChange})
                    </span>
                  </h2>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    <span>Accuracy: <strong className="text-emerald-400">{analysisData.analysisSummary?.accuracy ?? 85}%</strong></span>
                    <span>•</span>
                    <span>Blunders: <strong className="text-rose-400">{analysisData.analysisSummary?.blunders ?? 0}</strong></span>
                    <span>•</span>
                    <span>Total Moves: <strong className="text-slate-200">{moveHistory.length}</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAnalysisModal(false);
                  setPracticeMistakeIndex(null);
                  setReplayAutoPlay(false);
                  setInGame(false);
                }}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - 2 Columns (Replay Board + Move Notation Tree) */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Interactive Replay Board & Stepper Controls (lg:col-span-6) */}
              <div className="lg:col-span-6 flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between text-xs font-bold px-1 text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span>♟️</span>
                    <span>Replay Board Stepper</span>
                  </span>
                  <span className="text-[11px] font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                    Step {replayMoveIndex} / {moveHistory.length}
                  </span>
                </div>

                {/* Mini Replay Chessboard */}
                <div className="w-full max-w-[320px] aspect-square rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
                  <ChessboardComponent
                    position={currentReplayFen}
                    arePiecesDraggable={false}
                    boardOrientation={playerColor}
                    customBoardStyle={{ borderRadius: '10px' }}
                    customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                    customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                    customPieces={customChessPieces}
                  />
                </div>

                {/* Stepper Control Buttons */}
                <div className="w-full max-w-[320px] bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setReplayMoveIndex(0);
                      setReplayAutoPlay(false);
                    }}
                    title="Jump to Start"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
                  >
                    ⏮️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplayMoveIndex((prev) => Math.max(0, prev - 1));
                      setReplayAutoPlay(false);
                    }}
                    title="Previous Move"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
                  >
                    ◀️ Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplayAutoPlay((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                      replayAutoPlay
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                    }`}
                  >
                    {replayAutoPlay ? '⏸️ Pause' : '▶️ Auto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplayMoveIndex((prev) => Math.min(moveHistory.length, prev + 1));
                      setReplayAutoPlay(false);
                    }}
                    title="Next Move"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
                  >
                    Next ▶️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplayMoveIndex(moveHistory.length);
                      setReplayAutoPlay(false);
                    }}
                    title="Jump to Final Position"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
                  >
                    ⏭️
                  </button>
                </div>

                {/* Key Moment Banner if Current Move Matches */}
                {(() => {
                  const currentTurn = Math.ceil(replayMoveIndex / 2);
                  const activeMoment = (analysisData.analysisSummary?.keyMoments || []).find(
                    (km: any) => km.move_number === currentTurn
                  );
                  const activeMomentIdx = (analysisData.analysisSummary?.keyMoments || []).findIndex(
                    (km: any) => km.move_number === currentTurn
                  );

                  if (!activeMoment || replayMoveIndex === 0) return null;

                  return (
                    <div className="w-full max-w-[320px] bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          <span>⚠️</span>
                          <span>Move {activeMoment.move_number} Mistake</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => speakCoachAdvice(`${activeMoment.explanation}. Recommended idea: ${activeMoment.better_idea}`, { force: true })}
                          className="text-amber-400 hover:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 flex items-center gap-1"
                        >
                          <span>🗣️</span>
                          <span>Hear Advice</span>
                        </button>
                      </div>
                      <div className="text-slate-300 text-[11px] leading-snug font-medium">
                        {activeMoment.explanation}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartPracticeMistakes(activeMomentIdx >= 0 ? activeMomentIdx : 0)}
                        className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg shadow uppercase tracking-wide transition-all"
                      >
                        🎯 Practice This Mistake Now →
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Interactive Move Notation Tree & Tactical Analysis (lg:col-span-6) */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                {/* Move Tree Header */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span>🌳</span>
                    <span>Game Move Tree (Click to Jump)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Click any move to position board
                  </span>
                </div>

                {/* Move Tree Scrollable Container */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-[190px] overflow-y-auto space-y-1 font-mono text-xs shadow-inner">
                  {replayMovePairs.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs font-sans">
                      No moves recorded in this game.
                    </div>
                  ) : (
                    replayMovePairs.map((pair) => {
                      const isWhiteActive = replayMoveIndex === pair.whiteIndex;
                      const isBlackActive = replayMoveIndex === pair.blackIndex;
                      const isKeyMoment = (analysisData.analysisSummary?.keyMoments || []).some(
                        (km: any) => km.move_number === pair.moveNum
                      );

                      return (
                        <div
                          key={pair.moveNum}
                          className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
                            isWhiteActive || isBlackActive ? 'bg-slate-900/90' : 'hover:bg-slate-900/50'
                          }`}
                        >
                          <span className="w-8 text-[11px] text-slate-500 shrink-0 font-bold">
                            {pair.moveNum}.
                          </span>

                          {/* White Move Chip */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplayMoveIndex(pair.whiteIndex);
                              setReplayAutoPlay(false);
                            }}
                            className={`flex-1 text-left px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center justify-between ${
                              isWhiteActive
                                ? 'bg-amber-500/25 text-amber-300 ring-1 ring-amber-400'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                            }`}
                          >
                            <span>{pair.whiteMove}</span>
                            {isKeyMoment && playerColor === 'white' && (
                              <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300" title="Key Moment / Mistake">
                                ⚠️
                              </span>
                            )}
                          </button>

                          {/* Black Move Chip */}
                          {pair.blackMove ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (pair.blackIndex) {
                                  setReplayMoveIndex(pair.blackIndex);
                                  setReplayAutoPlay(false);
                                }
                              }}
                              className={`flex-1 text-left px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center justify-between ${
                                isBlackActive
                                  ? 'bg-amber-500/25 text-amber-300 ring-1 ring-amber-400'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                              }`}
                            >
                              <span>{pair.blackMove}</span>
                              {isKeyMoment && playerColor === 'black' && (
                                <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300" title="Key Moment / Mistake">
                                  ⚠️
                                </span>
                              )}
                            </button>
                          ) : (
                            <span className="flex-1 text-slate-700 text-[11px] px-2">-</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Key Moments Coach Summary */}
                {Array.isArray(analysisData.analysisSummary?.keyMoments) && analysisData.analysisSummary.keyMoments.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
                        💡 Key Moments ({analysisData.analysisSummary.keyMoments.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartPracticeMistakes(0)}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                      >
                        Practice All →
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                      {analysisData.analysisSummary.keyMoments.slice(0, 3).map((km: any, idx: number) => {
                        const expl = typeof km?.explanation === 'string' ? km.explanation : 'Tactical moment detected';
                        const idea = typeof km?.better_idea === 'string' ? km.better_idea : 'Consider alternative moves';

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              // Jump replay to that move turn
                              const moveIdx = km.move_number ? (playerColor === 'white' ? (km.move_number * 2 - 1) : (km.move_number * 2)) : 0;
                              setReplayMoveIndex(Math.min(moveHistory.length, Math.max(0, moveIdx)));
                              setReplayAutoPlay(false);
                            }}
                            className="bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-lg p-2 text-xs cursor-pointer transition-colors space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="font-bold text-amber-300">
                                Move {km.move_number}: {expl}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                {km.played_move ? `(${km.played_move})` : ''}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[10px] line-clamp-1">
                              🎯 Idea: {idea}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Match Replay & Export Options */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <span>📜</span>
                    <span>Export Game:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const pgnText = generatePgn({
                          whiteName: playerColor === 'white' ? 'Student' : `Level ${selectedLevel} Bot`,
                          blackName: playerColor === 'black' ? 'Student' : `Level ${selectedLevel} Bot`,
                          result: analysisData.result === 'win' ? (playerColor === 'white' ? '1-0' : '0-1') : (playerColor === 'white' ? '0-1' : '1-0'),
                          moves: moveHistory,
                        });
                        downloadPgnFile(`chesshub_match_${Date.now()}.pgn`, pgnText);
                      }}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 transition-all flex items-center gap-1"
                    >
                      📥 PGN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pgnText = generatePgn({
                          whiteName: playerColor === 'white' ? 'Student' : `Level ${selectedLevel} Bot`,
                          blackName: playerColor === 'black' ? 'Student' : `Level ${selectedLevel} Bot`,
                          result: analysisData.result === 'win' ? (playerColor === 'white' ? '1-0' : '0-1') : (playerColor === 'white' ? '0-1' : '1-0'),
                          moves: moveHistory,
                        });
                        copyPgnToClipboard(pgnText);
                      }}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-400 transition-all flex items-center gap-1"
                    >
                      {pgnCopiedToast ? '✅ Copied!' : '📋 Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyShareLink(activeGameId || undefined)}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-sky-400 transition-all flex items-center gap-1"
                    >
                      {shareLinkCopiedToast ? '✅ Link Copied!' : '🔗 Share'}
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {Array.isArray(analysisData.analysisSummary?.keyMoments) && analysisData.analysisSummary.keyMoments.length > 0 && (
                    <Button
                      onClick={() => handleStartPracticeMistakes(0)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <span>🎯 Practice Mistakes ({analysisData.analysisSummary.keyMoments.length})</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setShowAnalysisModal(false);
                      setPracticeMistakeIndex(null);
                      setReplayAutoPlay(false);
                      setInGame(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                  >
                    Back to Overview
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE MISTAKE PRACTICE BOARD MODAL */}
      {showAnalysisModal && practiceMistakeIndex !== null && analysisData && (() => {
        const moments = analysisData.analysisSummary?.keyMoments || [];
        const currentMoment = moments[practiceMistakeIndex];
        if (!currentMoment) return null;

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl flex flex-col items-center">
              {/* Header */}
              <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Mistake {practiceMistakeIndex + 1} of {moments.length}
                  </span>
                  <h3 className="text-sm font-extrabold text-white">Move {currentMoment.move_number} Practice</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPracticeMistakeIndex(null)}
                  className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 transition-colors"
                >
                  ← Back to Summary
                </button>
              </div>

              {/* Explanation Card */}
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span>You played:</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                    {currentMoment.played_move}
                  </span>
                </div>
                <div className="text-amber-300 font-medium leading-relaxed">
                  💡 {currentMoment.explanation}
                </div>
                <div className="text-slate-400 text-[11px] leading-relaxed">
                  🎯 <strong className="text-slate-200">Goal:</strong> {currentMoment.better_idea}
                </div>
              </div>

              {/* Practice Chessboard */}
              <div className="w-full max-w-[300px] aspect-square rounded-xl overflow-hidden border border-slate-800 shadow-xl">
                <ChessboardComponent
                  position={practiceFen}
                  onPieceDrop={handlePracticeDrop}
                  arePiecesDraggable={!practiceSolved}
                  boardOrientation={playerColor}
                  customPieces={customChessPieces}
                />
              </div>

              {/* Interactive Status Feedback */}
              {practiceMsg && (
                <div
                  className={`w-full p-2.5 rounded-xl text-xs font-bold text-center border ${
                    practiceSolved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {practiceMsg}
                </div>
              )}

              {/* Solution Revealer */}
              {showPracticeSolution && currentMoment.best_move && (
                <div className="w-full bg-indigo-950/80 border border-indigo-700/60 p-2 rounded-xl text-xs font-bold text-center text-indigo-200">
                  💡 Better Move: <span className="font-mono text-white text-sm ml-1">{currentMoment.best_move}</span>
                </div>
              )}

              {/* Control Buttons */}
              <div className="w-full flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPracticeFen(currentMoment.fen_before);
                    setPracticeSolved(false);
                    setPracticeMsg(null);
                    setShowPracticeSolution(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  🔄 Reset
                </button>

                {!practiceSolved && currentMoment.best_move && (
                  <button
                    type="button"
                    onClick={() => setShowPracticeSolution((v) => !v)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/50 text-xs font-bold transition-colors"
                  >
                    {showPracticeSolution ? 'Hide Solution' : '💡 Show Solution'}
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  {practiceMistakeIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => handleStartPracticeMistakes(practiceMistakeIndex - 1)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                    >
                      ← Prev
                    </button>
                  )}
                  {practiceMistakeIndex < moments.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleStartPracticeMistakes(practiceMistakeIndex + 1)}
                      className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* BOSS BATTLE VICTORY LOOT CHEST MODAL */}
      {showLootChest && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 rounded-3xl max-w-md w-full p-7 space-y-6 shadow-2xl shadow-amber-500/20 text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <div className="text-6xl animate-bounce">🎁</div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] uppercase tracking-wider">
                Boss Battle Conquered!
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                VICTORY LOOT CHEST
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                You shattered the Level {selectedLevel} Bot&apos;s defenses with clinical precision!
              </p>
            </div>

            {/* Loot Rewards Grid or Active Rapid Quiz */}
            {!chestQuizActive && !chestQuizFinished && (
              <>
                <div className="grid grid-cols-3 gap-2.5 relative z-10">
                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-2xl">⚡</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">XP Earned</span>
                    <span className="text-base font-black text-amber-400">+50 XP</span>
                  </div>
                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-2xl">⭐</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Rating</span>
                    <span className="text-base font-black text-emerald-400">
                      +{(analysisData?.ratingChange && analysisData.ratingChange > 0) ? analysisData.ratingChange : 15}
                    </span>
                  </div>
                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-2xl">🛡️</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Crest</span>
                    <span className="text-[11px] font-black text-purple-300 mt-1">Boss Slayer</span>
                  </div>
                </div>

                {/* 2X DOUBLE XP BONUS CHALLENGE PROMPT */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center space-y-2 relative z-10">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-300 uppercase tracking-wider">
                    <span>🔥</span> 2X DOUBLE XP CHALLENGE
                  </div>
                  <p className="text-xs text-slate-300">
                    Solve 3 rapid tactical puzzles to double match XP from <strong>+50</strong> to <strong className="text-amber-400">+100 XP</strong>!
                  </p>
                  <Button
                    onClick={() => {
                      setChestQuizActive(true);
                      setChestQuizStep(0);
                      setChestQuizScore(0);
                      setChestQuizSelectedOption(null);
                      setChestQuizAnswerSubmitted(false);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs uppercase shadow-md shadow-amber-500/25"
                  >
                    Start 3-Question Challenge ⚡
                  </Button>
                </div>
              </>
            )}

            {/* ACTIVE 3-QUESTION RAPID QUIZ */}
            {chestQuizActive && !chestQuizFinished && (() => {
              const currentQ = chestQuizQuestions[chestQuizStep] || TACTICAL_QUIZ_QUESTIONS[0];
              return (
                <div className="space-y-4 text-left relative z-10">
                  <div className="flex items-center justify-between text-xs font-extrabold text-amber-400">
                    <span>Puzzle {chestQuizStep + 1} of 3</span>
                    <span className="font-mono text-slate-400">Score: {chestQuizScore} / 3</span>
                  </div>

                  <div className="text-xs font-bold text-white bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {currentQ.question}
                  </div>

                  <div className="space-y-2">
                    {currentQ.options.map((opt, oIdx) => {
                      const isSelected = chestQuizSelectedOption === oIdx;
                      let btnStyle = 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300';
                      if (chestQuizAnswerSubmitted) {
                        if (opt.isCorrect) btnStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                        else if (isSelected) btnStyle = 'border-rose-500 bg-rose-950/40 text-rose-200';
                        else btnStyle = 'border-slate-900 bg-slate-950/30 text-slate-500 opacity-60';
                      } else if (isSelected) {
                        btnStyle = 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={chestQuizAnswerSubmitted}
                          onClick={() => setChestQuizSelectedOption(oIdx)}
                          className={`w-full text-left p-3 rounded-xl border transition-all text-xs font-semibold ${btnStyle}`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>

                  {!chestQuizAnswerSubmitted ? (
                    <Button
                      disabled={chestQuizSelectedOption === null}
                      onClick={() => {
                        if (chestQuizSelectedOption === null) return;
                        setChestQuizAnswerSubmitted(true);
                        const isCorrect = currentQ.options[chestQuizSelectedOption].isCorrect;
                        if (isCorrect) {
                          setChestQuizScore((s) => s + 1);
                          try { playChessSound('quiz_correct'); } catch {}
                        } else {
                          try { playChessSound('quiz_wrong'); } catch {}
                        }
                      }}
                      className="w-full py-2.5 bg-primary text-white font-extrabold text-xs uppercase"
                    >
                      Check Answer 🚀
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className={`p-2.5 rounded-lg text-xs ${
                        currentQ.options[chestQuizSelectedOption!].isCorrect
                          ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold'
                      }`}>
                        {currentQ.options[chestQuizSelectedOption!].isCorrect ? '✅ Correct!' : '❌ Missed!'} {currentQ.options[chestQuizSelectedOption!].explanation}
                      </div>

                      <Button
                        onClick={() => {
                          if (chestQuizStep < 2) {
                            setChestQuizStep((s) => s + 1);
                            setChestQuizSelectedOption(null);
                            setChestQuizAnswerSubmitted(false);
                          } else {
                            setChestQuizFinished(true);
                            setChestQuizActive(false);
                          }
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs uppercase"
                      >
                        {chestQuizStep < 2 ? 'Next Puzzle ➡️' : 'Claim Results 🎉'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* RAPID QUIZ FINISHED CELEBRATION */}
            {chestQuizFinished && (
              <div className="space-y-4 text-center relative z-10">
                <div className="bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/40 rounded-2xl p-5 space-y-2 shadow-xl">
                  <div className="text-3xl animate-bounce">
                    {chestQuizScore >= 2 ? '💎' : '⭐'}
                  </div>
                  <div className="text-sm font-black text-emerald-300">
                    {chestQuizScore >= 2 ? '2X MULTIPLIER ACTIVATED! (+100 XP)' : 'CHALLENGE COMPLETE (+50 XP)'}
                  </div>
                  <p className="text-xs text-slate-300">
                    {chestQuizScore >= 2
                      ? `Brilliant calculation! You scored ${chestQuizScore}/3, unlocking the 2x XP double bonus and a Grandmaster Gem!`
                      : `Great effort! You scored ${chestQuizScore}/3 and bank full match victory rewards.`}
                  </p>
                </div>
              </div>
            )}

            {/* Claim Rewards Button */}
            <div className="space-y-2 relative z-10 pt-2">
              <Button
                onClick={() => {
                  setShowLootChest(false);
                  setLootClaimed(true);
                  setShowAnalysisModal(true);
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/30 border border-amber-400/50 transition-all hover:scale-[1.02]"
              >
                {chestQuizFinished && chestQuizScore >= 2 ? 'Claim 2X Rewards (+100 XP) & Review 🚀' : 'Claim Rewards & Review Match 🚀'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowLootChest(false);
                  setLootClaimed(true);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Close & Return to Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL GATEKEEPER CHALLENGE MODAL */}
      {gatekeeperLockedLevel !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center relative overflow-hidden">
            <div className="text-5xl">🔒</div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                Gatekeeper Challenge
              </span>
              <h2 className="text-xl font-extrabold text-white">
                Level {gatekeeperLockedLevel} is Locked!
              </h2>
              <p className="text-xs text-slate-400">
                Unlock {BOT_LEVELS.find((b) => b.level === gatekeeperLockedLevel)?.name} using any of the 3 mastery paths:
              </p>
            </div>

            <div className="space-y-2.5 text-left text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div className="space-y-0.5">
                  <div className="font-bold text-white">Path 1: Tactical Quiz Benchmark</div>
                  <p className="text-slate-400 text-[11px]">
                    Score 4/10 or more in Tactical Quests. Current score: <strong className="text-amber-400">{quizScore}/10</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                <span className="text-xl">⚔️</span>
                <div className="space-y-0.5">
                  <div className="font-bold text-white">Path 2: Boss Knockout Progression</div>
                  <p className="text-slate-400 text-[11px]">
                    Defeat Level {gatekeeperLockedLevel - 1} in a Boss Battle Match to trigger auto-unlock.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                <span className="text-xl">🔑</span>
                <div className="space-y-0.5">
                  <div className="font-bold text-white">Path 3: Coach Master Key</div>
                  <p className="text-slate-400 text-[11px]">
                    Your chess academy coach can unlock this level anytime from the coach management portal.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                onClick={() => {
                  setGatekeeperLockedLevel(null);
                  setActiveTab('quests');
                }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase shadow-md shadow-amber-500/20"
              >
                Solve Quests 🎯
              </Button>
              <Button
                variant="outline"
                onClick={() => setGatekeeperLockedLevel(null)}
                className="py-3 px-4 text-xs font-bold text-slate-300 border-slate-800 hover:bg-slate-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DAILY MISSIONS MODAL */}
      {showMissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl animate-pulse">🔥</span>
                <div>
                  <h3 className="text-base font-black text-white">{streakCount}-Day Training Streak</h3>
                  <p className="text-xs text-slate-400">Complete 3 daily challenges to earn +100 XP!</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMissionsModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1.5 rounded-xl hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* 3 Mission Cards */}
            <div className="space-y-2.5">
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                hasWonToday ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚔️</span>
                  <div>
                    <div className="text-white font-black">Conquer 1 Bot Match</div>
                    <div className="text-[10px] text-slate-400 font-normal">Win any full game against a bot</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-black ${hasWonToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {hasWonToday ? '1/1 ✅' : '0/1'}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                questsSolved >= 2 ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <div className="text-white font-black">Solve 2 Tactical Quests</div>
                    <div className="text-[10px] text-slate-400 font-normal">Answer 2 questions in the Quests tab</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-black ${questsSolved >= 2 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {questsSolved}/2 {questsSolved >= 2 && '✅'}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                exploredOpening ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌳</span>
                  <div>
                    <div className="text-white font-black">Explore 1 Opening Tree Branch</div>
                    <div className="text-[10px] text-slate-400 font-normal">Play through lines in Fried Liver Adventure</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-black ${exploredOpening ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {exploredOpening ? '1/1 ✅' : '0/1'}
                </span>
              </div>
            </div>

            {/* Claim Action */}
            <div className="pt-2">
              {allCompleted && !dailyBonusClaimed ? (
                <Button
                  onClick={() => {
                    setDailyBonusClaimed(true);
                    setStreakCount((s) => s + 1);
                    triggerVictoryCelebration('Streak reward unlocked! Plus 100 XP gained!');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 animate-bounce"
                >
                  Claim +100 XP Streak Reward! 🔥
                </Button>
              ) : dailyBonusClaimed ? (
                <div className="w-full text-center py-2.5 text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
                  ✅ Streak Bonus Banked (+100 XP)
                </div>
              ) : (
                <div className="w-full text-center py-2 text-xs font-bold text-slate-400 bg-slate-950 border border-slate-800 rounded-xl">
                  {completedMissionsCount} / 3 Daily Missions Completed
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Gaming Quick Dock (Bottom Type Navigation) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-1 sm:gap-1.5 ring-1 ring-white/10">
        {[
          { id: 'play', icon: '♟️', label: 'Play' },
          { id: 'quests', icon: '🎯', label: 'Quests' },
          { id: 'openings', icon: '🌳', label: 'Openings' },
          { id: 'leaderboard', icon: '🏆', label: 'Rank' },
          { id: 'history', icon: '📜', label: 'History' },
          { id: 'plan', icon: '🧩', label: 'Puzzles' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                try { playChessSound('move'); } catch {}
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 ring-1 ring-amber-300 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Quick Missions trigger in bottom dock */}
        <button
          type="button"
          onClick={() => {
            setShowMissionsModal(true);
            try { playChessSound('move'); } catch {}
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black transition-all ${
            allCompleted && !dailyBonusClaimed
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white animate-bounce'
              : 'text-amber-400 hover:bg-slate-800/80'
          }`}
          title="Daily Missions & Streak"
        >
          <span>🔥</span>
          <span className="text-[11px] font-mono">{completedMissionsCount}/3</span>
        </button>
      </div>

      {/* Post-Victory Confetti & Fanfare Celebration Overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg) scale(0.8); opacity: 1; }
              50% { transform: translateY(50vh) rotate(180deg) scale(1.1); opacity: 0.9; }
              100% { transform: translateY(105vh) rotate(360deg) scale(0.6); opacity: 0; }
            }
          `}</style>
          {Array.from({ length: 45 }).map((_, i) => {
            const colors = ['#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#8b5cf6', '#eab308', '#ef4444'];
            const bg = colors[i % colors.length];
            const left = `${(i * 2.2 + 2) % 96}%`;
            const delay = `${(i % 12) * 0.18}s`;
            const size = `${(i % 3) * 3 + 8}px`;
            return (
              <div
                key={i}
                className="absolute top-0 rounded-sm shadow-md"
                style={{
                  left,
                  width: size,
                  height: size,
                  backgroundColor: bg,
                  animation: `confettiFall ${2.5 + (i % 4) * 0.5}s cubic-bezier(0.25, 1, 0.5, 1) infinite`,
                  animationDelay: delay,
                }}
              />
            );
          })}
          {/* Victory Announcement Banner Overlay */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="bg-slate-950/95 border-2 border-amber-400/80 rounded-2xl px-6 py-3 shadow-2xl shadow-amber-500/30 flex items-center gap-3 backdrop-blur-xl animate-in zoom-in-90 fade-in duration-300">
              <span className="text-3xl animate-bounce">🏆</span>
              <div>
                <div className="text-sm font-black text-amber-300 uppercase tracking-widest flex items-center gap-2">
                  Victory Achieved!
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
                    +XP Awarded
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-semibold">
                  Glorious checkmate! Outstanding game performance!
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfetti(false)}
                className="ml-2 text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

