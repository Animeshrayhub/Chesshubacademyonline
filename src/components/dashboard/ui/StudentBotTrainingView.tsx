'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
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
import { playChessSound, setChessSoundEnabled, speakCoachAdvice, stopCoachVoice, setCoachVoiceEnabled, resetVoiceCooldown, clearSpokenHistory } from '@/utils/chessAudio';
import ChessCoachAvatar from './ChessCoachAvatar';
import { computeBotMove, identifyOpeningFromMoves, safeExecuteMove, evaluatePosition } from '@/lib/bot-training/chessBotEngine';
import { TACTICAL_QUIZ_QUESTIONS } from '@/lib/bot-training/tacticalQuizData';
import TacticalQuestArena from './TacticalQuestArena';
import { ALL_OPENING_ADVENTURES, FRIED_LIVER_ADVENTURE } from '@/lib/bot-training/openingTreeData';
import {
  BOT_PERSONALITIES,
  ALL_BOT_PERSONALITIES,
  type BotPersonalityId,
  getRandomPersonalityQuote,
  getRandomNonRepeatingQuote,
} from '@/lib/bot-training/botPersonalities';
import {
  getUnlockedLevelsByPoints,
  calculateTrainingPoints,
  BOT_UNLOCK_THRESHOLDS,
} from '@/lib/bot-training/botService';
import {
  getOpeningBookContinuations,
  type BookPositionSummary,
  type BookMoveContinuation,
} from '@/lib/bot-training/openingBookExplorer';
import { BOT_SCOUT_DATA, type BotScoutIntel } from '@/lib/bot-training/botScoutData';
import {
  TROPHY_ACHIEVEMENTS,
  type TrophyAchievement,
  type AchievementCategory,
  type AchievementRarity,
  type AchievementContext,
} from '@/lib/bot-training/trophyAchievementsData';
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
  const [livePeers, setLivePeers] = useState<any[] | null>(null);

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

  // Trophy Badges Category & Filter States
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<AchievementCategory | 'all'>('all');
  const [badgeSearchQuery, setBadgeSearchQuery] = useState<string>('');
  const [badgeRarityFilter, setBadgeRarityFilter] = useState<AchievementRarity | 'all'>('all');
  const [badgeStatusFilter, setBadgeStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  // Other Options & Advanced Match Rules
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [hintAllowanceOption, setHintAllowanceOption] = useState<'3' | '5' | 'unlimited' | '0'>('3');
  const [handicapOption, setHandicapOption] = useState<'equal' | 'pawn_odds' | 'knight_odds'>('equal');
  const [takebackAllowed, setTakebackAllowed] = useState<boolean>(true);
  const [botChatterOption, setBotChatterOption] = useState<'active' | 'quiet'>('active');
  const [newlyUnlockedBotLevel, setNewlyUnlockedBotLevel] = useState<number | null>(null);

  // Upgraded Leaderboard ("Lider Bora") State
  const [leaderboardMetric, setLeaderboardMetric] = useState<'points' | 'rating' | 'streak' | 'boss' | 'badges'>('points');
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'all_time' | 'weekly'>('all_time');
  const [leaderboardSearch, setLeaderboardSearch] = useState<string>('');
  const [comparisonPeer, setComparisonPeer] = useState<any | null>(null);

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
  const spokenEventsRef = useRef<Set<string>>(new Set());
  const spokenQuotesRef = useRef<string[]>([]);

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
          unlocked_levels: [1],
          coach_unlocked_levels: [],
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          games_drawn: 0,
          puzzles_solved: 0,
          training_points: 0,
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
        unlocked_levels: [1],
        coach_unlocked_levels: [],
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        games_drawn: 0,
        puzzles_solved: 0,
        training_points: 0,
        updated_at: new Date().toISOString(),
      } as any);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard' && !livePeers) {
      fetch('/api/leaderboard')
        .then((res) => res.json())
        .then((data) => {
          if (data?.entries?.rating) {
            setLivePeers(data.entries.rating);
          }
        })
        .catch(() => {});
    }
  }, [activeTab, livePeers]);

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

    // Calculate starting FEN based on practice handicap / piece odds
    const resolvedColor = (gData?.color || selectedColor === 'random') ? (gData?.color || (Math.random() < 0.5 ? 'white' : 'black')) : selectedColor;
    let customStartingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (handicapOption === 'pawn_odds') {
      // Remove opponent's f-pawn
      customStartingFen = resolvedColor === 'white'
        ? 'rnbqkbnr/ppppp1pp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        : 'rnbqkbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    } else if (handicapOption === 'knight_odds') {
      // Remove opponent's queen knight (b-knight)
      customStartingFen = resolvedColor === 'white'
        ? 'r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
    }

    // Local fallback ensures students can always start and play matches immediately
    if (!gData) {
      const botCfg = BOT_LEVELS.find((b) => b.level === selectedLevel) || BOT_LEVELS[0];
      gData = {
        gameId: 'local-' + Date.now(),
        botLevel: selectedLevel,
        botRating: botCfg.rating,
        color: resolvedColor,
        timeControl: selectedTimeControl,
        initialFen: customStartingFen,
        studentRatingBefore: profile?.rating || 400,
      };
    } else if (handicapOption !== 'equal') {
      gData.initialFen = customStartingFen;
    }

    // Initialize hints allowance based on Match Rules
    const initialHints = hintAllowanceOption === '3' ? 3 : hintAllowanceOption === '5' ? 5 : hintAllowanceOption === 'unlimited' ? 999 : 0;
    setRemainingHints(initialHints);

    setActiveGameId(gData.gameId);
    setPlayerColor(gData.color);
    setFen(gData.initialFen);
    gameRef.current = new Chess(gData.initialFen);
    setMoveHistory([]);
    setGameStatus('active');
    setInGame(true);
    setCurrentOpening('Starting Position');
    spokenEventsRef.current.clear();
    const startGreeting = getRandomNonRepeatingQuote(selectedPersonalityId, 'greeting', []);
    spokenQuotesRef.current = [startGreeting];
    clearSpokenHistory();
    resetVoiceCooldown();
    if (botChatterOption === 'active') {
      setBotDialogue(startGreeting);
      if (voiceNarrationOn) {
        speakCoachAdvice(startGreeting, { pitch: currentPersonality.pitch, rate: currentPersonality.rate, force: true });
      }
    } else {
      setBotDialogue('');
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

  // Takeback / Undo Move Handler
  const handleTakeback = () => {
    if (!takebackAllowed || !inGame || gameStatus !== 'active' || isBotThinking) return;
    const currentTurn = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (currentTurn === playerColor) {
      // It is player's turn; undo both bot's last move and player's move before it
      if (gameRef.current.history().length >= 2) {
        gameRef.current.undo();
        gameRef.current.undo();
      } else if (gameRef.current.history().length === 1) {
        gameRef.current.undo();
      }
    } else {
      // It is bot's turn; undo player's last move
      if (gameRef.current.history().length >= 1) {
        gameRef.current.undo();
      }
    }
    const newFen = gameRef.current.fen();
    setFen(newFen);
    setMoveHistory(gameRef.current.history());
    setCoachTipDialogue("Takeback applied! Take your time to calculate a stronger move.");
    try { playChessSound('move'); } catch {}
  };

  // Stockfish Bot turn trigger
  useEffect(() => {
    if (!inGame || gameStatus !== 'active') return;

    const activeTurnColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeTurnColor !== playerColor && !isBotThinking) {
      const timeout = setTimeout(() => {
        handleBotMove();
      }, 500);
      return () => clearTimeout(timeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, inGame, gameStatus, playerColor]);

  // Bot response engine loop
  const handleBotMove = async () => {
    if (!inGame || gameStatus !== 'active') return;
    setIsBotThinking(true);

    try {
      const botColor = playerColor === 'white' ? 'black' : 'white';
      const uciHistory: string[] = [];
      const historyVerbose = gameRef.current.history({ verbose: true });
      historyVerbose.forEach((m) => {
        uciHistory.push(`${m.from}${m.to}${m.promotion || ''}`);
      });

      let botBestMove: { from: string; to: string; promotion?: string } | null = null;
      let openingName = '';
      let commentary = '';

      try {
        const engineResult = computeBotMove(
          gameRef.current,
          selectedLevel,
          botColor,
          uciHistory
        );
        botBestMove = {
          from: engineResult.from,
          to: engineResult.to,
          promotion: engineResult.promotion,
        };
        openingName = engineResult.openingName || '';
        commentary = engineResult.botCommentary || '';
      } catch (err) {
        console.warn('[handleBotMove] computeBotMove fallback:', err);
      }

      let from = botBestMove?.from;
      let to = botBestMove?.to;
      let promotion = botBestMove?.promotion;

      if (!from || !to) {
        const moves = gameRef.current.moves({ verbose: true });
        if (moves.length > 0) {
          const m = moves[Math.floor(Math.random() * moves.length)];
          from = m.from;
          to = m.to;
          promotion = m.promotion;
        }
      }
      const game = gameRef.current;
      if (from && to) {
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

          // Audio & Voice Priority: Check > Capture > Commentary
          // Spoken voice advice is delivered on the first check or key turning point.
          // Subsequent checks or routine captures play gentle sound effects to eliminate repetitive voice loops.
          if (game.inCheck()) {
            if (!spokenEventsRef.current.has('bot_check')) {
              spokenEventsRef.current.add('bot_check');
              const checkMsg = getRandomNonRepeatingQuote(selectedPersonalityId, 'check', spokenQuotesRef.current);
              spokenQuotesRef.current.push(checkMsg);
              setCoachTipDialogue(checkMsg);
              if (voiceNarrationOn) {
                speakCoachAdvice(checkMsg, {
                  pitch: currentPersonality.pitch,
                  rate: currentPersonality.rate,
                  fallbackSfx: 'check',
                });
              }
            } else {
              setCoachTipDialogue("Check! Mind your King's defense.");
              try { playChessSound('check'); } catch {}
            }
          } else if (moveRes.captured) {
            if (!spokenEventsRef.current.has('bot_capture')) {
              spokenEventsRef.current.add('bot_capture');
              const banter = getRandomNonRepeatingQuote(selectedPersonalityId, 'botCapture', spokenQuotesRef.current);
              spokenQuotesRef.current.push(banter);
              setBotDialogue(banter);
              if (voiceNarrationOn) {
                speakCoachAdvice(banter, {
                  pitch: currentPersonality.pitch,
                  rate: currentPersonality.rate,
                  fallbackSfx: 'capture',
                });
              }
            } else {
              const banterText = getRandomNonRepeatingQuote(selectedPersonalityId, 'botCapture', spokenQuotesRef.current);
              setBotDialogue(banterText);
              try { playChessSound('capture'); } catch {}
            }
          } else if (commentary) {
            setBotDialogue(commentary);
            if (voiceNarrationOn) {
              speakCoachAdvice(commentary, {
                pitch: currentPersonality.pitch,
                rate: currentPersonality.rate,
                minIntervalMs: 15000,
                fallbackSfx: 'move',
              });
            }
          }

          try {
            const nextScore = evaluatePosition(game);
            setEvalScore(nextScore);
            setPrevEvalScore(nextScore);
          } catch {}

          try {
            if (!game.inCheck() && !moveRes.captured) {
              playChessSound('move');
            }
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
      }
    } catch (e) {
      console.error('[handleBotMove] Bot move failed:', e);
    } finally {
      setIsBotThinking(false);
    }
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

      // Audio & Voice Priority on Student move: Check > Capture
      // Speaks coaching advice on the first check/capture; subsequent moves use subtle sound effects.
      if (gameRef.current.inCheck()) {
        if (!spokenEventsRef.current.has('student_check')) {
          spokenEventsRef.current.add('student_check');
          const studentCheckMsg = getRandomNonRepeatingQuote(selectedPersonalityId, 'check', spokenQuotesRef.current);
          spokenQuotesRef.current.push(studentCheckMsg);
          setCoachTipDialogue(studentCheckMsg);
          if (voiceNarrationOn) {
            speakCoachAdvice(studentCheckMsg, { fallbackSfx: 'check' });
          }
        } else {
          setCoachTipDialogue("Check! You have the Bot's King under fire.");
          try { playChessSound('check'); } catch {}
        }
      } else if (move.captured) {
        if (!spokenEventsRef.current.has('student_capture')) {
          spokenEventsRef.current.add('student_capture');
          const studentBanter = getRandomNonRepeatingQuote(selectedPersonalityId, 'studentCapture', spokenQuotesRef.current);
          spokenQuotesRef.current.push(studentBanter);
          setBotDialogue(studentBanter);
          if (voiceNarrationOn) {
            speakCoachAdvice(studentBanter, {
              pitch: currentPersonality.pitch,
              rate: currentPersonality.rate,
              fallbackSfx: 'capture',
            });
          }
        } else {
          const studentBanterText = getRandomNonRepeatingQuote(selectedPersonalityId, 'studentCapture', spokenQuotesRef.current);
          setBotDialogue(studentBanterText);
          try { playChessSound('capture'); } catch {}
        }
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

  // Points-based unlock: Level 2 at 400 pts, Level 3 at 800 pts, etc.
  const userTrainingPoints = useMemo(() => {
    return (profile as any)?.training_points ?? calculateTrainingPoints(
      profile?.wins || 0,
      profile?.draws || 0,
      profile?.losses || 0,
      profile?.puzzles_solved || 0
    );
  }, [profile?.wins, profile?.draws, profile?.losses, profile?.puzzles_solved, (profile as any)?.training_points]);

  const unlockedSet = useMemo(() => {
    // Only Level 1 Novice Bot is unlocked by default for beginners
    const set = new Set<number>([1]);

    if (profile?.unlocked_levels) {
      profile.unlocked_levels.forEach((lvl) => set.add(lvl));
    }

    // 1. Points-based unlock (+400 TP per tier)
    for (let lvl = 2; lvl <= 10; lvl++) {
      const threshold = BOT_UNLOCK_THRESHOLDS[lvl] ?? (lvl - 1) * 400;
      if (userTrainingPoints >= threshold) {
        set.add(lvl);
      }
    }

    // 2. Student Rating Equivalent (if student rating matches or exceeds bot rating)
    const studentRating = profile?.rating ?? 400;
    BOT_LEVELS.forEach((b) => {
      if (studentRating >= b.rating) {
        set.add(b.level);
      }
    });

    // 3. Coach Master Key override
    if (profile?.coach_unlocked_levels) {
      profile.coach_unlocked_levels.forEach((lvl) => set.add(lvl));
    }

    // 4. Tactical Quiz Benchmark: 4+ correct answers unlocks levels 4-5, 7+ unlocks 6-7, 10 unlocks all
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

    // 5. Boss Knockout Progression: beating level L unlocks L+1
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
  }, [profile?.unlocked_levels, profile?.coach_unlocked_levels, profile?.rating, userTrainingPoints, quizScore, recentGames]);

  // Next Bot Unlock Progression Metrics
  const nextLockedBot = useMemo(() => {
    return BOT_LEVELS.find((b) => !unlockedSet.has(b.level)) || null;
  }, [unlockedSet]);

  const nextPointsThreshold = useMemo(() => {
    if (!nextLockedBot) return 0;
    return BOT_UNLOCK_THRESHOLDS[nextLockedBot.level] ?? (nextLockedBot.level - 1) * 400;
  }, [nextLockedBot]);

  const pointsToNextUnlock = useMemo(() => {
    if (!nextLockedBot) return 0;
    return Math.max(0, nextPointsThreshold - userTrainingPoints);
  }, [nextLockedBot, nextPointsThreshold, userTrainingPoints]);

  const nextUnlockProgressPct = useMemo(() => {
    if (!nextLockedBot) return 100;
    const prevThreshold = BOT_UNLOCK_THRESHOLDS[nextLockedBot.level - 1] ?? 0;
    const range = Math.max(1, nextPointsThreshold - prevThreshold);
    const currentInRange = Math.max(0, userTrainingPoints - prevThreshold);
    return Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
  }, [nextLockedBot, nextPointsThreshold, userTrainingPoints]);

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
      {/* 3D Master Gaming Console HUD (Unified Top Bar) */}
      <div className="relative bg-gradient-to-r from-slate-900/95 via-slate-950/95 to-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3 shadow-2xl overflow-hidden">
        {/* Top Rim Light Reflection */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-3">
          {/* Col 1: Left Brand, Level, Points & Rating (lg:col-span-4) */}
          <div className="flex items-center justify-between lg:justify-start gap-2.5 lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-lg shadow-lg shadow-amber-500/30 border-b-2 border-amber-700 shrink-0 transform transition-transform hover:scale-105 select-none">
                ♟️
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-white tracking-wide drop-shadow-sm whitespace-nowrap">Bot Arena</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg shadow-sm whitespace-nowrap">
                  Lvl {profile?.current_level || 1}
                </span>
                <span className="text-[11px] font-black font-mono text-amber-400 bg-slate-950/90 border border-amber-500/30 px-2.5 py-0.5 rounded-lg shadow-inner flex items-center gap-1 whitespace-nowrap">
                  <span>⚡</span>
                  <span>{userTrainingPoints} TP</span>
                </span>
                <span className="text-[11px] font-bold font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg shadow-inner whitespace-nowrap" title="ChessHub Elo Rating">
                  {profile?.rating || 400} Elo
                </span>
              </div>
            </div>

            {/* Mobile Audio Quick Toggle */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  setChessSoundEnabled(next);
                }}
                className={`p-1.5 rounded-xl border text-xs transition-all shadow-sm active:translate-y-0.5 ${
                  soundOn
                    ? 'bg-slate-950 border-slate-700 text-slate-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {soundOn ? '🔊' : '🔇'}
              </button>
            </div>
          </div>

          {/* Col 2: Center 3D Embossed XP Progress Tube (lg:col-span-4) */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3.5 py-2 space-y-1.5 lg:col-span-4 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-mono leading-none whitespace-nowrap">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <span className="text-amber-300">⭐ Tier {currentLevelNum}</span>
                <span className="text-slate-600">➔</span>
                <span className="text-emerald-400 font-extrabold">Tier {Math.min(10, currentLevelNum + 1)}</span>
              </span>
              <span className="font-black text-amber-400">
                {xpInLevel} / {xpTarget} XP <span className="text-slate-400">({xpPercent}%)</span>
              </span>
            </div>
            {/* 3D Recessed Progress Tube */}
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800/90 p-0.5 shadow-inner relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-700 shadow-md shadow-amber-500/50 relative overflow-hidden"
                style={{ width: `${Math.max(4, xpPercent)}%` }}
              >
                {/* Gloss Reflection Highlight */}
                <div className="absolute inset-x-0 top-0 h-[50%] bg-white/25 rounded-t-full" />
              </div>
            </div>
          </div>

          {/* Col 3: Right Action Chips Grid (lg:col-span-4) */}
          <div className="flex items-center flex-wrap gap-1.5 justify-end lg:col-span-4 whitespace-nowrap">
            {/* Puzzles Chip */}
            <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/90 rounded-xl px-2.5 py-1 text-xs font-black text-sky-400 shadow-inner whitespace-nowrap">
              <span className="text-sm">🧩</span>
              <span>{profile?.puzzles_solved || 0}</span>
            </div>

            {/* Streak & Missions Chip (3D Pill) */}
            <button
              type="button"
              onClick={() => setShowMissionsModal(true)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black border transition-all shadow-sm active:translate-y-0.5 ${
                allCompleted && !dailyBonusClaimed
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse ring-2 ring-amber-400/50'
                  : 'bg-slate-950/90 border-slate-800 hover:border-amber-500/50 text-slate-300'
              }`}
              title="Daily Training Missions"
            >
              <span className="text-sm">🔥</span>
              <span>{streakCount}d</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                allCompleted ? 'bg-emerald-500/20 text-emerald-300 font-black' : 'bg-slate-800 text-amber-400'
              }`}>
                {completedMissionsCount}/3
              </span>
            </button>

            {/* AI Voice Toggle (3D tactile button) */}
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black transition-all shadow-sm active:translate-y-0.5 ${
                voiceNarrationOn
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-500/50 text-amber-300 ring-1 ring-amber-400/40'
                  : 'bg-slate-950/80 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{voiceNarrationOn ? '🗣️' : '🔇'}</span>
              <span className="text-[10px] uppercase font-mono">{voiceNarrationOn ? 'Voice' : 'Off'}</span>
            </button>

            {/* Sound Toggle (Desktop, 3D tactile button) */}
            <button
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setChessSoundEnabled(next);
              }}
              title={soundOn ? 'SFX ON' : 'SFX Muted'}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-black transition-all shadow-sm active:translate-y-0.5 ${
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
                className={`p-1.5 rounded-xl border text-xs shadow-sm transition-all active:translate-y-0.5 ${
                  showDevDiagnostics
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950/80 border-slate-800 text-slate-500 hover:text-slate-300'
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

      {/* 3D Segmented Console Tab Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-1.5 shadow-xl backdrop-blur-md overflow-x-auto no-scrollbar scroll-smooth">
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
            { id: 'badges', label: 'Badges (105)', icon: 'award' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap select-none ${
                  isActive
                    ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 border-b-2 border-amber-700 ring-1 ring-amber-300/40 -translate-y-0.5'
                    : 'bg-slate-950/70 text-slate-400 hover:bg-slate-800/90 hover:text-white border border-slate-800/80 shadow-sm active:translate-y-0.5'
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Level Selector & Scout Dossier (lg:col-span-7 xl:col-span-8) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                {/* 3D Bot Difficulty Selector & Bot Bar */}
                <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 backdrop-blur-xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-base shadow-md shadow-amber-500/10">
                        🏆
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
                          Select Bot Difficulty
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            10 Tiers
                          </span>
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Earn points from matches and puzzles to unlock the next academy bot!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950/90 border border-amber-500/30 px-3 py-1 rounded-xl shadow-inner">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Selected:</span>
                      <strong className="text-xs font-black text-amber-400">Level {selectedLevel}</strong>
                    </div>
                  </div>

                  {/* 3D Bot Progression & Next Unlock Bar ("Bot Bar") */}
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 shadow-md shadow-amber-500/10">
                          {nextLockedBot ? nextLockedBot.avatarIcon : '👑'}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-white">
                              {nextLockedBot
                                ? `Next Unlock: Level ${nextLockedBot.level} (${nextLockedBot.name.replace(/Level \d+ — /, '')})`
                                : 'All 10 Academy Bots Unlocked!'}
                            </span>
                            {nextLockedBot && (
                              <span className="text-[10px] font-mono font-black bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                                ⚡ {userTrainingPoints} / {nextPointsThreshold} TP
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {nextLockedBot
                              ? pointsToNextUnlock === 0
                                ? '🎉 You have earned enough points! This bot is unlocked and ready to play!'
                                : `Earn ${pointsToNextUnlock} more Training Points from matches or puzzles to unlock!`
                              : 'You have mastered every bot in the ChessHub Academy Arena!'}
                          </p>
                        </div>
                      </div>

                      {nextLockedBot && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <div className="text-right font-mono">
                            <span className="text-xs font-black text-emerald-400">{nextUnlockProgressPct}%</span>
                            <span className="text-[10px] text-slate-500 block">complete</span>
                          </div>
                          {pointsToNextUnlock === 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLevel(nextLockedBot.level);
                                setNewlyUnlockedBotLevel(nextLockedBot.level);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/25 animate-pulse border border-emerald-400/50 hover:brightness-110 active:translate-y-0.5"
                            >
                              Select Level {nextLockedBot.level} 🚀
                            </button>
                          ) : (
                            <div className="text-[10px] font-black text-amber-400/90 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                              ⚡ {pointsToNextUnlock} TP Left
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3D Progress Bar across all 10 bots */}
                    <div className="mt-3 relative">
                      <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/90 p-0.5 shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-700 shadow-md shadow-amber-500/50"
                          style={{ width: `${Math.min(100, Math.max(5, (unlockedSet.size / 10) * 100))}%` }}
                        />
                      </div>
                      {/* 10 Level Tick Marks */}
                      <div className="flex justify-between items-center px-1 mt-1 text-[9px] font-mono font-bold text-slate-500">
                        {BOT_LEVELS.map((b) => {
                          const isUnlocked = unlockedSet.has(b.level);
                          return (
                            <span
                              key={b.level}
                              className={`cursor-pointer transition-colors ${
                                isUnlocked ? 'text-amber-400 font-black' : 'hover:text-slate-300'
                              }`}
                              onClick={() => {
                                if (isUnlocked) setSelectedLevel(b.level);
                                else setGatekeeperLockedLevel(b.level);
                              }}
                              title={`Lvl ${b.level}: ${b.name} (${isUnlocked ? 'Unlocked' : `${BOT_UNLOCK_THRESHOLDS[b.level]} TP`})`}
                            >
                              L{b.level}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 10 Bot Cards Grid (3D Collectible Style with Point Badges) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
                    {BOT_LEVELS.map((b) => {
                      const isUnlocked = unlockedSet.has(b.level);
                      const isCoachUnlocked = profile?.coach_unlocked_levels?.includes(b.level);
                      const isSelected = selectedLevel === b.level;
                      const requiredPts = BOT_UNLOCK_THRESHOLDS[b.level] ?? (b.level - 1) * 400;
                      const ptsDiff = Math.max(0, requiredPts - userTrainingPoints);
                      const canUnlockNow = !isUnlocked && ptsDiff === 0;

                      return (
                        <div
                          key={b.level}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isUnlocked || canUnlockNow) {
                              setSelectedLevel(b.level);
                            } else {
                              setGatekeeperLockedLevel(b.level);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isUnlocked || canUnlockNow) setSelectedLevel(b.level);
                              else setGatekeeperLockedLevel(b.level);
                            }
                          }}
                          className={`relative rounded-2xl p-3 cursor-pointer transition-all duration-200 flex flex-col justify-between select-none ${
                            isSelected
                              ? 'border-2 border-amber-400 bg-gradient-to-b from-amber-500/25 via-slate-900 to-amber-950/40 shadow-xl shadow-amber-500/25 ring-2 ring-amber-400/80 -translate-y-1 scale-[1.02] border-b-4 border-b-amber-600'
                              : canUnlockNow
                              ? 'border-2 border-emerald-400/80 bg-emerald-950/30 hover:bg-emerald-950/50 -translate-y-0.5 shadow-lg shadow-emerald-500/20 border-b-4 border-b-emerald-600 animate-pulse'
                              : isUnlocked
                              ? 'border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-900/90 hover:border-amber-500/50 hover:bg-slate-850 hover:-translate-y-0.5 hover:shadow-lg border-b-4 border-b-slate-800'
                              : 'border border-slate-900 bg-slate-950/50 opacity-70 hover:opacity-90 border-b-2 border-b-slate-900/80'
                          }`}
                        >
                          {/* Card Top Pill */}
                          <div className="flex items-center justify-between">
                            <span className="text-2xl sm:text-3xl filter drop-shadow-md transform transition-transform group-hover:scale-110">
                              {b.avatarIcon}
                            </span>
                            {isUnlocked ? (
                              isCoachUnlocked ? (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                                  🔓 Coach
                                </span>
                              ) : (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.5 rounded-md border border-amber-500/30">
                                  Lvl {b.level}
                                </span>
                              )
                            ) : canUnlockNow ? (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded-md border border-emerald-500/40">
                                🔓 Ready!
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-800 text-amber-300 font-mono font-black px-1.5 py-0.5 rounded-md border border-slate-700">
                                ⚡ {requiredPts} TP
                              </span>
                            )}
                          </div>

                          {/* Card Info */}
                          <div className="mt-2.5 space-y-0.5">
                            <div className="font-black text-xs text-white truncate drop-shadow-sm">
                              {b.name.replace(/Level \d+ — /, '')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold flex items-center justify-between">
                              <span>Rating: {b.rating}</span>
                              {!isUnlocked && !canUnlockNow && (
                                <span className="text-[9px] text-amber-400/80 font-mono">
                                  -{ptsDiff} TP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3D Bot Opening Repertoire Scout Dossier Card */}
                {(() => {
                  const botMatches = recentGames.filter((g) => g.bot_level === selectedLevel);
                  const botWins = botMatches.filter((g) => g.result === 'win').length;
                  const botLosses = botMatches.filter((g) => g.result === 'loss').length;
                  const botDraws = botMatches.filter((g) => g.result === 'draw').length;
                  const botWinPct = botMatches.length > 0 ? Math.round((botWins / botMatches.length) * 100) : null;

                  return (
                    <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                      {/* Top Intelligence Dossier Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/80 shadow-md flex items-center justify-center text-3xl shrink-0">
                            {currentBotScout.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-white tracking-wide">{currentBotScout.name}</span>
                              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shadow-inner">
                                Rating {currentBotScout.rating}
                              </span>
                              <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
                                {currentBotScout.playstyleTag}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1">
                              Signature Trap: <strong className="text-amber-300 font-bold">{currentBotScout.signatureTrap}</strong>
                            </p>
                          </div>
                        </div>

                        {/* 3D Digital LED H2H Scoreboard */}
                        <div className="flex items-center gap-2 shrink-0 bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono shadow-inner">
                          <span className="text-slate-400 text-[10px] uppercase font-bold">H2H:</span>
                          {botMatches.length > 0 ? (
                            <span className="font-black text-white">
                              <span className="text-emerald-400">{botWins}W</span> - <span className="text-rose-400">{botLosses}L</span> - <span className="text-slate-400">{botDraws}D</span>{' '}
                              <span className="text-amber-400 font-bold">({botWinPct}%)</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-bold">No matches yet</span>
                          )}
                        </div>
                      </div>

                      {/* Repertoire Grid (White & Black) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Repertoire as White */}
                        <div className="bg-slate-950/80 border border-amber-500/20 rounded-xl p-3 space-y-1.5 shadow-inner">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                            <span className="flex items-center gap-1 text-amber-300">
                              <span>♔</span> White Repertoire:
                            </span>
                            <span className="font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                              {currentBotScout.whiteRepertoire.frequency}
                            </span>
                          </div>
                          <div className="font-black text-white text-xs">
                            {currentBotScout.whiteRepertoire.primary}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            {currentBotScout.whiteRepertoire.plan}
                          </p>
                        </div>

                        {/* Repertoire as Black */}
                        <div className="bg-slate-950/80 border border-emerald-500/20 rounded-xl p-3 space-y-1.5 shadow-inner">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                            <span className="flex items-center gap-1 text-emerald-300">
                              <span>♚</span> Black Repertoire:
                            </span>
                            <span className="font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              vs 1.e4 & 1.d4
                            </span>
                          </div>
                          <div className="font-black text-white text-xs truncate">
                            {currentBotScout.blackRepertoire.vsE4}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            {currentBotScout.blackRepertoire.plan}
                          </p>
                        </div>
                      </div>

                      {/* Coach Counter-Strategy & Weakness (Glowing 3D Banner) */}
                      <div className="bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-100 shadow-md">
                        <span className="text-xl leading-none mt-0.5 shrink-0">🛡️</span>
                        <div className="space-y-1 leading-snug">
                          <div className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                            <span>Exploitable Weakness & Coach Counter-Strategy:</span>
                          </div>
                          <div className="text-[11px] text-slate-200">
                            <strong className="text-rose-300 font-black">{currentBotScout.weakness}</strong> — {currentBotScout.coachAdvice}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: 3D Match Settings Panel (lg:col-span-5 xl:col-span-4) */}
              <div className="lg:col-span-5 xl:col-span-4 bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <DashboardIcon iconKey="settings" className="w-5 h-5 text-sky-400" />
                      Match Settings
                    </h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Setup & Launch
                    </span>
                  </div>

                  {/* 3D Color Selector (Choose Side) */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-200">Choose Side:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'white', label: '♔ White', style: 'border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 text-slate-950 font-black shadow-md border-b-4 border-b-slate-400' },
                        { id: 'black', label: '♚ Black', style: 'border-slate-700 bg-gradient-to-b from-slate-800 to-slate-950 text-white font-black shadow-md border-b-4 border-b-slate-950' },
                        { id: 'random', label: '🎲 Random', style: 'border-amber-600 bg-gradient-to-b from-amber-500 to-amber-600 text-white font-black shadow-md border-b-4 border-b-amber-700' },
                      ].map((c) => {
                        const isSelected = selectedColor === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedColor(c.id as any);
                            }}
                            className={`py-2.5 text-xs font-black rounded-xl border transition-all select-none active:translate-y-0.5 ${
                              isSelected
                                ? `${c.style} ring-2 ring-amber-400 scale-[1.02]`
                                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white border-b-2 border-b-slate-800'
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3D Time Control Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-200">Time Control:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '10+0', label: '10+0 (Blitz)' },
                        { id: '10+5', label: '10+5 (Rapid)' },
                        { id: '15+10', label: '15+10 (Rapid)' },
                        { id: '5+0', label: '5+0 (Speed)' },
                        { id: 'unlimited', label: 'Unlimited ♾️' },
                      ].map((tc) => {
                        const isSelected = selectedTimeControl === tc.id;
                        return (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedTimeControl(tc.id as any);
                            }}
                            className={`py-2 px-2.5 text-xs font-black rounded-xl border transition-all select-none active:translate-y-0.5 ${
                              isSelected
                                ? 'border-emerald-400 bg-gradient-to-b from-emerald-500/25 to-emerald-950/40 text-emerald-200 ring-2 ring-emerald-400/80 border-b-2 border-b-emerald-600 shadow-md shadow-emerald-500/20'
                                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white border-b-2 border-b-slate-800'
                            }`}
                          >
                            {tc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3D AI Bot Personality Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                        <span>🎭</span> AI Bot Personality:
                      </label>
                      <span className="text-[10px] font-mono text-amber-400 font-black bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedPersonalityId(p.id);
                              try { playChessSound('move'); } catch {}
                              const sample = getRandomPersonalityQuote(p.id, 'greeting');
                              setBotDialogue(sample);
                              if (voiceNarrationOn) {
                                speakCoachAdvice(sample, { pitch: p.pitch, rate: p.rate, force: true });
                              }
                            }}
                            className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden select-none active:translate-y-0.5 ${
                              isSelected
                                ? 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-amber-950/30 text-white ring-2 ring-amber-400/80 shadow-md shadow-amber-500/20 border-b-2 border-b-amber-600'
                                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white border-b-2 border-b-slate-800'
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

                  {/* 3D Boss Battle Mode Switch */}
                  <div className="flex items-center justify-between bg-slate-950/90 p-3 rounded-xl border border-slate-800/90 shadow-inner">
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>⚔️</span> Boss Battle Mode
                      </div>
                      <div className="text-[10px] text-slate-400">Animated HP bars, combat hits, and loot chest</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setBossBattleMode((prev) => !prev);
                      }}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all select-none active:translate-y-0.5 ${
                        bossBattleMode
                          ? 'border-amber-400 bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30 border-b-2 border-b-amber-700'
                          : 'border-slate-800 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {bossBattleMode ? 'ENABLED ⚡' : 'OFF'}
                    </button>
                  </div>

                  {/* 3D Board Theme Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-200">Board Theme:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BOARD_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedThemeId(theme.id);
                          }}
                          className={`py-2 px-2.5 text-xs font-black rounded-xl border transition-all flex items-center justify-between select-none active:translate-y-0.5 ${
                            selectedThemeId === theme.id
                              ? 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-amber-950/30 text-white ring-2 ring-amber-400/80 border-b-2 border-b-amber-600 shadow-md'
                              : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white border-b-2 border-b-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{theme.icon}</span>
                            <span className="text-[11px]">{theme.name}</span>
                          </span>
                          <span className="flex gap-0.5">
                            <span className="w-2.5 h-2.5 rounded-sm border border-black/30 shadow-sm" style={{ backgroundColor: theme.lightSquare }} />
                            <span className="w-2.5 h-2.5 rounded-sm border border-black/30 shadow-sm" style={{ backgroundColor: theme.darkSquare }} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3D Other Options / Advanced Match Rules Drawer */}
                  <div className="space-y-2 border-t border-slate-800/80 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedOptions((prev) => !prev)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 text-xs font-black text-slate-300 transition-all select-none shadow-sm active:translate-y-0.5"
                    >
                      <span className="flex items-center gap-2">
                        <span>⚙️</span>
                        <span>Other Options & Match Rules</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {showAdvancedOptions ? '▲ Hide Options' : '▼ Expand Options'}
                      </span>
                    </button>

                    {showAdvancedOptions && (
                      <div className="space-y-3 bg-slate-950/95 border border-slate-800/90 rounded-xl p-3.5 animate-in fade-in zoom-in-95 duration-200 shadow-inner">
                        {/* Hint Allowance */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                            <span>💡 Coach Hint Allowance:</span>
                            <span className="text-amber-400 font-mono text-[10px]">
                              {hintAllowanceOption === '3' ? '3 Hints (Standard)' : hintAllowanceOption === '5' ? '5 Hints (Guided)' : hintAllowanceOption === 'unlimited' ? 'Unlimited ♾️' : '0 Hints (Hardcore)'}
                            </span>
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { id: '3', label: '3 Hints' },
                              { id: '5', label: '5 Hints' },
                              { id: 'unlimited', label: 'Unlimited ♾️' },
                              { id: '0', label: '0 (Hardcore)' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setHintAllowanceOption(opt.id as any)}
                                className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                  hintAllowanceOption === opt.id
                                    ? 'border-amber-400 bg-amber-500/20 text-white font-black shadow-sm'
                                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Piece Odds / Handicap */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                            <span>⚖️ Practice Handicap / Odds:</span>
                            <span className="text-emerald-400 font-mono text-[10px]">
                              {handicapOption === 'equal' ? 'Equal Material' : handicapOption === 'pawn_odds' ? '+Pawn Odds' : '+Knight Odds'}
                            </span>
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'equal', label: 'Equal (Normal)' },
                              { id: 'pawn_odds', label: '+Pawn Odds' },
                              { id: 'knight_odds', label: '+Knight Odds' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setHandicapOption(opt.id as any)}
                                className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                  handicapOption === opt.id
                                    ? 'border-emerald-400 bg-emerald-500/20 text-white font-black shadow-sm'
                                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Takebacks & Bot Banter */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Takebacks / Undo:</label>
                            <button
                              type="button"
                              onClick={() => setTakebackAllowed((v) => !v)}
                              className={`w-full py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                takebackAllowed
                                  ? 'border-sky-500/50 bg-sky-500/20 text-sky-300 font-black'
                                  : 'border-slate-800 bg-slate-900 text-slate-400'
                              }`}
                            >
                              {takebackAllowed ? 'Allowed (Friendly)' : 'Strict (Tournament)'}
                            </button>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">Bot In-Game Chat:</label>
                            <button
                              type="button"
                              onClick={() => setBotChatterOption((c) => c === 'active' ? 'quiet' : 'active')}
                              className={`w-full py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                botChatterOption === 'active'
                                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-black'
                                  : 'border-slate-800 bg-slate-900 text-slate-400'
                              }`}
                            >
                              {botChatterOption === 'active' ? 'Active (💬 Fun)' : 'Quiet (🤫 Muted)'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3D Giant High-Impact START MATCH Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e: any) => {
                      e?.preventDefault?.();
                      e?.stopPropagation?.();
                      handleStartGame();
                    }}
                    disabled={isStartingGame}
                    className="w-full py-4 px-6 text-sm sm:text-base font-black uppercase tracking-widest text-white bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 border-b-4 border-amber-700 rounded-2xl shadow-xl shadow-amber-500/40 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-xl group-hover:scale-125 transition-transform duration-200">🚀</span>
                    <span>{isStartingGame ? 'LAUNCHING ARENA...' : 'START MATCH'}</span>
                  </button>
                </div>
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

                      {/* Voice Narration Quick Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const next = !voiceNarrationOn;
                          setVoiceNarrationOn(next);
                          setCoachVoiceEnabled(next);
                          if (next) {
                            speakCoachAdvice('Voice active!', { force: true });
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition-all flex items-center gap-1 ${
                          voiceNarrationOn
                            ? 'bg-amber-500/25 border-amber-500 text-amber-300 ring-1 ring-amber-400/50 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle AI Coach Voice Commentary"
                      >
                        <span>{voiceNarrationOn ? '🗣️' : '🔇'}</span>
                        <span>{voiceNarrationOn ? 'Voice ON' : 'Muted'}</span>
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

                  {/* 👨‍🏫 ChessHub Academy Coach Avatar & Educational Dialogue */}
                  <div className="space-y-3">
                    <ChessCoachAvatar
                      state={
                        isBotThinking
                          ? 'thinking'
                          : gameStatus === 'completed'
                          ? 'completed'
                          : remainingHints < 3
                          ? 'hint'
                          : 'puzzle_start'
                      }
                      customMessage={
                        coachTipDialogue ||
                        botDialogue ||
                        "Calculate your moves carefully and control the center!"
                      }
                    />

                    {/* Audio Feedback Controls Pill */}
                    <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-400">Audio Feedback:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const next = !voiceNarrationOn;
                            setVoiceNarrationOn(next);
                            setCoachVoiceEnabled(next);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                            voiceNarrationOn
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                          title="Toggle Coach Voice Narration"
                        >
                          <span>{voiceNarrationOn ? '🔊 Voice ON' : '🔇 Voice OFF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const next = !soundOn;
                            setSoundOn(next);
                            setChessSoundEnabled(next);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                            soundOn
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                          title="Toggle Move Sound Effects"
                        >
                          <span>{soundOn ? '🎵 SFX ON' : '🔇 SFX OFF'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

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

                    {/* Takeback / Undo Move Button (Match Rules) */}
                    <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-base">↩️</span>
                        <div>
                          <div className="font-extrabold text-white text-xs">Takeback / Undo</div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {takebackAllowed ? 'Revert last move & calculate anew' : 'Strict Tournament Mode (Off)'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!takebackAllowed || moveHistory.length === 0 || isBotThinking || gameStatus !== 'active'}
                        onClick={handleTakeback}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-black transition-all disabled:opacity-40 cursor-pointer select-none active:translate-y-0.5"
                        title={takebackAllowed ? 'Take back last move' : 'Takebacks disabled'}
                      >
                        {takebackAllowed ? 'Undo Move ↩️' : 'Strict 🔒'}
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

      {/* TAB: TACTICAL QUESTS (10 INTERACTIVE CHALLENGES) */}
      {activeTab === 'quests' && (
        <TacticalQuestArena
          voiceEnabled={voiceNarrationOn}
          soundEnabled={soundOn}
          onXpEarned={(xp) => {
            setProfile((prev) =>
              prev ? { ...prev, training_points: (prev.training_points || 0) + xp } : null
            );
          }}
        />
      )}

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

      {/* TAB: ACADEMY LEADERBOARD ("Lider Bora") */}
      {activeTab === 'leaderboard' && (() => {
        const studentRating = profile?.rating || 400;
        const maxBotBeaten = Math.max(...Array.from(unlockedSet), 1);

        const rawPeers = [
          {
            name: 'Aarav Sharma',
            rating: 1420,
            points: 2840,
            weeklyPoints: 520,
            streak: 14,
            bossLevel: 7,
            badges: 12,
            avatar: '👑',
            title: 'Grandmaster Slayer',
            winRate: 82,
            rankDelta: '+2',
            isYou: false,
          },
          {
            name: 'Ananya Roy',
            rating: 1280,
            points: 2310,
            weeklyPoints: 410,
            streak: 11,
            bossLevel: 6,
            badges: 9,
            avatar: '🎖️',
            title: 'Tactics Prodigy',
            winRate: 75,
            rankDelta: '+1',
            isYou: false,
          },
          {
            name: 'Vihaan Patel',
            rating: 1150,
            points: 1890,
            weeklyPoints: 340,
            streak: 8,
            bossLevel: 5,
            badges: 8,
            avatar: '🏅',
            title: 'Endgame Master',
            winRate: 69,
            rankDelta: '0',
            isYou: false,
          },
          {
            name: 'You (Current Student)',
            rating: studentRating,
            points: userTrainingPoints,
            weeklyPoints: Math.min(userTrainingPoints, 290),
            streak: streakCount,
            bossLevel: maxBotBeaten,
            badges: badges.length,
            avatar: '🛡️',
            title: maxBotBeaten >= 6 ? 'Arena Conqueror' : maxBotBeaten >= 3 ? 'Knight Hunter' : 'Aspiring Master',
            winRate: Math.round(((profile?.wins || 0) / Math.max(1, profile?.games_played || 0)) * 100) || 50,
            rankDelta: '+1',
            isYou: true,
          },
          {
            name: 'Rohan Gupta',
            rating: 780,
            points: 1120,
            weeklyPoints: 210,
            streak: 5,
            bossLevel: 3,
            badges: 6,
            avatar: '♟️',
            title: 'Opening Explorer',
            winRate: 58,
            rankDelta: '-1',
            isYou: false,
          },
          {
            name: 'Sara Khan',
            rating: 650,
            points: 840,
            weeklyPoints: 175,
            streak: 4,
            bossLevel: 2,
            badges: 4,
            avatar: '♞',
            title: 'Tactical Striker',
            winRate: 52,
            rankDelta: '0',
            isYou: false,
          },
          {
            name: 'Kabir Verma',
            rating: 520,
            points: 560,
            weeklyPoints: 120,
            streak: 2,
            bossLevel: 1,
            badges: 3,
            avatar: '♝',
            title: 'Rising Challenger',
            winRate: 46,
            rankDelta: '-1',
            isYou: false,
          },
          {
            name: 'Meera Nair',
            rating: 490,
            points: 440,
            weeklyPoints: 95,
            streak: 3,
            bossLevel: 1,
            badges: 3,
            avatar: '⚔️',
            title: 'Puzzle Solver',
            winRate: 48,
            rankDelta: '+3',
            isYou: false,
          },
        ];

        // Base peers list from server or enhanced mock data
        const basePeers = (livePeers && livePeers.length > 0)
          ? livePeers.map((p, idx) => ({
              name: p.name,
              rating: p.rating,
              points: (p as any).training_points ?? p.rating * 2,
              weeklyPoints: Math.round(((p as any).training_points ?? p.rating * 2) * 0.25),
              streak: p.streak || 1,
              bossLevel: p.botLevel || 1,
              badges: p.badges || Math.max(1, Math.floor(p.rating / 100)),
              avatar: p.avatar || '🛡️',
              title: (p as any).title || 'Academy Scholar',
              winRate: (p as any).winRate || 60,
              rankDelta: idx === 0 ? '+2' : idx === 1 ? '+1' : '0',
              isYou: p.isYou || false,
            }))
          : rawPeers;

        // Sort peers dynamically by selected leaderboard metric
        const sortedPeers = [...basePeers].sort((a, b) => {
          if (leaderboardMetric === 'points') {
            const valA = leaderboardTimeframe === 'weekly' ? a.weeklyPoints : a.points;
            const valB = leaderboardTimeframe === 'weekly' ? b.weeklyPoints : b.points;
            return valB - valA;
          }
          if (leaderboardMetric === 'rating') return b.rating - a.rating;
          if (leaderboardMetric === 'streak') return b.streak - a.streak;
          if (leaderboardMetric === 'boss') return b.bossLevel - a.bossLevel;
          if (leaderboardMetric === 'badges') return b.badges - a.badges;
          return 0;
        }).map((p, idx) => ({ ...p, rank: idx + 1 }));

        // Filter by search query
        const filteredPeers = sortedPeers.filter(
          (p) =>
            p.name.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
            p.title.toLowerCase().includes(leaderboardSearch.toLowerCase())
        );

        const yourEntry = sortedPeers.find((p) => p.isYou) || sortedPeers[0];
        const peerAhead = sortedPeers.find((p) => p.rank === yourEntry.rank - 1);
        const pointsDiffAhead = peerAhead
          ? (leaderboardMetric === 'points'
              ? (leaderboardTimeframe === 'weekly' ? peerAhead.weeklyPoints - yourEntry.weeklyPoints : peerAhead.points - yourEntry.points)
              : peerAhead.rating - yourEntry.rating)
          : 0;

        const topThree = [sortedPeers[1], sortedPeers[0], sortedPeers[2]].filter(Boolean);

        return (
          <div className="space-y-6">
            {/* Leaderboard Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative overflow-hidden">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-1/4 w-80 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-2xl animate-bounce">🏆</span>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    ChessHub Academy Standings
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ● Live Season
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Student Training Leaderboard</h2>
                <p className="text-xs text-slate-300 max-w-xl">
                  Compete with fellow academy peers across Training Points, Elo rating, daily streaks, and bot conquests!
                </p>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end relative z-10">
                {/* Your Live Standing Card */}
                <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-amber-500/30 border border-amber-400/50">
                    #{yourEntry.rank}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <span>Your Rank</span>
                      <span className="text-emerald-400 font-black">{yourEntry.rankDelta}</span>
                    </div>
                    <div className="text-xs font-black text-white">Student (You)</div>
                    <div className="text-[10px] font-mono text-amber-400 font-bold">
                      {leaderboardMetric === 'points'
                        ? `${yourEntry.points} TP`
                        : leaderboardMetric === 'rating'
                        ? `${yourEntry.rating} Elo`
                        : leaderboardMetric === 'streak'
                        ? `🔥 ${yourEntry.streak}d`
                        : `Lvl ${yourEntry.bossLevel} Bot`}
                    </div>
                  </div>
                </div>

                <Link
                  href="/dashboard/student/leaderboard"
                  className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25 flex items-center gap-1.5 shrink-0 active:translate-y-0.5"
                >
                  <span className="hidden sm:inline">Full Leaderboard Hub</span>
                  <span className="sm:hidden">Full Hub</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* Overtake Challenge Notification Bar (if not rank #1) */}
            {peerAhead && pointsDiffAhead > 0 && (
              <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-xl animate-pulse">⚡</span>
                  <div>
                    <span className="text-slate-300 font-bold">Next Milestone: </span>
                    <span className="text-white font-black">
                      Need <strong className="text-amber-400 font-mono">+{pointsDiffAhead} {leaderboardMetric === 'points' ? 'TP' : 'pts'}</strong> to overtake #{peerAhead.rank} {peerAhead.name}!
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Win your next bot battle to earn +75 TP or solve puzzle quests to climb!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('play')}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl shadow-md shadow-amber-500/20 active:translate-y-0.5 transition-all shrink-0 cursor-pointer"
                >
                  Battle Bot (+75 TP) ⚔️
                </button>
              </div>
            )}

            {/* Metric Selector Tabs & Timeframe Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Metric Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { id: 'points', label: '⚡ Training Points', icon: '⚡' },
                  { id: 'rating', label: '⭐ Elo Rating', icon: '⭐' },
                  { id: 'streak', label: '🔥 Daily Streak', icon: '🔥' },
                  { id: 'boss', label: '👑 Bots Conquered', icon: '👑' },
                  { id: 'badges', label: '🏆 Badges', icon: '🏆' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLeaderboardMetric(m.id as any)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all whitespace-nowrap active:translate-y-0.5 cursor-pointer ${
                      leaderboardMetric === m.id
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 border-b-2 border-amber-700'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Timeframe Toggle & Search */}
              <div className="flex items-center gap-2">
                {/* Timeframe Switch */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLeaderboardTimeframe('all_time')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                      leaderboardTimeframe === 'all_time'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    All-Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardTimeframe('weekly')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                      leaderboardTimeframe === 'weekly'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Weekly ⚡
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 md:w-48">
                  <input
                    type="text"
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full py-1.5 pl-7 pr-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">🔍</span>
                </div>
              </div>
            </div>

            {/* 3D GRAND CHAMPIONS PODIUM (TOP 3) */}
            {topThree.length >= 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 items-end">
                {/* 2nd Place: Silver Prodigy (Left) */}
                <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-400/40 rounded-3xl p-5 text-center flex flex-col items-center justify-between space-y-3 shadow-xl relative order-2 sm:order-1 hover:scale-[1.02] transition-transform">
                  <div className="text-3xl filter drop-shadow">🥈</div>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl border-4 border-slate-400/60 shadow-lg shadow-slate-400/20">
                      {topThree[0].avatar}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-slate-800 text-slate-300 font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full border border-slate-600">
                      #2
                    </span>
                  </div>

                  <div>
                    <div className="font-black text-sm text-white flex items-center justify-center gap-1">
                      <span>{topThree[0].name}</span>
                      {topThree[0].isYou && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-black uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">{topThree[0].title}</div>
                    <div className="text-base font-black font-mono text-slate-200 mt-1">
                      {leaderboardMetric === 'points'
                        ? `${topThree[0].points} TP`
                        : leaderboardMetric === 'rating'
                        ? `${topThree[0].rating} Elo`
                        : leaderboardMetric === 'streak'
                        ? `🔥 ${topThree[0].streak}d`
                        : `Lvl ${topThree[0].bossLevel}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setComparisonPeer(topThree[0])}
                    className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Compare Stats 📊
                  </button>
                </div>

                {/* 1st Place: Gold Academy Champion (Center, Elevated) */}
                <div className="bg-gradient-to-b from-slate-900 via-amber-950/50 to-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 text-center flex flex-col items-center justify-between space-y-3.5 shadow-2xl shadow-amber-500/20 relative order-1 sm:order-2 sm:-translate-y-2 hover:scale-[1.03] transition-transform">
                  {/* Glowing Aura Ring */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="text-4xl animate-bounce filter drop-shadow-md">👑</div>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/40 border-4 border-amber-300">
                      {topThree[1].avatar}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-mono text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 shadow-md">
                      #1
                    </span>
                  </div>

                  <div>
                    <div className="font-black text-base text-white flex items-center justify-center gap-1.5">
                      <span>{topThree[1].name}</span>
                      {topThree[1].isYou && (
                        <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black uppercase shadow-sm">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-amber-300">{topThree[1].title}</div>
                    <div className="text-xl font-black font-mono text-amber-400 mt-1 drop-shadow-sm">
                      {leaderboardMetric === 'points'
                        ? `${topThree[1].points} TP`
                        : leaderboardMetric === 'rating'
                        ? `${topThree[1].rating} Elo`
                        : leaderboardMetric === 'streak'
                        ? `🔥 ${topThree[1].streak}d`
                        : `Lvl ${topThree[1].bossLevel}`}
                    </div>
                    <div className="text-[10px] text-amber-200/80 font-mono">
                      🔥 {topThree[1].streak}d streak · {topThree[1].badges} Badges
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setComparisonPeer(topThree[1])}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/30 transition-all cursor-pointer"
                  >
                    Compare Stats 📊
                  </button>
                </div>

                {/* 3rd Place: Bronze Tactician (Right) */}
                <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-800/50 rounded-3xl p-5 text-center flex flex-col items-center justify-between space-y-3 shadow-xl relative order-3 hover:scale-[1.02] transition-transform">
                  <div className="text-3xl filter drop-shadow">🥉</div>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl border-4 border-amber-700/60 shadow-lg shadow-amber-900/20">
                      {topThree[2].avatar}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-amber-950 text-amber-400 font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-700">
                      #3
                    </span>
                  </div>

                  <div>
                    <div className="font-black text-sm text-white flex items-center justify-center gap-1">
                      <span>{topThree[2].name}</span>
                      {topThree[2].isYou && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-black uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">{topThree[2].title}</div>
                    <div className="text-base font-black font-mono text-amber-500 mt-1">
                      {leaderboardMetric === 'points'
                        ? `${topThree[2].points} TP`
                        : leaderboardMetric === 'rating'
                        ? `${topThree[2].rating} Elo`
                        : leaderboardMetric === 'streak'
                        ? `🔥 ${topThree[2].streak}d`
                        : `Lvl ${topThree[2].bossLevel}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setComparisonPeer(topThree[2])}
                    className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Compare Stats 📊
                  </button>
                </div>
              </div>
            )}

            {/* FULL STUDENT ACADEMY ROSTER TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Full Student Academy Roster</h3>
                  <p className="text-xs text-slate-400">
                    Showing {filteredPeers.length} ranked academy students · Sorted by {leaderboardMetric.toUpperCase()}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {leaderboardTimeframe === 'weekly' ? '⚡ Weekly Season' : '🌟 All-Time'}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Student & Title</th>
                      <th className="p-3 font-black text-amber-400">
                        {leaderboardMetric === 'points'
                          ? '⚡ Training Points'
                          : leaderboardMetric === 'rating'
                          ? '⭐ Elo Rating'
                          : leaderboardMetric === 'streak'
                          ? '🔥 Streak'
                          : leaderboardMetric === 'boss'
                          ? '👑 Bot Beaten'
                          : '🏆 Badges'}
                      </th>
                      <th className="p-3">ChessHub Rating</th>
                      <th className="p-3">Streak</th>
                      <th className="p-3">Max Bot</th>
                      <th className="p-3">Badges</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredPeers.map((student) => (
                      <tr
                        key={student.rank + student.name}
                        className={`transition-colors ${
                          student.isYou
                            ? 'bg-amber-500/10 border-l-4 border-amber-500 font-bold'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Rank */}
                        <td className="p-3 font-black text-sm">
                          <div className="flex items-center gap-1.5">
                            <span>
                              {student.rank === 1
                                ? '🥇'
                                : student.rank === 2
                                ? '🥈'
                                : student.rank === 3
                                ? '🥉'
                                : `#${student.rank}`}
                            </span>
                            <span
                              className={`text-[9px] font-mono ${
                                student.rankDelta.startsWith('+')
                                  ? 'text-emerald-400 font-bold'
                                  : student.rankDelta.startsWith('-')
                                  ? 'text-rose-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {student.rankDelta}
                            </span>
                          </div>
                        </td>

                        {/* Student Name & Title */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">{student.avatar}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-black ${student.isYou ? 'text-amber-300' : 'text-white'}`}>
                                  {student.name}
                                </span>
                                {student.isYou && (
                                  <span className="text-[8px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black uppercase">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block">{student.title}</span>
                            </div>
                          </div>
                        </td>

                        {/* Selected Metric (Highlighted) */}
                        <td className="p-3 font-mono font-black text-sm text-amber-400">
                          {leaderboardMetric === 'points'
                            ? `${leaderboardTimeframe === 'weekly' ? student.weeklyPoints : student.points} TP`
                            : leaderboardMetric === 'rating'
                            ? `${student.rating} Elo`
                            : leaderboardMetric === 'streak'
                            ? `${student.streak} days`
                            : leaderboardMetric === 'boss'
                            ? `Level ${student.bossLevel}`
                            : `${student.badges} Crests`}
                        </td>

                        {/* Elo Rating */}
                        <td className="p-3 font-mono font-bold text-slate-300">{student.rating}</td>

                        {/* Streak */}
                        <td className="p-3 font-bold text-slate-300">
                          <span className="flex items-center gap-1">
                            <span>🔥</span>
                            <span>{student.streak}d</span>
                          </span>
                        </td>

                        {/* Max Bot */}
                        <td className="p-3 font-bold text-slate-300">
                          Level {student.bossLevel} ({BOT_LEVELS.find((b) => b.level === student.bossLevel)?.name.replace(/Level \d+ — /, '')})
                        </td>

                        {/* Badges */}
                        <td className="p-3 font-mono font-bold text-purple-300">
                          {student.badges} 🛡️
                        </td>

                        {/* Action: Compare */}
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setComparisonPeer(student)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer shadow-sm active:translate-y-0.5"
                          >
                            Compare 📊
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HEAD-TO-HEAD COMPARISON MODAL */}
            {comparisonPeer && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-center relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⚔️</span>
                      <h3 className="text-base font-black text-white">Head-to-Head Comparison</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComparisonPeer(null)}
                      className="text-slate-400 hover:text-white text-xs font-bold"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Two Cards Face-Off */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    {/* You */}
                    <div className="bg-slate-950/80 border-2 border-amber-500/40 rounded-2xl p-4 text-center space-y-1.5">
                      <div className="text-3xl">{yourEntry.avatar}</div>
                      <div className="text-xs font-black text-amber-300">Student (You)</div>
                      <div className="text-[10px] text-slate-400">{yourEntry.title}</div>
                      <span className="inline-block text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-black">
                        Rank #{yourEntry.rank}
                      </span>
                    </div>

                    {/* Peer */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center space-y-1.5">
                      <div className="text-3xl">{comparisonPeer.avatar}</div>
                      <div className="text-xs font-black text-white">{comparisonPeer.name}</div>
                      <div className="text-[10px] text-slate-400">{comparisonPeer.title}</div>
                      <span className="inline-block text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-black">
                        Rank #{comparisonPeer.rank}
                      </span>
                    </div>
                  </div>

                  {/* Stat Comparison Bars */}
                  <div className="space-y-3 text-left text-xs">
                    {[
                      { label: '⚡ Training Points', valA: yourEntry.points, valB: comparisonPeer.points, unit: 'TP' },
                      { label: '⭐ Elo Rating', valA: yourEntry.rating, valB: comparisonPeer.rating, unit: 'Elo' },
                      { label: '🔥 Daily Streak', valA: yourEntry.streak, valB: comparisonPeer.streak, unit: 'days' },
                      { label: '👑 Bot Conquered', valA: yourEntry.bossLevel, valB: comparisonPeer.bossLevel, unit: 'Lvl' },
                      { label: '🏆 Badges Unlocked', valA: yourEntry.badges, valB: comparisonPeer.badges, unit: 'badges' },
                    ].map((s) => {
                      const total = Math.max(1, s.valA + s.valB);
                      const pctA = Math.round((s.valA / total) * 100);
                      const isWinning = s.valA >= s.valB;

                      return (
                        <div key={s.label} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={isWinning ? 'text-amber-400' : 'text-slate-300'}>
                              {s.valA} {s.unit}
                            </span>
                            <span className="text-slate-400 text-[10px] uppercase font-extrabold">{s.label}</span>
                            <span className={!isWinning ? 'text-emerald-400' : 'text-slate-300'}>
                              {s.valB} {s.unit}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500"
                              style={{ width: `${pctA}%` }}
                            />
                            <div
                              className="h-full bg-slate-600 transition-all duration-500"
                              style={{ width: `${100 - pctA}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      onClick={() => {
                        setComparisonPeer(null);
                        setSelectedLevel(comparisonPeer.bossLevel);
                        setActiveTab('play');
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      Battle Bot Level {comparisonPeer.bossLevel} ⚔️
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setComparisonPeer(null)}
                      className="py-3 px-4 text-xs font-bold text-slate-300 border-slate-800 hover:bg-slate-800"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
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

      {/* TAB 5: ACHIEVEMENTS & TROPHY BADGES (105 ACHIEVEMENTS) */}
      {activeTab === 'badges' && (() => {
        const achievementContext: AchievementContext = {
          profile,
          recentGames,
          quizScore,
          streakCount,
          adventureHistory,
          puzzlesSolvedCount: profile?.puzzles_solved ?? 0,
        };

        const allEvaluated = TROPHY_ACHIEVEMENTS.map((ach) => ({
          ...ach,
          isUnlocked: ach.checkUnlocked(achievementContext),
        }));

        const totalCount = allEvaluated.length;
        const unlockedTotal = allEvaluated.filter((c) => c.isUnlocked).length;
        const totalPossibleXp = allEvaluated.reduce((acc, c) => acc + c.xpReward, 0);
        const totalEarnedXp = allEvaluated.filter((c) => c.isUnlocked).reduce((acc, c) => acc + c.xpReward, 0);
        const unlockPct = Math.round((unlockedTotal / Math.max(1, totalCount)) * 100);

        // Category counts
        const getCatCounts = (cat: AchievementCategory) => {
          const items = allEvaluated.filter((c) => c.category === cat);
          return {
            total: items.length,
            unlocked: items.filter((c) => c.isUnlocked).length,
          };
        };

        const milestoneCounts = getCatCounts('milestones');
        const tierCounts = getCatCounts('tiers');
        const pieceCounts = getCatCounts('pieces');
        const puzzleCounts = getCatCounts('puzzles');
        const openingCounts = getCatCounts('openings');
        const secretCounts = getCatCounts('secret');

        // Filter logic
        const filteredAchievements = allEvaluated.filter((ach) => {
          // Category filter
          if (badgeCategoryFilter !== 'all' && ach.category !== badgeCategoryFilter) {
            return false;
          }
          // Status filter
          if (badgeStatusFilter === 'unlocked' && !ach.isUnlocked) {
            return false;
          }
          if (badgeStatusFilter === 'locked' && ach.isUnlocked) {
            return false;
          }
          // Rarity filter
          if (badgeRarityFilter !== 'all' && ach.rarity !== badgeRarityFilter) {
            return false;
          }
          // Search query
          if (badgeSearchQuery.trim()) {
            const q = badgeSearchQuery.toLowerCase();
            const matchTitle = ach.title.toLowerCase().includes(q);
            const matchDesc = ach.desc.toLowerCase().includes(q);
            const matchCategory = ach.category.toLowerCase().includes(q);
            const matchRarity = ach.rarity.toLowerCase().includes(q);
            if (!matchTitle && !matchDesc && !matchCategory && !matchRarity) {
              return false;
            }
          }
          return true;
        });

        const getMasteryRank = (pct: number) => {
          if (pct >= 90) return { title: 'Grandmaster Champion', color: 'text-amber-400', icon: '👑' };
          if (pct >= 60) return { title: 'Master Virtuoso', color: 'text-purple-400', icon: '💎' };
          if (pct >= 30) return { title: 'Adept Knight', color: 'text-cyan-400', icon: '⚔️' };
          if (pct >= 10) return { title: 'Apprentice Scholar', color: 'text-emerald-400', icon: '📜' };
          return { title: 'Academy Novice', color: 'text-slate-400', icon: '♟️' };
        };

        const rank = getMasteryRank(unlockPct);

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Header & Main Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl shadow-lg shadow-amber-500/10">
                    🏆
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                      Academy Trophy Showcase
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {unlockedTotal} / {totalCount} Unlocked
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Earn 100+ prestigious academy crests across milestones, difficulty tiers, piece mastery, puzzles, openings, and secret achievements!
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2 max-w-xl">
                  <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span>Showcase Progress</span>
                      <span className="text-white font-bold">{unlockPct}% Complete</span>
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${rank.color}`}>
                      <span>{rank.icon}</span>
                      <span>{rank.title}</span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5 relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-700 shadow-md shadow-amber-500/30"
                      style={{ width: `${Math.max(3, unlockPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unlocked</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5">{unlockedTotal}</div>
                  <div className="text-[10px] text-slate-500">of {totalCount} badges</div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">XP Earned</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">+{totalEarnedXp}</div>
                  <div className="text-[10px] text-slate-500">of {totalPossibleXp} XP</div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion</div>
                  <div className="text-xl font-black text-cyan-400 mt-0.5">{unlockPct}%</div>
                  <div className="text-[10px] text-slate-500">overall mastery</div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining</div>
                  <div className="text-xl font-black text-slate-300 mt-0.5">{totalCount - unlockedTotal}</div>
                  <div className="text-[10px] text-slate-500">to conquer</div>
                </div>
              </div>
            </div>

            {/* Filter Toolbar: Categories, Search & Filters */}
            <div className="space-y-3">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800">
                {[
                  { id: 'all', label: `All (${totalCount})` },
                  { id: 'milestones', label: `Milestones 🏆 (${milestoneCounts.unlocked}/${milestoneCounts.total})` },
                  { id: 'tiers', label: `Bot Tiers 🥇 (${tierCounts.unlocked}/${tierCounts.total})` },
                  { id: 'pieces', label: `Pieces ♞ (${pieceCounts.unlocked}/${pieceCounts.total})` },
                  { id: 'puzzles', label: `Puzzles 🧩 (${puzzleCounts.unlocked}/${puzzleCounts.total})` },
                  { id: 'openings', label: `Openings 📖 (${openingCounts.unlocked}/${openingCounts.total})` },
                  { id: 'secret', label: `Secrets ⚡ (${secretCounts.unlocked}/${secretCounts.total})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBadgeCategoryFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      badgeCategoryFilter === f.id
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Secondary Controls: Search, Status & Rarity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <DashboardIcon iconKey="search" className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={badgeSearchQuery}
                    onChange={(e) => setBadgeSearchQuery(e.target.value)}
                    placeholder="Search 105 achievements (e.g. Queen, Checkmate, Master)..."
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  />
                  {badgeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBadgeSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status and Rarity Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Toggle */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setBadgeStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        badgeStatusFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setBadgeStatusFilter('unlocked')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        badgeStatusFilter === 'unlocked' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      Unlocked ({unlockedTotal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBadgeStatusFilter('locked')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        badgeStatusFilter === 'locked' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Locked ({totalCount - unlockedTotal})
                    </button>
                  </div>

                  {/* Rarity Select */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
                    {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map((rarity) => (
                      <button
                        key={rarity}
                        type="button"
                        onClick={() => setBadgeRarityFilter(rarity)}
                        className={`px-2 py-1 rounded-md capitalize transition-all ${
                          badgeRarityFilter === rarity
                            ? rarity === 'legendary'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : rarity === 'epic'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : rarity === 'rare'
                              ? 'bg-cyan-600 text-white shadow-sm'
                              : 'bg-slate-800 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {rarity}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Showing Count Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing <strong className="text-white">{filteredAchievements.length}</strong> of {totalCount} achievements
                {badgeCategoryFilter !== 'all' && (
                  <span className="text-amber-400 ml-1">in {badgeCategoryFilter}</span>
                )}
                {badgeSearchQuery && (
                  <span className="text-cyan-400 ml-1">matching "{badgeSearchQuery}"</span>
                )}
              </span>
              {(badgeCategoryFilter !== 'all' || badgeSearchQuery || badgeRarityFilter !== 'all' || badgeStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setBadgeCategoryFilter('all');
                    setBadgeSearchQuery('');
                    setBadgeRarityFilter('all');
                    setBadgeStatusFilter('all');
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline text-xs"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            {/* Empty State */}
            {filteredAchievements.length === 0 && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
                <div className="text-4xl">🔍</div>
                <h3 className="text-sm font-bold text-white">No Achievements Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No trophies match your current filter and search criteria. Try clearing your search or switching categories!
                </p>
                <Button
                  onClick={() => {
                    setBadgeCategoryFilter('all');
                    setBadgeSearchQuery('');
                    setBadgeRarityFilter('all');
                    setBadgeStatusFilter('all');
                  }}
                  className="py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl"
                >
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Badges Grid (105 Trophies) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredAchievements.map((crest) => {
                // Determine styling based on rarity and unlocked status
                const isUnlocked = crest.isUnlocked;
                let rarityBorder = 'border-slate-800 bg-slate-950/60';
                let rarityBadge = 'bg-slate-800/70 text-slate-300 border-slate-700';

                if (crest.rarity === 'legendary') {
                  rarityBorder = isUnlocked
                    ? 'border-amber-400/70 bg-gradient-to-b from-amber-950/40 via-slate-950 to-amber-950/20 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40'
                    : 'border-amber-900/40 bg-slate-950/60 opacity-60 hover:opacity-90';
                  rarityBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                } else if (crest.rarity === 'epic') {
                  rarityBorder = isUnlocked
                    ? 'border-purple-500/60 bg-gradient-to-b from-purple-950/40 via-slate-950 to-purple-950/20 shadow-lg shadow-purple-500/15 ring-1 ring-purple-400/30'
                    : 'border-purple-900/40 bg-slate-950/60 opacity-60 hover:opacity-90';
                  rarityBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                } else if (crest.rarity === 'rare') {
                  rarityBorder = isUnlocked
                    ? 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/40 via-slate-950 to-cyan-950/20 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400/30'
                    : 'border-cyan-900/40 bg-slate-950/60 opacity-60 hover:opacity-90';
                  rarityBadge = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                } else {
                  rarityBorder = isUnlocked
                    ? 'border-slate-700 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-md shadow-slate-900/50'
                    : 'border-slate-800 bg-slate-950/60 opacity-55 hover:opacity-85';
                }

                return (
                  <div
                    key={crest.id}
                    className={`rounded-2xl border p-3.5 text-center flex flex-col justify-between space-y-2 transition-all duration-200 relative overflow-hidden group hover:scale-[1.02] ${rarityBorder}`}
                  >
                    {/* Top Ribbon: Rarity & XP */}
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                      <span className={`px-1.5 py-0.5 rounded border ${rarityBadge}`}>
                        {crest.rarity}
                      </span>
                      <span className="text-amber-400 font-extrabold flex items-center gap-0.5 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                        ⚡ +{crest.xpReward} XP
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="text-3xl my-1 group-hover:scale-110 transition-transform duration-200 select-none">
                      {crest.icon}
                    </div>

                    {/* Title & Desc */}
                    <div className="space-y-1 flex-1 flex flex-col justify-center">
                      <div className="font-extrabold text-xs text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {crest.title}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                        {crest.desc}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="pt-1.5 border-t border-slate-800/60">
                      {isUnlocked ? (
                        <span className="inline-flex items-center justify-center gap-1 w-full text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/10">
                          <span>✅</span> Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 w-full text-[10px] font-bold text-slate-400 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-full">
                          <span>🔒</span> Locked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {Array.isArray(analysisData.analysisSummary?.keyMoments) && analysisData.analysisSummary.keyMoments.length > 0 && (
                    <Button
                      onClick={() => handleStartPracticeMistakes(0)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 min-w-[140px]"
                    >
                      <span>🎯 Practice Mistakes ({analysisData.analysisSummary.keyMoments.length})</span>
                    </Button>
                  )}
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAnalysisModal(false);
                      setPracticeMistakeIndex(null);
                      setReplayAutoPlay(false);
                      handleStartGame();
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg min-w-[120px]"
                  >
                    🔄 Play Again
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAnalysisModal(false);
                      setPracticeMistakeIndex(null);
                      setReplayAutoPlay(false);
                      setInGame(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs min-w-[130px]"
                  >
                    🤖 Pick Another Bot
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
      {gatekeeperLockedLevel !== null && (() => {
        const targetBot = BOT_LEVELS.find((b) => b.level === gatekeeperLockedLevel);
        const requiredPts = BOT_UNLOCK_THRESHOLDS[gatekeeperLockedLevel] ?? (gatekeeperLockedLevel - 1) * 400;
        const ptsDiff = Math.max(0, requiredPts - userTrainingPoints);
        const canUnlockWithPoints = ptsDiff === 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center relative overflow-hidden">
              <div className="text-5xl animate-bounce">🔒</div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  Gatekeeper Challenge
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  Level {gatekeeperLockedLevel} is Locked!
                </h2>
                <p className="text-xs text-slate-400">
                  Unlock {targetBot?.name} using any of the mastery paths below:
                </p>
              </div>

              <div className="space-y-2.5 text-left text-xs">
                {/* Path 0 (PRIMARY): Training Points Unlock */}
                <div
                  className={`border rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all ${
                    canUnlockWithPoints
                      ? 'bg-gradient-to-b from-emerald-950/40 to-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <div className="font-extrabold text-white flex items-center gap-1.5">
                          <span>Primary Path: Training Points</span>
                          {canUnlockWithPoints && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-500/30 animate-pulse">
                              Ready to Unlock!
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Target: <strong className="text-amber-400 font-mono">{requiredPts} TP</strong> · You have: <strong className="text-white font-mono">{userTrainingPoints} TP</strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-400 shrink-0">
                      {Math.min(100, Math.round((userTrainingPoints / Math.max(1, requiredPts)) * 100))}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        canUnlockWithPoints
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/50'
                          : 'bg-gradient-to-r from-amber-500 to-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, (userTrainingPoints / Math.max(1, requiredPts)) * 100))}%` }}
                    />
                  </div>

                  {canUnlockWithPoints ? (
                    <button
                      type="button"
                      onClick={() => {
                        setProfile((prev) =>
                          prev
                            ? {
                                ...prev,
                                unlocked_levels: Array.from(
                                  new Set([...(prev.unlocked_levels || [1]), gatekeeperLockedLevel])
                                ),
                              }
                            : prev
                        );
                        setSelectedLevel(gatekeeperLockedLevel);
                        setGatekeeperLockedLevel(null);
                        setNewlyUnlockedBotLevel(gatekeeperLockedLevel);
                        try {
                          playChessSound('quiz_correct');
                        } catch {}
                      }}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:brightness-110 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/30 border border-emerald-400/50 flex items-center justify-center gap-2 animate-pulse cursor-pointer active:translate-y-0.5 transition-all"
                    >
                      <span>🔓</span>
                      <span>Unlock & Play Level {gatekeeperLockedLevel} Now! 🚀</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-amber-300/90 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      ⚡ Need <strong className="text-white font-mono">{ptsDiff} TP</strong> more! Earn points from bot matches (+75 TP for wins) or puzzle quests (+20 TP).
                    </div>
                  )}
                </div>

                {/* Path 1: Tactical Quiz Benchmark */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Path 1: Tactical Quiz Benchmark</div>
                    <p className="text-slate-400 text-[11px]">
                      Score 4/10 or more in Tactical Quests. Current score: <strong className="text-amber-400 font-mono">{quizScore}/10</strong>.
                    </p>
                  </div>
                </div>

                {/* Path 2: Boss Knockout Progression */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-xl">⚔️</span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Path 2: Boss Knockout Progression</div>
                    <p className="text-slate-400 text-[11px]">
                      Defeat Level {gatekeeperLockedLevel - 1} in a match to trigger auto-unlock.
                    </p>
                  </div>
                </div>

                {/* Path 3: Coach Master Key */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-xl">🔑</span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Path 3: Coach Master Key</div>
                    <p className="text-slate-400 text-[11px]">
                      Your coach can unlock this bot anytime from the coaching portal.
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
                  Solve Quests (+TP) 🎯
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
        );
      })()}

      {/* NEWLY UNLOCKED BOT CELEBRATION MODAL */}
      {newlyUnlockedBotLevel !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-400/80 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="text-5xl animate-bounce">🔓</div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                New Arena Challenger Unlocked!
              </span>
              <h3 className="text-xl font-black text-white">
                Level {newlyUnlockedBotLevel} — {BOT_LEVELS.find((b) => b.level === newlyUnlockedBotLevel)?.name.replace(/Level \d+ — /, '')}
              </h3>
              <p className="text-xs text-slate-300">
                You earned enough Training Points! Level {newlyUnlockedBotLevel} is now unlocked and ready for battle.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => {
                  setSelectedLevel(newlyUnlockedBotLevel);
                  setNewlyUnlockedBotLevel(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/30 cursor-pointer"
              >
                Play Level {newlyUnlockedBotLevel} Now ⚔️
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

