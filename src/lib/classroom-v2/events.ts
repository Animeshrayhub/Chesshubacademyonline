/**
 * Classroom V2 Realtime Event Payloads
 */

import {
  type MoveData,
  type BoardArrow,
  type BoardHighlight,
  type CanonicalPuzzleState,
  type CanonicalGameState,
  type CanonicalCurriculumState,
  type ClassroomQuizState,
  type ClassroomSnapshot,
  type ChatMessage,
  type StudentResponseItem,
  type ClassroomBookmark,
  type CoachQuestion,
} from './types';
import { type RealtimeEventType } from './constants';

export interface ClassroomRealtimeBaseEvent {
  sessionId: string;
  eventId: string;
  version: number;
  timestamp: string;
}

export type ClassroomRealtimePayload =
  | (ClassroomRealtimeBaseEvent & {
      type: 'SNAPSHOT_RECONCILE';
      snapshot: ClassroomSnapshot;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'BOARD_STATE_UPDATED';
      fen: string;
      currentMoveIndex: number;
      moves: MoveData[];
      mode: string;
      arrows: BoardArrow[];
      highlights: BoardHighlight[];
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'MOVE_PLAYED';
      move: MoveData;
      fen: string;
      currentMoveIndex: number;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'PERMISSIONS_CHANGED';
      boardControllers: string[];
      isBoardLocked: boolean;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'FREE_MOVE_TOGGLED';
      allowIllegalMoves: boolean;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'PUZZLE_UPDATED';
      puzzle: CanonicalPuzzleState | null;
      fen: string;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'PUZZLE_SOLVED';
      puzzleId: string;
      studentId: string;
      solved: boolean;
      attempts: number;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'GAME_LOADED';
      game: CanonicalGameState | null;
      fen: string;
      moves: MoveData[];
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'CURRICULUM_UPDATED';
      curriculum: CanonicalCurriculumState | null;
      fen: string;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'QUIZ_STATE_CHANGED';
      quiz: ClassroomQuizState | null;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'CHAT_MESSAGE';
      message: ChatMessage;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'PRIVATE_CHAT_MESSAGE';
      message: ChatMessage;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'STUDENT_RESPONSE';
      response: StudentResponseItem;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'RAISE_HAND_CHANGED';
      studentId: string;
      raised: boolean;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'REACTION';
      userId: string;
      userName: string;
      emoji: string;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'PARTICIPANT_PRESENCE_CHANGED';
      userId: string;
      isOnline: boolean;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'BOOKMARK_CREATED';
      bookmark: ClassroomBookmark;
    })
  | (ClassroomRealtimeBaseEvent & {
      type: 'CLASS_ENDED';
      endedAt: string;
    })
  | (ClassroomRealtimeBaseEvent & {
      /** Coach broadcasts a question/prompt to all students */
      type: 'COACH_QUESTION';
      question: CoachQuestion;
    });
