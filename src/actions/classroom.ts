'use server';

import { getCurrentUser } from '@/lib/supabase/auth';
import {
  getCanonicalClassroomSnapshot,
  mutateClassroomMove,
  mutateClassroomUndo,
  mutateClassroomReset,
  mutateClassroomLock,
  mutateClassroomFreeMove,
  mutateClassroomPermission,
  mutateClassroomLoadPuzzle,
  mutateClassroomRevealPuzzleSolution,
  mutateClassroomNextPuzzle,
  mutateClassroomSubmitPuzzleResult,
  mutateClassroomLoadGame,
  mutateClassroomLoadCurriculum,
  mutateClassroomNavigateMove,
  mutateClassroomSetDrawing,
  mutateClassroomStartQuiz,
  mutateClassroomCloseQuiz,
  mutateClassroomRevealQuiz,
  mutateClassroomSubmitQuizAnswer,
  mutateClassroomSubmitResponse,
  mutateClassroomSendChat,
  mutateClassroomCreateBookmark,
  mutateClassroomRaiseHand,
  endClassroomSession,
} from '@/lib/classroom-v2/server';
import {
  type UserRole,
  type CanonicalPuzzleState,
  type CanonicalCurriculumState,
  type BoardArrow,
  type BoardHighlight,
} from '@/lib/classroom-v2/types';
import { checkProcessedMutation, recordProcessedMutation } from '@/lib/classroom-v2/idempotency';

/**
 * Helper to resolve authenticated user and sanitized role.
 */
async function getAuthContext(): Promise<{ userId: string; userRole: UserRole } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const rawRole = (user.role || 'student').toLowerCase();
  const userRole: UserRole = rawRole === 'admin' || rawRole === 'coach' ? rawRole : 'student';
  return { userId: user.id, userRole };
}

export async function getCanonicalClassroomSnapshotAction(
  classId: string,
  sessionId: string
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  try {
    const snapshot = await getCanonicalClassroomSnapshot(
      classId,
      sessionId,
      auth.userId,
      auth.userRole
    );
    return { success: true, data: snapshot };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retrieve snapshot.' };
  }
}

export async function mutateClassroomMoveAction(
  sessionId: string,
  moveInput: { from: string; to: string; promotion?: string } | string,
  expectedVersion?: number,
  mutationId?: string
) {
  if (mutationId) {
    const cached = await checkProcessedMutation(mutationId);
    if (cached) return cached;
  }

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const res = await mutateClassroomMove(
    sessionId,
    auth.userId,
    auth.userRole,
    moveInput,
    expectedVersion
  );

  if (mutationId && res.success) {
    await recordProcessedMutation(mutationId, res, sessionId, 'move');
  }
  return res;
}

export async function mutateClassroomUndoAction(
  sessionId: string,
  expectedVersion?: number,
  mutationId?: string
) {
  if (mutationId) {
    const cached = await checkProcessedMutation(mutationId);
    if (cached) return cached;
  }

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const res = await mutateClassroomUndo(sessionId, auth.userId, auth.userRole, expectedVersion);
  if (mutationId && res.success) {
    await recordProcessedMutation(mutationId, res, sessionId, 'undo');
  }
  return res;
}

export async function mutateClassroomResetAction(
  sessionId: string,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomReset(sessionId, auth.userId, auth.userRole, expectedVersion);
}

export async function mutateClassroomLockAction(
  sessionId: string,
  isLocked: boolean,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomLock(sessionId, auth.userId, auth.userRole, isLocked, expectedVersion);
}

export async function mutateClassroomFreeMoveAction(
  sessionId: string,
  allow: boolean,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomFreeMove(sessionId, auth.userId, auth.userRole, allow, expectedVersion);
}

export async function mutateClassroomPermissionAction(
  sessionId: string,
  targetStudentId: string,
  enable: boolean,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomPermission(
    sessionId,
    auth.userId,
    auth.userRole,
    targetStudentId,
    enable,
    expectedVersion
  );
}

export async function mutateClassroomLoadPuzzleAction(
  sessionId: string,
  puzzle: CanonicalPuzzleState,
  expectedVersion?: number,
  mutationId?: string
) {
  if (mutationId) {
    const cached = await checkProcessedMutation(mutationId);
    if (cached) return cached;
  }

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const res = await mutateClassroomLoadPuzzle(sessionId, auth.userId, auth.userRole, puzzle, expectedVersion);
  if (mutationId && res.success) {
    await recordProcessedMutation(mutationId, res, sessionId, 'load_puzzle');
  }
  return res;
}

export async function mutateClassroomRevealPuzzleSolutionAction(
  sessionId: string,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomRevealPuzzleSolution(sessionId, auth.userId, auth.userRole, expectedVersion);
}

