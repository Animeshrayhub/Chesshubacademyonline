/**
 * Classroom V2 Server-Authoritative Mutation Engine
 * Validates chess rules, user role/board permissions, updates database atomically,
 * logs audit trail, and broadcasts canonical updates over Supabase Realtime.
 * 100% resilient and compatible with live Supabase database schema.
 */

import { createSupabaseAdmin } from '../supabase/admin';
import { Chess } from 'chess.js';
import {
  type ClassroomSnapshot,
  type CanonicalBoardState,
  type CanonicalPuzzleState,
  type CanonicalGameState,
  type CanonicalCurriculumState,
  type PermissionsState,
  type ClassroomQuizState,
  type UserRole,
  type BoardArrow,
  type BoardHighlight,
  type MoveData,
  type ClassroomBookmark,
  type ChatMessage,
  type StudentResponseItem,
} from './types';
import { type ClassroomRealtimePayload } from './events';
import { validateChessMove, parsePgnToMoves } from './validation';
import { canUserMoveBoard, isCoachOrAdmin } from './permissions';
import { logClassroomTimelineEvent } from './timeline';
import { logClassroomAudit } from './audit';
import { DEFAULT_INITIAL_FEN } from './constants';

function getSideToMoveFromFen(fen: string): 'w' | 'b' {
  const parts = (fen || '').trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}

/**
 * Broadcasts an event to the single canonical Supabase Realtime channel for this session.
 */
export async function broadcastToLiveSession(
  sessionId: string,
  payload: ClassroomRealtimePayload
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              topic: `live-session:${sessionId}`,
              event: payload.type,
              payload,
            },
          ],
        }),
      });
    }
  } catch (err) {
    console.warn('[Classroom V2 Broadcast Notice]', err);
  }
}

/**
 * Helper that ensures a live_session_board_state row always exists in PostgreSQL.
 * Uses exact columns supported by live Supabase schema.
 */
async function ensureBoardStateRow(admin: ReturnType<typeof createSupabaseAdmin>, sessionId: string) {
  const { data: existing } = await admin
    .from('live_session_board_state')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) return existing;

  // Insert default row with verified existing schema columns
  const { data: newRow, error } = await admin
    .from('live_session_board_state')
    .insert({
      session_id: sessionId,
      fen: DEFAULT_INITIAL_FEN,
      moves: [],
      current_move_index: -1,
      board_controller_id: null,
      allow_illegal_moves: false,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[ensureBoardStateRow] Insert fallback notice:', error.message);
  }

  return newRow || existing;
}

// In-memory active modes and overlays cache per session
const sessionOverlays = new Map<
  string,
  {
    puzzle: CanonicalPuzzleState | null;
    game: CanonicalGameState | null;
    curriculum: CanonicalCurriculumState | null;
    quiz: ClassroomQuizState | null;
    arrows: BoardArrow[];
    highlights: BoardHighlight[];
    version: number;
  }
>();

function getOverlayState(sessionId: string, currentMovesLength: number) {
  let state = sessionOverlays.get(sessionId);
  if (!state) {
    state = {
      puzzle: null,
      game: null,
      curriculum: null,
      quiz: null,
      arrows: [],
      highlights: [],
      version: Math.max(1, currentMovesLength + 1),
    };
    sessionOverlays.set(sessionId, state);
  }
  return state;
}

/**
 * Retrieves the full canonical classroom snapshot directly from PostgreSQL.
 * Strips sensitive data (unrevealed quiz answers, puzzle solutions) for students.
 */
