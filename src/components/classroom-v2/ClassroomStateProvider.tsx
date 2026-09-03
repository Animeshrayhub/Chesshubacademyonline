'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  type ClassroomSnapshot,
  type CanonicalBoardState,
  type CanonicalPuzzleState,
  type CanonicalGameState,
  type CanonicalCurriculumState,
  type ClassroomQuizState,
  type PermissionsState,
  type UserRole,
  type BoardArrow,
  type BoardHighlight,
  type MoveData,
  type ParticipantInfo,
  type ChatMessage,
  type StudentResponseItem,
  type ClassroomBookmark,
  type CoachQuestion,
  type PuzzleAttemptResult,
} from '@/lib/classroom-v2/types';
import { classroomReducer } from '@/lib/classroom-v2/reducer';
import { DEFAULT_INITIAL_FEN } from '@/lib/classroom-v2/constants';
import { validateChessMove, parsePgnToMoves } from '@/lib/classroom-v2/validation';
import { canUserMoveBoard } from '@/lib/classroom-v2/permissions';
import {
  mutateClassroomMoveAction,
  mutateClassroomUndoAction,
  mutateClassroomResetAction,
  mutateClassroomLockAction,
  mutateClassroomFreeMoveAction,
  mutateClassroomPermissionAction,
  mutateClassroomLoadPuzzleAction,
  mutateClassroomRevealPuzzleSolutionAction,
  mutateClassroomNextPuzzleAction,
  mutateClassroomSubmitPuzzleResultAction,
  mutateClassroomLoadGameAction,
  mutateClassroomLoadCurriculumAction,
  mutateClassroomNavigateMoveAction,
  mutateClassroomSetDrawingAction,
  mutateClassroomStartQuizAction,
  mutateClassroomCloseQuizAction,
  mutateClassroomRevealQuizAction,
  mutateClassroomSubmitQuizAnswerAction,
  mutateClassroomSubmitResponseAction,
  mutateClassroomSendChatAction,
  mutateClassroomCreateBookmarkAction,
  mutateClassroomRaiseHandAction,
  getCanonicalClassroomSnapshotAction,
  endClassroomSessionAction,
} from '@/actions/classroom';

export interface ClassroomContextValue {
  snapshot: ClassroomSnapshot;
  isCoach: boolean;
  canMove: boolean;
  isBoardLocked: boolean;
  userId: string;
  userName: string;
  role: UserRole;
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  participants: ParticipantInfo[];
  messages: ChatMessage[];
  responses: StudentResponseItem[];
  bookmarks: ClassroomBookmark[];
  hasRaisedHand: boolean;
  isCoachReconnecting: boolean;
  reactions: Array<{ id: string; emoji: string; userName: string }>;
  errorMessage: string | null;
  clearError: () => void;
  /** Last puzzle attempt result (student-local, not broadcast to others) */
  puzzleAttemptResult: PuzzleAttemptResult | null;
  clearPuzzleAttemptResult: () => void;
  // Actions
  onMakeMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  onUndoMove: () => Promise<boolean>;
  onResetBoard: () => Promise<boolean>;
  onToggleBoardLock: (isLocked: boolean) => Promise<boolean>;
  onToggleFreeMove: (allow: boolean) => Promise<boolean>;
  onToggleStudentPermission: (studentId: string, enable: boolean) => Promise<boolean>;
  onLoadPuzzle: (puzzle: CanonicalPuzzleState) => Promise<boolean>;
  onRevealPuzzleSolution: () => Promise<boolean>;
  onNextPuzzle: (puzzle: CanonicalPuzzleState) => Promise<boolean>;
  onSubmitPuzzleResult: (puzzleId: string, solved: boolean, attempts: number) => Promise<boolean>;
  onLoadGame: (pgn: string, title?: string) => Promise<boolean>;
  onLoadCurriculum: (curriculum: CanonicalCurriculumState) => Promise<boolean>;
  onNavigateMove: (moveIndex: number) => Promise<boolean>;
  onSetDrawing: (arrows: BoardArrow[], highlights: BoardHighlight[]) => Promise<boolean>;
  onStartQuiz: (question: string, options: string[], correctIndex: number, explanation: string) => Promise<boolean>;
  onCloseQuiz: () => Promise<boolean>;
  onRevealQuiz: () => Promise<boolean>;
  onSubmitQuizAnswer: (quizId: string, selectedOptionIndex: number) => Promise<boolean>;
  onSubmitResponse: (prompt: string, response: string) => Promise<boolean>;
  onSendMessage: (message: string, isPrivate: boolean, recipientId?: string) => Promise<boolean>;
  onCreateBookmark: (fen: string, moveIndex: number, note: string) => Promise<boolean>;
  onToggleRaiseHand: (raised: boolean) => Promise<boolean>;
  onSendReaction: (emoji: string) => Promise<boolean>;
  /** Coach broadcasts a question prompt to all students */
  onAskQuestion: (question: CoachQuestion) => Promise<boolean>;
  onEndClass: (attendanceRecords?: any[], reviewNotes?: string) => Promise<boolean>;
}

