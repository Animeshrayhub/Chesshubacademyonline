'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { supabase } from '@/utils/supabaseClient';
import ChessWorkspace from './ChessWorkspace';
import ClassroomLocalRecorder from '@/components/dashboard/ui/ClassroomLocalRecorder';
import ClassroomVideoGrid from '@/components/dashboard/ui/ClassroomVideoGrid';
import ClassroomLessonDrawer from '@/features/classroom/ClassroomLessonDrawer';
import ClassroomDatabasePanel from '@/components/dashboard/ui/ClassroomDatabasePanel';
import ClearBoardModal, { ClearMode } from './ClearBoardModal';
import ClassroomBottomToolbar from './ClassroomBottomToolbar';
import ClassroomMoveNotation from './ClassroomMoveNotation';
import ClassroomEnginePanel from './ClassroomEnginePanel';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { TeachingPosition } from '@/types/curriculum.types';
import ClassroomVirtualBackgroundModal, { type BackgroundType } from './ClassroomVirtualBackgroundModal';
import ClassroomPreJoinModal from './ClassroomPreJoinModal';
import { endClassAction, startClassAction, submitClassEndReportAction, updateParticipantHeartbeatAction } from '@/actions/classes';
import { listHomeworkAction, listChaptersAction, assignChapterToClassAction } from '@/actions/homework';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  studentProfileId?: string;
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

