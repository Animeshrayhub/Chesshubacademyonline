/**
 * Classroom V2 State Reducer & Default Snapshot Generator
 */

import {
  type ClassroomSnapshot,
  type CanonicalBoardState,
  type CanonicalPuzzleState,
  type CanonicalGameState,
  type CanonicalCurriculumState,
  type ClassroomQuizState,
  type PermissionsState,
  type UserRole,
} from './types';
import { type ClassroomRealtimePayload } from './events';
import { DEFAULT_INITIAL_FEN } from './constants';

export function createDefaultSnapshot(
  classId: string,
  sessionId: string,
  className = 'Live Chess Classroom',
  coachName = 'Coach'
): ClassroomSnapshot {
  const board: CanonicalBoardState = {
    fen: DEFAULT_INITIAL_FEN,
    initialFen: DEFAULT_INITIAL_FEN,
    moves: [],
    pgn: '',
    currentMoveIndex: -1,
    sideToMove: 'w',
    orientation: 'white',
    mode: 'NORMAL_GAME',
    isBoardLocked: false,
    allowIllegalMoves: false,
    arrows: [],
    highlights: [],
  };

  const permissions: PermissionsState = {
    coachId: '',
    boardControllers: [],
    isBoardLocked: false,
  };

  return {
    classId,
    sessionId,
    className,
    coachName,
    scheduledStart: new Date().toISOString(),
    startedAt: null,
    durationMinutes: 60,
    status: 'scheduled',
    isLive: false,
    version: 1,
    board,
    puzzle: null,
    game: null,
    curriculum: null,
    quiz: null,
    permissions,
    activeQuestion: null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pure state reducer for applying realtime events to the classroom snapshot on the client.
 */
export function classroomReducer(
  state: ClassroomSnapshot,
  action: ClassroomRealtimePayload
): ClassroomSnapshot {
  // Discard older version events (except moves, snapshot reconcile, and special notifications)
  if (action.type === 'MOVE_PLAYED') {
    // For moves, only discard if we already have this move or a strictly newer move
    if (action.currentMoveIndex < state.board.currentMoveIndex) {
      return state;
    }
  } else if (
    action.type !== 'SNAPSHOT_RECONCILE' &&
    action.type !== 'CLASS_ENDED' &&
    action.type !== 'CHAT_MESSAGE' &&
    action.type !== 'PRIVATE_CHAT_MESSAGE' &&
    action.type !== 'STUDENT_RESPONSE' &&
    action.type !== 'REACTION' &&
    action.type !== 'PERMISSIONS_CHANGED' &&
    action.type !== 'BOARD_STATE_UPDATED'
  ) {
    if (action.version && action.version < state.version) {
      return state;
    }
  }

  const nextVersion = Math.max(state.version, action.version || state.version);

  switch (action.type) {
    case 'SNAPSHOT_RECONCILE':
      return {
        ...action.snapshot,
        version: Math.max(state.version, action.snapshot.version),
      };

    case 'MOVE_PLAYED': {
      const targetIndex = action.currentMoveIndex;
      const isOptimisticMatch =
        targetIndex >= 0 &&
        targetIndex < state.board.moves.length &&
        (state.board.moves[targetIndex]?.uci === action.move.uci ||
          state.board.moves[targetIndex]?.fenAfter === action.fen);

      const newMoves = isOptimisticMatch
        ? state.board.moves.slice(0, targetIndex + 1)
        : [...state.board.moves.slice(0, targetIndex), action.move];

      const sideToMove: 'w' | 'b' = action.move.color === 'w' ? 'b' : 'w';

      return {
        ...state,
        version: nextVersion,
        board: {
          ...state.board,
          fen: action.fen,
          moves: newMoves,
          currentMoveIndex: targetIndex,
          sideToMove,
          arrows: [],
          highlights: [],
        },
        updatedAt: action.timestamp,
      };
    }

    case 'BOARD_STATE_UPDATED':
      return {
        ...state,
        version: nextVersion,
        board: {
          ...state.board,
          fen: action.fen,
          currentMoveIndex: action.currentMoveIndex,
          moves: action.moves || state.board.moves,
          mode: (action.mode as any) || state.board.mode,
          arrows: action.arrows || [],
          highlights: action.highlights || [],
        },
        updatedAt: action.timestamp,
      };

    case 'PERMISSIONS_CHANGED':
      return {
        ...state,
        version: nextVersion,
        permissions: {
          ...state.permissions,
          boardControllers: action.boardControllers,
          isBoardLocked: action.isBoardLocked,
        },
        board: {
          ...state.board,
          isBoardLocked: action.isBoardLocked,
        },
        updatedAt: action.timestamp,
      };

    case 'FREE_MOVE_TOGGLED':
      return {
        ...state,
        version: nextVersion,
        board: {
          ...state.board,
          allowIllegalMoves: action.allowIllegalMoves,
        },
        updatedAt: action.timestamp,
      };

    case 'PUZZLE_UPDATED':
      return {
        ...state,
        version: nextVersion,
        puzzle: action.puzzle,
        board: {
          ...state.board,
          fen: action.fen,
          initialFen: action.fen,
          mode: action.puzzle ? 'PUZZLE' : 'NORMAL_GAME',
          moves: [],
          currentMoveIndex: -1,
          arrows: [],
          highlights: [],
        },
        updatedAt: action.timestamp,
      };

    case 'GAME_LOADED':
      return {
        ...state,
        version: nextVersion,
        game: action.game,
        board: {
          ...state.board,
          fen: action.fen,
          moves: action.moves,
          currentMoveIndex: action.moves.length - 1,
          mode: action.game ? 'NORMAL_GAME' : state.board.mode,
        },
        updatedAt: action.timestamp,
      };

    case 'CURRICULUM_UPDATED':
      return {
        ...state,
        version: nextVersion,
        curriculum: action.curriculum,
        board: {
          ...state.board,
          fen: action.fen,
          mode: action.curriculum ? 'CURRICULUM' : state.board.mode,
        },
        updatedAt: action.timestamp,
      };

    case 'QUIZ_STATE_CHANGED':
      return {
        ...state,
        version: nextVersion,
        quiz: action.quiz,
        updatedAt: action.timestamp,
      };

    case 'CLASS_ENDED':
      return {
        ...state,
        status: 'ended',
        isLive: false,
        updatedAt: action.endedAt,
      };

    case 'COACH_QUESTION':
      return {
        ...state,
        activeQuestion: action.question,
      };

    default:
      return state;
  }
}
