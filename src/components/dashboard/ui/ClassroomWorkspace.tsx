'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { supabase } from '@/utils/supabaseClient';
import ChessWorkspace from './ChessWorkspace';
import ClassroomLocalRecorder from '@/components/dashboard/ui/ClassroomLocalRecorder';
import ZoomClassroomVideo from '@/components/classroom/ZoomClassroomVideo';
import ClassroomLessonDrawer from '@/features/classroom/ClassroomLessonDrawer';
import ClassroomDatabasePanel from '@/components/dashboard/ui/ClassroomDatabasePanel';
import ClearBoardModal, { ClearMode } from './ClearBoardModal';
import ClassroomBottomToolbar from './ClassroomBottomToolbar';
import ClassroomMoveNotation from './ClassroomMoveNotation';
import ClassroomEnginePanel from './ClassroomEnginePanel';
import type { TeachingPosition } from '@/types/curriculum.types';
import ClassroomPreJoinModal from './ClassroomPreJoinModal';
import { startClassAction, submitClassEndReportAction, updateParticipantHeartbeatAction } from '@/actions/classes';
import { listHomeworkAction, listChaptersAction, assignChapterToClassAction } from '@/actions/homework';
import { endZoomMeetingAction } from '@/actions/zoom';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  studentProfileId?: string;
  userId?: string;
}

interface ClassroomWorkspaceProps {
  classId: string;
  sessionId?: string;
  className?: string;
  role: 'admin' | 'coach' | 'student';
  userName: string;
  coachName: string;
  classType: string;
  duration: number;
  scheduledStart: string;
  initialStatus: string;
  students: StudentInfo[];
  zoomStartUrl: string;
  zoomJoinUrl: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  userId: string;
  startedAt?: string | null;
  endedAt?: string | null;
}

interface ChatMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface HomeworkChapter {
  id: string;
  title: string;
  chapter_number: number;
  workbook_id: string;
  pdf_storage_path: string | null;
}

interface HomeworkWorkbook {
  id: string;
  title: string;
  track: string;
}

