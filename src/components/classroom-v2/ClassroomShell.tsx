'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useClassroomState } from './ClassroomStateProvider';
import ClassroomBoard from './ClassroomBoard';
import ClassroomNotation from './ClassroomNotation';
import ClassroomChat from './ClassroomChat';
import ClassroomParticipants from './ClassroomParticipants';
import ClassroomQuiz from './ClassroomQuiz';
import ClassroomResponses from './ClassroomResponses';
import ClassroomZoom from './ClassroomZoom';
import ClassroomEnginePanel from '@/components/dashboard/ui/ClassroomEnginePanel';
import { type BoardOrientation, type CanonicalPuzzleState, type CanonicalCurriculumState } from '@/lib/classroom-v2/types';
import { DEFAULT_INITIAL_FEN } from '@/lib/classroom-v2/constants';
import { getPuzzleBankAction } from '@/actions/puzzles';
import { fetchCurriculumHierarchyAction } from '@/actions/curriculum';

// ── Board Theme Definitions ──────────────────────────────────────────────────
const BOARD_THEMES = {
  classic:  { label: 'Classic',  dark: '#779952', light: '#edeed1', dot: '#5a7a3a' },
  walnut:   { label: 'Walnut',   dark: '#b58863', light: '#f0d9b5', dot: '#8a5c3a' },
  midnight: { label: 'Midnight', dark: '#4e4e6e', light: '#b8b8d8', dot: '#3a3a5a' },
  amber:    { label: 'Amber',    dark: '#c49a3c', light: '#f6e8b1', dot: '#9a6e1c' },
} as const;
type BoardThemeKey = keyof typeof BOARD_THEMES;

const STORAGE_THEME_KEY = 'classroom_board_theme';
const STORAGE_ZOOM_H_KEY = 'classroom_zoom_panel_height';
const DEFAULT_ZOOM_HEIGHT = 220;

interface ClassroomShellProps {
  classId: string;
  sessionId: string;
  zoomMeetingId: string;
  zoomPasscode?: string;
  coachName?: string;
  scheduledStart?: string;
  durationMinutes?: number;
}