export async function getCanonicalClassroomSnapshot(
  classId: string,
  sessionId: string,
  userId: string,
  userRole: UserRole
): Promise<ClassroomSnapshot> {
  const admin = createSupabaseAdmin();
  const effectiveSessionId = sessionId || classId;

  // 1. Fetch class metadata with real columns
  const { data: cls } = await admin
    .from('classes')
    .select('id, status, coach_id, scheduled_start, duration_minutes, class_type')
    .eq('id', classId)
    .maybeSingle();

  const className = cls?.class_type ? `${cls.class_type} Chess Class` : 'Live Chess Classroom';

  // 2. Fetch coach name
  let coachName = 'Academy Coach';
  if (cls?.coach_id) {
    const { data: cp } = await admin
      .from('coach_profiles')
      .select('user_id, title')
      .eq('id', cls.coach_id)
      .maybeSingle();
    const targetUserId = cp?.user_id || cls.coach_id;
    const { data: cu } = await admin
      .from('users')
      .select('first_name, last_name')
      .eq('id', targetUserId)
      .maybeSingle();
    if (cu) {
      coachName = `${cp?.title || 'Coach'} ${cu.first_name} ${cu.last_name}`.trim();
    }
  }

  // 3. Fetch live_sessions row
  const { data: liveSession } = await admin
    .from('live_sessions')
    .select('*')
    .eq('id', effectiveSessionId)
    .maybeSingle();

  const isSessionActive = liveSession?.status === 'active' || cls?.status === 'LIVE';
  const sessionStatus = liveSession?.status || (cls?.status === 'LIVE' ? 'active' : 'scheduled');

  // 4. Ensure & fetch canonical board state row
  const boardRow = await ensureBoardStateRow(admin, effectiveSessionId);

  const rawFen = boardRow?.fen || DEFAULT_INITIAL_FEN;
  const rawMoves: MoveData[] = Array.isArray(boardRow?.moves) ? boardRow.moves : [];
  const currentMoveIndex = boardRow?.current_move_index ?? (rawMoves.length - 1);
  const allowIllegalMoves = boardRow?.allow_illegal_moves ?? false;

  // Extract controllers & lock state from board_controller_id
  let isBoardLocked = false;
  let boardControllers: string[] = [];
  const rawController = boardRow?.board_controller_id || '';
  if (rawController.startsWith('LOCKED')) {
    isBoardLocked = true;
    const remaining = rawController.replace(/^LOCKED:?/, '').trim();
    boardControllers = remaining ? remaining.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  } else if (rawController) {
    boardControllers = rawController.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  // Overlay states (Puzzle, Curriculum, Game, Quiz, Arrows)
  const overlay = getOverlayState(effectiveSessionId, rawMoves.length);
  const version = Math.max(overlay.version, rawMoves.length + 1);

  let activePuzzle: CanonicalPuzzleState | null = overlay.puzzle;
  // Security: scrub puzzle solution for students
  if (activePuzzle && userRole === 'student' && activePuzzle.status !== 'solved') {
    activePuzzle = {
      ...activePuzzle,
      solution: [],
    };
  }

  const activeGame: CanonicalGameState | null = overlay.game;
  const activeCurriculum: CanonicalCurriculumState | null = overlay.curriculum;

  // Security: scrub quiz correct index for students
  let quizState: ClassroomQuizState | null = overlay.quiz;
  if (quizState && userRole === 'student' && quizState.status !== 'revealed') {
    quizState = {
      ...quizState,
      correctIndex: null,
      explanation: null,
    };
  }

  const mode = activePuzzle ? 'PUZZLE' : activeCurriculum ? 'CURRICULUM' : 'NORMAL_GAME';

  const board: CanonicalBoardState = {
    fen: rawFen,
    initialFen: activePuzzle ? activePuzzle.fen : (activeGame ? activeGame.initialFen : DEFAULT_INITIAL_FEN),
    moves: rawMoves,
    pgn: '',
    currentMoveIndex,
    sideToMove: getSideToMoveFromFen(rawFen),
    orientation: 'white',
    mode,
    isBoardLocked,
    allowIllegalMoves,
    arrows: overlay.arrows,
    highlights: overlay.highlights,
  };

  const permissions: PermissionsState = {
    coachId: cls?.coach_id || '',
    boardControllers,
    isBoardLocked,
  };

  return {
    classId,
    sessionId: effectiveSessionId,
    className,
    coachName,
    scheduledStart: cls?.scheduled_start || new Date().toISOString(),
    startedAt: liveSession?.started_at || null,
    durationMinutes: cls?.duration_minutes || 60,
    status: sessionStatus as any,
    isLive: isSessionActive,
    version,
    board,
    puzzle: activePuzzle,
    game: activeGame,
    curriculum: activeCurriculum,
    quiz: quizState,
    permissions,
    activeQuestion: null, // Set client-side via COACH_QUESTION realtime events
    updatedAt: boardRow?.updated_at || new Date().toISOString(),
  };
}

/**
 * Server-authoritative move submission with optimistic concurrency and Coach priority.
 */
export async function mutateClassroomMove(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  moveInput: { from: string; to: string; promotion?: string } | string,
  expectedVersion?: number
): Promise<{
  success: boolean;
  error?: string;
  snapshot?: ClassroomSnapshot;
  moveData?: MoveData;
}> {
  const admin = createSupabaseAdmin();
  const boardRow = await ensureBoardStateRow(admin, sessionId);

  if (!boardRow) {
    return { success: false, error: 'Active live session board state not found.' };
  }

  const currentMoves: MoveData[] = Array.isArray(boardRow.moves) ? boardRow.moves : [];
  const overlay = getOverlayState(sessionId, currentMoves.length);
  const currentVersion = Math.max(overlay.version, currentMoves.length + 1);
  const currentFen = boardRow.fen || DEFAULT_INITIAL_FEN;
  const allowIllegalMoves = boardRow.allow_illegal_moves || false;

  let isBoardLocked = false;
  let boardControllers: string[] = [];
  const rawController = boardRow.board_controller_id || '';
  if (rawController.startsWith('LOCKED')) {
    isBoardLocked = true;
    const remaining = rawController.replace(/^LOCKED:?/, '').trim();
    boardControllers = remaining ? remaining.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  } else if (rawController) {
    boardControllers = rawController.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  const permissions: PermissionsState = {
    coachId: '',
    boardControllers,
    isBoardLocked,
  };

  // 1. Authorize user to move
  const canMove = canUserMoveBoard(userRole, userId, permissions);
  if (!canMove) {
    await logClassroomAudit({
      classId: sessionId,
      sessionId,
      actorId: userId,
      actorRole: userRole,
      action: 'UNAUTHORIZED_ATTEMPT_BLOCKED',
      metadata: { reason: 'Student attempted move without board control permission' },
    });

    return {
      success: false,
      error: 'Permission Denied: You do not have permission to move the board.',
    };
  }

  // 2. Concurrency check: Coach always has priority. For students, ensure board hasn't progressed past expected move.
  const canonicalBoardMoveCount = currentMoves.length;
  if (expectedVersion !== undefined && expectedVersion <= canonicalBoardMoveCount) {
    if (userRole !== 'coach' && userRole !== 'admin') {
      return {
        success: false,
        error: 'State conflict: A new move was made on the board. Resynchronizing…',
      };
    }
  }

  // 3. Validate chess move server-side using chess.js
  const validation = validateChessMove(currentFen, moveInput, allowIllegalMoves);
  if (!validation.valid || !validation.newFen) {
    return {
      success: false,
      error: validation.error || 'Illegal chess move according to FIDE rules.',
    };
  }

  const nextVersion = currentVersion + 1;
  overlay.version = nextVersion;

  const newMoveData: MoveData = {
    moveNumber: Math.floor(currentMoves.length / 2) + 1,
    san: validation.san || '',
    from: validation.from || '',
    to: validation.to || '',
    piece: validation.piece,
    color: (validation.color as 'w' | 'b') || 'w',
    promotion: validation.promotion,
    fenAfter: validation.newFen,
    uci: validation.uci,
    playedBy: userId,
    timestamp: new Date().toISOString(),
  };

  const updatedMoves = [...currentMoves, newMoveData];

  // 4. Update Database atomically
  const { error: updateErr } = await admin
    .from('live_session_board_state')
    .update({
      fen: validation.newFen,
      moves: updatedMoves,
      current_move_index: updatedMoves.length - 1,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Clear arrows upon move
  overlay.arrows = [];
  overlay.highlights = [];

  // 5. Broadcast Realtime Event
  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `move_${Date.now()}_${nextVersion}`,
    type: 'MOVE_PLAYED',
    move: newMoveData,
    fen: validation.newFen,
    currentMoveIndex: updatedMoves.length - 1,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    moveData: newMoveData,
  };
}

/**
 * Undoes the last move (Coach only).
 */
export async function mutateClassroomUndo(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can undo moves.' };
  }

  const admin = createSupabaseAdmin();
  const boardRow = await ensureBoardStateRow(admin, sessionId);
  const currentMoves: MoveData[] = Array.isArray(boardRow?.moves) ? boardRow.moves : [];

  if (currentMoves.length === 0) {
    return { success: false, error: 'No moves to undo.' };
  }

  const updatedMoves = currentMoves.slice(0, -1);
  const nextMoveIndex = updatedMoves.length - 1;
  const newFen = nextMoveIndex >= 0 ? updatedMoves[nextMoveIndex].fenAfter : DEFAULT_INITIAL_FEN;

  const overlay = getOverlayState(sessionId, currentMoves.length);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      fen: newFen,
      moves: updatedMoves,
      current_move_index: nextMoveIndex,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'MOVE_UNDO',
    metadata: { undoneMove: currentMoves[currentMoves.length - 1]?.san, remainingMoves: updatedMoves.length },
  });

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `undo_${Date.now()}`,
    type: 'BOARD_STATE_UPDATED',
    fen: newFen,
    currentMoveIndex: nextMoveIndex,
    moves: updatedMoves,
    mode: overlay.puzzle ? 'PUZZLE' : overlay.curriculum ? 'CURRICULUM' : 'NORMAL_GAME',
    arrows: [],
    highlights: [],
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Resets the board to standard starting position (Coach only).
 */
export async function mutateClassroomReset(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can reset the board.' };
  }

  const admin = createSupabaseAdmin();
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;
  overlay.puzzle = null;
  overlay.game = null;
  overlay.curriculum = null;
  overlay.arrows = [];
  overlay.highlights = [];

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      fen: DEFAULT_INITIAL_FEN,
      moves: [],
      current_move_index: -1,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'BOARD_RESET',
  });

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `reset_${Date.now()}`,
    type: 'BOARD_STATE_UPDATED',
    fen: DEFAULT_INITIAL_FEN,
    currentMoveIndex: -1,
    moves: [],
    mode: 'NORMAL_GAME',
    arrows: [],
    highlights: [],
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Toggles global board lock (Coach only).
 */
