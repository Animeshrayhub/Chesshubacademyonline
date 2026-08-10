'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { supabase } from '@/utils/supabaseClient';
import { customChessPieces } from './ChessPieces';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import ClassroomBoardEditorDrawer from './ClassroomBoardEditorDrawer';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

const PlayBotBoardModal = dynamic(
  () => import('./PlayBotBoard'),
  { ssr: false }
);

import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import Button from '@/components/ui/Button';
import { assignCustomPositionHomeworkAction } from '@/actions/homework';


interface ChessWorkspaceProps {
  initialFen?: string;
  targetSolution?: string | string[];
  onMove?: (fen: string, pgn: string) => void;
  readOnly?: boolean;
  showEngine?: boolean;
  showMoveDots?: boolean;
  showCoordinates?: boolean;
  classId?: string;
  userRole?: 'admin' | 'coach' | 'student';
  spotlightedStudentId?: string | null;
  spotlightedStudentName?: string | null;
  userId?: string;
  isEditorOpen?: boolean;
  onToggleEditorOpen?: (open: boolean) => void;
}

interface StockfishLine {
  depth: number;
  score: string;
  pv: string;
  bestMove: string;
}

// react-chessboard v5 Arrow type: { startSquare, endSquare, color }
interface ChessBoardArrow {
  startSquare: string;
  endSquare: string;
  color: string;
}

interface BoardTheme {
  id: string;
  name: string;
  darkSquareColor: string;
  lightSquareColor: string;
  darkSquareTextColor: string;
  lightSquareTextColor: string;
  backgroundImage?: string;
}

const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic-wood',
    name: 'Classic Wood 🪵',
    darkSquareColor: 'transparent',
    lightSquareColor: 'transparent',
    darkSquareTextColor: '#f0d9b5',
    lightSquareTextColor: '#b58863',
    backgroundImage: "url('https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png')",
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze 🌊',
    darkSquareColor: '#4b7399',
    lightSquareColor: '#eae9d2',
    darkSquareTextColor: '#eae9d2',
    lightSquareTextColor: '#4b7399'
  },
  {
    id: 'forest-moss',
    name: 'Forest Moss 🌲',
    darkSquareColor: '#769656',
    lightSquareColor: '#eeeed2',
    darkSquareTextColor: '#eeeed2',
    lightSquareTextColor: '#769656'
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon ⚡',
    darkSquareColor: '#1a1a2e',
    lightSquareColor: '#16213e',
    darkSquareTextColor: '#0f3460',
    lightSquareTextColor: '#e94560'
  },
  {
    id: 'charcoal-dark',
    name: 'Charcoal Dark 🌑',
    darkSquareColor: '#2b2b2b',
    lightSquareColor: '#d6d6d6',
    darkSquareTextColor: '#d6d6d6',
    lightSquareTextColor: '#2b2b2b'
  }
];

const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function safeChessInstance(rawFen?: string): { chess: Chess; validFen: string } {
  if (!rawFen || !rawFen.trim()) {
    return { chess: new Chess(DEFAULT_START_FEN), validFen: DEFAULT_START_FEN };
  }
  let f = rawFen.trim();
  const parts = f.split(/\s+/);
  if (parts.length === 1 && f.split('/').length === 8) {
    f = `${f} w - - 0 1`;
  } else if (parts.length === 2 && f.split('/').length === 8) {
    f = `${f} - - 0 1`;
  }
  try {
    const c = new Chess(f);
    return { chess: c, validFen: c.fen() };
  } catch {
    try {
      const c = new Chess();
      c.clear();
      const tempRanks = f.split(' ')[0].split('/');
      const files = ['a','b','c','d','e','f','g','h'];
      tempRanks.forEach((r, rIdx) => {
        let fIdx = 0;
        for (const char of r) {
          if (/\d/.test(char)) {
            fIdx += parseInt(char, 10);
          } else {
            const sq = files[fIdx] + (8 - rIdx);
            const color = char === char.toUpperCase() ? 'w' : 'b';
            const type = char.toLowerCase() as 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
            try { c.put({ type, color }, sq as any); } catch {}
            fIdx++;
          }
        }
      });
      return { chess: c, validFen: c.fen() };
    } catch {
      return { chess: new Chess(DEFAULT_START_FEN), validFen: DEFAULT_START_FEN };
    }
  }
}