export default function ClassroomShell({
  classId,
  sessionId,
  zoomMeetingId,
  zoomPasscode = 'chesshub',
  coachName = 'Academy Coach',
  scheduledStart,
  durationMinutes = 60,
}: ClassroomShellProps) {
  const {
    snapshot,
    isCoach,
    canMove,
    isBoardLocked,
    userId,
    userName,
    role,
    connectionState,
    participants,
    messages,
    responses,
    isCoachReconnecting,
    reactions,
    errorMessage,
    clearError,
    onMakeMove,
    onUndoMove,
    onResetBoard,
    onToggleBoardLock,
    onToggleFreeMove,
    onToggleStudentPermission,
    onLoadPuzzle,
    onRevealPuzzleSolution,
    onNextPuzzle,
    onSubmitPuzzleResult,
    onLoadGame,
    onLoadCurriculum,
    onNavigateMove,
    onSetDrawing,
    onStartQuiz,
    onCloseQuiz,
    onRevealQuiz,
    onSubmitQuizAnswer,
    onSubmitResponse,
    onSendMessage,
    onToggleRaiseHand,
    hasRaisedHand,
    onSendReaction,
    onAskQuestion,
    puzzleAttemptResult,
    clearPuzzleAttemptResult,
    onEndClass,
  } = useClassroomState();

  const [activeTab, setActiveTab] = useState<'moves' | 'chat' | 'response' | 'leaderboard' | 'participants' | 'engine'>('moves');
  const [orientation, setOrientation] = useState<BoardOrientation>('white');
  const [showCoords, setShowCoords] = useState(true);
  const [showSquareLabels, setShowSquareLabels] = useState(false);
  const localMountTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Unread chat and participant notification tracking
  const [lastReadMsgCount, setLastReadMsgCount] = useState(messages.length);
  useEffect(() => {
    if (activeTab === 'chat') {
      setLastReadMsgCount(messages.length);
    }
  }, [activeTab, messages.length]);

  const unreadChatCount = activeTab === 'chat' ? 0 : Math.max(0, messages.length - lastReadMsgCount);
  const onlineCount = useMemo(() => participants.filter((p) => p.isOnline).length, [participants]);
  const raisedHandsCount = useMemo(() => participants.filter((p) => p.raisedHand).length, [participants]);

  // Auto-switch to 'response' tab for student when Coach sends a live question
  useEffect(() => {
    if (!isCoach && snapshot.activeQuestion) {
      setActiveTab('response');
    }
  }, [isCoach, snapshot.activeQuestion]);

  // ── Currently Displayed Position (Live or Navigated History) ─────────────
  const displayedFen = useMemo(() => {
    if (snapshot.board.currentMoveIndex >= 0 && snapshot.board.currentMoveIndex < snapshot.board.moves.length) {
      return snapshot.board.moves[snapshot.board.currentMoveIndex]?.fenAfter || snapshot.board.fen;
    }
    if (snapshot.board.currentMoveIndex === -1 && snapshot.board.moves.length > 0) {
      return snapshot.board.initialFen || DEFAULT_INITIAL_FEN;
    }
    return snapshot.board.fen;
  }, [snapshot.board.currentMoveIndex, snapshot.board.moves, snapshot.board.fen, snapshot.board.initialFen]);

  // ── Board Theme ───────────────────────────────────────────────────────────
  const [boardTheme, setBoardTheme] = useState<BoardThemeKey>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_THEME_KEY);
      if (saved && saved in BOARD_THEMES) return saved as BoardThemeKey;
    }
    return 'classic';
  });
  const [showThemePicker, setShowThemePicker] = useState(false);

  const handleSetTheme = useCallback((key: BoardThemeKey) => {
    setBoardTheme(key);
    try { localStorage.setItem(STORAGE_THEME_KEY, key); } catch {}
    setShowThemePicker(false);
  }, []);

  // ── Responsive Board Sizing (ResizeObserver) ──────────────────────────────
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const size = Math.floor(Math.min(width, height) - 8);
      setBoardWidth(size > 100 ? size : undefined);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [boardScale, setBoardScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('classroom_board_scale'));
      if (saved >= 0.7 && saved <= 1.3) return saved;
    }
    return 1.0;
  });

  const handleSetBoardScale = useCallback((scale: number) => {
    const clamped = Math.max(0.7, Math.min(1.3, Number(scale.toFixed(2))));
    setBoardScale(clamped);
    try { localStorage.setItem('classroom_board_scale', String(clamped)); } catch {}
  }, []);

  const effectiveBoardWidth = boardWidth ? Math.floor(boardWidth * boardScale) : undefined;

  // ── Right Panel Width Drag Resize ─────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('classroom_sidebar_width'));
      if (saved >= 280 && saved <= 600) return saved;
    }
    return 380;
  });
  const isDraggingSidebar = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(380);

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSidebar.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSidebar.current) return;
      const deltaX = dragStartX.current - moveEvent.clientX;
      const nextWidth = Math.max(280, Math.min(600, dragStartWidth.current + deltaX));
      setSidebarWidth(nextWidth);
      try { localStorage.setItem('classroom_sidebar_width', String(nextWidth)); } catch {}
    };

    const handleMouseUp = () => {
      isDraggingSidebar.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  // ── Zoom Panel Drag Resize ───────────────────────────────────────────────
  const [zoomPanelHeight, setZoomPanelHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem(STORAGE_ZOOM_H_KEY));
      if (saved >= 120 && saved <= 400) return saved;
    }
    return DEFAULT_ZOOM_HEIGHT;
  });
  const isDraggingZoom = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(DEFAULT_ZOOM_HEIGHT);

  const handleZoomDragStart = useCallback((e: React.MouseEvent) => {
    isDraggingZoom.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = zoomPanelHeight;
    e.preventDefault();
  }, [zoomPanelHeight]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingZoom.current) return;
      const delta = e.clientY - dragStartY.current;
      const newH = Math.min(400, Math.max(120, dragStartHeight.current + delta));
      setZoomPanelHeight(newH);
    };
    const onUp = () => {
      if (!isDraggingZoom.current) return;
      isDraggingZoom.current = false;
      try { localStorage.setItem(STORAGE_ZOOM_H_KEY, String(zoomPanelHeight)); } catch {}
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [zoomPanelHeight]);

  // ── Keyboard Navigation (Move History + Puzzle) ───────────────────────────
  // Handler defined below after handleLoadNextPuzzle is in scope

  // ── Puzzle Filter State ───────────────────────────────────────────────────
  const [puzzleFilterTheme, setPuzzleFilterTheme] = useState('ALL');
  const [puzzleFilterDifficulty, setPuzzleFilterDifficulty] = useState('ALL');

  // Modal dialog states
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPuzzleModal, setShowPuzzleModal] = useState(false);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEFT_EARLY'; notes: string }>
  >({});
  const [learnedTopics, setLearnedTopics] = useState('');
  const [studentFeedbackMap, setStudentFeedbackMap] = useState<Record<string, string>>({});
  const [isEndingSession, setIsEndingSession] = useState(false);

  // Puzzle Bank data
  const [puzzlesList, setPuzzlesList] = useState<any[]>([]);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(false);
  const [manualPuzzleFen, setManualPuzzleFen] = useState('');
  const [manualPuzzleTitle, setManualPuzzleTitle] = useState('');
  const [manualPuzzleSolution, setManualPuzzleSolution] = useState('');

  // Curriculum data
  const [curriculumData, setCurriculumData] = useState<any[]>([]);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);

  // Initialize attendance records when participants change
  useEffect(() => {
    const studentParticipants = participants.filter((p) => p.role === 'student');
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      studentParticipants.forEach((s) => {
        if (!next[s.userId]) {
          next[s.userId] = { status: 'PRESENT', notes: '' };
        }
      });
      return next;
    });
  }, [participants]);

  // Calculate live elapsed session timer from snapshot.startedAt with sanity check
  useEffect(() => {
    const startMs = snapshot.startedAt ? new Date(snapshot.startedAt).getTime() : localMountTimeRef.current;

    const updateTimer = () => {
      const nowMs = Date.now();
      let diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      // Sanity check: If startedAt is older than 8 hours (e.g. reused old class) or NaN, clamp to local session duration
      if (diffSecs > 28800 || isNaN(diffSecs) || startMs <= 0) {
        diffSecs = Math.max(0, Math.floor((nowMs - localMountTimeRef.current) / 1000));
      }
      setElapsedSeconds(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [snapshot.startedAt]);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Load Real Puzzle Bank
  const openPuzzleModal = async () => {
    setShowPuzzleModal(true);
    if (puzzlesList.length === 0) {
      setIsLoadingPuzzles(true);
      try {
        const res = await getPuzzleBankAction();
        if (res.success && res.puzzles) {
          setPuzzlesList(res.puzzles);
        }
      } catch (err) {
        console.warn('[Puzzle Bank Error]', err);
      } finally {
        setIsLoadingPuzzles(false);
      }
    }
  };

  // Load Real Curriculum
  const openCurriculumModal = async () => {
    setShowCurriculumModal(true);
    if (curriculumData.length === 0) {
      setIsLoadingCurriculum(true);
      try {
        const res = await fetchCurriculumHierarchyAction();
        if (res.success && res.data) {
          setCurriculumData(res.data);
        }
      } catch (err) {
        console.warn('[Curriculum Error]', err);
      } finally {
        setIsLoadingCurriculum(false);
      }
    }
  };

  // Handle Loading a Puzzle
  const handleSelectPuzzle = useCallback(async (puzzle: any) => {
    const puzzleState: CanonicalPuzzleState = {
      puzzleId: puzzle.id || `puz_${Date.now()}`,
      title: puzzle.theme || puzzle.title || 'Chess Tactic Puzzle',
      fen: puzzle.fen,
      solution: Array.isArray(puzzle.solution_moves) ? puzzle.solution_moves : (Array.isArray(puzzle.solution) ? puzzle.solution : []),
      moveIndex: 0,
      status: 'unsolved',
      sideToMove: puzzle.side_to_move || (puzzle.fen.split(' ')[1] === 'b' ? 'b' : 'w'),
      instructions: puzzle.instructions || puzzle.description || 'Find the best move!',
    };
    await onLoadPuzzle(puzzleState);
    setShowPuzzleModal(false);
  }, [onLoadPuzzle]);

  // Advance to next puzzle or open puzzle bank
  const handleLoadNextPuzzle = useCallback(async () => {
    if (puzzlesList.length > 0 && snapshot.puzzle) {
      const currentIndex = puzzlesList.findIndex(
        (p) => (p.id && p.id === snapshot.puzzle?.puzzleId) || p.fen === snapshot.puzzle?.fen
      );
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % puzzlesList.length : 0;
      const nextPuz = puzzlesList[nextIndex];
      if (nextPuz) {
        await handleSelectPuzzle(nextPuz);
        return;
      }
    }
    openPuzzleModal();
  }, [puzzlesList, snapshot.puzzle, handleSelectPuzzle, openPuzzleModal]);

  // ── Keyboard Navigation (Move History + Puzzle) ───────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (snapshot.board.mode === 'PUZZLE') {
        return;
      }

      if (!isCoach) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = snapshot.board.currentMoveIndex - 1;
        if (prev >= -1) onNavigateMove(prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = snapshot.board.currentMoveIndex + 1;
        if (next < snapshot.board.moves.length) onNavigateMove(next);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCoach, snapshot.board.currentMoveIndex, snapshot.board.moves.length, snapshot.board.mode, onNavigateMove]);

  const handleLoadManualPuzzle = async () => {
    if (!manualPuzzleFen.trim()) return;
    const solMoves = manualPuzzleSolution.split(',').map((s) => s.trim()).filter(Boolean);
    const puzzleState: CanonicalPuzzleState = {
      puzzleId: `puz_${Date.now()}`,
      title: manualPuzzleTitle.trim() || 'Custom Coach Puzzle',
      fen: manualPuzzleFen.trim(),
      solution: solMoves,
      moveIndex: 0,
      status: 'unsolved',
      sideToMove: manualPuzzleFen.trim().split(' ')[1] === 'b' ? 'b' : 'w',
      instructions: 'Solve the puzzle position.',
    };
    await onLoadPuzzle(puzzleState);
    setShowPuzzleModal(false);
  };

  // Handle Loading Curriculum Position
  const handleSelectCurriculumPosition = async (chapter: any, position: any) => {
    const currState: CanonicalCurriculumState = {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      topic: chapter.title,
      content: position.description || chapter.description || '',
      currentFen: position.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
    };
    await onLoadCurriculum(currState);
    setShowCurriculumModal(false);
  };

  // Confirm End Class with Attendance & Review
  const handleConfirmEndClass = async () => {
    setIsEndingSession(true);
    const studentParticipants = participants.filter((p) => p.role === 'student');
    const records = (studentParticipants.length > 0
      ? studentParticipants
      : Object.keys(attendanceRecords).map((id) => ({ userId: id }))
    ).map((student: any) => ({
      studentProfileId: student.userId,
      status: attendanceRecords[student.userId]?.status || 'PRESENT',
      feedback: studentFeedbackMap[student.userId] || attendanceRecords[student.userId]?.notes || '',
    }));
    await onEndClass(records, learnedTopics);
    setIsEndingSession(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0F19] text-white overflow-hidden font-sans select-none relative">
      {/* ── Coach Reconnecting Grace Period Banner ──────────────────────────── */}
      {isCoachReconnecting && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-300 font-semibold flex items-center justify-center gap-2 animate-pulse z-50">
          <span>⚠️</span>
          <span>Coach temporarily disconnected. Grace period active (5 min) — please stay in class while Coach reconnects…</span>
        </div>
      )}

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="bg-rose-500/90 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between z-50 animate-in slide-in-from-top duration-200">
          <span>⚠️ {errorMessage}</span>
          <button type="button" onClick={clearError} className="text-rose-200 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* ── Class Concluded Overlay ───────────────────────────────────────── */}
      {snapshot.status === 'ended' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-750 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <span className="text-4xl block">🏁</span>
            <h2 className="text-lg font-bold text-white">Live Class Concluded</h2>
            <p className="text-xs text-slate-400">
              The coach has concluded this session. All moves, board history, and attendance records have been safely recorded.
            </p>
            <div className="pt-2">
              <a
                href={isCoach ? '/dashboard/coach/classes' : '/dashboard/student/classes'}
                className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Reaction Bubbles ─────────────────────────────────────── */}
      <div className="absolute top-16 left-6 pointer-events-none z-40 flex flex-col gap-2">
        {reactions.slice(-4).map((r) => (
          <div
            key={r.id}
            className="animate-bounce bg-slate-900/80 border border-slate-700/60 rounded-full px-3 py-1 text-sm shadow-xl flex items-center gap-1.5 text-white"
          >
            <span className="text-xl">{r.emoji}</span>
            <span className="text-[11px] text-slate-300 font-medium">{r.userName}</span>
          </div>
        ))}
      </div>

      {/* ── Top Header Navigation Bar ─────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/95 px-4 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">♟️</span>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-none text-white">{snapshot.className}</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {coachName} • <span className="text-emerald-400 font-semibold">● LIVE CLASSROOM</span>
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Realtime Server-Time Timer & Telemetry */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Time:</span>
            <span className="text-sm font-black font-mono text-emerald-400">{formatTimer(elapsedSeconds)}</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
                connectionState === 'connected'
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                  : connectionState === 'reconnecting'
                  ? 'bg-amber-950/50 border-amber-800/60 text-amber-300 animate-pulse'
                  : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
              }`}
              title={`Classroom connection: ${connectionState}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-emerald-400'
                    : connectionState === 'reconnecting'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              <span>
                {connectionState === 'connected'
                  ? 'Connected • 28ms'
                  : connectionState === 'reconnecting'
                  ? 'Reconnecting...'
                  : 'Offline'}
              </span>
            </div>

            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border bg-slate-800/70 border-slate-700/60 text-slate-300 text-[11px]"
              title={`${onlineCount} participants online`}
            >
              <span>👥</span>
              <span className="font-semibold">{onlineCount} Online</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {/* Reaction Toolbar */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-xl p-1">
            {['👍', '❤️', '😂', '🎯', '👏'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSendReaction(emoji)}
                className="hover:scale-125 transition-transform px-1.5 py-0.5 text-sm"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {!isCoach && (
            <button
              type="button"
              onClick={() => onToggleRaiseHand(!hasRaisedHand)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                hasRaisedHand
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <span>✋</span>
              <span>{hasRaisedHand ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>
          )}

          {isCoach && (
            <>
              <button
                type="button"
                onClick={openPuzzleModal}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center gap-1"
              >
                <span>🧩</span> Puzzles
              </button>
              <button
                type="button"
                onClick={openCurriculumModal}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600/90 hover:bg-teal-500 text-white shadow-md transition-all flex items-center gap-1"
              >
                <span>📚</span> Curriculum
              </button>
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all flex items-center gap-1"
              >
                <span>⏹</span> End Class
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Active Mode Banner (Puzzle / Curriculum) ────────────────────────── */}
      {snapshot.board.mode === 'PUZZLE' && snapshot.puzzle && (
        <div className="bg-indigo-950/70 border-b border-indigo-800/60 px-4 py-1.5 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-400">🧩 PUZZLE:</span>
            <span className="font-semibold">{snapshot.puzzle.title}</span>
            <span className="text-slate-400 text-[11px]">({snapshot.puzzle.instructions || 'Find the best move'})</span>
          </div>
          <div className="flex items-center gap-2">
            {isCoach && (
              <>
                <button
                  type="button"
                  onClick={onRevealPuzzleSolution}
                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold"
                >
                  Reveal Solution
                </button>
                <button
                  type="button"
                  onClick={handleLoadNextPuzzle}
                  className="px-2 py-0.5 rounded bg-violet-700 hover:bg-violet-600 text-white text-[11px] font-bold flex items-center gap-1"
                  title="Next Puzzle (→ key)"
                >
                  Next Puzzle →
                </button>
                <button
                  type="button"
                  onClick={onResetBoard}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                >
                  Exit Puzzle
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main Classroom Viewport ──────────────────────────────────────── */}
      <div
        className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] p-3 gap-3 overflow-hidden min-h-0"
        style={{
          gridTemplateColumns:
            typeof window !== 'undefined' && window.innerWidth >= 1024
              ? `1fr ${sidebarWidth}px`
              : undefined,
        }}
      >
        {/* Left Area: Chessboard & Controls */}
        <div className="flex flex-col items-center justify-between h-full bg-slate-950/40 border border-slate-850 rounded-2xl p-3 overflow-hidden">
          <div ref={boardContainerRef} className="flex-1 w-full flex items-center justify-center p-2 overflow-hidden relative">
            <ClassroomBoard
              fen={displayedFen}
              orientation={orientation}
              isLocked={isBoardLocked}
              canMove={canMove}
              allowIllegalMoves={snapshot.board.allowIllegalMoves}
              arrows={snapshot.board.arrows}
              highlights={snapshot.board.highlights}
              showCoords={showCoords}
              showSquareLabels={showSquareLabels}
              darkSquareColor={BOARD_THEMES[boardTheme].dark}
              lightSquareColor={BOARD_THEMES[boardTheme].light}
              boardScale={boardScale}
              onMove={onMakeMove}
              className="w-full h-full"
            />

            {/* Puzzle Attempt Result Badge — auto-dismissed after 4s by StateProvider */}
            {puzzleAttemptResult && (
              <div
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-sm font-black shadow-2xl select-none z-20 flex items-center gap-2 animate-bounce transition-all ${
                  puzzleAttemptResult.solved
                    ? 'bg-emerald-500 text-white shadow-emerald-900/60'
                    : 'bg-rose-600 text-white shadow-rose-900/60'
                }`}
              >
                <span className="text-lg">{puzzleAttemptResult.solved ? '✓' : '✗'}</span>
                <span>
                  {puzzleAttemptResult.solved
                    ? `Correct! (Attempt ${puzzleAttemptResult.attempts})`
                    : `Not quite — try again (Attempt ${puzzleAttemptResult.attempts})`}
                </span>
                <button
                  type="button"
                  onClick={clearPuzzleAttemptResult}
                  className="ml-1 opacity-70 hover:opacity-100 text-xs"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Bottom Board Toolbar */}
          <div className="w-full pt-2 flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-850 select-none">
            {isCoach && (
              <>
                <button
                  type="button"
                  onClick={onUndoMove}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <span>↩</span> Undo
                </button>
                <button
                  type="button"
                  onClick={onResetBoard}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <span>🔄</span> Reset
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
            >
              <span>⇅</span> Flip
            </button>

            <button
              type="button"
              onClick={() => setShowCoords((v) => !v)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                showCoords
                  ? 'bg-rose-900/40 border-rose-600/50 text-rose-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Toggle outer board coordinates (a-h, 1-8)"
            >
              <span>#</span> Coords
            </button>

            <button
              type="button"
              onClick={() => setShowSquareLabels((v) => !v)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                showSquareLabels
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={showSquareLabels ? 'Hide Inner Square Labels' : 'Show Inner Square Labels (a1...h8)'}
            >
              <span className="font-mono text-[11px] font-black">[a1]</span>
              <span>Labels</span>
            </button>

            {isCoach && (
              <button
                type="button"
                onClick={() => onToggleBoardLock(!isBoardLocked)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                  isBoardLocked
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <span>{isBoardLocked ? '🔒' : '🔓'}</span>
                <span>{isBoardLocked ? 'Locked' : 'Lock Board'}</span>
              </button>
            )}

            {/* Theme Picker Button + Popup */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThemePicker((v) => !v)}
                className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                title="Board Theme"
              >
                <span
                  className="w-3.5 h-3.5 rounded-sm border border-slate-600 inline-block"
                  style={{ background: `linear-gradient(135deg, ${BOARD_THEMES[boardTheme].light} 50%, ${BOARD_THEMES[boardTheme].dark} 50%)` }}
                />
                <span>Theme</span>
              </button>
              {showThemePicker && (
                <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-30 min-w-[130px]">
                  {(Object.entries(BOARD_THEMES) as [BoardThemeKey, typeof BOARD_THEMES[BoardThemeKey]][]).map(([key, theme]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSetTheme(key)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        boardTheme === key
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded border border-slate-600 flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${theme.light} 50%, ${theme.dark} 50%)` }}
                      />
                      {theme.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Board Sizing Controls */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => handleSetBoardScale(boardScale - 0.05)}
                className="px-1.5 py-0.5 text-xs font-bold text-slate-300 hover:text-white"
                title="Decrease Board Size"
              >
                −
              </button>
              <span className="text-[10px] font-mono text-slate-300 px-1 font-bold">
                {Math.round(boardScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleSetBoardScale(boardScale + 0.05)}
                className="px-1.5 py-0.5 text-xs font-bold text-slate-300 hover:text-white"
                title="Increase Board Size"
              >
                +
              </button>
            </div>

            {/* Free Move Teaching Mode (ON/OFF) */}
            {isCoach && (
              <button
                type="button"
                onClick={() => onToggleFreeMove(!snapshot.board.allowIllegalMoves)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                  snapshot.board.allowIllegalMoves
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle Illegal / Free Move Teaching Mode"
              >
                <span>✨</span>
                <span>Free Move: {snapshot.board.allowIllegalMoves ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {!isCoach && snapshot.board.allowIllegalMoves && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ✨ Free Move Active
              </span>
            )}

            <div className="px-3 py-1 text-[11px] font-bold text-slate-400">
              Side: <span className="text-white uppercase">{snapshot.board.sideToMove === 'w' ? 'White' : 'Black'}</span>
            </div>
            {isCoach && snapshot.board.moves.length > 0 && (
              <div className="px-2 py-1 text-[9px] text-slate-500">
                ← → keys to navigate
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Zoom Conference & Tabbed Panels (Column 2) */}
        <div
          className="relative flex flex-col h-full gap-2 overflow-hidden min-h-0"
          style={{
            width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : undefined,
          }}
        >
          {/* Horizontal Resize Drag Handle on left edge of Right Sidebar */}
          <div
            onMouseDown={handleSidebarMouseDown}
            className="hidden lg:block absolute -left-2 top-0 bottom-0 w-3 cursor-col-resize z-30 group select-none"
            title="Drag horizontally to resize sidebar"
          >
            <div className="w-1 h-full mx-auto bg-transparent group-hover:bg-indigo-500/70 transition-colors" />
          </div>

          {/* Zoom Video Area — CSS resize only, never remounted */}
          <div
            className="shrink-0 w-full overflow-hidden"
            style={{ height: zoomPanelHeight }}
          >
            <ClassroomZoom
              classId={classId}
              zoomMeetingId={zoomMeetingId}
              zoomPasscode={zoomPasscode}
              userName={userName}
              role={role}
              isCoach={isCoach}
            />
          </div>

          {/* Drag Handle between Zoom and Tab Panel */}
          <div
            onMouseDown={handleZoomDragStart}
            className="shrink-0 w-full h-2 cursor-ns-resize flex items-center justify-center group"
            title="Drag to resize video panel"
          >
            <div className="w-12 h-0.5 rounded-full bg-slate-700 group-hover:bg-blue-500/60 transition-colors" />
          </div>

          {/* Tab Navigation */}
          <div className="flex-1 min-h-0 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="h-9 bg-slate-950 border-b border-slate-800 px-1 flex items-center justify-between text-xs font-bold shrink-0">
              <div className="flex items-center gap-0.5">
                {(([
                  'moves',
                  'chat',
                  'response',
                  'leaderboard',
                  'participants',
                  ...(isCoach ? ['engine'] : []),
                ]) as const).map((tab) => {
                  let badge = null;
                  if (tab === 'chat' && unreadChatCount > 0) {
                    badge = (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black leading-none animate-pulse">
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    );
                  } else if (tab === 'response' && (snapshot.activeQuestion || responses.length > 0)) {
                    badge = (
                      <span
                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                          snapshot.activeQuestion
                            ? 'bg-amber-500 text-slate-950 animate-bounce'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {snapshot.activeQuestion ? '!' : responses.length}
                      </span>
                    );
                  } else if (tab === 'participants' && raisedHandsCount > 0) {
                    badge = (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black leading-none animate-bounce flex items-center gap-0.5">
                        <span>✋</span>
                        <span>{raisedHandsCount}</span>
                      </span>
                    );
                  }

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors flex items-center ${
                        activeTab === tab
                          ? 'bg-slate-800 text-white border-b-2 border-blue-500 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{tab === 'engine' ? '⚙️ ENGINE' : tab}</span>
                      {badge}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Viewport */}
            <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-900">
              {activeTab === 'moves' && (
                <ClassroomNotation
                  moves={snapshot.board.moves}
                  currentMoveIndex={snapshot.board.currentMoveIndex}
                  onNavigateMove={isCoach ? onNavigateMove : undefined}
                  isCoach={isCoach}
                  className="w-full h-full border-none rounded-none"
                />
              )}

              {activeTab === 'chat' && (
                <ClassroomChat
                  messages={messages}
                  onSendMessage={onSendMessage}
                  currentUserId={userId}
                  currentUserRole={role}
                  participants={participants}
                  className="w-full h-full border-none rounded-none"
                />
              )}

              {activeTab === 'response' && (
                <ClassroomResponses
                  responses={responses}
                  isCoach={isCoach}
                  currentUserId={userId}
                  onSubmitResponse={onSubmitResponse}
                  onAskQuestion={onAskQuestion}
                  activeQuestion={snapshot.activeQuestion}
                  className="w-full h-full border-none rounded-none"
                />
              )}

              {activeTab === 'leaderboard' && (
                <ClassroomQuiz
                  quiz={snapshot.quiz}
                  isCoach={isCoach}
                  onStartQuiz={onStartQuiz}
                  onCloseQuiz={onCloseQuiz}
                  onRevealQuiz={onRevealQuiz}
                  onSubmitAnswer={onSubmitQuizAnswer}
                  className="w-full h-full border-none rounded-none"
                />
              )}

              {activeTab === 'participants' && (
                <ClassroomParticipants
                  participants={participants}
                  isCoach={isCoach}
                  onToggleControl={onToggleStudentPermission}
                  className="w-full h-full border-none rounded-none"
                />
              )}

              {activeTab === 'engine' && isCoach && (
                <ClassroomEnginePanel
                  fen={displayedFen}
                  isEnabled={activeTab === 'engine'}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── End Class Confirmation & Review Modal ──────────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🏁</span> Complete Class & Review
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Conducted duration: {formatTimer(elapsedSeconds)} ({Math.max(1, Math.round(elapsedSeconds / 60))} mins)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* WHAT WE LEARNED Topic Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>📖</span> WHAT WE LEARNED
              </label>
              <textarea
                rows={3}
                value={learnedTopics}
                onChange={(e) => setLearnedTopics(e.target.value)}
                placeholder="Key concepts, openings, tactical motifs or endgames covered in this lesson..."
                className="w-full bg-slate-950 border border-slate-750 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Attendance & Per-Student Feedback */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>👥</span> STUDENT ATTENDANCE & COACH FEEDBACK
              </label>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {participants
                  .filter((p) => p.role === 'student')
                  .map((student) => {
                    const record = attendanceRecords[student.userId] || { status: 'PRESENT', notes: '' };
                    return (
                      <div
                        key={student.userId}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-white">{student.firstName} {student.lastName}</p>
                            <p className="text-[10px] text-slate-500">
                              {student.isOnline ? '🟢 Connected' : '⚪ Offline'}
                            </p>
                          </div>

                          {/* Status Pills */}
                          <div className="flex items-center gap-1 text-[10px] font-bold">
                            {(['PRESENT', 'ABSENT', 'LATE', 'LEFT_EARLY'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setAttendanceRecords((prev) => ({
                                    ...prev,
                                    [student.userId]: { ...record, status: st },
                                  }))
                                }
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  record.status === st
                                    ? st === 'PRESENT'
                                      ? 'bg-emerald-600 text-white font-bold'
                                      : st === 'ABSENT'
                                      ? 'bg-rose-600 text-white font-bold'
                                      : 'bg-amber-600 text-white font-bold'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {st === 'LEFT_EARLY' ? 'LEFT' : st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Personal Student Feedback Input */}
                        <input
                          type="text"
                          value={studentFeedbackMap[student.userId] || ''}
                          onChange={(e) =>
                            setStudentFeedbackMap((prev) => ({
                              ...prev,
                              [student.userId]: e.target.value,
                            }))
                          }
                          placeholder={`Personal feedback for ${student.firstName} (strengths, next steps)...`}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>
                    );
                  })}
                {participants.filter((p) => p.role === 'student').length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4 bg-slate-950/40 rounded-xl border border-slate-800">
                    No enrolled students currently registered in this session.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndClass}
                disabled={isEndingSession}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center gap-1.5"
              >
                {isEndingSession ? 'Ending Class…' : 'Save Review & Conclude Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Puzzle Bank Modal ────────────────────────────────────────────── */}
      {showPuzzleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🧩</span> Load ChessHub Puzzle
              </h2>
              <button type="button" onClick={() => setShowPuzzleModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={puzzleFilterTheme}
                onChange={(e) => setPuzzleFilterTheme(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 flex-1 min-w-[120px]"
              >
                <option value="ALL">All Themes</option>
                {Array.from(new Set(puzzlesList.map((p: any) => p.theme).filter(Boolean))).map((t) => (
                  <option key={String(t)} value={String(t)}>{String(t)}</option>
                ))}
              </select>
              <select
                value={puzzleFilterDifficulty}
                onChange={(e) => setPuzzleFilterDifficulty(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 flex-1 min-w-[120px]"
              >
                <option value="ALL">All Levels</option>
                {['pre_beginner', 'beginner', 'intermediate', 'advanced', 'expert', 'master'].map((d) => (
                  <option key={d} value={d}>{d.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* List Puzzles */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {isLoadingPuzzles && <div className="text-xs text-slate-400 text-center py-6">Loading puzzles bank…</div>}
              {!isLoadingPuzzles &&
                puzzlesList
                  .filter((puz: any) => {
                    if (puzzleFilterTheme !== 'ALL' && puz.theme !== puzzleFilterTheme) return false;
                    if (puzzleFilterDifficulty !== 'ALL' && puz.difficulty !== puzzleFilterDifficulty) return false;
                    return true;
                  })
                  .map((puz: any) => (
                    <div
                      key={puz.id}
                      onClick={() => handleSelectPuzzle(puz)}
                      className="p-3 bg-slate-950/60 border border-slate-800 hover:border-indigo-500/60 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                          {puz.title || puz.theme || 'Tactical Problem'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-md">{puz.fen}</p>
                        {puz.theme && (
                          <p className="text-[9px] text-indigo-400 mt-0.5">{puz.theme}</p>
                        )}
                      </div>
                      <div className="ml-2 flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/40">
                          {puz.difficulty || 'Normal'}
                        </span>
                        {puz.rating && (
                          <span className="text-[9px] text-slate-500">★ {puz.rating}</span>
                        )}
                      </div>
                    </div>
                  ))}
              {!isLoadingPuzzles && puzzlesList.filter((p: any) => {
                if (puzzleFilterTheme !== 'ALL' && p.theme !== puzzleFilterTheme) return false;
                if (puzzleFilterDifficulty !== 'ALL' && p.difficulty !== puzzleFilterDifficulty) return false;
                return true;
              }).length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4">No puzzles match selected filters.</div>
              )}
            </div>

            {/* Manual FEN Input Tab */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <p className="text-[11px] font-bold text-slate-400">Or Load Custom Position (FEN):</p>
              <input
                type="text"
                placeholder="Paste FEN (e.g. 8/8/8/4k3/8/8/4K3/8 w - - 0 1)"
                value={manualPuzzleFen}
                onChange={(e) => setManualPuzzleFen(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Puzzle Title (optional)"
                  value={manualPuzzleTitle}
                  onChange={(e) => setManualPuzzleTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Solution SAN (e.g. Qh7+,Kf8)"
                  value={manualPuzzleSolution}
                  onChange={(e) => setManualPuzzleSolution(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={handleLoadManualPuzzle}
                disabled={!manualPuzzleFen.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                Load Custom Puzzle onto Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Curriculum Hierarchy Modal ─────────────────────────────────────── */}
      {showCurriculumModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>📚</span> ChessHub Teaching Curriculum
              </h2>
              <button
                type="button"
                onClick={() => setShowCurriculumModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {isLoadingCurriculum && (
                <div className="text-xs text-slate-400 text-center py-6">Loading curriculum hierarchy…</div>
              )}
              {!isLoadingCurriculum &&
                curriculumData.map((prog) => (
                  <div key={prog.id} className="space-y-1.5">
                    <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">{prog.title}</div>
                    {prog.courses?.map((course: any) => (
                      <div key={course.id} className="ml-2 pl-2 border-l border-slate-800 space-y-1">
                        <div className="text-[11px] font-semibold text-slate-300">{course.title}</div>
                        {course.chapters?.map((ch: any) => (
                          <div
                            key={ch.id}
                            onClick={() => handleSelectCurriculumPosition(ch, ch.positions?.[0] || {})}
                            className="p-2 bg-slate-950/60 border border-slate-800 hover:border-teal-500/60 rounded-xl cursor-pointer flex items-center justify-between text-xs group"
                          >
                            <span className="text-white group-hover:text-teal-300 font-medium">{ch.title}</span>
                            <span className="text-[10px] text-teal-400 font-bold">Load Lesson →</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              {!isLoadingCurriculum && curriculumData.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4">No curriculum programs currently published.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