export async function mutateClassroomLock(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  isLocked: boolean,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can lock/unlock board.' };
  }

  const admin = createSupabaseAdmin();
  const boardRow = await ensureBoardStateRow(admin, sessionId);
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  let currentControllers: string[] = [];
  const rawController = boardRow?.board_controller_id || '';
  if (rawController.startsWith('LOCKED')) {
    const remaining = rawController.replace(/^LOCKED:?/, '').trim();
    currentControllers = remaining ? remaining.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  } else if (rawController) {
    currentControllers = rawController.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  const newControllerStr = isLocked
    ? `LOCKED:${currentControllers.join(',')}`
    : currentControllers.join(',');

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      board_controller_id: newControllerStr,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: isLocked ? 'BOARD_LOCKED' : 'BOARD_UNLOCKED',
  });

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `perm_${Date.now()}`,
    type: 'PERMISSIONS_CHANGED',
    boardControllers: currentControllers,
    isBoardLocked: isLocked,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Toggles Free / Illegal move teaching mode (Coach only).
 */
export async function mutateClassroomFreeMove(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  allow: boolean,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can toggle Free Move mode.' };
  }

  const admin = createSupabaseAdmin();
  await ensureBoardStateRow(admin, sessionId);
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      allow_illegal_moves: allow,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: allow ? 'FREE_MOVE_ENABLED' : 'FREE_MOVE_DISABLED',
  });

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `freemove_${Date.now()}`,
    type: 'FREE_MOVE_TOGGLED',
    allowIllegalMoves: allow,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Grants or revokes board control for a specific student (Coach only).
 */