export async function mutateClassroomNextPuzzleAction(
  sessionId: string,
  puzzle: CanonicalPuzzleState,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomNextPuzzle(sessionId, auth.userId, auth.userRole, puzzle, expectedVersion);
}

export async function mutateClassroomSubmitPuzzleResultAction(
  sessionId: string,
  puzzleId: string,
  solved: boolean,
  attempts: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomSubmitPuzzleResult(
    sessionId,
    auth.userId,
    auth.userRole,
    puzzleId,
    solved,
    attempts
  );
}

export async function mutateClassroomLoadGameAction(
  sessionId: string,
  pgnText: string,
  gameTitle?: string,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomLoadGame(
    sessionId,
    auth.userId,
    auth.userRole,
    pgnText,
    gameTitle,
    expectedVersion
  );
}

export async function mutateClassroomLoadCurriculumAction(
  sessionId: string,
  curriculum: CanonicalCurriculumState,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomLoadCurriculum(
    sessionId,
    auth.userId,
    auth.userRole,
    curriculum,
    expectedVersion
  );
}

export async function mutateClassroomNavigateMoveAction(
  sessionId: string,
  targetMoveIndex: number,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomNavigateMove(
    sessionId,
    auth.userId,
    auth.userRole,
    targetMoveIndex,
    expectedVersion
  );
}

export async function mutateClassroomSetDrawingAction(
  sessionId: string,
  arrows: BoardArrow[],
  highlights: BoardHighlight[],
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomSetDrawing(
    sessionId,
    auth.userId,
    auth.userRole,
    arrows,
    highlights,
    expectedVersion
  );
}

export async function mutateClassroomStartQuizAction(
  sessionId: string,
  question: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  expectedVersion?: number,
  mutationId?: string
) {
  if (mutationId) {
    const cached = await checkProcessedMutation(mutationId);
    if (cached) return cached;
  }

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const res = await mutateClassroomStartQuiz(
    sessionId,
    auth.userId,
    auth.userRole,
    question,
    options,
    correctIndex,
    explanation,
    expectedVersion
  );

  if (mutationId && res.success) {
    await recordProcessedMutation(mutationId, res, sessionId, 'start_quiz');
  }
  return res;
}

export async function mutateClassroomCloseQuizAction(
  sessionId: string,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomCloseQuiz(sessionId, auth.userId, auth.userRole, expectedVersion);
}

export async function mutateClassroomRevealQuizAction(
  sessionId: string,
  expectedVersion?: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomRevealQuiz(sessionId, auth.userId, auth.userRole, expectedVersion);
}

export async function mutateClassroomSubmitQuizAnswerAction(
  sessionId: string,
  quizId: string,
  selectedOptionIndex: number
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomSubmitQuizAnswer(
    sessionId,
    auth.userId,
    auth.userRole,
    quizId,
    selectedOptionIndex
  );
}

export async function mutateClassroomSubmitResponseAction(
  sessionId: string,
  classId: string,
  prompt: string,
  response: string
) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student';
  return mutateClassroomSubmitResponse(
    sessionId,
    classId,
    user.id,
    userName,
    prompt,
    response
  );
}

export async function mutateClassroomSendChatAction(
  classId: string,
  sessionId: string,
  message: string,
  isPrivate = false,
  recipientId?: string
) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const rawRole = (user.role || 'student').toLowerCase();
  const userRole: UserRole = rawRole === 'admin' || rawRole === 'coach' ? rawRole : 'student';
  const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Participant';

  return mutateClassroomSendChat(
    classId,
    sessionId,
    user.id,
    senderName,
    userRole,
    message,
    isPrivate,
    recipientId
  );
}

export async function mutateClassroomCreateBookmarkAction(
  classId: string,
  sessionId: string,
  fen: string,
  moveIndex: number,
  note: string
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomCreateBookmark(
    classId,
    sessionId,
    auth.userId,
    fen,
    moveIndex,
    note
  );
}

export async function mutateClassroomRaiseHandAction(
  sessionId: string,
  raised: boolean
) {
  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };
  return mutateClassroomRaiseHand(sessionId, auth.userId, raised);
}

export async function endClassroomSessionAction(
  classId: string,
  sessionId: string,
  attendanceRecords?: Array<{ studentProfileId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEFT_EARLY'; feedback?: string }>,
  mutationId?: string,
  reviewNotes?: string
) {
  if (mutationId) {
    const cached = await checkProcessedMutation(mutationId);
    if (cached) return cached;
  }

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: 'Unauthorized' };

  const res = await endClassroomSession(classId, sessionId, auth.userId, auth.userRole, attendanceRecords, reviewNotes);
  if (mutationId && res.success) {
    await recordProcessedMutation(mutationId, res, sessionId, 'end_class');
  }
  return res;
}