type RightTab = 'at' | 'response' | 'leaderboard' | 'participants' | 'engine';

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

  /* ── Native In-House WebRTC Hook (Zero Login / Zero Redirect) ───────────── */
  const webRTC = useWebRTC({ classId, sessionId: activeSessionId, userName, userRole: role, userId });

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
  const [showBgModal, setShowBgModal] = useState(false);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [customBgUrl, setCustomBgUrl] = useState<string>('');
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
    supabase.channel(`classroom-board:${classId}`).send({
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
      updatedBy: userId || userName,
      updatedAt: new Date().toISOString(),
    };

    // 1. Persist to DB (live_session_board_state table & classroom_chat table fallback)
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
      await supabase.from('classroom_chat').insert({
        class_id: classId,
        user_id: userId || null,
        sender_name: '__BOARD_STATE__',
        sender_role: 'admin',
        message: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('[classroom] Board state DB persistence warning:', err);
    }

    // 2. Broadcast on Canonical Realtime Channel
    mainChannelRef.current?.send({
      type: 'broadcast',
      event: 'board-position',
      payload,
    });
  }, [classId, activeSessionId, userId, userName, boardControllerId]);

  // Callback passed to ChessWorkspace to capture live board moves
  // ChessWorkspace encodes clean SAN history after '__HISTORY__:' marker in pgn param
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
        .order('created_at', { ascending: true });
      if (!error && data) setMessages(data);
    };
    fetchChat();
  }, [classId]);

  useEffect(() => {
    if (rightTab === 'at') setChatUnread(0);
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, rightTab]);

  // Board Control Management Handlers (Phase 14 & 16)
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
        } else {
          // Fallback to classroom_chat history
          const { data } = await supabase
            .from('classroom_chat')
            .select('*')
            .eq('class_id', classId)
            .eq('sender_name', '__BOARD_STATE__')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data?.message) {
            const parsed = JSON.parse(data.message);
            if (parsed.fen) {
              setCurrentFen(parsed.fen);
              if (Array.isArray(parsed.moves)) {
                setGameMoves(parsed.moves);
                setCurrentMoveIndex(parsed.currentMoveIndex ?? parsed.moves.length - 1);
              }
              if (parsed.controllerId) {
                setBoardControllerId(parsed.controllerId);
              }
              setBoardKey((k) => k + 1);
            }
          }
        }
      } catch (err) {
        console.warn('[classroom] Initial board sync warning:', err);
      }
    };
    fetchInitialBoardState();
  }, [activeSessionId, classId]);

  /* ── Canonical Realtime Channel Setup (live-session:${activeSessionId}) ── */
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const mainChannelRef = useRef<any>(null);

  useEffect(() => {
    const channelTopic = `live-session:${activeSessionId}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[classroom] JOIN SUCCESS role: ${role}, class_id: ${classId}, session_id: ${activeSessionId}, channel: ${channelTopic}`);
    }

    const channel = supabase
      .channel(channelTopic, {
        config: { broadcast: { self: false }, presence: { key: activeSessionId } },
      })
      .on('broadcast', { event: 'board-position' }, ({ payload }: any) => {
        if (payload?.fen) {
          if (payload.version && payload.version <= boardVersionRef.current) {
            return;
          }
          if (payload.version) boardVersionRef.current = payload.version;
          setCurrentFen(payload.fen);
          if (Array.isArray(payload.moves)) {
            setGameMoves(payload.moves);
            setCurrentMoveIndex(payload.currentMoveIndex ?? payload.moves.length - 1);
          }
          if (payload.controllerId) {
            setBoardControllerId(payload.controllerId);
          }
          setBoardKey((k) => k + 1);
        }
      })
      .on('broadcast', { event: 'board-control' }, ({ payload }: any) => {
        if (payload?.controllerId) {
          if (payload.version && payload.version < boardVersionRef.current) return;
          if (payload.version) boardVersionRef.current = payload.version;
          setBoardControllerId(payload.controllerId);
        }
      })
      .on('broadcast', { event: 'position-update' }, ({ payload }: any) => {
        if (payload?.fen) {
          setCurrentFen(payload.fen);
          setBoardKey((k) => k + 1);
          setGameMoves([]);
          setCurrentMoveIndex(-1);
        }
      })
      .on('broadcast', { event: 'load-position' }, ({ payload }: any) => {
        if (payload?.fen) {
          setCurrentFen(payload.fen);
          setBoardKey((k) => k + 1);
          setGameMoves([]);
          setCurrentMoveIndex(-1);
        }
      })
      .on('broadcast', { event: 'homework-assigned' }, ({ payload }: any) => {
        setHomeworkToast(`📝 Homework Assigned by ${payload.assignedBy}! Target position saved.`);
        setTimeout(() => setHomeworkToast(null), 4000);
      })
      .on('broadcast', { event: 'chat-message' }, ({ payload }: any) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        if (rightTab !== 'at') setChatUnread((u) => u + 1);
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
        const onlineIds = Object.values(state).flat().map((p: any) => p.displayName || p.userId || p.profileId);
        setOnlineUserIds(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state).flat().map((p: any) => p.displayName || p.userId || p.profileId);
        setOnlineUserIds(onlineIds);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state).flat().map((p: any) => p.displayName || p.userId || p.profileId);
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (subStatus: string) => {
        if (subStatus === 'SUBSCRIBED') {
          await channel.track({
            userId: userId || userName,
            role: isCoach ? 'COACH' : 'STUDENT',
            displayName: userName,
            profileId: userId || userName,
            joinedAt: new Date().toISOString(),
            online: true,
          });
        }
      });

    mainChannelRef.current = channel;

    // 15-second heartbeat loop for DB presence tracking
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

  // Push-to-Talk spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        webRTC.toggleAudio(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        webRTC.toggleAudio(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [webRTC]);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender_name: userName,
      sender_role: role,
      message: chatInput.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    mainChannelRef.current?.send({ type: 'broadcast', event: 'chat-message', payload: newMsg });
    supabase.from('classroom_chat').insert({ class_id: classId, sender_name: userName, sender_role: role, message: newMsg.message });
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
      setStatus('COMPLETED');
      setShowEndClassModal(false);
      router.push('/dashboard');
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

  useEffect(() => {
    const channel = supabase.channel(`classroom-responses:${classId}`)
      .on('broadcast', { event: 'student-response' }, ({ payload }: any) => {
        if (isCoach) setStudentResponses((prev) => ({ ...prev, [payload.user]: payload.response }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [classId, isCoach]);

  const displayTitle = activeClassName || `${classType || 'Group'} (${duration}min)`;

  return (
    <div className="fixed inset-0 bg-[#0f0f1f] text-white flex flex-col overflow-hidden select-none" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          TOP NAVBAR HEADER BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="h-12 bg-[#0a0a1a] border-b border-[#222244] flex items-center justify-between px-4 flex-shrink-0 z-30 shadow-md">
        {/* Left: Class title & timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-amber-400 tracking-tight flex items-center gap-1.5">
              <span className="text-xs">♟️</span>
              <span>{displayTitle}</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#1e1e3e] border border-[#2a2a4a] text-[#8888cc] rounded tracking-widest uppercase">
              {status === 'LIVE' ? 'LIVE SESSION' : status === 'SCHEDULED' ? 'SCHEDULED' : 'CUSTOM MEETING'}
            </span>
          </div>

          {/* Timer always visible */}
          <div className="flex items-center gap-1.5 ml-2 bg-[#1a1a32] px-2.5 py-1 rounded-lg border border-[#2a2a4a]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono font-black text-white tabular-nums">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Center: Action Buttons (Coach Only) */}
        {isCoach && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLessonDrawer(true)}
              className="px-3 h-7 bg-[#1e1e3e] hover:bg-[#2a2a4e] border border-[#2a2a4e] text-[#ccccee] text-[11px] font-bold rounded transition-all uppercase tracking-wide"
            >
              LOAD GAME
            </button>

            <button
              type="button"
              onClick={() => setShowSetPositionModal(true)}
              className="px-3 h-7 bg-[#c84b31] hover:bg-[#d55339] text-white text-[11px] font-extrabold rounded transition-all uppercase tracking-wide shadow-md"
            >
              🎨 SET POSITION
            </button>

            {/* Local Device MP4 Recorder for Admin / Coach */}
            <ClassroomLocalRecorder classId={classId} isCoachOrAdmin={isCoach} />
          </div>
        )}

        {/* Right: Prominent END CLASS & Exit */}
        <div className="flex items-center gap-2">
          {/* Prominent Red End Class Button for Coach & Admin at all times */}
          {isCoach && (
            <button
              type="button"
              onClick={handleOpenEndClassModal}
              disabled={isPending || isSubmittingEndReport}
              className="px-3.5 h-7 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] rounded uppercase tracking-wider flex items-center gap-1 shadow-lg animate-pulse"
            >
              <span>🛑</span>
              <span>END CLASS</span>
            </button>
          )}

          {/* Notification bell */}
          <button
            type="button"
            className="w-7 h-7 rounded-full bg-[#c84b31] hover:bg-[#d55339] flex items-center justify-center text-white text-sm transition-all relative ml-1"
          >
            🔔
            {chatUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {chatUnread}
              </span>
            )}
          </button>
        </div>
      </header>

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

          {/* Active Screen Share Notification Banner */}
          {webRTC.screenStream && (
            <div className="w-full bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-yellow-500/20 border-b border-amber-500/40 px-3 py-2 flex items-center justify-between text-xs text-amber-300 shadow-md">
              <div className="flex items-center gap-2 font-bold">
                <span className="text-base animate-pulse">💻</span>
                <span>Coach is sharing screen! View high-res big screen in video panel or open zoom controls.</span>
              </div>
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
            className="flex-1 overflow-y-auto flex items-center justify-center p-2 bg-[#0a0a1a]"
          >
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
              readOnly={!isCoach && boardControllerId !== (userId || userName)}
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
            isAudioMuted={webRTC.isAudioMuted}
            isVideoMuted={webRTC.isVideoMuted}
            isBoardLocked={isBoardLocked}
            allowIllegalMoves={allowIllegalMoves}
            onToggleAudio={webRTC.toggleAudio}
            onToggleVideo={webRTC.toggleVideo}
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
            {/* ── Native In-House WebRTC Video Section (Zero Login / Zero Redirect) ── */}
            <div className="flex-shrink-0">
              <ClassroomVideoGrid
                localStream={webRTC.localStream}
                screenStream={webRTC.screenStream}
                remotePeers={webRTC.remotePeers}
                isAudioMuted={webRTC.isAudioMuted}
                isVideoMuted={webRTC.isVideoMuted}
                isScreenSharing={webRTC.isScreenSharing}
                handRaised={webRTC.handRaised}
                reactionEmoji={webRTC.reactionEmoji}
                coachName={coachName}
                userName={userName}
                isCoach={isCoach}
                students={students}
                onlineUserIds={onlineUserIds}
                spotlightedStudentId={spotlightedStudentId}
                bgType={bgType}
                customBgUrl={customBgUrl}
                boardControllerId={boardControllerId}
                onGrantBoardControl={handleGrantBoardControl}
                onTakeBoardControl={handleTakeBoardControl}
                onOpenBgModal={() => setShowBgModal(true)}
                onCoachMuteAll={() => {
                  students.forEach((s) => {
                    webRTC.coachMuteStudent(`${s.firstName} ${s.lastName}`);
                  });
                }}
                onToggleAudio={webRTC.toggleAudio}
                onToggleVideo={webRTC.toggleVideo}
                onToggleScreenShare={webRTC.toggleScreenShare}
                onToggleRaiseHand={webRTC.toggleRaiseHand}
                onSendEmojiReaction={webRTC.sendEmojiReaction}
                onCoachMuteStudent={webRTC.coachMuteStudent}
                onCoachStopStudentVideo={webRTC.coachStopStudentVideo}
                onToggleSpotlight={handleToggleSpotlight}
              />
            </div>

            {/* ── 5-Tab Panel ─────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center border-b border-[#222244] flex-shrink-0 bg-[#0a0a1a]">
                {([
                  ['at', 'AT'],
                  ['response', 'RESPONSE'],
                  ['leaderboard', 'LEADERBOARD'],
                  ['participants', 'PARTICIPANTS'],
                  ...(isCoach ? [['engine', 'ENGINE'] as [RightTab, string]] : []),
                ]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRightTab(key as RightTab)}
                    className={`flex-1 py-2.5 text-[10px] font-extrabold uppercase tracking-wide transition-colors border-b-2 ${
                      rightTab === key
                        ? 'text-white border-[#c84b31] bg-[#1a1a32]'
                        : 'text-[#666688] border-transparent hover:text-[#aaaacc] hover:bg-[#141428]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
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
                    />

                    {/* Chat Section */}
                    <div className="border-t border-[#222244] flex-shrink-0 bg-[#0a0a1a]">
                      <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-1.5">
                        {messages.length === 0 && (
                          <p className="text-[10px] text-[#555577] italic text-center py-2">No messages yet</p>
                        )}
                        {messages.map((msg) => (
                          <div key={msg.id} className={`flex gap-2 ${msg.sender_name === userName ? 'justify-end' : ''}`}>
                            <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-tight ${
                              msg.sender_role === 'coach' || msg.sender_role === 'admin'
                                ? 'bg-amber-900/40 border border-amber-700/40 text-amber-100'
                                : msg.sender_name === userName
                                ? 'bg-[#c84b31] text-white'
                                : 'bg-[#1a1a32] text-[#ccccee]'
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
                      <form onSubmit={sendChatMessage} className="flex gap-2 px-2 py-1.5 border-t border-[#222244]">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-[#1a1a32] border border-[#2a2a4a] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-[#555577] focus:outline-none focus:border-[#c84b31]"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="px-3 py-1.5 bg-[#c84b31] hover:bg-[#d55339] text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40"
                        >
                          ▶
                        </button>
                      </form>
                    </div>
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
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" title="Coach Online" />
                    </div>
                    {students.map((student, i) => {
                      const studentName = `${student.firstName} ${student.lastName}`;
                      const isOnline = onlineUserIds.some((id) =>
                        id === studentName || id.toLowerCase().includes(student.firstName.toLowerCase()) || id === student.studentProfileId || id === student.email
                      );
                      const targetId = student.studentProfileId || studentName;
                      const hasControl = boardControllerId === targetId;

                      return (
                        <div key={i} className="flex items-center gap-2.5 bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#2a2a4a] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
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

      {/* Pre-Join Device Check & Audio/Video Preview Modal */}
      <ClassroomPreJoinModal
        isOpen={showPreJoinModal}
        userName={userName}
        userRole={role}
        onJoin={({ isAudioMuted, isVideoMuted, bgType: selectedBg, customBgUrl: selectedCustom }) => {
          setShowPreJoinModal(false);
          webRTC.toggleAudio(!isAudioMuted);
          webRTC.toggleVideo(!isVideoMuted);
          setBgType(selectedBg);
          if (selectedCustom) setCustomBgUrl(selectedCustom);
        }}
      />

      {/* Virtual Video Background Selector Modal */}
      <ClassroomVirtualBackgroundModal
        isOpen={showBgModal}
        currentBgType={bgType}
        currentCustomUrl={customBgUrl}
        onClose={() => setShowBgModal(false)}
        onApplyBackground={(type, url) => {
          setBgType(type);
          if (url) setCustomBgUrl(url);
        }}
      />
    </div>
  );
}