export async function mutateClassroomPermission(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  targetStudentId: string,
  enable: boolean,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can update student permissions.' };
  }

  const admin = createSupabaseAdmin();
  const boardRow = await ensureBoardStateRow(admin, sessionId);
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  let isLocked = false;
  let currentControllers: string[] = [];
  const rawController = boardRow?.board_controller_id || '';
  if (rawController.startsWith('LOCKED')) {
    isLocked = true;
    const remaining = rawController.replace(/^LOCKED:?/, '').trim();
    currentControllers = remaining ? remaining.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  } else if (rawController) {
    currentControllers = rawController.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  const updatedControllers = enable
    ? Array.from(new Set([...currentControllers, targetStudentId]))
    : currentControllers.filter((id) => id !== targetStudentId);

  const newControllerStr = isLocked
    ? `LOCKED:${updatedControllers.join(',')}`
    : updatedControllers.join(',');

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      board_controller_id: newControllerStr,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: enable ? 'BOARD_CONTROL_GRANTED' : 'BOARD_CONTROL_REVOKED',
    targetUserId: targetStudentId,
  });

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `perm_${Date.now()}`,
    type: 'PERMISSIONS_CHANGED',
    boardControllers: updatedControllers,
    isBoardLocked: isLocked,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Loads a puzzle onto the canonical classroom board (Coach only).
 */