const ClassroomContext = createContext<ClassroomContextValue | null>(null);

interface ClassroomStateProviderProps {
  initialSnapshot: ClassroomSnapshot;
  classId: string;
  sessionId: string;
  userId: string;
  userName: string;
  role: UserRole;
  students?: Array<{ studentProfileId: string; userId: string; firstName: string; lastName: string; email: string }>;
  coachName?: string;
  children: React.ReactNode;
}

export function ClassroomStateProvider({
  initialSnapshot,
  classId,
  sessionId,
  userId,
  userName,
  role,
  students = [],
  coachName = 'Academy Coach',
  children,
}: ClassroomStateProviderProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot>(initialSnapshot);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [responses, setResponses] = useState<StudentResponseItem[]>([]);
  const [bookmarks, setBookmarks] = useState<ClassroomBookmark[]>([]);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; userName: string }>>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set([userId]));
  const [raisedHandUserIds, setRaisedHandUserIds] = useState<Set<string>>(new Set());
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [puzzleAttemptResult, setPuzzleAttemptResult] = useState<PuzzleAttemptResult | null>(null);
  const clearPuzzleAttemptResult = useCallback(() => setPuzzleAttemptResult(null), []);

  const isCoach = role === 'coach' || role === 'admin';
  const canMove = canUserMoveBoard(role, userId, snapshot.permissions);
  const isBoardLocked = snapshot.permissions.isBoardLocked;

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const clearError = useCallback(() => setErrorMessage(null), []);

  // ── Snapshot Reconciliation ───────────────────────────────────────────────
  const reconcileSnapshot = useCallback(async () => {
    try {
      const res = await getCanonicalClassroomSnapshotAction(classId, sessionId);
      if (res.success && res.data) {
        setSnapshot((prev) => ({
          ...res.data!,
          version: Math.max(prev.version, res.data!.version),
        }));
      }
    } catch (err) {
      console.warn('[Snapshot Reconcile Error]', err);
    }
  }, [classId, sessionId]);

  // ── Realtime WebSocket Setup ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseClient();
    const channelName = `live-session:${sessionId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('broadcast', { event: '*' }, (eventPayload: any) => {
        const payload = eventPayload?.payload;
        if (!payload) return;

        // Gap detection: If incoming version skips local version, reconcile canonical state!
        if (payload.version && payload.version > snapshotRef.current.version + 1) {
          console.warn('[Realtime Gap] Received version', payload.version, 'while at', snapshotRef.current.version, '- Reconciling canonical snapshot');
          reconcileSnapshot();
          return;
        }

        // Apply reducer for canonical board/puzzle/quiz states
        setSnapshot((current) => classroomReducer(current, payload));

        // Special handling for secondary real-time entities
        if (payload.type === 'CHAT_MESSAGE' || payload.type === 'PRIVATE_CHAT_MESSAGE') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.message.id)) return prev;
            return [...prev, payload.message];
          });
        } else if (payload.type === 'REACTION') {
          setReactions((prev) => [
            ...prev.slice(-15),
            { id: `rx_${Date.now()}_${Math.random()}`, emoji: payload.emoji, userName: payload.userName },
          ]);
        } else if (payload.type === 'STUDENT_RESPONSE') {
          setResponses((prev) => {
            if (prev.some((r) => r.id === payload.response.id)) return prev;
            return [payload.response, ...prev];
          });
        } else if (payload.type === 'BOOKMARK_CREATED') {
          setBookmarks((prev) => [payload.bookmark, ...prev]);
        } else if (payload.type === 'PUZZLE_SOLVED') {
          // Update puzzle attempt result (shown as inline feedback on board)
          setPuzzleAttemptResult({
            puzzleId: payload.puzzleId,
            studentId: payload.studentId,
            solved: payload.solved,
            attempts: payload.attempts,
            timestamp: payload.timestamp,
          });
          // Auto-clear after 4 seconds for student
          if (payload.studentId === userId) {
            setTimeout(() => setPuzzleAttemptResult(null), 4000);
          }
        } else if (payload.type === 'RAISE_HAND_CHANGED') {
          setRaisedHandUserIds((prev) => {
            const next = new Set(prev);
            if (payload.raised) next.add(payload.studentId);
            else next.delete(payload.studentId);
            return next;
          });
          if (payload.studentId === userId) {
            setHasRaisedHand(payload.raised);
          }
        } else if (payload.type === 'CLASS_ENDED') {
          setSnapshot((prev) => ({
            ...prev,
            status: 'ended',
            isLive: false,
          }));
          setTimeout(() => {
            if (!isCoach) {
              router.push('/dashboard/student/classes');
            }
          }, 3000);
        }
      });

    // Realtime Presence tracking — accurately maps presence key and payload to onlineUserIds
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        for (const [key, presences] of Object.entries(state)) {
          if (key) online.add(key);
          if (Array.isArray(presences)) {
            for (const p of presences as any[]) {
              if (p?.userId) online.add(p.userId);
            }
          }
        }
        setOnlineUserIds(online);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (key) next.add(key);
          if (Array.isArray(newPresences)) {
            for (const p of newPresences) {
              if (p?.userId) next.add(p.userId);
            }
          }
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (key) next.delete(key);
          if (Array.isArray(leftPresences)) {
            for (const p of leftPresences) {
              if (p?.userId) next.delete(p.userId);
            }
          }
          return next;
        });
      });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('connected');
        channel.track({
          userId,
          userName,
          role,
          onlineAt: new Date().toISOString(),
        });
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        setConnectionState('reconnecting');
      } else if (status === 'CLOSED') {
        setConnectionState('disconnected');
      }
    });

    const handleOnline = () => {
      setConnectionState('reconnecting');
      reconcileSnapshot().then(() => setConnectionState('connected'));
    };

    const handleFocus = () => {
      reconcileSnapshot();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [classId, sessionId, userId, userName, role, isCoach, router, reconcileSnapshot]);

  // ── Compute Participants List ─────────────────────────────────────────────
  const participants: ParticipantInfo[] = useMemo(() => {
    const list: ParticipantInfo[] = [
      {
        userId: snapshot.permissions.coachId || 'coach',
        firstName: coachName,
        lastName: '',
        role: 'coach',
        isOnline: true,
        hasBoardControl: true,
        raisedHand: false,
      },
    ];

    for (const s of students) {
      const isOnline = onlineUserIds.has(s.userId);
      const hasControl = snapshot.permissions.boardControllers.includes(s.userId);
      const raisedHand = raisedHandUserIds.has(s.userId);

      list.push({
        userId: s.userId,
        firstName: s.firstName || 'Student',
        lastName: s.lastName || '',
        role: 'student',
        isOnline,
        hasBoardControl: hasControl,
        raisedHand,
      });
    }

    return list;
  }, [students, coachName, onlineUserIds, snapshot.permissions.boardControllers, snapshot.permissions.coachId, raisedHandUserIds]);

  // ── Action Handlers ───────────────────────────────────────────────────────

  const onMakeMove = useCallback(
    async (from: string, to: string, promotion?: string): Promise<boolean> => {
      console.log('[ClassroomStateProvider] onMakeMove called:', {
        from,
        to,
        promotion,
        canMove,
        isBoardLocked,
        currentFen: snapshotRef.current?.board?.fen,
      });

      if (!canMove || isBoardLocked) {
        // Silently reject — the board's FEN prop stays unchanged, piece snaps back naturally.
        return false;
      }

      // Optimistic Validation & Update
      const allowIllegalMoves = Boolean(snapshotRef.current?.board?.allowIllegalMoves);
      const validation = validateChessMove(snapshotRef.current.board.fen, { from, to, promotion }, allowIllegalMoves);
      if (!validation.valid || !validation.newFen) {
        console.warn('[ClassroomStateProvider] Move validation failed (silent):', validation.error);
        // Silent return — no error banner. Invalid moves snap back via FEN prop naturally.
        return false;
      }

      const previousSnapshot = snapshotRef.current;
      const expectedVersion = previousSnapshot.version;
      const mutationId = `move_${Date.now()}_${from}_${to}`;

      const newMoveData: MoveData = {
        moveNumber: Math.floor(previousSnapshot.board.moves.length / 2) + 1,
        san: validation.san || '',
        from,
        to,
        piece: validation.piece,
        color: (validation.color as 'w' | 'b') || 'w',
        promotion,
        fenAfter: validation.newFen,
        uci: validation.uci,
        playedBy: userId,
        timestamp: new Date().toISOString(),
      };

      // Optimistic UI state
      setSnapshot((current) => ({
        ...current,
        version: current.version + 1,
        board: {
          ...current.board,
          fen: validation.newFen!,
          moves: [...current.board.moves, newMoveData],
          currentMoveIndex: current.board.moves.length,
          sideToMove: validation.color === 'w' ? 'b' : 'w',
          arrows: [],
          highlights: [],
        },
      }));

      // Server-Authoritative Persist & Broadcast
      const res = await mutateClassroomMoveAction(
        sessionId,
        { from, to, promotion },
        expectedVersion,
        mutationId
      );

      if (!res.success) {
        // Rollback on rejection
        setSnapshot(previousSnapshot);
        setErrorMessage(res.error || 'Move rejected by server.');
        reconcileSnapshot();
        return false;
      }

      return true;
    },
    [canMove, isBoardLocked, sessionId, userId, reconcileSnapshot]
  );

  const onUndoMove = useCallback(async (): Promise<boolean> => {
    const res = await mutateClassroomUndoAction(sessionId, snapshotRef.current.version);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to undo move.');
      return false;
    }
    return true;
  }, [sessionId]);

  const onResetBoard = useCallback(async (): Promise<boolean> => {
    const res = await mutateClassroomResetAction(sessionId, snapshotRef.current.version);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to reset board.');
      return false;
    }
    return true;
  }, [sessionId]);

  const onToggleBoardLock = useCallback(
    async (isLocked: boolean): Promise<boolean> => {
      const res = await mutateClassroomLockAction(sessionId, isLocked, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update board lock.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onToggleFreeMove = useCallback(
    async (allow: boolean): Promise<boolean> => {
      setSnapshot((current) => ({
        ...current,
        board: {
          ...current.board,
          allowIllegalMoves: allow,
        },
      }));
      const res = await mutateClassroomFreeMoveAction(sessionId, allow, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to toggle Free Move mode.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onToggleStudentPermission = useCallback(
    async (targetStudentId: string, enable: boolean): Promise<boolean> => {
      setSnapshot((current) => ({
        ...current,
        permissions: {
          ...current.permissions,
          boardControllers: enable
            ? Array.from(new Set([...current.permissions.boardControllers, targetStudentId]))
            : current.permissions.boardControllers.filter((id) => id !== targetStudentId),
        },
      }));
      const res = await mutateClassroomPermissionAction(
        sessionId,
        targetStudentId,
        enable,
        snapshotRef.current.version
      );
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update student permission.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onLoadPuzzle = useCallback(
    async (puzzle: CanonicalPuzzleState): Promise<boolean> => {
      const res = await mutateClassroomLoadPuzzleAction(sessionId, puzzle, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to load puzzle.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onRevealPuzzleSolution = useCallback(async (): Promise<boolean> => {
    const res = await mutateClassroomRevealPuzzleSolutionAction(sessionId, snapshotRef.current.version);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to reveal puzzle solution.');
      return false;
    }
    return true;
  }, [sessionId]);

  const onNextPuzzle = useCallback(
    async (puzzle: CanonicalPuzzleState): Promise<boolean> => {
      const res = await mutateClassroomNextPuzzleAction(sessionId, puzzle, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to advance to next puzzle.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onSubmitPuzzleResult = useCallback(
    async (puzzleId: string, solved: boolean, attempts: number): Promise<boolean> => {
      const res = await mutateClassroomSubmitPuzzleResultAction(sessionId, puzzleId, solved, attempts);
      return res.success;
    },
    [sessionId]
  );

  const onLoadGame = useCallback(
    async (pgn: string, title?: string): Promise<boolean> => {
      const res = await mutateClassroomLoadGameAction(sessionId, pgn, title, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to load game.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onLoadCurriculum = useCallback(
    async (curriculum: CanonicalCurriculumState): Promise<boolean> => {
      const res = await mutateClassroomLoadCurriculumAction(sessionId, curriculum, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to load curriculum.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onNavigateMove = useCallback(
    async (moveIndex: number): Promise<boolean> => {
      const res = await mutateClassroomNavigateMoveAction(sessionId, moveIndex, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to navigate move.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onSetDrawing = useCallback(
    async (arrows: BoardArrow[], highlights: BoardHighlight[]): Promise<boolean> => {
      const res = await mutateClassroomSetDrawingAction(sessionId, arrows, highlights, snapshotRef.current.version);
      return res.success;
    },
    [sessionId]
  );

  const onStartQuiz = useCallback(
    async (question: string, options: string[], correctIndex: number, explanation: string): Promise<boolean> => {
      const res = await mutateClassroomStartQuizAction(sessionId, question, options, correctIndex, explanation, snapshotRef.current.version);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to start quiz.');
        return false;
      }
      return true;
    },
    [sessionId]
  );

  const onCloseQuiz = useCallback(async (): Promise<boolean> => {
    const res = await mutateClassroomCloseQuizAction(sessionId, snapshotRef.current.version);
    return res.success;
  }, [sessionId]);

  const onRevealQuiz = useCallback(async (): Promise<boolean> => {
    const res = await mutateClassroomRevealQuizAction(sessionId, snapshotRef.current.version);
    return res.success;
  }, [sessionId]);

  const onSubmitQuizAnswer = useCallback(
    async (quizId: string, selectedOptionIndex: number): Promise<boolean> => {
      const res = await mutateClassroomSubmitQuizAnswerAction(sessionId, quizId, selectedOptionIndex);
      return res.success;
    },
    [sessionId]
  );

  const onSubmitResponse = useCallback(
    async (prompt: string, response: string): Promise<boolean> => {
      const res = await mutateClassroomSubmitResponseAction(sessionId, classId, prompt, response);
      return res.success;
    },
    [sessionId, classId]
  );

  const onSendMessage = useCallback(
    async (message: string, isPrivate: boolean, recipientId?: string): Promise<boolean> => {
      const res = await mutateClassroomSendChatAction(classId, sessionId, message, isPrivate, recipientId);
      return res.success;
    },
    [classId, sessionId]
  );

  const onCreateBookmark = useCallback(
    async (fen: string, moveIndex: number, note: string): Promise<boolean> => {
      const res = await mutateClassroomCreateBookmarkAction(classId, sessionId, fen, moveIndex, note);
      return res.success;
    },
    [classId, sessionId]
  );

  const onToggleRaiseHand = useCallback(
    async (raised: boolean): Promise<boolean> => {
      const res = await mutateClassroomRaiseHandAction(sessionId, raised);
      return res.success;
    },
    [sessionId]
  );

  const isCoachOnline = participants.some((p) => (p.role === 'coach' || p.role === 'admin') && p.isOnline);
  const isCoachReconnecting = !isCoachOnline && snapshot.isLive && role === 'student';

  const onSendReaction = useCallback(
    async (emoji: string): Promise<boolean> => {
      try {
        const supabase = createSupabaseClient();
        const channel = supabase.channel(`live-session:${sessionId}`);
        await channel.send({
          type: 'broadcast',
          event: 'REACTION',
          payload: {
            type: 'REACTION',
            emoji,
            userId,
            userName,
            timestamp: new Date().toISOString(),
          },
        });
        setReactions((prev) => [
          ...prev.slice(-15),
          { id: `rx_${Date.now()}_${Math.random()}`, emoji, userName },
        ]);
        return true;
      } catch {
        return false;
      }
    },
    [sessionId, userId, userName]
  );

  const onAskQuestion = useCallback(
    async (question: CoachQuestion): Promise<boolean> => {
      if (!isCoach) return false;
      try {
        const supabase = createSupabaseClient();
        const channel = supabase.channel(`live-session:${sessionId}`);
        await channel.send({
          type: 'broadcast',
          event: 'COACH_QUESTION',
          payload: {
            type: 'COACH_QUESTION',
            sessionId,
            eventId: `q_${Date.now()}`,
            version: snapshotRef.current.version,
            timestamp: new Date().toISOString(),
            question,
          },
        });
        // Apply locally for coach view
        setSnapshot((prev) => ({ ...prev, activeQuestion: question }));
        return true;
      } catch (err) {
        console.warn('[onAskQuestion] Error broadcasting question:', err);
        return false;
      }
    },
    [isCoach, sessionId]
  );

  const onEndClass = useCallback(async (attendanceRecords?: any[], reviewNotes?: string): Promise<boolean> => {
    const res = await endClassroomSessionAction(classId, sessionId, attendanceRecords, undefined, reviewNotes);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to end class.');
      return false;
    }
    router.push('/dashboard/coach/classes');
    return true;
  }, [classId, sessionId, router]);

  const value = useMemo<ClassroomContextValue>(
    () => ({
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
      bookmarks,
      hasRaisedHand,
      isCoachReconnecting,
      reactions,
      errorMessage,
      clearError,
      puzzleAttemptResult,
      clearPuzzleAttemptResult,
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
      onCreateBookmark,
      onToggleRaiseHand,
      onSendReaction,
      onAskQuestion,
      onEndClass,
    }),
    [
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
      bookmarks,
      hasRaisedHand,
      isCoachReconnecting,
      reactions,
      errorMessage,
      clearError,
      puzzleAttemptResult,
      clearPuzzleAttemptResult,
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
      onCreateBookmark,
      onToggleRaiseHand,
      onSendReaction,
      onAskQuestion,
      onEndClass,
    ]
  );

  return <ClassroomContext.Provider value={value}>{children}</ClassroomContext.Provider>;
}

export function useClassroomState() {
  const ctx = useContext(ClassroomContext);
  if (!ctx) {
    throw new Error('useClassroomState must be used within ClassroomStateProvider');
  }
  return ctx;
}