export default function ChessWorkspace({
  initialFen = DEFAULT_START_FEN,
  targetSolution,
  onMove,
  readOnly = false,
  showEngine = true,
  showMoveDots = true,
  showCoordinates = true,
  classId,
  userRole,
  spotlightedStudentId = null,
  spotlightedStudentName = null,
  userId,
  isEditorOpen = false,
  onToggleEditorOpen,
}: ChessWorkspaceProps) {
  // Authorization permissions
  const isCoach = userRole === 'coach' || userRole === 'admin' || !userRole;

  // Student Spotlight states
  const [activeSpotlightId, setActiveSpotlightId] = useState<string | null>(spotlightedStudentId);
  const [activeSpotlightName, setActiveSpotlightName] = useState<string | null>(spotlightedStudentName);

  // Loaded Position state & toolbar controls
  const [loadedPositionTitle, setLoadedPositionTitle] = useState<string | null>(null);
  const [loadedPositionSolution, setLoadedPositionSolution] = useState<string | null>(null);
  const [loadedPositionHint, setLoadedPositionHint] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (spotlightedStudentId !== undefined) setActiveSpotlightId(spotlightedStudentId);
    if (spotlightedStudentName !== undefined) setActiveSpotlightName(spotlightedStudentName);
  }, [spotlightedStudentId, spotlightedStudentName]);

  // Feedback states for student interactive moves
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveSuccess, setMoveSuccess] = useState<string | null>(null);

  // Safe FEN initialization
  const safeInit = safeChessInstance(initialFen);

  // Chess.js instance ref
  const gameRef = useRef<Chess>(safeInit.chess);

  // Core board states
  const [fen, setFen] = useState(safeInit.validFen);
  const [fenHistory, setFenHistory] = useState<string[]>([safeInit.validFen]);

  // Sync when initialFen prop updates safely
  useEffect(() => {
    if (initialFen) {
      const safe = safeChessInstance(initialFen);
      gameRef.current = safe.chess;
      setFen(safe.validFen);
      setFenHistory([safe.validFen]);
      setMoveHistory([]);
      setHistoryIndex(0);
      setSelectedSquare(null);
      setOptionSquares({});
      if (targetSolution) {
        setLoadedPositionSolution(Array.isArray(targetSolution) ? targetSolution.join(' ') : targetSolution);
      }
      if (classId && isCoach && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'load-position',
          payload: {
            fen: safe.validFen,
            solution: targetSolution,
            sentAt: Date.now(),
          },
        });
      }
    }
  }, [initialFen, targetSolution, classId, isCoach]);

  const [allowIllegalMoves, setAllowIllegalMoves] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0); // For undo/redo & history playback
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [boardSize, setBoardSize] = useState(480);

  // Selection & option squares for legal move dots
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  // Web Speech Move Reader State
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const speakMove = useCallback((sanMove: string, isCheck: boolean, isCheckmate: boolean) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    let text = sanMove;
    if (isCheckmate) text += ', Checkmate!';
    else if (isCheck) text += ', Check!';

    text = text
      .replace(/^Q/, 'Queen ')
      .replace(/^R/, 'Rook ')
      .replace(/^B/, 'Bishop ')
      .replace(/^N/, 'Knight ')
      .replace(/^K/, 'King ')
      .replace(/x/, ' captures ')
      .replace(/#/, '')
      .replace(/\+/, '');

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, [voiceEnabled]);

  
  // Board Theme Switcher
  const [selectedThemeId, setSelectedThemeId] = useState<string>('classic-wood');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chess_board_theme');
      if (saved && BOARD_THEMES.some((t) => t.id === saved)) {
        setSelectedThemeId(saved);
      }
    }
  }, []);

  const handleThemeChange = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chess_board_theme', themeId);
    }
  };

  const currentTheme = BOARD_THEMES.find((t) => t.id === selectedThemeId) || BOARD_THEMES[0];

  // Re-sync chessboard when initialFen prop changes (lessons/puzzles load)
  useEffect(() => {
    const safe = safeChessInstance(initialFen);
    gameRef.current = safe.chess;
    setFen(safe.validFen);
    setFenHistory([safe.validFen]);
    setMoveHistory([]);
    setHistoryIndex(0);
    setReviewIndex(null);
    setArrows([]);
    setHighlights({});
    setEngineLines({});
    undoneMovesRef.current = [];
  }, [initialFen]);

  // Load saved PGN / FEN position for this classId on initial mount!
  useEffect(() => {
    if (typeof window === 'undefined' || !classId) return;
    // Skip loading stale PGN if initialFen is a custom position setup
    if (initialFen && initialFen !== DEFAULT_START_FEN) {
      return;
    }
    try {
      const savedPgn = localStorage.getItem(`classroom_pgn_${classId}`);
      const savedFen = localStorage.getItem(`classroom_fen_${classId}`);
      if (savedPgn || savedFen) {
        const c = new Chess();
        let loaded = false;
        if (savedPgn && savedPgn.trim()) {
          try {
            c.loadPgn(savedPgn);
            loaded = true;
          } catch {}
        }
        if (!loaded && savedFen && savedFen.trim()) {
          try {
            c.load(savedFen);
            loaded = true;
          } catch {}
        }
        if (loaded) {
          gameRef.current = c;
          setFen(c.fen());
          setMoveHistory(c.history());
        }
      }
    } catch (e) {
      console.error('Failed to load saved classroom PGN:', e);
    }
  }, [classId, initialFen]);

  // In a classroom (classId present), start unlocked (false) so students can move unless coach locks.
  const [isBoardLocked, setIsBoardLocked] = useState(false);
  const isBoardLockedRef = useRef(false);

  useEffect(() => {
    isBoardLockedRef.current = isBoardLocked;
  }, [isBoardLocked]);

  // Review mode (playback move list)
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  // Drawing States (arrows & square highlights)
  const [showAssignHomeworkModal, setShowAssignHomeworkModal] = useState(false);
  const [homeworkTitle, setHomeworkTitle] = useState('Classroom Tactical Challenge');
  const [isAssigningHomework, setIsAssigningHomework] = useState(false);
  const [homeworkAssignedSuccess, setHomeworkAssignedSuccess] = useState(false);

  // v5 Arrow type: { startSquare, endSquare, color }
  const [arrows, setArrows] = useState<ChessBoardArrow[]>([]);

  const arrowsRef = useRef<ChessBoardArrow[]>([]);
  useEffect(() => {
    arrowsRef.current = arrows;
  }, [arrows]);

  const [highlights, setHighlights] = useState<Record<string, React.CSSProperties>>({});
  const highlightsRef = useRef<Record<string, React.CSSProperties>>({});
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  // Board Editor (Position Setup) states
  const [isEditorMode, setIsEditorMode] = useState(isEditorOpen || false);

  useEffect(() => {
    if (isEditorOpen !== undefined) {
      setIsEditorMode(isEditorOpen);
    }
  }, [isEditorOpen]);
  const [editorActivePiece, setEditorActivePiece] = useState<string | null>(null); // e.g. 'wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK', or 'trash'
  const [editorSideToMove, setEditorSideToMove] = useState<'w' | 'b'>('w');
  const [editorCastling, setEditorCastling] = useState({
    wK: true,
    wQ: true,
    bK: true,
    bQ: true,
  });
  const [editorEnPassant, setEditorEnPassant] = useState('-');
  const [editorHalfMove, setEditorHalfMove] = useState('0');
  const [editorFullMove, setEditorFullMove] = useState('1');

  // Input & Bot states
  const [fenInput, setFenInput] = useState('');
  const [pgnInput, setPgnInput] = useState('');
  const [showImportExportModal, setShowImportExportModal] = useState<'fen' | 'pgn' | null>(null);
  const [showPlayBotModal, setShowPlayBotModal] = useState(false);

  // Latency & Connection states
  const [latencyWarning, setLatencyWarning] = useState(false);

  // Stockfish Engine States
  const [engineActive, setEngineActive] = useState(false);
  const [engineDepth, setEngineDepth] = useState(12);
  const [engineMultiPV, setEngineMultiPV] = useState(1);
  const [engineInfinite, setEngineInfinite] = useState(false);
  const [engineLines, setEngineLines] = useState<Record<number, StockfishLine>>({});
  const [engineError, setEngineError] = useState(false);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(false);

  const stockfishRef = useRef<Worker | null>(null);
  const channelRef = useRef<any>(null);
  const undoneMovesRef = useRef<any[]>([]);

  // Effective read-only status for current user (unlocked if user is the spotlighted student)
  const isSpotlightedUser = Boolean(userId && activeSpotlightId && userId === activeSpotlightId);
  const isReadOnly = readOnly || (!isCoach && isBoardLocked && !isSpotlightedUser) || reviewIndex !== null;

  // Calculate evaluation relative to White for the Evaluation Bar
  const getEvaluationStats = useCallback(() => {
    if (!engineActive || Object.keys(engineLines).length === 0) {
      return { percentage: 50, scoreText: '0.0' };
    }
    const primaryLine = engineLines[1];
    if (!primaryLine) return { percentage: 50, scoreText: '0.0' };

    const scoreStr = primaryLine.score;
    if (scoreStr.startsWith('M')) {
      const mateMoves = parseInt(scoreStr.substring(1));
      const isWhiteWinning = mateMoves > 0;
      return {
        percentage: isWhiteWinning ? 100 : 0,
        scoreText: scoreStr
      };
    }

    const scoreNum = parseFloat(scoreStr);
    if (isNaN(scoreNum)) return { percentage: 50, scoreText: '0.0' };

    // Standard cp score
    // Map score from -5.0 to +5.0 into 5% to 95% (leaving bounds)
    const cappedScore = Math.max(-5, Math.min(5, scoreNum));
    const percentage = ((cappedScore + 5) / 10) * 100;
    const scoreText = scoreNum > 0 ? `+${scoreNum.toFixed(1)}` : scoreNum.toFixed(1);
    
    return { percentage, scoreText };
  }, [engineActive, engineLines]);

  const { percentage: whiteEvalPercentage, scoreText: evalText } = getEvaluationStats();

  // Recalculate side controls based on FEN in editor mode
  const parseEditorStateFromFen = (currFen: string) => {
    try {
      const parts = currFen.split(' ');
      if (parts.length >= 6) {
        setEditorSideToMove(parts[1] as 'w' | 'b');
        setEditorCastling({
          wK: parts[2].includes('K'),
          wQ: parts[2].includes('Q'),
          bK: parts[2].includes('k'),
          bQ: parts[2].includes('q'),
        });
        setEditorEnPassant(parts[3]);
        setEditorHalfMove(parts[4]);
        setEditorFullMove(parts[5]);
      }
    } catch {
      // Ignore parsing error
    }
  };

  const syncFromGame = useCallback((g: Chess, updateHistory = true) => {
    const nextFen = g.fen();
    setFen(nextFen);
    setMoveHistory(g.history());
    setSelectedSquare(null);
    setOptionSquares({});

    setCanUndo(g.history().length > 0);
    setCanRedo(undoneMovesRef.current.length > 0);

    if (updateHistory) {
      const newHistory = fenHistory.slice(0, historyIndex + 1);
      newHistory.push(nextFen);
      setFenHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    setArrows([]);
    setHighlights({});

    if (typeof window !== 'undefined' && classId) {
      try {
        localStorage.setItem(`classroom_pgn_${classId}`, g.pgn());
        localStorage.setItem(`classroom_fen_${classId}`, nextFen);
      } catch (e) {}
    }

    if (onMove) onMove(nextFen, g.pgn());

  const applyEditorConfig = useCallback(() => {
    try {
      const boardFen = gameRef.current.fen().split(' ')[0];
      const castlingStr = `${editorCastling.wK ? 'K' : ''}${editorCastling.wQ ? 'Q' : ''}${editorCastling.bK ? 'k' : ''}${editorCastling.bQ ? 'q' : ''}` || '-';
      const fullFen = `${boardFen} ${editorSideToMove} ${castlingStr} ${editorEnPassant} ${editorHalfMove} ${editorFullMove}`;
      
      const safe = safeChessInstance(fullFen);
      gameRef.current = safe.chess;
      syncFromGame(safe.chess);
      if (classId) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'move',
          payload: { fen: safe.validFen, history: [], sentAt: Date.now() },
        });
      }
    } catch (err) {
      console.error('Apply editor config error:', err);
    }
  }, [editorCastling, editorSideToMove, editorEnPassant, editorHalfMove, editorFullMove, classId, syncFromGame]);

  const handleSquareLeftClick = useCallback(({ square }: { piece?: any; square: string }) => {
    if (!isCoach) return;
    try {
      if (editorActivePiece === 'trash') {
        gameRef.current.remove(square as any);
      } else if (editorActivePiece) {
        const color = editorActivePiece[0] === 'w' ? 'w' : 'b';
        const type = editorActivePiece[1].toLowerCase() as any;
        gameRef.current.remove(square as any);
        gameRef.current.put({ type, color }, square as any);
      }
      const boardFen = gameRef.current.fen().split(' ')[0];
      const castlingStr = `${editorCastling.wK ? 'K' : ''}${editorCastling.wQ ? 'Q' : ''}${editorCastling.bK ? 'k' : ''}${editorCastling.bQ ? 'q' : ''}` || '-';
      const nextFen = `${boardFen} ${editorSideToMove} ${castlingStr} ${editorEnPassant} ${editorHalfMove} ${editorFullMove}`;
      
      setFen(nextFen);
      if (classId) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'move',
          payload: { fen: nextFen, history: [], sentAt: Date.now() },
        });
      }
    } catch (err) {
      console.error('Editor square click error:', err);
    }
  }, [isCoach, editorActivePiece, editorCastling, editorSideToMove, editorEnPassant, editorHalfMove, editorFullMove, classId]);

    const canBroadcast = isCoach || (!isCoach && !isBoardLocked);
    if (classId && canBroadcast) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'move',
        payload: {
          fen: nextFen,
          history: g.history(),
          sentAt: Date.now(),
        },
      });
      channelRef.current?.send({
        type: 'broadcast',
        event: 'arrows',
        payload: { arrows: [], highlights: {} },
      });
    }
  }, [onMove, classId, isCoach, isBoardLocked, fenHistory, historyIndex]);

  // Broadcast arrows helper — converts v5 arrow format to broadcast payload
  const broadcastArrows = useCallback((newArrows: ChessBoardArrow[], newHighlights: Record<string, React.CSSProperties>) => {
    const canBroadcast = isCoach || (!isCoach && !isBoardLocked);
    if (classId && canBroadcast) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'arrows',
        payload: { arrows: newArrows, highlights: newHighlights },
      });
    }
  }, [classId, isCoach, isBoardLocked]);

  // Set up Supabase Realtime Broadcast Channel
  useEffect(() => {
    if (!classId) return;

    const bindChannelListeners = (ch: any) => {
      ch.on('broadcast', { event: 'move' }, ({ payload }: any) => {
        const shouldUpdate = !isCoach || !isBoardLockedRef.current;
        if (shouldUpdate) {
          const newFen = payload.fen;
          try {
            const g = new Chess(newFen);
            gameRef.current = g;
            setFen(newFen);
            setMoveHistory(payload.history || g.history());
            setArrows([]);
            setHighlights({});
            setReviewIndex(null);

            // Update local history tracker
            setFenHistory((prev) => [...prev, newFen]);
            setHistoryIndex((prev) => prev + 1);

            // Latency warning
            if (payload.sentAt) {
              const delay = Date.now() - payload.sentAt;
              setLatencyWarning(delay > 500);
            }
          } catch (e) {
            console.error('Failed to sync board state:', e);
            try {
              gameRef.current.clear();
            } catch {}
            setFen(newFen);
            setMoveHistory(payload.history || []);
            setArrows([]);
            setHighlights({});
            setReviewIndex(null);
          }
        }
      })
      .on('broadcast', { event: 'arrows' }, ({ payload }: any) => {
        const shouldUpdate = !isCoach || !isBoardLockedRef.current;
        if (shouldUpdate) {
          setArrows(payload.arrows || []);
          setHighlights(payload.highlights || {});
        }
      })
      .on('broadcast', { event: 'lock-state' }, ({ payload }: any) => {
        setIsBoardLocked(payload.locked);
      })
      .on('broadcast', { event: 'load-position' }, ({ payload }: any) => {
        const newFen = payload.fen;
        try {
          const g = new Chess(newFen);
          gameRef.current = g;
          setFen(newFen);
          setMoveHistory([]);
          setArrows([]);
          setHighlights({});
          setReviewIndex(null);
          if (payload.orientation) setBoardOrientation(payload.orientation);
          if (payload.locked !== undefined) setIsBoardLocked(payload.locked);
          setLoadedPositionTitle(payload.title || null);
          setLoadedPositionSolution(payload.solution || null);
          setLoadedPositionHint(payload.hint || null);
          setShowSolution(false);
          setShowHint(false);
        } catch (e) {
          console.error('Failed to load position FEN:', e);
        }
      })
      .on('broadcast', { event: 'spotlight-student' }, ({ payload }: any) => {
        setActiveSpotlightId(payload.studentId || null);
        setActiveSpotlightName(payload.studentName || null);
      })
      .on('broadcast', { event: 'sync-orientation' }, ({ payload }: any) => {
        if (!isCoach) {
          setBoardOrientation(payload.orientation);
        }
      })
      .on('broadcast', { event: 'sync-request' }, () => {
        if (isCoach) {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'sync-response',
            payload: {
              fen: gameRef.current.fen(),
              history: gameRef.current.history(),
              arrows: arrowsRef.current,
              highlights: highlightsRef.current,
              locked: isBoardLockedRef.current,
            },
          });
        }
      })
      .on('broadcast', { event: 'sync-response' }, ({ payload }: any) => {
        if (!isCoach) {
          const newFen = payload.fen;
          try {
            const g = new Chess(newFen);
            gameRef.current = g;
            setFen(newFen);
            setMoveHistory(payload.history || g.history());
            setArrows(payload.arrows || []);
            setHighlights(payload.highlights || {});
            setIsBoardLocked(payload.locked ?? false);
            setFenHistory([newFen]);
            setHistoryIndex(0);
          } catch (e) {
            console.error('Failed to parse sync response:', e);
            try {
              gameRef.current.clear();
            } catch {}
            setFen(newFen);
            setMoveHistory(payload.history || []);
            setArrows(payload.arrows || []);
            setHighlights(payload.highlights || {});
            setIsBoardLocked(payload.locked ?? false);
            setFenHistory([newFen]);
            setHistoryIndex(0);
          }
        }
      });
    };

    const boardChannelTopic = `classroom-board:${classId}`;

    const channel = supabase.channel(boardChannelTopic, {
      config: {
        broadcast: { self: false },
      },
    });

    bindChannelListeners(channel);

    const subscribeWithRetry = (ch: any, attempts = 0) => {
      ch.subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Supabase Realtime channel error: ${status}. Reconnecting...`);
          if (attempts < 5) {
            setTimeout(() => {
              supabase.removeChannel(ch).then(() => {
                const newCh = supabase.channel(boardChannelTopic, {
                  config: {
                    broadcast: { self: false },
                  },
                });
                bindChannelListeners(newCh);
                subscribeWithRetry(newCh, attempts + 1);
                channelRef.current = newCh;
              });
            }, 2000 * (attempts + 1));
          }
        }
      });
    };

    subscribeWithRetry(channel);
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [classId, isCoach]);

  // Request sync for students on mount
  useEffect(() => {
    if (!classId || isCoach) return;
    const timer = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'sync-request',
        payload: {},
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [classId, isCoach]);

  // Stockfish analysis triggering
  const triggerStockfishAnalysis = useCallback((currentFen: string) => {
    if (typeof window === 'undefined' || !showEngine || !engineActive) return;
    setEngineError(false);

    try {
      stockfishRef.current?.terminate();
      stockfishRef.current = null;

      const worker = new Worker('/stockfish/stockfish.js');
      stockfishRef.current = worker;

      worker.onerror = () => {
        worker.terminate();
        stockfishRef.current = null;
        setEngineError(true);
      };

      worker.onmessage = (event) => {
        const line: string = event.data;
        
        if (line.startsWith('info depth')) {
          const depthMatch = line.match(/depth (\d+)/);
          const scoreCpMatch = line.match(/score cp (-?\d+)/);
          const scoreMateMatch = line.match(/score mate (-?\d+)/);
          const multipvMatch = line.match(/multipv (\d+)/);
          const pvMatch = line.match(/ pv (.+)/);

          if (depthMatch && (scoreCpMatch || scoreMateMatch) && pvMatch) {
            const depth = parseInt(depthMatch[1]);
            const multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
            const scoreVal = scoreCpMatch
              ? (parseInt(scoreCpMatch[1]) / 100).toFixed(2)
              : `M${scoreMateMatch ? scoreMateMatch[1] : ''}`;
            const pvMoves = pvMatch[1];
            const bestMove = pvMoves.split(' ')[0];

            setEngineLines((prev) => ({
              ...prev,
              [multipv]: {
                depth,
                score: scoreVal,
                pv: pvMoves,
                bestMove,
              },
            }));
          }
        }
      };

      worker.postMessage('uci');
      worker.postMessage(`setoption name MultiPV value ${engineMultiPV}`);
      worker.postMessage('ucinewgame');
      worker.postMessage(`position fen ${currentFen}`);

      if (engineInfinite) {
        worker.postMessage('go infinite');
      } else {
        worker.postMessage(`go depth ${engineDepth}`);
      }
    } catch (err) {
      setEngineError(true);
    }
  }, [showEngine, engineActive, engineDepth, engineMultiPV, engineInfinite]);

  // Run stockfish on position changes
  useEffect(() => {
    if (engineActive) {
      triggerStockfishAnalysis(fen);
    } else {
      stockfishRef.current?.terminate();
      stockfishRef.current = null;
      setEngineLines({});
    }
    return () => {
      stockfishRef.current?.terminate();
    };
  }, [fen, engineActive, triggerStockfishAnalysis]);





  // Chessboard move handlers — supports both positional args and object params
  const onDrop = (sourceOrObj: any, targetArg?: string | null, pieceArg?: any): boolean => {
    let sourceSquare: string = '';
    let targetSquare: string | null = null;
    let piece: any = pieceArg;

    if (typeof sourceOrObj === 'object' && sourceOrObj !== null && 'sourceSquare' in sourceOrObj) {
      sourceSquare = sourceOrObj.sourceSquare;
      targetSquare = sourceOrObj.targetSquare || null;
      piece = sourceOrObj.piece || pieceArg;
    } else {
      sourceSquare = String(sourceOrObj || '');
      targetSquare = targetArg || null;
    }

    if (!targetSquare) return false;

    if (isEditorMode && isCoach) {
      try {
        const pieceStr = typeof piece === 'string' ? piece : (piece?.pieceType || piece?.piece || 'wP');
        const color = (pieceStr[0] || 'w').toLowerCase() === 'b' ? 'b' : 'w';
        const type = (pieceStr[1] || 'p').toLowerCase() as 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
        gameRef.current.remove(sourceSquare as any);
        gameRef.current.put({ type, color }, targetSquare as any);
        const nextFen = gameRef.current.fen();
        setFen(nextFen);
        parseEditorStateFromFen(nextFen);

        // Broadcast editor moves to students instantly
        if (classId) {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'move',
            payload: {
              fen: nextFen,
              history: gameRef.current.history(),
              sentAt: Date.now(),
            },
          });
        }
        return true;
      } catch (err) {
        console.error('Editor move drop error:', err);
        return false;
      }
    }

    if (!isCoach && isBoardLocked) return false;
    if (isReadOnly) return false;
    setSelectedSquare(null);
    setOptionSquares({});

    // Free / Illegal Moves Mode Handler
    if (allowIllegalMoves) {
      try {
        const pieceOnSource = gameRef.current.get(sourceSquare as any);
        if (pieceOnSource) {
          gameRef.current.remove(sourceSquare as any);
          gameRef.current.remove(targetSquare as any);
          gameRef.current.put(pieceOnSource, targetSquare as any);
          const nextFen = gameRef.current.fen();
          setFen(nextFen);
          undoneMovesRef.current = [];
          syncFromGame(gameRef.current);
          return true;
        }
      } catch (err) {
        console.error('Free move error:', err);
      }
    }

    try {
      const pieceOnSource = gameRef.current.get(sourceSquare as any);
      const isPromotion =
        pieceOnSource?.type === 'p' &&
        (targetSquare.endsWith('8') || targetSquare.endsWith('1'));

      const result = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      });
      if (!result) return false;

      // Student Interactive Move Feedback
      if (userRole === 'student') {
        const moveSan = result.san;
        if (gameRef.current.isCheckmate()) {
          setMoveSuccess(`🎯 Checkmate delivered with ${moveSan}! 🎉`);
          setTimeout(() => setMoveSuccess(null), 3500);
        } else if (gameRef.current.inCheck()) {
          setMoveSuccess(`⚔️ Check with ${moveSan}!`);
          setTimeout(() => setMoveSuccess(null), 2500);
        } else {
          setMoveSuccess(`✅ Move played: ${moveSan}`);
          setTimeout(() => setMoveSuccess(null), 2000);
        }
      }

      undoneMovesRef.current = [];
      speakMove(result.san, gameRef.current.inCheck(), gameRef.current.isGameOver());
      syncFromGame(gameRef.current);
      return true;

    } catch {
      return false;
    }
  };

  // Draw custom arrows and highlights
  const broadcastDrawings = (newArrows: ChessBoardArrow[], newHighlights: any) => {
    const canBroadcast = isCoach || (!isCoach && !isBoardLocked);
    if (classId && canBroadcast) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'arrows',
        payload: {
          arrows: newArrows,
          highlights: newHighlights,
        },
      });
    }
  };

  // v5 API: onSquareRightClick receives ({ piece, square })
  const handleSquareRightClick = ({ square }: { piece: any; square: string }) => {
    if (isReadOnly) return;
    setHighlights((prev) => {
      const newHighlights = { ...prev };
      if (newHighlights[square]) {
        delete newHighlights[square];
      } else {
        newHighlights[square] = { backgroundColor: 'rgba(212, 175, 55, 0.4)' }; // Gold highlight
      }
      broadcastDrawings(arrows, newHighlights);
      return newHighlights;
    });
  };

  const handleSquareClick = useCallback(({ square }: { square: string }) => {
    // If in editor mode, delegate to editor left click handler
    if (isEditorMode && isCoach) {
      handleSquareLeftClick({ piece: null, square });
      return;
    }

    if (!isCoach && isBoardLocked) return;
    if (isReadOnly) return;

    // 1. If clicked on a valid move square, make the move
    if (optionSquares[square]) {
      try {
        const isPromotion =
          gameRef.current.get(selectedSquare as any)?.type === 'p' &&
          (square.endsWith('8') || square.endsWith('1'));

        const move = gameRef.current.move({
          from: selectedSquare!,
          to: square,
          promotion: isPromotion ? 'q' : undefined,
        });

        if (move) {
          undoneMovesRef.current = [];
          syncFromGame(gameRef.current);
          setSelectedSquare(null);
          setOptionSquares({});
          return;
        }
      } catch {}
    }

    // 2. Otherwise, check if we clicked on our own piece to select it
    const piece = gameRef.current.get(square as any);
    if (piece && piece.color === gameRef.current.turn()) {
      setSelectedSquare(square);

      // Find legal moves
      const moves = gameRef.current.moves({ square: square as any, verbose: true });
      const newOptionSquares: Record<string, React.CSSProperties> = {};

      // Selection highlight (Chess.com style blue border/glow)
      newOptionSquares[square] = {
        boxShadow: 'inset 0 0 0 3.5px #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      };

      if (showMoveDots) {
        moves.forEach((m) => {
          const targetPiece = gameRef.current.get(m.to as any);
          if (targetPiece) {
            // Enemy piece capture: Red Ring Highlight
            newOptionSquares[m.to] = {
              boxShadow: 'inset 0 0 0 4px #ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
            };
          } else {
            // Empty square: Vibrant Red Dot
            newOptionSquares[m.to] = {
              background: 'radial-gradient(circle, #ef4444 32%, transparent 35%)',
            };
          }
        });
      }

      setOptionSquares(newOptionSquares);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  }, [isEditorMode, isCoach, isReadOnly, selectedSquare, optionSquares, syncFromGame]);

  // v5 API: onSquareClick receives ({ piece, square })
  // Board Editor Placement clicks
  const handleSquareLeftClick = ({ square }: { piece?: any; square: string }) => {
    if (!isCoach) return;
    if (!editorActivePiece) {
      handleSquareClick({ square });
      return;
    }

    try {
      if (editorActivePiece === 'trash') {
        gameRef.current.remove(square as any);
      } else {
        const color = editorActivePiece[0] as 'w' | 'b';
        const type = editorActivePiece[1].toLowerCase() as 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
        gameRef.current.put({ type, color }, square as any);
      }

      // Sync and reconstruct editor state
      const nextFen = gameRef.current.fen();
      setFen(nextFen);
      parseEditorStateFromFen(nextFen);
      if (onMove) onMove(nextFen, gameRef.current.pgn());

      // Broadcast placement updates to students instantly
      if (classId) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'move',
          payload: {
            fen: nextFen,
            history: gameRef.current.history(),
            sentAt: Date.now(),
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Construct FEN from board editor parameters
  const applyEditorConfig = () => {
    try {
      const piecePart = gameRef.current.fen().split(' ')[0];
      const castlingPart = [
        editorCastling.wK ? 'K' : '',
        editorCastling.wQ ? 'Q' : '',
        editorCastling.bK ? 'k' : '',
        editorCastling.bQ ? 'q' : '',
      ].join('') || '-';
      
      const newFen = `${piecePart} ${editorSideToMove} ${castlingPart} ${editorEnPassant || '-'} ${editorHalfMove} ${editorFullMove}`;
      const safe = safeChessInstance(newFen);
      gameRef.current = safe.chess;
      syncFromGame(safe.chess);
      setIsEditorMode(false);

      if (onMove) onMove(safe.validFen, safe.chess.pgn());

      // Broadcast updated position to students in realtime!
      broadcastBoardState(safe.validFen, safe.chess.history());
    } catch {
      alert('Invalid Editor parameters. FEN generation failed.');
    }
  };

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Control Functions
  const handleUndo = useCallback(() => {
    if (isReadOnly) return;
    const history = gameRef.current.history();
    if (history.length === 0) return;

    const undone = gameRef.current.undo();
    if (!undone) return;

    undoneMovesRef.current.push(undone);
    setCanRedo(true);
    setCanUndo(gameRef.current.history().length > 0);

    const prevFen = gameRef.current.fen();
    syncFromGame(gameRef.current);
    broadcastBoardState(prevFen, gameRef.current.history());
  }, [isReadOnly, syncFromGame]);

  const handleRedo = useCallback(() => {
    if (isReadOnly || undoneMovesRef.current.length === 0) return;
    const move = undoneMovesRef.current.pop();
    if (!move) return;

    const result = gameRef.current.move(move);
    if (!result) return;

    setCanRedo(undoneMovesRef.current.length > 0);
    setCanUndo(true);

    const nextFen = gameRef.current.fen();
    syncFromGame(gameRef.current);
    broadcastBoardState(nextFen, gameRef.current.history());
  }, [isReadOnly, syncFromGame]);

  // Feature 88: Keyboard Shortcuts Listener (ArrowLeft -> Undo Move, ArrowRight -> Redo Move)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return; // Don't trigger if user is typing text
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);


  const broadcastBoardState = (f: string, h: string[]) => {
    if (classId && isCoach) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'move',
        payload: { fen: f, history: h, sentAt: Date.now() },
      });
    }
  };

  const handleResetBoard = () => {
    if (isReadOnly) return;
    try {
      const safe = safeChessInstance(initialFen);
      gameRef.current = safe.chess;
      syncFromGame(safe.chess);
      if (onMove) onMove(safe.validFen, safe.chess.pgn());
    } catch (e) {
      console.error('Failed to reset board:', e);
    }
  };

  const handleClearBoard = () => {
    if (isReadOnly) return;
    try {
      gameRef.current.clear();
    } catch {}
    const emptyFen = '8/8/8/8/8/8/8/8 w - - 0 1';
    setFen(emptyFen);
    setMoveHistory([]);
    setFenHistory([emptyFen]);
    setHistoryIndex(0);
    if (onMove) onMove(emptyFen, '');
    broadcastBoardState(emptyFen, []);
  };

  const handleOrientationSync = () => {
    if (classId && isCoach) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'sync-orientation',
        payload: { orientation: boardOrientation },
      });
    }
  };

  // FEN and PGN Imports
  const handleLoadCustomFen = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const safe = safeChessInstance(fenInput);
      gameRef.current = safe.chess;
      syncFromGame(safe.chess);
      if (onMove) onMove(safe.validFen, safe.chess.pgn());
      setShowImportExportModal(null);
      setFenInput('');
    } catch {
      alert('Invalid FEN String.');
    }
  };

  const handleLoadCustomPgn = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const safe = safeChessInstance();
      safe.chess.loadPgn(pgnInput);
      gameRef.current = safe.chess;
      syncFromGame(safe.chess);
      if (onMove) onMove(safe.chess.fen(), safe.chess.pgn());
      setShowImportExportModal(null);
      setPgnInput('');
    } catch {
      alert('Failed to load PGN string.');
    }
  };

  const downloadPgnFile = () => {
    const element = document.createElement('a');
    const file = new Blob([gameRef.current.pgn()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `chess_classroom_${classId || 'session'}.pgn`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Best move arrow rendering (v5 format: { startSquare, endSquare, color })
  const engineBestMoveArrow = (): ChessBoardArrow[] => {
    if (showBestMoveArrow && engineLines[1]?.bestMove) {
      const mv = engineLines[1].bestMove;
      if (mv.length >= 4) {
        return [{ startSquare: mv.substring(0, 2), endSquare: mv.substring(2, 4), color: '#D4AF37' }];
      }
    }
    return [];
  };

  const renderedArrows: ChessBoardArrow[] = [...arrows, ...engineBestMoveArrow()];

  return (
    <div className={`grid grid-cols-1 ${showEngine ? 'xl:grid-cols-3' : 'w-full'} gap-6 bg-surface-dark border border-slate-800 rounded-3xl p-6 pt-12 shadow-2xl relative`}>
      <div className="absolute top-3 left-6 right-6 flex items-center justify-between border-b border-slate-850 pb-1.5 drag-handle cursor-grab active:cursor-grabbing select-none text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <span>⋮⋮ Interactive Chessboard Panel</span>
        <span>Drag to Rearrange</span>
      </div>
      {/* Board & controls section */}
      <div className={`${showEngine ? 'xl:col-span-2' : 'col-span-1'} flex flex-col items-center gap-4 w-full`}>
        {latencyWarning && (
          <div className="w-full bg-red-950/60 border border-red-900/50 rounded-xl px-3 py-2 text-red-200 text-[10px] font-semibold flex items-center gap-2 transition-all">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            High connection latency detected (&gt;500ms). Real-time board sync may be delayed.
          </div>
        )}

        {reviewIndex !== null && (
          <div className="w-full bg-blue-950/60 border border-blue-900/50 rounded-xl px-4 py-2 text-blue-200 text-xs font-semibold flex items-center justify-between transition-all">
            <span>Viewing move {reviewIndex + 1} history. Board is read-only.</span>
            <button
              onClick={() => {
                setReviewIndex(null);
                const activeFen = fenHistory[historyIndex];
                setFen(activeFen);
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold"
            >
              Return to Live Play
            </button>
          </div>
        )}

        {/* 🎨 SLIDE-OUT BOARD EDITOR DRAWER (Coach Only - Choice A1) */}
        {isCoach && (
          <ClassroomBoardEditorDrawer
            isOpen={isEditorMode}
            onClose={() => setIsEditorMode(false)}
            editorActivePiece={editorActivePiece}
            setEditorActivePiece={setEditorActivePiece}
            editorSideToMove={editorSideToMove}
            setEditorSideToMove={setEditorSideToMove}
            editorCastling={editorCastling}
            setEditorCastling={setEditorCastling}
            onResetStart={() => {
              gameRef.current = new Chess();
              const startFen = gameRef.current.fen();
              setFen(startFen);
              setFenHistory([startFen]);
              setHistoryIndex(0);
              setMoveHistory([]);
              broadcastBoardState(startFen, []);
            }}
            onClearBoard={handleClearBoard}
            onApplyPosition={() => {
              applyEditorConfig();
              setEditorActivePiece(null);
            }}
          />
        )}

        {/* Student Spotlight Banner */}
        {activeSpotlightName && (
          <div className="w-full bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 rounded-xl p-2.5 mb-3 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2 font-bold">
              <span className="text-base animate-pulse">🎯</span>
              <span>Student Spotlight Active: <strong className="text-white font-extrabold">{activeSpotlightName}</strong> has live board move control!</span>
            </div>
            {isSpotlightedUser && (
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md animate-pulse">
                Your Turn to Move
              </span>
            )}
          </div>
        )}

        {/* Loaded Curriculum Position Toolbar */}
        {(loadedPositionTitle || loadedPositionSolution || loadedPositionHint) && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">🎯 {loadedPositionTitle || 'Loaded Position'}</span>
              {isBoardLocked ? (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">
                  🔒 Board Locked
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  🔓 Board Unlocked
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isCoach && (
                <button
                  type="button"
                  onClick={() => {
                    const nextLock = !isBoardLocked;
                    setIsBoardLocked(nextLock);
                    channelRef.current?.send({
                      type: 'broadcast',
                      event: 'lock-state',
                      payload: { locked: nextLock },
                    });
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
                >
                  {isBoardLocked ? '🔓 Unlock Board' : '🔒 Lock Board'}
                </button>
              )}

              {loadedPositionHint && (
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30"
                >
                  💡 {showHint ? 'Hide Hint' : 'Hint'}
                </button>
              )}

              {loadedPositionSolution && (
                <button
                  type="button"
                  onClick={() => setShowSolution(!showSolution)}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30"
                >
                  🔑 {showSolution ? 'Hide Solution' : 'Solution'}
                </button>
              )}
            </div>

            {(showHint || showSolution) && (
              <div className="w-full pt-2 border-t border-slate-800 space-y-1">
                {showHint && loadedPositionHint && (
                  <div className="p-2 bg-amber-950/40 border border-amber-500/30 text-amber-200 rounded-xl text-xs">
                    💡 <strong>Hint:</strong> {loadedPositionHint}
                  </div>
                )}
                {showSolution && loadedPositionSolution && (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 rounded-xl text-xs font-mono">
                    🔑 <strong>Solution:</strong> {loadedPositionSolution}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chessboard Wrapper with Evaluation Bar */}
        <div className="flex gap-3 items-stretch w-full justify-center" style={{ maxWidth: `${boardSize + (engineActive ? 32 : 0)}px` }}>
          {/* Evaluation Bar (Coach Side Only) */}
          {isCoach && engineActive && (
            <div className="w-5 bg-slate-950 border-2 border-slate-800 rounded-xl overflow-hidden flex flex-col relative shadow-2xl flex-shrink-0">
              {/* Black eval fill (top part) */}
              <div className="w-full bg-slate-950 flex-grow" />
              {/* White eval fill (bottom part) */}
              <div 
                className="w-full bg-white transition-all duration-500 ease-out border-t border-slate-700"
                style={{ height: `${whiteEvalPercentage}%` }}
              />
              {/* Score text overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-difference">
                <span className="text-[9px] font-extrabold text-white rotate-90 transform origin-center whitespace-nowrap tracking-wider">
                  {evalText}
                </span>
              </div>
            </div>
          )}

          {/* Chessboard Container */}
          <div
            className="flex-grow aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 relative transition-all duration-200"
            style={{ maxWidth: `${boardSize}px`, touchAction: 'none' }}
          >
            {/* Move Feedback Notification Banners */}
            {moveError && (
              <div className="absolute top-2 left-2 right-2 z-50 bg-red-600/90 border border-red-400 text-white text-xs font-black px-3 py-2 rounded-xl shadow-xl text-center backdrop-blur-sm animate-bounce">
                {moveError}
              </div>
            )}
            {moveSuccess && (
              <div className="absolute top-2 left-2 right-2 z-50 bg-emerald-600/90 border border-emerald-400 text-white text-xs font-black px-3 py-2 rounded-xl shadow-xl text-center backdrop-blur-sm animate-bounce">
                {moveSuccess}
              </div>
            )}

            {/* Full Square Coordinates Overlay (a1, a2 ... h8 on every square corner) */}
            {showCoordinates && (
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none z-10 select-none">
                {(boardOrientation === 'black'
                  ? [
                      'h1','g1','f1','e1','d1','c1','b1','a1',
                      'h2','g2','f2','e2','d2','c2','b2','a2',
                      'h3','g3','f3','e3','d3','c3','b3','a3',
                      'h4','g4','f4','e4','d4','c4','b4','a4',
                      'h5','g5','f5','e5','d5','c5','b5','a5',
                      'h6','g6','f6','e6','d6','c6','b6','a6',
                      'h7','g7','f7','e7','d7','c7','b7','a7',
                      'h8','g8','f8','e8','d8','c8','b8','a8',
                    ]
                  : [
                      'a8','b8','c8','d8','e8','f8','g8','h8',
                      'a7','b7','c7','d7','e7','f7','g7','h7',
                      'a6','b6','c6','d6','e6','f6','g6','h6',
                      'a5','b5','c5','d5','e5','f5','g5','h5',
                      'a4','b4','c4','d4','e4','f4','g4','h4',
                      'a3','b3','c3','d3','e3','f3','g3','h3',
                      'a2','b2','c2','d2','e2','f2','g2','h2',
                      'a1','b1','c1','d1','e1','f1','g1','h1',
                    ]
                ).map((sq) => (
                  <div key={sq} className="relative p-0.5 pointer-events-none">
                    <span className="text-[10px] font-black text-amber-300 font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] select-none leading-none">
                      {sq}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Lock Banner Overlay for Students */}
            {!isCoach && isBoardLocked && !isSpotlightedUser && (
              <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px] flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-2xl pointer-events-auto">
                  <span className="text-red-400 text-sm">🔒</span>
                  <span className="text-white text-xs font-bold font-sans uppercase tracking-wider">Board Locked by Coach</span>
                </div>
              </div>
            )}

            <ChessboardComponent
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              arePiecesDraggable={(isCoach || !isBoardLocked) && !isReadOnly}
              customSquareStyles={{ ...highlights, ...optionSquares }}
              options={{
                position: fen,
                onPieceDrop: onDrop,
                boardOrientation: boardOrientation,
                allowDragging: (isCoach || !isBoardLocked) && !isReadOnly,
                showBoardNotation: showCoordinates,
                showCoordinates: showCoordinates,
                darkSquareStyle: { backgroundColor: currentTheme.darkSquareColor },
                lightSquareStyle: { backgroundColor: currentTheme.lightSquareColor },
                boardStyle: currentTheme.backgroundImage ? {
                  backgroundImage: currentTheme.backgroundImage,
                  backgroundSize: 'cover',
                } : undefined,
                arrows: renderedArrows,
                squareStyles: { ...highlights, ...optionSquares },
                onSquareClick: handleSquareClick,
                onSquareRightClick: handleSquareRightClick,
                onArrowsChange: ({ arrows: newArrows }: { arrows: ChessBoardArrow[] }) => {
                  setArrows(newArrows);
                  broadcastDrawings(newArrows, highlights);
                },
                pieces: customChessPieces,
              }}
            />
          </div>
        </div>
      </div>

      {/* Engine & Move List Right Section */}
      {showEngine && (
        <div className="flex flex-col gap-4 text-white bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl h-full justify-between">
          {/* Engine Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-accent tracking-wide uppercase">Stockfish Engine</h3>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engineActive}
                  onChange={(e) => setEngineActive(e.target.checked)}
                  className="rounded border-slate-800 text-accent focus:ring-accent bg-slate-950 w-3.5 h-3.5"
                />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Toggle Analysis</span>
              </label>
            </div>

            {engineActive && (
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3.5 text-xs">
                {engineError ? (
                  <p className="text-red-400 text-[11px] font-semibold">Engine unavailable.</p>
                ) : (
                  <>
                    {/* Depth & MultiPV controls */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Max Depth: {engineDepth}</label>
                        <input
                          type="range"
                          min="8"
                          max="20"
                          value={engineDepth}
                          onChange={(e) => setEngineDepth(parseInt(e.target.value))}
                          disabled={engineInfinite}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">MultiPV: {engineMultiPV}</label>
                        <select
                          value={engineMultiPV}
                          onChange={(e) => setEngineMultiPV(parseInt(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded px-1.5 py-0.5"
                        >
                          <option value="1">1 Line</option>
                          <option value="2">2 Lines</option>
                          <option value="3">3 Lines</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 text-[10px]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={engineInfinite}
                          onChange={(e) => setEngineInfinite(e.target.checked)}
                          className="rounded border-slate-800 text-accent bg-slate-950 w-3 h-3"
                        />
                        <span>Infinite Analysis</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showBestMoveArrow}
                          onChange={(e) => setShowBestMoveArrow(e.target.checked)}
                          className="rounded border-slate-800 text-accent bg-slate-950 w-3 h-3"
                        />
                        <span>Draw Best Move Arrow</span>
                      </label>
                    </div>

                    {/* Calculated lines */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/60 max-h-[140px] overflow-y-auto">
                      {Object.values(engineLines).map((line, idx) => (
                        <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 font-mono text-[10px] space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className="text-accent">Line {idx + 1} (depth {line.depth})</span>
                            <span className={parseFloat(line.score) >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {parseFloat(line.score) > 0 ? '+' : ''}{line.score}
                            </span>
                          </div>
                          <p className="text-slate-350 line-clamp-2 leading-relaxed">{line.pv}</p>
                        </div>
                      ))}
                      {Object.keys(engineLines).length === 0 && (
                        <p className="text-slate-500 italic text-[10px]">Calculating position lines...</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Move History */}
          <div className="space-y-2 flex flex-col flex-grow min-h-[180px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Move List ({moveHistory.length})
              </span>
              {moveHistory.length > 0 && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const pgnStr = gameRef.current.pgn();
                      navigator.clipboard.writeText(pgnStr);
                      alert('📋 Full Game PGN copied to clipboard!');
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[10px] rounded-md transition-colors"
                    title="Copy full game PGN notation"
                  >
                    📋 Copy PGN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pgnStr = gameRef.current.pgn();
                      const blob = new Blob([pgnStr], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `ChessHub_Class_${classId || 'Game'}.pgn`;
                      a.click();
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[10px] rounded-md transition-colors"
                    title="Download PGN file to local device"
                  >
                    💾 Save PGN
                  </button>
                </div>
              )}
            </div>
            <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl flex-grow overflow-y-auto max-h-[220px]">
              {moveHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">No moves played yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                  {moveHistory.map((move, idx) => {
                    if (idx % 2 === 0) {
                      const moveNum = Math.floor(idx / 2) + 1;
                      const isWhiteActive = reviewIndex === idx;
                      const isBlackActive = reviewIndex === idx + 1;
                      return (
                        <div key={idx} className="col-span-2 flex justify-between py-1 border-b border-slate-800/10">
                          <span className="text-slate-500 w-8">{moveNum}.</span>
                          <button
                            onClick={() => {
                              setReviewIndex(idx);
                              const selectedFen = fenHistory[idx + 1];
                              setFen(selectedFen);
                            }}
                            className={`flex-1 text-left font-semibold hover:text-accent transition-colors ${
                              isWhiteActive ? 'text-accent underline' : 'text-slate-200'
                            }`}
                          >
                            {move}
                          </button>
                          {moveHistory[idx + 1] && (
                            <button
                              onClick={() => {
                                setReviewIndex(idx + 1);
                                const selectedFen = fenHistory[idx + 2];
                                setFen(selectedFen);
                              }}
                              className={`flex-1 text-left font-semibold hover:text-accent transition-colors ${
                                isBlackActive ? 'text-accent underline' : 'text-slate-350'
                              }`}
                            >
                              {moveHistory[idx + 1]}
                            </button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FEN / PGN Import/Export Popup Modal */}
      {showImportExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white">
              {showImportExportModal === 'fen' ? 'FEN Position Tools' : 'PGN Variation Tools'}
            </h3>

            {showImportExportModal === 'fen' ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold mb-1">Export Current FEN Position:</span>
                  <div className="bg-slate-950/80 font-mono p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-nowrap text-accent tracking-wide">
                    {fen}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fen);
                      alert('FEN string copied to clipboard!');
                    }}
                    className="mt-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-bold"
                  >
                    Copy FEN
                  </button>
                </div>

                {!isReadOnly && (
                  <form onSubmit={handleLoadCustomFen} className="space-y-2">
                    <label className="block text-slate-400 font-bold">Import / Load Position FEN:</label>
                    <input
                      type="text"
                      placeholder="Paste valid FEN position..."
                      value={fenInput}
                      onChange={(e) => setFenInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowImportExportModal(null)}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="secondary" className="bg-accent text-surface-dark">
                        Load Position
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs">  
                <div>
                  <span className="block text-slate-400 font-bold mb-1">Export / View PGN Data:</span>
                  <textarea
                    readOnly
                    value={gameRef.current.pgn() || 'No moves played yet.'}
                    rows={4}
                    className="w-full bg-slate-950/80 font-mono p-3 rounded-xl border border-slate-800 text-slate-300 focus:outline-none"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(gameRef.current.pgn());
                        alert('PGN copied to clipboard!');
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-bold"
                    >
                      Copy PGN
                    </button>
                    <button
                      onClick={downloadPgnFile}
                      className="px-3 py-1 bg-accent hover:bg-accent-hover rounded text-surface-dark font-bold"
                    >
                      Download PGN File
                    </button>
                  </div>
                </div>

                {!isReadOnly && (
                  <form onSubmit={handleLoadCustomPgn} className="space-y-2">
                    <label className="block text-slate-400 font-bold">Import / Load PGN Game:</label>
                    <textarea
                      placeholder="Paste chess game PGN here..."
                      value={pgnInput}
                      onChange={(e) => setPgnInput(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowImportExportModal(null)}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="secondary" className="bg-accent text-surface-dark">
                        Load PGN
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
            <button
              onClick={() => setShowImportExportModal(null)}
              className="absolute top-2 right-4 text-slate-400 hover:text-white font-bold text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Play Position with Bot Modal */}
      {showPlayBotModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl space-y-4 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-bold text-lg text-accent">
                  🤖 Play Current Position against Stockfish Bot
                </h3>
                <p className="text-xs text-slate-400">
                  Select a difficulty level (Level 1 Pawn to Level 8 GM) and test your custom position!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlayBotModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <PlayBotBoardModal
              initialFen={fen}
              classId={classId}
              onCloseCustom={() => setShowPlayBotModal(false)}
            />
          </div>
        </div>
      )}

      {/* ⚡ 1-Click Assign Board Position as Homework Modal */}
      {showAssignHomeworkModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative my-8 text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-bold text-lg text-emerald-400 flex items-center gap-2">
                  <span>⚡ Assign Board Position as Homework</span>
                </h3>
                <p className="text-xs text-slate-400">
                  1-Click assign this exact position as a tactical puzzle to your class!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAssignHomeworkModal(false);
                  setHomeworkAssignedSuccess(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {homeworkAssignedSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                <div className="text-3xl">🎉</div>
                <p className="text-sm font-bold text-emerald-300">
                  Homework Position Assigned Successfully!
                </p>
                <p className="text-xs text-slate-400">
                  Students can now solve this puzzle in their Homework Dashboard.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowAssignHomeworkModal(false);
                    setHomeworkAssignedSuccess(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full"
                >
                  Close Window
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    value={homeworkTitle}
                    onChange={(e) => setHomeworkTitle(e.target.value)}
                    placeholder="e.g. Tactical Challenge: Find Mate in 1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Board Position (FEN)
                  </label>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-400 break-all">
                    {fen}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isAssigningHomework}
                  onClick={async () => {
                    setIsAssigningHomework(true);
                    const res = await assignCustomPositionHomeworkAction({
                      title: homeworkTitle || 'Classroom Tactical Challenge',
                      fen: fen,
                      classId: classId,
                    });
                    setIsAssigningHomework(false);
                    if (res.success) {
                      setHomeworkAssignedSuccess(true);
                    } else {
                      alert(res.error?.message || 'Failed to assign homework.');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full py-2 text-xs"
                >
                  {isAssigningHomework ? 'Assigning...' : '🚀 Submit Assignment to Class'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