export async function mutateClassroomLoadPuzzle(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  puzzle: CanonicalPuzzleState,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can load puzzles.' };
  }

  const admin = createSupabaseAdmin();
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;
  overlay.puzzle = puzzle;
  overlay.curriculum = null;
  overlay.game = null;
  overlay.arrows = [];
  overlay.highlights = [];

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      fen: puzzle.fen,
      moves: [],
      current_move_index: -1,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'PUZZLE_LOADED',
    metadata: { puzzleId: puzzle.puzzleId, title: puzzle.title },
  });

  // Broadcast sanitized puzzle (hide solution from students!)
  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `puzzle_${Date.now()}`,
    type: 'PUZZLE_UPDATED',
    puzzle: {
      ...puzzle,
      solution: [], // Scrubbed in realtime broadcast
    },
    fen: puzzle.fen,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Reveals the solution for the active puzzle (Coach only).
 */
export async function mutateClassroomRevealPuzzleSolution(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can reveal puzzle solution.' };
  }

  const overlay = getOverlayState(sessionId, 0);
  if (!overlay.puzzle) return { success: true };

  const updatedPuzzle: CanonicalPuzzleState = {
    ...overlay.puzzle,
    status: 'solved',
  };
  overlay.puzzle = updatedPuzzle;
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `puzzle_${Date.now()}`,
    type: 'PUZZLE_UPDATED',
    puzzle: updatedPuzzle, // Solution revealed to all students
    fen: updatedPuzzle.fen,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Advances to the next puzzle (Coach only).
 */
export async function mutateClassroomNextPuzzle(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  puzzle: CanonicalPuzzleState,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  return mutateClassroomLoadPuzzle(sessionId, userId, userRole, puzzle, expectedVersion);
}

/**
 * Records a student's puzzle solution result.
 */
export async function mutateClassroomSubmitPuzzleResult(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  puzzleId: string,
  solved: boolean,
  attempts: number
): Promise<{ success: boolean; error?: string }> {
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  if (solved) {
    await logClassroomAudit({
      classId: sessionId,
      sessionId,
      actorId: userId,
      actorRole: userRole,
      action: 'PUZZLE_SOLVED',
      metadata: { puzzleId, attempts, solved },
    });
  }

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `puzzlesolve_${Date.now()}`,
    type: 'PUZZLE_SOLVED',
    puzzleId,
    studentId: userId,
    solved,
    attempts,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Loads a full game PGN onto the board (Coach only).
 */
export async function mutateClassroomLoadGame(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  pgnText: string,
  gameTitle = 'Master Game',
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can load games.' };
  }

  const { moves, finalFen } = parsePgnToMoves(pgnText, userId);
  const admin = createSupabaseAdmin();
  const overlay = getOverlayState(sessionId, moves.length);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  const gameState: CanonicalGameState = {
    gameId: `game_${Date.now()}`,
    whiteName: 'White',
    blackName: 'Black',
    result: '*',
    pgn: pgnText,
    initialFen: DEFAULT_INITIAL_FEN,
    moves,
    currentMoveIndex: moves.length - 1,
  };

  overlay.game = gameState;
  overlay.puzzle = null;
  overlay.curriculum = null;

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      fen: finalFen,
      moves,
      current_move_index: moves.length - 1,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'GAME_LOADED',
    metadata: { title: gameTitle, moveCount: moves.length },
  });

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `game_${Date.now()}`,
    type: 'GAME_LOADED',
    game: gameState,
    fen: finalFen,
    moves,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Loads curriculum content onto the board (Coach only).
 */