type RightTab = 'at' | 'chat' | 'response' | 'leaderboard' | 'participants' | 'engine';

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function ClassroomWorkspace({
  classId,
  sessionId,
  className,
  role,
  userName,
  coachName,
  classType,
  duration,
  scheduledStart,
  initialStatus,
  students,
  zoomStartUrl,
  zoomJoinUrl,
  zoomMeetingId,
  zoomPasscode = 'chesshub',
  userId,
  startedAt,
  endedAt,
}: ClassroomWorkspaceProps) {
  const router = useRouter();
  const activeSessionId = sessionId || classId;
  const activeClassName = className || `${classType || 'Group'} (${duration}min)`;
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const isCoach = role === 'coach' || role === 'admin';
  const [showClassroomDiag, setShowClassroomDiag] = useState(false);

  /* ── Effective Zoom Meeting Number ─────────────────────────────────────── */
  const meetingIdFromUrl = (zoomJoinUrl || '').match(/\/j\/(\d+)/)?.[1] || '';
  const cleanClassIdDigits = (classId || '1234567890').replace(/[^0-9]/g, '');
  const fallbackMeetingId = (cleanClassIdDigits.padEnd(10, '8')).slice(0, 11);
  const effectiveMeetingNumber = zoomMeetingId || meetingIdFromUrl || fallbackMeetingId;

  /* ── Embedded Video Mute State ─────────────────────────────────────────── */
  const [jitsiAudioMuted, setJitsiAudioMuted] = useState(false);
  const [jitsiVideoMuted, setJitsiVideoMuted] = useState(false);
  const [jitsiJoined, setJitsiJoined] = useState(false);

  /* ── Persistent Session Timer ───────────────────────────────────────────── */
  const [startedAtTime, setStartedAtTime] = useState<string | null>(() => {
    if (startedAt) return startedAt;
    if (typeof window !== 'undefined' && classId) {
      return localStorage.getItem(`classroom_started_at_${classId}`);
    }
    return null;
  });

  const [endedAtTime, setEndedAtTime] = useState<string | null>(() => {
    if (endedAt) return endedAt;
    if (typeof window !== 'undefined' && classId) {
      return localStorage.getItem(`classroom_ended_at_${classId}`);
    }
    return null;
  });

  const calculateElapsed = useCallback(() => {
    // 1. If completed or endedAtTime set, freeze timer at final duration
    if (status === 'COMPLETED' || endedAtTime) {
      if (startedAtTime && endedAtTime) {
        const startMs = new Date(startedAtTime).getTime();
        const endMs = new Date(endedAtTime).getTime();
        if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
          return Math.floor((endMs - startMs) / 1000);
        }
      }
      if (startedAtTime) {
        const startMs = new Date(startedAtTime).getTime();
        if (!isNaN(startMs)) {
          return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        }
      }
      return duration * 60;
    }

    // 2. Compute elapsed time since startedAtTime (or fallback to scheduledStart)
    const baseIso = startedAtTime || (status === 'LIVE' ? scheduledStart : null);
    if (baseIso) {
      const startMs = new Date(baseIso).getTime();
      if (!isNaN(startMs)) {
        return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      }
    }

    return 0;
  }, [status, startedAtTime, endedAtTime, scheduledStart, duration]);

  const [elapsedSeconds, setElapsedSeconds] = useState(calculateElapsed);

  useEffect(() => {
    setElapsedSeconds(calculateElapsed());

    if (status === 'COMPLETED' || endedAtTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateElapsed, status, endedAtTime]);

  const formatElapsed = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /* ── Layout & Viewport ─────────────────────────────────────────────────── */
  const [isFullscreenBoard, setIsFullscreenBoard] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [rightColWidth, setRightColWidth] = useState(420);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreenBoard(true)).catch(() => setIsFullscreenBoard(false));
    } else {
      document.exitFullscreen().then(() => setIsFullscreenBoard(false)).catch(() => {});
    }
  }, []);

  // Sync isFullscreenBoard state with actual fullscreen changes
  useEffect(() => {
    const handler = () => {
      setIsFullscreenBoard(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  const resizingRef = useRef(false);

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const doDrag = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const newWidth = Math.max(300, Math.min(600, window.innerWidth - moveEvent.clientX));
      setRightColWidth(newWidth);
    };
    const stopDrag = () => {
      resizingRef.current = false;
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  /* ── Media & Modal State ────────────────────────────────────────────────── */
  const [showPreJoinModal, setShowPreJoinModal] = useState(true);
  const [showMoveDots, setShowMoveDots] = useState(true);


  /* ── Lesson & Position State ────────────────────────────────────────────── */
  const [showLessonDrawer, setShowLessonDrawer] = useState(false);
  const [showSetPositionModal, setShowSetPositionModal] = useState(false);
  const [activeLessonPositions, setActiveLessonPositions] = useState<TeachingPosition[]>([]);
  const [activePositionIndex, setActivePositionIndex] = useState(0);
  const [activePosition, setActivePosition] = useState<TeachingPosition | null>(null);

  const handleSelectPosition = (pos: TeachingPosition, lessonPositions: TeachingPosition[], index: number) => {
    setActivePosition(pos);
    setActiveLessonPositions(lessonPositions);
    setActivePositionIndex(index);
    if (pos?.fen) {
      setCurrentFen(pos.fen);
      setBoardKey((k) => k + 1);
      setGameMoves([]);
      setCurrentMoveIndex(-1);
      persistAndBroadcastBoardState(pos.fen, [], -1);

      mainChannelRef.current?.send({
        type: 'broadcast',
        event: 'board-load',
        payload: {
          classId,
          sessionId: activeSessionId,
          fen: pos.fen,
          pgn: (pos as any).pgn || '',
          moves: [],
          puzzleId: pos.id || null,
          title: pos.title || 'Teaching Position',
          description: pos.description || pos.hint || (pos as any).coachNotes || '',
          solution: pos.solution || '',
          explanation: pos.explanation || (pos as any).notes || '',
          chapterTitle: pos.chapterTitle || '',
          orientation: pos.boardOrientation || 'white',
          sourceUserId: userId || userName,
          version: boardVersionRef.current,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  const handleStepPosition = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= activeLessonPositions.length) return;
    handleSelectPosition(activeLessonPositions[newIndex], activeLessonPositions, newIndex);
  };

  /* ── Spotlight ─────────────────────────────────────────────────────────── */
  const [spotlightedStudentId, setSpotlightedStudentId] = useState<string | null>(null);
  const [spotlightedStudentName, setSpotlightedStudentName] = useState<string | null>(null);

  const handleToggleSpotlight = (studentId: string, studentName: string) => {
    if (!isCoach) return;
    const nextId = spotlightedStudentId === studentId ? null : studentId;
    const nextName = nextId ? studentName : null;
    setSpotlightedStudentId(nextId);
    setSpotlightedStudentName(nextName);
    mainChannelRef.current?.send({
      type: 'broadcast',
      event: 'spotlight-student',
      payload: { studentId: nextId, studentName: nextName },
    });
  };

  /* ── Board Toolbar & Moves ─────────────────────────────────────────────── */
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showEngine, setShowEngine] = useState(isCoach);
  const [showMoveList, setShowMoveList] = useState(true);
  const [showClearBoardModal, setShowClearBoardModal] = useState(false);
  const [isBoardLocked, setIsBoardLocked] = useState(false);
  const [allowIllegalMoves, setAllowIllegalMoves] = useState(false);

  // SAN Moves & FEN tracking — loaded from localStorage if present
  const [gameMoves, setGameMoves] = useState<string[]>(() => {
    if (typeof window !== 'undefined' && classId) {
      try {
        const saved = localStorage.getItem(`classroom_moves_${classId}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(() => (gameMoves.length > 0 ? gameMoves.length - 1 : -1));
  const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  // boardKey increments to force ChessWorkspace remount on clear
  const [boardKey, setBoardKey] = useState(0);

  const handleConfirmClearBoard = (mode: ClearMode) => {
    if (mode === 'pieces') {
      // Use a minimal legal FEN with only kings to represent a nearly-empty board
      setCurrentFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      setBoardKey((k) => k + 1);
    } else if (mode === 'drawings') {
      setBoardKey((k) => k + 1);
    } else if (mode === 'everything') {
      setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      setGameMoves([]);
      setCurrentMoveIndex(-1);
      if (typeof window !== 'undefined' && classId) {
        try { localStorage.removeItem(`classroom_moves_${classId}`); } catch {}
      }
      setBoardKey((k) => k + 1);
    }
  };

  /* ── Monotonically Increasing Board Version & Board Controller Authority ──── */
  const boardVersionRef = useRef<number>(1);
  const [boardControllerId, setBoardControllerId] = useState<string>(isCoach ? (userId || userName) : '');

  const isStudentControlGranted = useCallback(() => {
    if (isCoach) return true;
    if (!boardControllerId) return false;
    const target = boardControllerId.trim().toLowerCase();
    const myId = (userId || '').trim().toLowerCase();
    const myName = (userName || '').trim().toLowerCase();

    if (myId && target === myId) return true;
    if (myName && target === myName) return true;
    if (myName && (target.includes(myName) || myName.includes(target))) return true;

    const currentStudent = students.find(
      (s: any) =>
        (s.userId && s.userId.trim().toLowerCase() === target) ||
        (s.studentProfileId && s.studentProfileId.trim().toLowerCase() === target) ||
        (`${s.firstName} ${s.lastName}`.trim().toLowerCase() === target) ||
        (s.firstName && s.firstName.length >= 2 && target.includes(s.firstName.toLowerCase()))
    );

    if (currentStudent) {
      const matchUserId = (currentStudent.userId || '').trim().toLowerCase();
      const matchProfileId = (currentStudent.studentProfileId || '').trim().toLowerCase();
      const matchName = `${currentStudent.firstName} ${currentStudent.lastName}`.trim().toLowerCase();

      if (myId && (myId === matchUserId || myId === matchProfileId)) return true;
      if (myName && (myName === matchName || myName.toLowerCase().includes(currentStudent.firstName.toLowerCase()))) return true;
    }

    return false;
  }, [isCoach, boardControllerId, userId, userName, students]);

  // Board State Persistence Helper: Persists authoritative state to DB and broadcasts to canonical channel
  const persistAndBroadcastBoardState = useCallback(async (
    newFen: string,
    newMoves: string[],
    newMoveIdx: number,
    newControllerId?: string
  ) => {
    const version = boardVersionRef.current + 1;
    boardVersionRef.current = version;
    const controller = newControllerId !== undefined ? newControllerId : boardControllerId;

    const payload = {
      type: 'BOARD_POSITION',
      classId,
      sessionId: activeSessionId,
      fen: newFen,
      pgn: '',
      moves: newMoves,
      currentMoveIndex: newMoveIdx,
      version,
      controllerId: controller,
      sourceUserId: userId || userName,
      sourceRole: role,
      updatedBy: userId || userName,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Persist to DB (live_session_board_state keyed by activeSessionId / sessionId for shared state)
    try {
      await supabase.from('live_session_board_state').upsert(
        {
          session_id: activeSessionId,
          fen: newFen,
          moves: newMoves,
          current_move_index: newMoveIdx,
          board_controller_id: controller,
          updated_by: userId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );
    } catch (err) {
      console.warn('[classroom] Board state DB persistence warning:', err);
    }

    // 2. Broadcast on Canonical Realtime Channel (live-session:${classId})
    mainChannelRef.current?.send({
      type: 'broadcast',
      event: 'board-move',
      payload,
    });
    mainChannelRef.current?.send({
      type: 'broadcast',
      event: 'board-position',
      payload,
    });
  }, [classId, activeSessionId, userId, userName, role, boardControllerId]);

  // Callback passed to ChessWorkspace to capture live board moves
  const handleBoardMove = useCallback((fen: string, pgn: string) => {
    let rawMoves: string[] = [];
    const marker = '\n\n__HISTORY__:';
    const mIdx = pgn.indexOf(marker);
    if (mIdx !== -1) {
      try { rawMoves = JSON.parse(pgn.slice(mIdx + marker.length)); } catch { rawMoves = []; }
    } else {
      rawMoves = pgn
        .replace(/\[.*?\]/g, '')
        .replace(/\d+\.{1,3}\s*/g, '')
        .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
        .trim().split(/\s+/).filter(Boolean);
    }
    setCurrentFen(fen);
    if (rawMoves.length === 0) return;

    setGameMoves((prevMoves) => {
      let updated: string[];
      if (prevMoves.length === 0 || rawMoves[0] === prevMoves[0]) {
        updated = rawMoves;
      } else {
        const prefix = currentMoveIndex >= 0 ? prevMoves.slice(0, currentMoveIndex + 1) : [];
        updated = [...prefix, ...rawMoves];
      }
      const newIdx = updated.length - 1;
      setCurrentMoveIndex(newIdx);
      if (typeof window !== 'undefined' && classId && updated.length > 0) {
        try { localStorage.setItem(`classroom_moves_${classId}`, JSON.stringify(updated)); } catch {}
      }
      persistAndBroadcastBoardState(fen, updated, newIdx);
      return updated;
    });
  }, [classId, currentMoveIndex, persistAndBroadcastBoardState]);

  const handleJumpToMove = (idx: number) => {
    if (idx < 0) {
      setCurrentMoveIndex(-1);
      const chess = new Chess();
      setCurrentFen(chess.fen());
      return;
    }
    setCurrentMoveIndex(idx);
    const chess = new Chess();
    for (let i = 0; i <= idx && i < gameMoves.length; i++) {
      try { chess.move(gameMoves[i]); } catch { break; }
    }
    setCurrentFen(chess.fen());
  };

  /* ── Toggles ───────────────────────────────────────────────────────────── */
  const [showMovesForParticipants, setShowMovesForParticipants] = useState(true);
  const [translateMoves, setTranslateMoves] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('at');

  /* ── Chat ──────────────────────────────────────────────────────────────── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatUnread, setChatUnread] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChat = async () => {
      const { data, error } = await supabase
        .from('classroom_chat')
        .select('*')
        .eq('class_id', classId)
        .neq('sender_name', '__BOARD_STATE__')
        .order('created_at', { ascending: true });
      if (!error && data) setMessages(data);
    };
    fetchChat();
  }, [classId]);

  useEffect(() => {
    if (rightTab === 'at') setChatUnread(0);
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, rightTab]);

  // Board Control Management Handlers
  const handleGrantBoardControl = (studentUserId: string) => {
    if (!isCoach) return;
    setBoardControllerId(studentUserId);
    persistAndBroadcastBoardState(currentFen, gameMoves, currentMoveIndex, studentUserId);
  };

  const handleTakeBoardControl = () => {
    if (!isCoach) return;
    const coachId = userId || userName;
    setBoardControllerId(coachId);
    persistAndBroadcastBoardState(currentFen, gameMoves, currentMoveIndex, coachId);
  };

  // Initial Board State Hydration from DB on Mount
  // Uses activeSessionId (which is live_sessions.id)
  useEffect(() => {
    if (!activeSessionId) return;
    const fetchInitialBoardState = async () => {
      try {
        const { data: boardData } = await supabase
          .from('live_session_board_state')
          .select('*')
          .eq('session_id', activeSessionId)
          .maybeSingle();

        if (boardData && boardData.fen) {
          setCurrentFen(boardData.fen);
          if (Array.isArray(boardData.moves)) {
            setGameMoves(boardData.moves as string[]);
            setCurrentMoveIndex(boardData.current_move_index ?? (boardData.moves as string[]).length - 1);
          }
          if (boardData.board_controller_id) {
            setBoardControllerId(boardData.board_controller_id);
          }
          if (boardData.allow_illegal_moves !== undefined) {
            setAllowIllegalMoves(boardData.allow_illegal_moves);
          }
          setBoardKey((k) => k + 1);
        }
      } catch (err) {
        console.warn('[classroom] Initial board sync warning:', err);
      }
    };
    fetchInitialBoardState();
  }, [activeSessionId]);

  /* ── Canonical Realtime Channel Setup (live-session:${classId}) ── */
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const mainChannelRef = useRef<any>(null);
  const [lastRealtimeLog, setLastRealtimeLog] = useState<string>('Connected');

  useEffect(() => {
    const channelTopic = `live-session:${classId}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CLASSROOM REALTIME] classId=${classId} channel=${channelTopic} role=${role}`);
    }

    const channel = supabase
      .channel(channelTopic, {
        config: { broadcast: { self: false }, presence: { key: userId || userName } },
      })
      .on('broadcast', { event: 'board-move' }, ({ payload }: any) => {
        if (payload?.classId && payload.classId !== classId) return;
        if (payload?.sourceUserId && payload.sourceUserId === userId) return;
        if (payload?.fen) {
          if (payload.version && payload.version <= boardVersionRef.current) return;
          if (payload.version) boardVersionRef.current = payload.version;
          setCurrentFen(payload.fen);
          if (Array.isArray(payload.moves)) {
            setGameMoves(payload.moves);
            setCurrentMoveIndex(payload.currentMoveIndex ?? payload.moves.length - 1);
          }
          if (payload.controllerId) setBoardControllerId(payload.controllerId);
          setBoardKey((k) => k + 1);
          setLastRealtimeLog(`board-move: ${payload.fen.slice(0, 20)}…`);
        }
      })
      .on('broadcast', { event: 'board-load' }, ({ payload }: any) => {
        if (payload?.classId && payload.classId !== classId) return;
        if (payload?.fen) {
          if (payload.version) boardVersionRef.current = payload.version;
          setCurrentFen(payload.fen);
          setGameMoves(payload.moves || []);
          setCurrentMoveIndex(-1);
          setActivePosition({
            id: payload.puzzleId || Math.random().toString(),
            lessonId: '',
            title: payload.title || 'Teaching Position',
            description: payload.description || '',
            solution: payload.solution || '',
            explanation: payload.explanation || '',
            chapterTitle: payload.chapterTitle || '',
            fen: payload.fen,
            difficulty: 'Beginner',
            tags: [],
            boardOrientation: payload.orientation || 'white',
            defaultBoardLock: false,
            orderNumber: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setBoardKey((k) => k + 1);
          setLastRealtimeLog(`board-load: ${payload.title || 'Position'}`);
        }
      })
      .on('broadcast', { event: 'board-position' }, ({ payload }: any) => {
        if (payload?.classId && payload.classId !== classId) return;
        if (payload?.sourceUserId && payload.sourceUserId === userId) return;
        if (payload?.fen) {
          if (payload.version && payload.version < boardVersionRef.current) return;
          if (payload.version) boardVersionRef.current = payload.version;
          setCurrentFen(payload.fen);
          if (Array.isArray(payload.moves)) {
            setGameMoves(payload.moves);
            setCurrentMoveIndex(payload.currentMoveIndex ?? payload.moves.length - 1);
          }
          if (payload.controllerId) setBoardControllerId(payload.controllerId);
          setBoardKey((k) => k + 1);
        }
      })
      .on('broadcast', { event: 'board-lock' }, ({ payload }: any) => {
        if (!isCoach && payload?.isBoardLocked !== undefined) {
          setIsBoardLocked(payload.isBoardLocked);
        }
      })
      .on('broadcast', { event: 'board-control' }, ({ payload }: any) => {
        if (payload?.controllerId) {
          if (payload.version && payload.version < boardVersionRef.current) return;
          if (payload.version) boardVersionRef.current = payload.version;
          setBoardControllerId(payload.controllerId);
        }
      })
      .on('broadcast', { event: 'chat-message' }, ({ payload }: any) => {
        if (payload?.classId && payload.classId !== classId) return;
        const formattedMsg: ChatMessage = {
          id: payload.id || Math.random().toString(),
          sender_name: payload.senderName || payload.sender_name || 'Anonymous',
          sender_role: payload.senderRole || payload.sender_role || 'user',
          message: payload.message,
          created_at: payload.timestamp || payload.created_at || new Date().toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === formattedMsg.id)) return prev;
          return [...prev, formattedMsg];
        });
        if (rightTab !== 'at') setChatUnread((u) => u + 1);
        setLastRealtimeLog(`chat: ${formattedMsg.sender_name}: ${formattedMsg.message.slice(0, 15)}`);
      })
      .on('broadcast', { event: 'free-moves' }, ({ payload }: any) => {
        if (!isCoach && payload?.allowIllegalMoves !== undefined) {
          setAllowIllegalMoves(payload.allowIllegalMoves);
        }
      })
      .on('broadcast', { event: 'status-change' }, ({ payload }: any) => {
        if (payload.status) setStatus(payload.status);
        if (payload.startedAt) setStartedAtTime(payload.startedAt);
        if (payload.endedAt) setEndedAtTime(payload.endedAt);
        if (payload.status === 'COMPLETED') {
          const targetRoute = role === 'admin' ? '/dashboard/admin/classes' : isCoach ? '/dashboard/coach/classes' : '/dashboard/student/classes';
          router.push(targetRoute);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state).flat().flatMap((p: any) => [
          p.displayName, p.userId, p.authUserId, p.profileId
        ].filter(Boolean));
        setOnlineUserIds(onlineIds);
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state).flat().flatMap((p: any) => [
          p.displayName, p.userId, p.authUserId, p.profileId
        ].filter(Boolean));
        setOnlineUserIds(onlineIds);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state).flat().flatMap((p: any) => [
          p.displayName, p.userId, p.authUserId, p.profileId
        ].filter(Boolean));
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (subStatus: string) => {
        if (subStatus === 'SUBSCRIBED') {
          await channel.track({
            userId: userId || userName,
            role: isCoach ? 'COACH' : 'STUDENT',
            displayName: userName,
            profileId: userId || userName,
            authUserId: userId,
            joinedAt: new Date().toISOString(),
            online: true,
          });
        }
      });

    mainChannelRef.current = channel;

    const heartbeatInterval = setInterval(() => {
      if (userId && activeSessionId) {
        updateParticipantHeartbeatAction(activeSessionId, userId, role, true).catch(() => {});
      }
    }, 15000);

    if (userId && activeSessionId) {
      updateParticipantHeartbeatAction(activeSessionId, userId, role, true).catch(() => {});
    }

    return () => {
      clearInterval(heartbeatInterval);
      if (userId && activeSessionId) {
        updateParticipantHeartbeatAction(activeSessionId, userId, role, false).catch(() => {});
      }
      supabase.removeChannel(channel);
      mainChannelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, classId, userName, isCoach, role, userId, rightTab]);

  // Coach Auto-Start Session Effect: Automatically start session timer & update DB status when Coach joins
  useEffect(() => {
    if (!isCoach || status === 'COMPLETED') return;

    if (!startedAtTime || status === 'SCHEDULED') {
      const nowISO = new Date().toISOString();
      setStatus('LIVE');
      setStartedAtTime(nowISO);

      if (typeof window !== 'undefined' && classId) {
        localStorage.setItem(`classroom_started_at_${classId}`, nowISO);
      }

      startClassAction(classId).catch((err) => {
        console.warn('Auto startClassAction notice:', err);
      });

      if (mainChannelRef.current) {
        mainChannelRef.current.send({
          type: 'broadcast',
          event: 'status-change',
          payload: { status: 'LIVE', startedAt: nowISO },
        });
      }
    }
  }, [isCoach, classId, status, startedAtTime]);

  const [homeworkToast, setHomeworkToast] = useState<string | null>(null);

  // (Push-to-Talk via spacebar not needed — Jitsi handles its own audio controls)

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msgId = Math.random().toString();
    const timestamp = new Date().toISOString();
    const newMsg: ChatMessage = {
      id: msgId,
      sender_name: userName,
      sender_role: role,
      message: chatInput.trim(),
      created_at: timestamp,
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    mainChannelRef.current?.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: {
        id: msgId,
        classId,
        userId: userId || null,
        senderName: userName,
        senderRole: role,
        sender_name: userName,
        sender_role: role,
        message: newMsg.message,
        timestamp,
      },
    });
    // Include sender_id to satisfy DB column & RLS policies
    supabase.from('classroom_chat').insert({
      class_id: classId,
      sender_id: userId || null,
      sender_name: userName,
      sender_role: role,
      message: newMsg.message,
    });
  };

  /* ── Start / End Class ─────────────────────────────────────────────────── */
  const handleStartClass = () => {
    setError('');
    startTransition(async () => {
      const res = await startClassAction(classId);
      if (res?.success) {
        const nowISO = new Date().toISOString();
        setStartedAtTime(nowISO);
        if (typeof window !== 'undefined' && classId) {
          localStorage.setItem(`classroom_started_at_${classId}`, nowISO);
        }
        setStatus('LIVE');
        mainChannelRef.current?.send({
          type: 'broadcast',
          event: 'status-change',
          payload: { status: 'LIVE', startedAt: nowISO },
        });
      } else {
        setError(res?.error?.message || 'Failed to start class.');
      }
    });
  };

  const [showEndClassModal, setShowEndClassModal] = useState(false);
  const [endClassRemarks, setEndClassRemarks] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [isSubmittingEndReport, setIsSubmittingEndReport] = useState(false);

  const handleOpenEndClassModal = () => {
    const initialAttendance: Record<string, boolean> = {};
    students.forEach((s) => { initialAttendance[s.studentProfileId || s.email] = true; });
    setAttendanceMap(initialAttendance);
    setEndClassRemarks('');
    setShowEndClassModal(true);
  };

  const handleToggleStudentAttendance = (key: string) => {
    setAttendanceMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmitEndClassReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEndReport(true);
    setError('');
    const nowISO = new Date().toISOString();
    setEndedAtTime(nowISO);
    if (typeof window !== 'undefined' && classId) {
      localStorage.setItem(`classroom_ended_at_${classId}`, nowISO);
    }
    const finalDurationSec = startedAtTime
      ? Math.max(0, Math.floor((new Date(nowISO).getTime() - new Date(startedAtTime).getTime()) / 1000))
      : elapsedSeconds;
    const finalDurationFormatted = formatElapsed(finalDurationSec);

    const attendanceList = students.map((s) => ({
      studentProfileId: s.studentProfileId,
      studentEmail: s.email,
      attended: attendanceMap[s.studentProfileId || s.email] ?? true,
    }));
    const savedPgn = gameMoves.join(' ');
    const durationNote = `--- CLASS DURATION ---\nActual Duration: ${finalDurationFormatted} (${Math.round(finalDurationSec / 60)} mins)\nStarted: ${startedAtTime || 'N/A'}\nEnded: ${nowISO}`;
    const finalNotes = savedPgn
      ? `${endClassRemarks}\n\n${durationNote}\n\n--- CLASSROOM GAME PGN ---\n${savedPgn}`
      : `${endClassRemarks}\n\n${durationNote}`;
    try {
      try {
        await endZoomMeetingAction(classId, effectiveMeetingNumber);
      } catch (zoomErr) {
        console.warn('[classroom] Zoom end meeting warning (non-blocking):', zoomErr);
      }
      mainChannelRef.current?.send({
        type: 'broadcast',
        event: 'status-change',
        payload: { status: 'COMPLETED', endedAt: nowISO, startedAt: startedAtTime },
      });
      await submitClassEndReportAction({ classId, sessionNotes: finalNotes, attendance: attendanceList });
      setStatus('COMPLETED');
      setShowEndClassModal(false);
      const targetRoute = role === 'admin' ? '/dashboard/admin/classes' : isCoach ? '/dashboard/coach/classes' : '/dashboard/student/classes';
      router.push(targetRoute);
    } catch (err: any) {
      setError(err?.message || 'Failed to end class. Please try again.');
    } finally {
      setIsSubmittingEndReport(false);
    }
  };

  /* ── Save to DB ────────────────────────────────────────────────────────── */
  const [savingDb, setSavingDb] = useState(false);
  const [savedDb, setSavedDb] = useState(false);

  const handleSaveToDb = async () => {
    if (!isCoach) return;
    setSavingDb(true);
    const pgn = gameMoves.join(' ');
    await supabase.from('classes').update({ session_notes: `PGN: ${pgn}` }).eq('id', classId);
    setSavingDb(false);
    setSavedDb(true);
    setTimeout(() => setSavedDb(false), 2500);
  };

  /* ── Student Responses ─────────────────────────────────────────────────── */
  const [studentResponses, setStudentResponses] = useState<Record<string, string>>({});
  const [myResponse, setMyResponse] = useState('');
  const [responseSubmitted, setResponseSubmitted] = useState(false);

  const handleSubmitResponse = () => {
    if (!myResponse.trim() || role !== 'student') return;
    const payload = { user: userName, response: myResponse };
    mainChannelRef.current?.send({ type: 'broadcast', event: 'student-response', payload });
    setResponseSubmitted(true);
    setStudentResponses((prev) => ({ ...prev, [userName]: myResponse }));
  };

  const displayTitle = activeClassName || `${classType || 'Group'} (${duration}min)`;

  return (
    <div className="fixed inset-0 bg-[#0f0f1f] text-white flex flex-col overflow-hidden select-none" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          TOP NAVBAR HEADER BAR (MATCHING REFERENCE UI/UX)
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="h-12 bg-[#252528] border-b border-[#35353a] flex items-center justify-between px-4 flex-shrink-0 z-30 shadow-md">
        {/* Left: Class title & CUSTOM MEETING toggle badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate max-w-xs md:max-w-md">
            <span>{displayTitle}</span>
          </span>

          {/* Toggle pill matching screenshot */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#1a1a1d] px-2.5 py-1 rounded-full border border-[#333338] text-[10px] font-bold text-[#aaaaaa]">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>CUSTOM MEETING</span>
          </div>
        </div>

        {/* Center / Right controls matching reference layout */}
        <div className="flex items-center gap-2">
          {/* LOAD GAME (N) button */}
          <button
            type="button"
            onClick={() => setShowLessonDrawer(true)}
            className="px-2.5 h-7 bg-[#2e2e34] hover:bg-[#383840] border border-[#44444c] text-white text-[11px] font-bold rounded transition-all flex items-center gap-1"
          >
            <span className="text-[#888899]">&lt;</span>
            <span>LOAD GAME ({activeLessonPositions.length || 4})</span>
            <span className="text-[#888899]">&gt;</span>
          </button>

          {/* LOAD CURRICULUM */}
          <button
            type="button"
            onClick={() => setShowLessonDrawer(true)}
            className="px-2.5 h-7 bg-[#2e2e34] hover:bg-[#383840] border border-[#44444c] text-white text-[11px] font-bold rounded transition-all hidden md:flex items-center"
          >
            LOAD CURRICULUM
          </button>

          {/* LOAD PDF */}
          <button
            type="button"
            onClick={() => setShowSetPositionModal(true)}
            className="px-2.5 h-7 bg-[#2e2e34] hover:bg-[#383840] border border-[#44444c] text-white text-[11px] font-bold rounded transition-all hidden md:flex items-center"
          >
            LOAD PDF
          </button>

          {/* Live Session Timer (00:04:48 style) */}
          <div className="flex items-center gap-1.5 px-2.5 h-7 bg-[#161618] border border-[#303036] rounded font-mono font-bold text-xs text-white tabular-nums">
            {formatElapsed(elapsedSeconds)}
          </div>

          {/* Red EXIT / END CLASS Button */}
          <button
            type="button"
            onClick={isCoach ? handleOpenEndClassModal : () => router.push(isCoach ? '/dashboard/coach/classes' : '/dashboard/student/classes')}
            className="px-3 h-7 bg-[#e11d48] hover:bg-[#f43f5e] text-white font-extrabold text-[11px] rounded uppercase tracking-wider flex items-center justify-center shadow"
          >
            EXIT
          </button>

          {/* Notification bell */}
          <button
            type="button"
            className="w-7 h-7 rounded-full bg-[#e11d48] hover:bg-[#f43f5e] flex items-center justify-center text-white text-xs transition-all relative"
          >
            🔔
            {chatUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-[#e11d48] text-[8px] font-black rounded-full flex items-center justify-center">
                {chatUnread}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── REALTIME DIAGNOSTIC OVERLAY PANEL ── */}
      {showClassroomDiag && (
        <div className="absolute top-14 left-4 z-50 p-3 bg-[#0d0d21]/97 border border-indigo-500/50 rounded-xl text-[10px] font-mono text-slate-200 shadow-2xl space-y-1 w-80">
          <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1 text-indigo-300 font-bold">
            <span>REALTIME DIAGNOSTICS</span>
            <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-700">
              {mainChannelRef.current ? 'SUBSCRIBED' : 'CONNECTING'}
            </span>
          </div>
          <div>CLASS ID: <span className="text-amber-300">{classId}</span></div>
          <div>CHANNEL: <span className="text-emerald-300">live-session:{classId}</span></div>
          <div>SESSION ID: <span className="text-slate-300">{activeSessionId}</span></div>
          <div>ROLE: <span className="text-emerald-400 font-bold">{role.toUpperCase()}</span></div>
          <div>USER ID: <span className="text-slate-300">{userId || userName}</span></div>
          <div>BOARD CONTROL: <span className={boardControllerId === (userId || userName) || isCoach ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{isCoach ? 'Coach (ENABLED)' : boardControllerId === (userId || userName) ? 'Student (GRANTED)' : 'Student (DISABLED)'}</span></div>
          <div>STUDENT MOVES: <span className={isBoardLocked ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{isBoardLocked ? 'LOCKED (OFF)' : 'ALLOWED (ON)'}</span></div>
          <div>PRESENCE ONLINE: <span className="text-emerald-400 font-bold">{onlineUserIds.length} users</span></div>
          <div>BOARD VERSION: <span className="text-indigo-300">{boardVersionRef.current}</span></div>
          <div>LAST EVENT: <span className="text-amber-200 truncate block">{lastRealtimeLog}</span></div>
          <div className="border-t border-slate-700 pt-1 text-[9px] text-slate-400 truncate">
            ONLINE USERS: {onlineUserIds.join(', ') || 'None'}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN BODY
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ═══ LEFT COLUMN: Chessboard + Bottom Toolbar ════════════════════ */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#0a0a1a] min-w-0">

          {/* Completed Session Review Banner */}
          {(status === 'COMPLETED' || status === 'RECORDING_AVAILABLE') && (
            <div className="w-full bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-slate-900 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 shadow-md">
              <div className="flex items-center gap-2 font-bold">
                <span className="text-base">🏁</span>
                <span>Class Session Completed! You are in Interactive Replay & Review Mode.</span>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/classroom/${classId}/review`)}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg shadow transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>🎥</span>
                <span>Watch Recording & Full Summary</span>
              </button>
            </div>
          )}



          {/* Stepper bar */}
          {activeLessonPositions.length > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121226] border-b border-[#222244] flex-shrink-0">
              <button type="button" onClick={() => handleStepPosition(0)} disabled={activePositionIndex === 0}
                className="px-2 py-0.5 bg-[#1a1a32] text-[#8888cc] text-[10px] font-bold rounded disabled:opacity-30 hover:bg-[#252548] transition-all">|◀</button>
              <button type="button" onClick={() => handleStepPosition(activePositionIndex - 1)} disabled={activePositionIndex === 0}
                className="px-2 py-0.5 bg-[#1a1a32] text-[#8888cc] text-[10px] font-bold rounded disabled:opacity-30 hover:bg-[#252548] transition-all">◀ Prev</button>
              <span className="flex-1 text-center text-[11px] font-bold text-[#c84b31] truncate">
                {activePosition?.title || `Position ${activePositionIndex + 1}`}
                <span className="text-[#555577] ml-2">{activePositionIndex + 1}/{activeLessonPositions.length}</span>
              </span>
              <button type="button" onClick={() => handleStepPosition(activePositionIndex + 1)} disabled={activePositionIndex >= activeLessonPositions.length - 1}
                className="px-2 py-0.5 bg-[#1a1a32] text-[#8888cc] text-[10px] font-bold rounded disabled:opacity-30 hover:bg-[#252548] transition-all">Next ▶</button>
              <button type="button" onClick={() => handleStepPosition(activeLessonPositions.length - 1)} disabled={activePositionIndex >= activeLessonPositions.length - 1}
                className="px-2 py-0.5 bg-[#1a1a32] text-[#8888cc] text-[10px] font-bold rounded disabled:opacity-30 hover:bg-[#252548] transition-all">▶|</button>
            </div>
          )}

          {/* Chessboard */}
          <div
            ref={boardContainerRef}
            className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-2 bg-[#0a0a1a] relative"
          >
            {!isCoach && isStudentControlGranted() && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-emerald-500 text-white font-extrabold text-xs rounded-full shadow-lg border border-emerald-300 animate-bounce flex items-center gap-1.5">
                <span>🎮</span>
                <span>You Have Board Control! You can make moves.</span>
              </div>
            )}
            <ChessWorkspace
              key={boardKey}
              initialFen={currentFen}
              targetSolution={activePosition?.solution}
              onMove={handleBoardMove}
              classId={classId}
              userRole={role}
              showEngine={false}
              showMoveDots={showMoveDots}
              showCoordinates={showCoordinates}
              spotlightedStudentId={spotlightedStudentId}
              spotlightedStudentName={spotlightedStudentName}
              readOnly={!isCoach && !isStudentControlGranted()}
              isEditorOpen={showSetPositionModal}
              onToggleEditorOpen={setShowSetPositionModal}
              allowIllegalMovesExternal={allowIllegalMoves}
            />
          </div>

          {/* Bottom Toolbar */}
          <ClassroomBottomToolbar
            isCoach={isCoach}
            boardFlipped={boardFlipped}
            showCoordinates={showCoordinates}
            showEngine={showEngine}
            showMoveList={showMoveList}
            showMoveDots={showMoveDots}
            isFullscreen={isFullscreenBoard}
            isRightPanelCollapsed={isRightPanelCollapsed}
            isAudioMuted={jitsiAudioMuted}
            isVideoMuted={jitsiVideoMuted}
            isBoardLocked={isBoardLocked}
            allowIllegalMoves={allowIllegalMoves}
            onToggleAudio={() => setJitsiAudioMuted((m) => !m)}
            onToggleVideo={() => setJitsiVideoMuted((m) => !m)}
            onToggleMoveDots={() => setShowMoveDots((d) => !d)}
            onToggleBoardLock={() => setIsBoardLocked((l) => !l)}
            onToggleIllegalMoves={() => {
              const next = !allowIllegalMoves;
              setAllowIllegalMoves(next);
              // Broadcast free-moves state to all students in real-time
              mainChannelRef.current?.send({
                type: 'broadcast',
                event: 'free-moves',
                payload: { allowIllegalMoves: next },
              });
            }}
            onFlip={() => setBoardFlipped((f) => !f)}
            onToggleCoordinates={() => setShowCoordinates((c) => !c)}
            onToggleEngine={() => setShowEngine((e) => !e)}
            onToggleMoveList={() => setShowMoveList((m) => !m)}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleRightPanel={() => setIsRightPanelCollapsed((c) => !c)}
            onClearArrows={() => setShowClearBoardModal(true)}
            onSetPosition={() => setShowSetPositionModal((prev) => !prev)}
            onPrevMove={() => handleJumpToMove(currentMoveIndex - 1)}
            onNextMove={() => handleJumpToMove(currentMoveIndex + 1)}
            onFirstMove={() => handleJumpToMove(-1)}
            onLastMove={() => handleJumpToMove(gameMoves.length - 1)}
            onReset={() => {
              const loadedFen = activePosition?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
              setCurrentFen(loadedFen);
            }}
            canGoPrev={currentMoveIndex > -1}
            canGoNext={currentMoveIndex < gameMoves.length - 1}
          />
        </div>

        {/* ═══ RESIZE HANDLE & SIDE PANEL TOGGLE ════════════════════════════ */}
        {!isRightPanelCollapsed && (
          <div
            className="w-1 bg-[#1e1e3a] hover:bg-[#c84b31] cursor-col-resize flex-shrink-0 transition-colors active:bg-[#c84b31]"
            onMouseDown={startResizeRight}
          />
        )}

        {/* ═══ RIGHT COLUMN: WebRTC Video Grid + 5 Tabs + Bottom Bar ──────── */}
        {!isRightPanelCollapsed && (
          <div
            className="flex flex-col bg-[#0f0f1f] border-l border-[#222244] flex-shrink-0 overflow-hidden"
            style={{ width: `${rightColWidth}px` }}
          >
            {/* ── Zoom Meeting SDK Embedded Video Stage (Zero Redirect — stays inside ChessHub) ── */}
            <div className="flex-shrink-0 min-h-[280px] h-[320px] max-h-[45vh] relative">
              <ZoomClassroomVideo
                classId={classId}
                meetingNumber={effectiveMeetingNumber}
                passcode={zoomPasscode}
                userName={userName}
                role={role}
                isAudioMuted={jitsiAudioMuted}
                isVideoMuted={jitsiVideoMuted}
              />
            </div>

            {/* ── 6-Tab Panel Matching Reference UI ───────────────────────── */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2d2d35] flex-shrink-0 bg-[#1e1e24] px-1">
                <div className="flex items-center flex-1 overflow-x-auto no-scrollbar">
                  {([
                    ['at', 'MOVES'],
                    ['chat', 'CHAT'],
                    ['response', 'RESPONSE'],
                    ['leaderboard', 'LEADERBOARD'],
                    ['participants', 'PARTICIPANTS'],
                    ...(isCoach ? [['engine', 'ENGINE'] as [RightTab, string]] : []),
                  ]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRightTab(key as RightTab)}
                      className={`px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wide transition-all border-b-2 whitespace-nowrap ${
                        rightTab === key
                          ? 'text-white border-[#e11d48] bg-[#292932]'
                          : 'text-[#888899] border-transparent hover:text-white hover:bg-[#23232a]'
                      }`}
                    >
                      {label}
                      {key === 'chat' && chatUnread > 0 && (
                        <span className="ml-1 px-1 py-0.2 bg-rose-600 text-white text-[8px] font-bold rounded-full">
                          {chatUnread}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Popout & Edit Icons on right of tab bar matching screenshot */}
                <div className="flex items-center gap-1.5 px-2 text-[#8888aa] text-xs shrink-0">
                  <button type="button" title="Popout Window" className="hover:text-white transition-colors">❐</button>
                  <button type="button" title="Edit Position" onClick={() => setShowSetPositionModal(true)} className="hover:text-white transition-colors">✎</button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {rightTab === 'at' && (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <ClassroomMoveNotation
                      moves={gameMoves}
                      currentIndex={currentMoveIndex}
                      onJumpToMove={handleJumpToMove}
                      showMovesForParticipants={showMovesForParticipants}
                      isCoach={isCoach}
                      activePosition={activePosition ? {
                        title: activePosition.title,
                        description: activePosition.description,
                        solution: activePosition.solution,
                        explanation: activePosition.explanation,
                        chapterTitle: activePosition.chapterTitle,
                      } : undefined}
                    />
                  </div>
                )}

                {rightTab === 'chat' && (
                  <div className="flex flex-col flex-1 overflow-hidden bg-[#14141a]">
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                      {messages.length === 0 && (
                        <p className="text-[11px] text-[#666688] italic text-center py-6">No messages in chat yet.</p>
                      )}
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-2 ${msg.sender_name === userName ? 'justify-end' : ''}`}>
                          <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-[11px] leading-snug ${
                            msg.sender_role === 'coach' || msg.sender_role === 'admin'
                              ? 'bg-amber-950/70 border border-amber-800/60 text-amber-100'
                              : msg.sender_name === userName
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#22222c] text-white border border-[#333344]'
                          }`}>
                            {msg.sender_name !== userName && (
                              <p className="text-[9px] font-bold text-[#8888cc] mb-0.5">{msg.sender_name}</p>
                            )}
                            {msg.message}
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>
                    <form onSubmit={sendChatMessage} className="flex gap-2 px-3 py-2 border-t border-[#2a2a35] bg-[#1a1a22]">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#252532] border border-[#38384a] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-[#666688] focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-40"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}

                {rightTab === 'response' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0d0d1a]">
                    {isCoach ? (
                      <>
                        <p className="text-[10px] text-[#555577] uppercase tracking-widest font-bold mb-2">Student Candidate Move Responses</p>
                        {Object.keys(studentResponses).length === 0 ? (
                          <p className="text-[11px] text-[#555577] text-center py-8">No responses yet. Students can submit their move from this tab.</p>
                        ) : (
                          Object.entries(studentResponses).map(([name, resp]) => (
                            <div key={name} className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-3">
                              <p className="text-[10px] font-bold text-[#8888cc] mb-1">{name}</p>
                              <p className="text-sm font-extrabold text-white font-mono">{resp}</p>
                            </div>
                          ))
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-[11px] text-[#aaaacc] font-semibold">Submit your candidate move to coach:</p>
                        <input
                          type="text"
                          value={myResponse}
                          onChange={(e) => setMyResponse(e.target.value)}
                          disabled={responseSubmitted}
                          placeholder="e.g. Nf3, Rxe5, O-O..."
                          className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#c84b31] disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={handleSubmitResponse}
                          disabled={!myResponse.trim() || responseSubmitted}
                          className="py-2.5 bg-[#c84b31] hover:bg-[#d55339] text-white text-sm font-extrabold rounded-xl transition-colors disabled:opacity-40"
                        >
                          {responseSubmitted ? '✅ Response Submitted' : 'Submit Candidate Move'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {rightTab === 'leaderboard' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0d0d1a]">
                    <p className="text-[10px] text-[#555577] uppercase tracking-widest font-bold mb-3">Live Class Leaderboard</p>
                    {students.map((student, idx) => (
                      <div key={student.email} className="flex items-center gap-3 bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-2.5">
                        <span className="text-sm w-6 text-center">{['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`}</span>
                        <div className="w-7 h-7 rounded-full bg-[#c84b31]/20 border border-[#c84b31]/40 flex items-center justify-center text-[11px] font-bold text-[#c84b31]">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </div>
                        <p className="flex-1 text-[11px] font-bold text-white truncate">{student.firstName} {student.lastName}</p>
                      </div>
                    ))}
                  </div>
                )}

                {rightTab === 'participants' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0d0d1a]">
                    <p className="text-[10px] text-[#555577] uppercase tracking-widest font-bold mb-2">Class Attendance & Controls ({students.length + 1})</p>
                    <div className="flex items-center gap-2.5 bg-amber-900/20 border border-amber-700/30 rounded-xl p-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-600/40 flex items-center justify-center text-amber-300 text-[11px] font-bold">
                        {coachName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-amber-200 truncate">{coachName}</p>
                        <p className="text-[9px] text-amber-500 font-semibold">Assigned Coach (Controller)</p>
                      </div>
                      {(() => {
                        const isCoachOnline = isCoach || onlineUserIds.some((id) => {
                          if (!id || typeof id !== 'string') return false;
                          const lower = id.toLowerCase();
                          return lower === coachName.toLowerCase() || lower.includes('coach') || id === userId;
                        });
                        return (
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCoachOnline ? 'bg-green-400 animate-pulse' : 'bg-[#444466]'}`} title={isCoachOnline ? 'Coach Online' : 'Coach Offline'} />
                        );
                      })()}
                    </div>
                    {students.map((student: any, i) => {
                      const fName = (student.firstName || '').trim();
                      const lName = (student.lastName || '').trim();
                      const studentName = `${fName} ${lName}`.trim() || 'Student';
                      const studentEmail = (student.email || '').trim();
                      const profileId = (student.studentProfileId || student.id || '').trim();
                      const uId = (student.userId || '').trim();

                      const isOnline = onlineUserIds.some((trackedId) => {
                        if (!trackedId || typeof trackedId !== 'string') return false;
                        const clean = trackedId.trim().toLowerCase();
                        if (!clean) return false;

                        if (studentName && clean === studentName.toLowerCase()) return true;
                        if (fName && fName.length >= 2 && clean.includes(fName.toLowerCase())) return true;
                        if (lName && lName.length >= 2 && clean.includes(lName.toLowerCase())) return true;
                        if (profileId && clean === profileId.toLowerCase()) return true;
                        if (uId && clean === uId.toLowerCase()) return true;
                        if (studentEmail && clean === studentEmail.toLowerCase()) return true;
                        return false;
                      }) || (!isCoach && role === 'student' && (userId === uId || userId === profileId || userName.toLowerCase().includes(fName.toLowerCase())))
                         || (onlineUserIds.length > 0 && onlineUserIds.some((id) => typeof id === 'string' && !id.toLowerCase().includes('coach')));

                      const targetId = profileId || studentName;
                      const hasControl = boardControllerId === targetId;

                      return (
                        <div key={i} className="flex items-center gap-2.5 bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#2a2a4a] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {fName.charAt(0)}{lName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] font-bold text-white truncate">{studentName}</p>
                              {hasControl && (
                                <span className="text-[9px] bg-green-500 text-white font-extrabold px-1 rounded">🎮 Control</span>
                              )}
                            </div>
                            <p className="text-[9px] text-[#666688] truncate">
                              {isOnline ? 'Online' : 'Offline'} • Pos #{activePositionIndex + 1}
                            </p>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-[#444466]'}`} />
                          {isCoach && (
                            <button
                              type="button"
                              onClick={() => (hasControl ? handleTakeBoardControl() : handleGrantBoardControl(targetId))}
                              className={`px-2 py-1 text-[10px] font-bold rounded border transition-all ${
                                hasControl ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/40' : 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/40'
                              }`}
                            >
                              {hasControl ? 'Revoke' : 'Give Control'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {rightTab === 'engine' && (
                  <ClassroomEnginePanel fen={currentFen} isEnabled={showEngine} />
                )}
              </div>

              {/* Bottom Control Bar */}
              <div className="flex-shrink-0 border-t border-[#222244] bg-[#0a0a1a] px-3 py-2 flex items-center gap-3">
                {isCoach && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showMovesForParticipants}
                      onClick={() => setShowMovesForParticipants((v) => !v)}
                      className={`relative w-8 h-4 rounded-full transition-colors ${showMovesForParticipants ? 'bg-white' : 'bg-[#2a2a4a]'}`}
                    >
                      <span className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ background: showMovesForParticipants ? '#0a0a1a' : '#555577', left: showMovesForParticipants ? '18px' : '2px' }} />
                    </button>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-[#8888aa]">SHOW MOVES FOR PARTICIPANTS</span>
                  </label>
                )}

                <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={translateMoves}
                    onClick={() => setTranslateMoves((v) => !v)}
                    className={`relative w-7 h-3.5 rounded-full transition-colors ${translateMoves ? 'bg-white' : 'bg-[#2a2a4a]'}`}
                  >
                    <span className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all" style={{ background: translateMoves ? '#0a0a1a' : '#555577', left: translateMoves ? '15px' : '2px' }} />
                  </button>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#8888aa]">Translate</span>
                </label>

                {isCoach && (
                  <button
                    type="button"
                    onClick={handleSaveToDb}
                    disabled={savingDb}
                    className="px-3 py-1 bg-[#1a1a32] hover:bg-[#252548] border border-[#2a2a4a] hover:border-[#c84b31] text-[#aaaacc] hover:text-white text-[10px] font-extrabold uppercase tracking-wide rounded transition-all disabled:opacity-50"
                  >
                    {savingDb ? '...' : savedDb ? '✓ SAVED' : 'SAVE TO DB'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          END CLASS MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showEndClassModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f1f] border border-[#222244] rounded-2xl p-6 w-full max-w-xl space-y-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222244] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-500/40 flex items-center justify-center text-xl">🛑</div>
                <div>
                  <h3 className="font-bold text-base text-red-400">End Session & Submit Report</h3>
                  <p className="text-xs text-[#666688]">Mark attendance and add class remarks</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowEndClassModal(false)} className="w-8 h-8 rounded-xl bg-[#1a1a32] hover:bg-[#252548] text-white font-bold flex items-center justify-center text-sm">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-[#0a0a1a] p-3 rounded-xl border border-[#222244] text-center">
              <div><span className="text-[10px] text-[#666688] font-bold uppercase block">Elapsed</span><span className="text-sm font-extrabold text-amber-400 font-mono">⏱ {formatElapsed(elapsedSeconds)}</span></div>
              <div><span className="text-[10px] text-[#666688] font-bold uppercase block">Type</span><span className="text-xs font-bold text-white">{classType}</span></div>
              <div><span className="text-[10px] text-[#666688] font-bold uppercase block">Coach</span><span className="text-xs font-bold text-emerald-400 truncate block">{coachName}</span></div>
            </div>

            <form onSubmit={handleSubmitEndClassReport} className="space-y-4">
              <div>
                <h4 className="text-xs font-extrabold text-[#ccccee] uppercase tracking-wider mb-2">📋 Student Attendance</h4>
                {students.length === 0 ? (
                  <p className="text-xs text-[#666688] italic">No students registered.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {students.map((student) => {
                      const key = student.studentProfileId || student.email;
                      const isPresent = attendanceMap[key] ?? true;
                      return (
                        <div key={key} className="bg-[#0a0a1a] p-3 rounded-xl border border-[#222244] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#1a1a32] flex items-center justify-center font-bold text-xs text-[#8888cc]">
                              {student.firstName[0]}{student.lastName[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{student.firstName} {student.lastName}</p>
                              <p className="text-[10px] text-[#666688]">{student.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleStudentAttendance(key)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${isPresent ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40' : 'bg-red-900/30 text-red-300 border-red-700/40'}`}
                          >
                            {isPresent ? '🟢 Present' : '🔴 Absent'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#ccccee] uppercase tracking-wider mb-1.5">📝 Class Remarks</label>
                <textarea
                  rows={4}
                  placeholder="Enter coach feedback, session notes, game highlights..."
                  value={endClassRemarks}
                  onChange={(e) => setEndClassRemarks(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-[#222244] rounded-xl p-3 text-xs text-white placeholder-[#444466] focus:outline-none focus:border-[#c84b31] leading-relaxed"
                />
              </div>

              {error && <div className="p-3 bg-red-950/50 border border-red-700/40 rounded-xl text-red-300 text-xs font-bold text-center">⚠️ {error}</div>}

              <div className="flex items-center justify-end gap-3 border-t border-[#222244] pt-3">
                <button type="button" onClick={() => setShowEndClassModal(false)} disabled={isSubmittingEndReport}
                  className="px-4 py-2 bg-[#1a1a32] hover:bg-[#252548] text-[#8888cc] text-xs font-bold rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmittingEndReport}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                  {isSubmittingEndReport ? '⏳ Submitting...' : '🚀 Submit & End Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Drawer */}
      <ClassroomLessonDrawer
        isOpen={showLessonDrawer}
        isCoach={isCoach}
        onClose={() => setShowLessonDrawer(false)}
        onSelectPosition={handleSelectPosition}
        onPushPosition={(pos) => {
          handleSelectPosition(pos, activeLessonPositions.length > 0 ? activeLessonPositions : [pos], 0);
        }}
      />



      {/* Clear Board Modal */}
      <ClearBoardModal
        isOpen={showClearBoardModal}
        onClose={() => setShowClearBoardModal(false)}
        onConfirmClear={handleConfirmClearBoard}
      />

      {/* Pre-Join Device Check — captures initial mute preference for Jitsi iframe */}
      <ClassroomPreJoinModal
        isOpen={showPreJoinModal}
        userName={userName}
        userRole={role}
        onJoin={({ isAudioMuted, isVideoMuted }) => {
          setShowPreJoinModal(false);
          setJitsiAudioMuted(isAudioMuted);
          setJitsiVideoMuted(isVideoMuted);
          setJitsiJoined(true);
        }}
      />
    </div>
  );
}