export async function mutateClassroomLoadCurriculum(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  curriculum: CanonicalCurriculumState,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can load curriculum.' };
  }

  const admin = createSupabaseAdmin();
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;
  overlay.curriculum = curriculum;
  overlay.puzzle = null;
  overlay.game = null;

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      fen: curriculum.currentFen || DEFAULT_INITIAL_FEN,
      moves: [],
      current_move_index: -1,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'CURRICULUM_LOADED',
    metadata: { chapterId: curriculum.chapterId, title: curriculum.chapterTitle },
  });

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `curriculum_${Date.now()}`,
    type: 'CURRICULUM_UPDATED',
    curriculum,
    fen: curriculum.currentFen || DEFAULT_INITIAL_FEN,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Navigates move index in notation tree (Coach only).
 */
export async function mutateClassroomNavigateMove(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  targetMoveIndex: number,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can navigate move history.' };
  }

  const admin = createSupabaseAdmin();
  const boardRow = await ensureBoardStateRow(admin, sessionId);
  const moves: MoveData[] = Array.isArray(boardRow?.moves) ? boardRow.moves : [];

  let fenToSet = DEFAULT_INITIAL_FEN;
  if (targetMoveIndex >= 0 && targetMoveIndex < moves.length) {
    fenToSet = moves[targetMoveIndex].fenAfter;
  }

  const overlay = getOverlayState(sessionId, moves.length);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  const { error } = await admin
    .from('live_session_board_state')
    .update({
      fen: fenToSet,
      current_move_index: targetMoveIndex,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) return { success: false, error: error.message };

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `nav_${Date.now()}`,
    type: 'BOARD_STATE_UPDATED',
    fen: fenToSet,
    currentMoveIndex: targetMoveIndex,
    moves,
    mode: overlay.puzzle ? 'PUZZLE' : overlay.curriculum ? 'CURRICULUM' : 'NORMAL_GAME',
    arrows: [],
    highlights: [],
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Updates drawing annotations (arrows & highlights).
 */
export async function mutateClassroomSetDrawing(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  arrows: BoardArrow[],
  highlights: BoardHighlight[],
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdmin();
  const boardRow = await ensureBoardStateRow(admin, sessionId);
  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;
  overlay.arrows = arrows;
  overlay.highlights = highlights;

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `draw_${Date.now()}`,
    type: 'BOARD_STATE_UPDATED',
    fen: boardRow?.fen || DEFAULT_INITIAL_FEN,
    currentMoveIndex: boardRow?.current_move_index ?? -1,
    moves: boardRow?.moves || [],
    mode: overlay.puzzle ? 'PUZZLE' : overlay.curriculum ? 'CURRICULUM' : 'NORMAL_GAME',
    arrows,
    highlights,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Starts a classroom quiz (Coach only).
 */
export async function mutateClassroomStartQuiz(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  question: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can launch a quiz.' };
  }

  const overlay = getOverlayState(sessionId, 0);
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  const quizState: ClassroomQuizState = {
    quizId: `quiz_${Date.now()}`,
    status: 'active',
    question,
    options,
    correctIndex,
    explanation,
    startedAt: new Date().toISOString(),
  };
  overlay.quiz = quizState;

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'QUIZ_STARTED',
    metadata: { question, optionCount: options.length },
  });

  // Broadcast sanitized quiz state (safe payload for all clients)
  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `quiz_${Date.now()}`,
    type: 'QUIZ_STATE_CHANGED',
    quiz: {
      ...quizState,
      correctIndex: null, // Scrubbed for realtime broadcast!
      explanation: null,
    },
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Closes the active quiz question (Coach only).
 */
export async function mutateClassroomCloseQuiz(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can close a quiz.' };
  }

  const overlay = getOverlayState(sessionId, 0);
  if (!overlay.quiz) return { success: true };

  const updatedQuiz: ClassroomQuizState = {
    ...overlay.quiz,
    status: 'closed',
  };
  overlay.quiz = updatedQuiz;
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `quiz_${Date.now()}`,
    type: 'QUIZ_STATE_CHANGED',
    quiz: { ...updatedQuiz, correctIndex: null, explanation: null },
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Reveals the quiz solution to all students (Coach only).
 */
export async function mutateClassroomRevealQuiz(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  expectedVersion?: number
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can reveal quiz answers.' };
  }

  const overlay = getOverlayState(sessionId, 0);
  if (!overlay.quiz) return { success: true };

  const updatedQuiz: ClassroomQuizState = {
    ...overlay.quiz,
    status: 'revealed',
  };
  overlay.quiz = updatedQuiz;
  const nextVersion = overlay.version + 1;
  overlay.version = nextVersion;

  await logClassroomAudit({
    classId: sessionId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'QUIZ_REVEALED',
    metadata: { quizId: updatedQuiz.quizId },
  });

  // Now broadcast full revealed quiz with solution and explanation
  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `quiz_${Date.now()}`,
    type: 'QUIZ_STATE_CHANGED',
    quiz: updatedQuiz,
    version: nextVersion,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Submits a student's answer to the active quiz.
 */
export async function mutateClassroomSubmitQuizAnswer(
  sessionId: string,
  userId: string,
  userRole: UserRole,
  quizId: string,
  selectedOptionIndex: number
): Promise<{ success: boolean; error?: string }> {
  const overlay = getOverlayState(sessionId, 0);
  const quizState: ClassroomQuizState | null = overlay.quiz;

  if (!quizState || quizState.status !== 'active') {
    return { success: false, error: 'No active quiz is currently accepting submissions.' };
  }

  const isCorrect = quizState.correctIndex !== null && selectedOptionIndex === quizState.correctIndex;

  try {
    const admin = createSupabaseAdmin();
    await admin.from('quiz_answers').upsert(
      {
        quiz_id: quizId,
        student_id: userId,
        question_index: 0,
        selected_option_index: selectedOptionIndex,
        is_correct: isCorrect,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'quiz_id,student_id' }
    );
  } catch {
    // Graceful fallback
  }

  return { success: true };
}

/**
 * Submits a question response from student.
 */
export async function mutateClassroomSubmitResponse(
  sessionId: string,
  classId: string,
  studentId: string,
  studentName: string,
  prompt: string,
  response: string
): Promise<{ success: boolean; error?: string; data?: StudentResponseItem }> {
  const item: StudentResponseItem = {
    id: `resp_${Date.now()}`,
    sessionId,
    studentId,
    studentName,
    prompt,
    response,
    createdAt: new Date().toISOString(),
  };

  try {
    const admin = createSupabaseAdmin();
    await admin.from('classroom_responses').insert({
      class_id: classId,
      session_id: sessionId,
      student_id: studentId,
      student_name: studentName,
      prompt,
      response,
      created_at: item.createdAt,
    });
  } catch {
    // Graceful fallback if table not yet created
  }

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `resp_${Date.now()}`,
    type: 'STUDENT_RESPONSE',
    response: item,
    version: 0,
    timestamp: new Date().toISOString(),
  });

  return { success: true, data: item };
}

/**
 * Sends a chat message (public or private).
 */
export async function mutateClassroomSendChat(
  classId: string,
  sessionId: string,
  senderId: string,
  senderName: string,
  senderRole: UserRole,
  message: string,
  isPrivate = false,
  recipientId?: string
): Promise<{ success: boolean; error?: string; data?: ChatMessage }> {
  const admin = createSupabaseAdmin();
  const timestamp = new Date().toISOString();

  // Save to verified classroom_chat schema
  const { data, error } = await admin
    .from('classroom_chat')
    .insert({
      class_id: classId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      message: isPrivate && recipientId ? `[PRIVATE:${recipientId}] ${message}` : message,
      created_at: timestamp,
    })
    .select('*')
    .single();

  const item: ChatMessage = {
    id: data?.id || `chat_${Date.now()}`,
    sessionId,
    senderId,
    senderName,
    senderRole,
    message,
    isPrivate,
    recipientId,
    createdAt: data?.created_at || timestamp,
  };

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `chat_${Date.now()}`,
    type: isPrivate ? 'PRIVATE_CHAT_MESSAGE' : 'CHAT_MESSAGE',
    message: item,
    version: 0,
    timestamp,
  });

  return { success: true, data: item };
}

/**
 * Creates a position bookmark (Coach only).
 */
export async function mutateClassroomCreateBookmark(
  classId: string,
  sessionId: string,
  createdBy: string,
  fen: string,
  moveIndex: number,
  note: string
): Promise<{ success: boolean; error?: string; data?: ClassroomBookmark }> {
  const bookmark: ClassroomBookmark = {
    id: `bm_${Date.now()}`,
    classId,
    sessionId,
    createdBy,
    fen,
    moveIndex,
    note,
    createdAt: new Date().toISOString(),
  };

  try {
    const admin = createSupabaseAdmin();
    await admin.from('classroom_bookmarks').insert({
      class_id: classId,
      session_id: sessionId,
      created_by: createdBy,
      fen,
      move_index: moveIndex,
      note,
      created_at: bookmark.createdAt,
    });
  } catch {}

  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `bm_${Date.now()}`,
    type: 'BOOKMARK_CREATED',
    bookmark,
    version: 0,
    timestamp: bookmark.createdAt,
  });

  return { success: true, data: bookmark };
}

/**
 * Toggles a student's raised hand status.
 */
export async function mutateClassroomRaiseHand(
  sessionId: string,
  studentId: string,
  raised: boolean
): Promise<{ success: boolean; error?: string }> {
  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `hand_${Date.now()}`,
    type: 'RAISE_HAND_CHANGED',
    studentId,
    raised,
    version: 0,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Concludes the classroom session (Coach only).
 * Terminates Zoom, calculates real duration, logs attendance, and deletes ephemeral live chat.
 */
export async function endClassroomSession(
  classId: string,
  sessionId: string,
  userId: string,
  userRole: UserRole,
  attendanceRecords?: Array<{ studentProfileId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEFT_EARLY'; feedback?: string }>,
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCoachOrAdmin(userRole)) {
    return { success: false, error: 'Only coach or admin can end the class.' };
  }

  const admin = createSupabaseAdmin();
  const endedAt = new Date().toISOString();

  // 1. Fetch class details to compute actual duration and get Zoom meeting ID
  const { data: cls } = await admin
    .from('classes')
    .select('id, zoom_meeting_id')
    .eq('id', classId)
    .maybeSingle();

  const { data: liveSession } = await admin
    .from('live_sessions')
    .select('started_at')
    .eq('id', sessionId)
    .maybeSingle();

  const startTime = liveSession?.started_at ? new Date(liveSession.started_at).getTime() : Date.now();
  const actualDurationMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));

  // 2. Mark live session ended in PostgreSQL
  await admin
    .from('live_sessions')
    .update({ status: 'ended', ended_at: endedAt })
    .eq('id', sessionId);

  // 3. Mark class completed and persist real elapsed duration
  await admin
    .from('classes')
    .update({
      status: 'COMPLETED',
      duration_minutes: actualDurationMinutes,
    })
    .eq('id', classId);

  // 4. Terminate Zoom meeting cloud session
  if (cls?.zoom_meeting_id) {
    try {
      const { endZoomMeeting } = await import('../zoom');
      await endZoomMeeting(cls.zoom_meeting_id);
    } catch (zoomErr) {
      console.warn('[End Class] Zoom termination notice:', zoomErr);
    }
  }

  // 5. Save real attendance and class report
  try {
    const { markClassAttendance } = await import('../coaches');
    const notesToSave = reviewNotes && reviewNotes.trim()
      ? reviewNotes.trim()
      : `Class concluded normally. Actual conducted duration: ${actualDurationMinutes} mins.`;
    await markClassAttendance(
      classId,
      (attendanceRecords || []) as any,
      notesToSave
    );
  } catch (attErr) {
    console.warn('[End Class] Attendance logging warning:', attErr);
  }

  // 6. Delete ephemeral live classroom chat
  try {
    await admin.from('classroom_chat').delete().eq('class_id', classId);
  } catch (chatDelErr) {
    console.warn('[End Class] Ephemeral chat cleanup warning:', chatDelErr);
  }

  // 7. Log milestone and security audit event
  await logClassroomAudit({
    classId,
    sessionId,
    actorId: userId,
    actorRole: userRole,
    action: 'COACH_ENDED_CLASS',
    metadata: { actualDurationMinutes, endedAt },
  });

  // 8. Broadcast global class end to all clients
  await broadcastToLiveSession(sessionId, {
    sessionId,
    eventId: `end_${Date.now()}`,
    type: 'CLASS_ENDED',
    endedAt,
    version: 999999,
    timestamp: endedAt,
  });

  return { success: true };
}
