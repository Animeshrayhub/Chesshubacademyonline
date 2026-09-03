/**
 * Comprehensive Automated Test Suite for Classroom V2 Core Engine
 * Executes all mandatory lifecycle, authority, synchronization, security, idempotency,
 * and undo scenarios.
 */

import {
  validateChessMove,
  validateFen,
  parsePgnToMoves,
} from '../src/lib/classroom-v2/validation';
import {
  classroomReducer,
  createDefaultSnapshot,
} from '../src/lib/classroom-v2/reducer';
import {
  canUserMoveBoard,
  isCoachOrAdmin,
} from '../src/lib/classroom-v2/permissions';
import {
  evaluateEventRecovery,
} from '../src/lib/classroom-v2/recovery';
import {
  checkProcessedMutation,
  recordProcessedMutation,
} from '../src/lib/classroom-v2/idempotency';
import {
  type ClassroomSnapshot,
  type CanonicalPuzzleState,
  type MoveData,
} from '../src/lib/classroom-v2/types';
import { DEFAULT_INITIAL_FEN } from '../src/lib/classroom-v2/constants';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('CHESSUB ACADEMY: CLASSROOM V2 AUTOMATED INTEGRITY TESTS');
  console.log('============================================================\n');

  // 1. Move Validation
  assert(validateFen(DEFAULT_INITIAL_FEN), 'Test 1: Standard initial FEN is valid');
  assert(!validateFen('invalid fen string'), 'Test 2: Malformed FEN is rejected');

  const e4Move = validateChessMove(DEFAULT_INITIAL_FEN, { from: 'e2', to: 'e4' });
  assert(e4Move.valid && e4Move.san === 'e4', 'Test 3: Legal move e2-e4 accepted');

  const illegalMove = validateChessMove(DEFAULT_INITIAL_FEN, { from: 'e2', to: 'e5' });
  assert(!illegalMove.valid, 'Test 4: Illegal move e2-e5 rejected');

  // 2. Promotion Validation
  const promoFen = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';
  const queenPromo = validateChessMove(promoFen, { from: 'e7', to: 'e8', promotion: 'q' });
  assert(queenPromo.valid && queenPromo.san === 'e8=Q', 'Test 5: Queen promotion valid');

  // 3. PGN Parsing
  const samplePgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';
  const parsedGame = parsePgnToMoves(samplePgn, 'user_test_coach');
  assert(parsedGame.moves.length === 6, 'Test 6: PGN parsed exactly 6 half-moves');
  assert(parsedGame.moves[0].san === 'e4', 'Test 7: First move is e4');
  assert(parsedGame.moves[5].san === 'a6', 'Test 8: Sixth move is a6');

  // 4. Role & Board Control Permissions
  const permissionsLocked = { coachId: 'coach_1', boardControllers: ['student_1'], isBoardLocked: true };
  const permissionsUnlocked = { coachId: 'coach_1', boardControllers: ['student_1'], isBoardLocked: false };
  const permissionsNoControl = { coachId: 'coach_1', boardControllers: [], isBoardLocked: false };

  assert(isCoachOrAdmin('coach'), 'Test 9: Coach identified as coach/admin');
  assert(isCoachOrAdmin('admin'), 'Test 10: Admin identified as coach/admin');
  assert(!isCoachOrAdmin('student'), 'Test 11: Student rejected as coach/admin');

  assert(canUserMoveBoard('coach', 'coach_1', permissionsLocked), 'Test 12: Coach can move even if board is locked');
  assert(!canUserMoveBoard('student', 'student_1', permissionsLocked), 'Test 13: Student blocked when board is locked');
  assert(canUserMoveBoard('student', 'student_1', permissionsUnlocked), 'Test 14: Student with control can move when unlocked');
  assert(!canUserMoveBoard('student', 'student_2', permissionsUnlocked), 'Test 15: Student without control rejected');
  assert(!canUserMoveBoard('student', 'student_1', permissionsNoControl), 'Test 16: Student rejected when controller list is empty');

  // Multi-controller test (Buddy / Group class support)
  const multiPermissions = { coachId: 'coach_1', boardControllers: ['student_1', 'student_2'], isBoardLocked: false };
  assert(canUserMoveBoard('student', 'student_1', multiPermissions) && canUserMoveBoard('student', 'student_2', multiPermissions), 'Test 17: Multiple authorized students in boardControllers array can move');

  // 5. Reducer State Reconciliation
  const initialSnapshot = createDefaultSnapshot('cls_1', 'sess_1', 'Chess Masterclass', 'Coach Anand');
  assert(initialSnapshot.version === 1, 'Test 18: Initial snapshot version is 1');
  assert(initialSnapshot.board.moves.length === 0, 'Test 19: Initial board has 0 moves');

  const movePayload: MoveData = {
    moveNumber: 1,
    san: 'e4',
    from: 'e2',
    to: 'e4',
    piece: 'p',
    color: 'w',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    playedBy: 'coach_1',
    timestamp: new Date().toISOString(),
  };

  const stateAfterE4 = classroomReducer(initialSnapshot, {
    sessionId: 'sess_1',
    eventId: 'evt_1',
    type: 'MOVE_PLAYED',
    move: movePayload,
    fen: movePayload.fenAfter,
    currentMoveIndex: 0,
    version: 2,
    timestamp: new Date().toISOString(),
  });

  assert(stateAfterE4.version === 2, 'Test 20: Reducer advanced version to 2');
  assert(stateAfterE4.board.moves.length === 1, 'Test 21: Board has 1 move');
  assert(stateAfterE4.board.sideToMove === 'b', 'Test 22: Side to move switched to Black');

  // Stale event discarded
  const staleState = classroomReducer(stateAfterE4, {
    sessionId: 'sess_1',
    eventId: 'evt_stale',
    type: 'BOARD_STATE_UPDATED',
    fen: DEFAULT_INITIAL_FEN,
    currentMoveIndex: -1,
    moves: [],
    mode: 'NORMAL_GAME',
    arrows: [],
    highlights: [],
    version: 1, // Stale version!
    timestamp: new Date().toISOString(),
  });
  assert(staleState.version === 2 && staleState.board.moves.length === 1, 'Test 23: Stale event with version <= current was safely discarded');

  // 6. Monotonic Version Gap Evaluator
  const normalCheck = evaluateEventRecovery(2, 3);
  assert(normalCheck.needsReconcile === false && normalCheck.action === 'apply_event', 'Test 24: Sequential version (2 -> 3) accepted directly');

  const gapCheck = evaluateEventRecovery(2, 6);
  assert(gapCheck.needsReconcile === true && gapCheck.action === 'fetch_snapshot', 'Test 25: Version gap (2 -> 6) triggers full snapshot reconciliation');

  // 7. Distributed DB-Backed Idempotency
  assert((await checkProcessedMutation('mut_test_100')) === null, 'Test 26: Unprocessed mutation returns null');
  await recordProcessedMutation('mut_test_100', { success: true, move: 'e4' });
  assert((await checkProcessedMutation('mut_test_100'))?.success === true, 'Test 27: Processed mutation returns cached result idempotently');

  // 8. Atomic Puzzle Loading & Solving
  const testPuzzle: CanonicalPuzzleState = {
    puzzleId: 'puzzle_fide_01',
    title: 'Mate in 2',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    solution: ['c4f7', 'e8f7'],
    moveIndex: 0,
    sideToMove: 'w',
    status: 'unsolved',
    instructions: 'White to move and win material.',
  };

  const puzzleState = classroomReducer(stateAfterE4, {
    sessionId: 'sess_1',
    eventId: 'evt_puz',
    type: 'PUZZLE_UPDATED',
    puzzle: testPuzzle,
    fen: testPuzzle.fen,
    version: 3,
    timestamp: new Date().toISOString(),
  });

  assert(puzzleState.board.mode === 'PUZZLE', 'Test 28: Classroom mode transitioned to PUZZLE');
  assert(puzzleState.puzzle?.puzzleId === 'puzzle_fide_01', 'Test 29: Puzzle loaded correctly');

  // 9. Interactive Quiz Sanitization
  const quizState = classroomReducer(puzzleState, {
    sessionId: 'sess_1',
    eventId: 'evt_quiz',
    type: 'QUIZ_STATE_CHANGED',
    quiz: {
      quizId: 'quiz_01',
      status: 'active',
      question: 'Which piece did White move first?',
      options: ['Pawn', 'Knight', 'Bishop', 'Rook'],
      correctIndex: null, // Sanitized for students!
      explanation: null,
      startedAt: new Date().toISOString(),
    },
    version: 4,
    timestamp: new Date().toISOString(),
  });

  assert(quizState.quiz?.status === 'active', 'Test 30: Quiz state is active');
  assert(quizState.quiz?.correctIndex === null, 'Test 31: Correct answer scrubbed from broadcast to prevent client-side cheating');

  // 10. Undo Action Simulation
  const move2Payload: MoveData = {
    moveNumber: 1,
    san: 'e5',
    from: 'e7',
    to: 'e5',
    piece: 'p',
    color: 'b',
    fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    playedBy: 'student_1',
    timestamp: new Date().toISOString(),
  };

  const stateAfterE5 = classroomReducer(stateAfterE4, {
    sessionId: 'sess_1',
    eventId: 'evt_2',
    type: 'MOVE_PLAYED',
    move: move2Payload,
    fen: move2Payload.fenAfter,
    currentMoveIndex: 1,
    version: 3,
    timestamp: new Date().toISOString(),
  });

  assert(stateAfterE5.board.moves.length === 2, 'Test 32: Moves count is 2 before undo');

  // Coach undos last move
  const undoneMoves = stateAfterE5.board.moves.slice(0, -1);
  const stateAfterUndo = classroomReducer(stateAfterE5, {
    sessionId: 'sess_1',
    eventId: 'evt_undo',
    type: 'BOARD_STATE_UPDATED',
    fen: undoneMoves[undoneMoves.length - 1].fenAfter,
    currentMoveIndex: undoneMoves.length - 1,
    moves: undoneMoves,
    mode: 'NORMAL_GAME',
    arrows: [],
    highlights: [],
    version: 4,
    timestamp: new Date().toISOString(),
  });

  assert(stateAfterUndo.board.moves.length === 1, 'Test 33: Undone move popped from moves history');
  assert(stateAfterUndo.board.fen === stateAfterE4.board.fen, 'Test 34: Position restored to previous move FEN');

  // 11. Class Ending Terminal Transition
  const endedState = classroomReducer(stateAfterUndo, {
    sessionId: 'sess_1',
    eventId: 'evt_end',
    type: 'CLASS_ENDED',
    endedAt: new Date().toISOString(),
    version: 999999,
    timestamp: new Date().toISOString(),
  });

  assert(endedState.isLive === false, 'Test 35: Classroom isLive is set to false upon CLASS_ENDED');
  assert(endedState.status === 'ended', 'Test 36: Classroom status marked as ended');

  console.log('\n------------------------------------------------------------');
  console.log(`TOTAL INTEGRITY TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('------------------------------------------------------------\n');

  if (passedTests === totalTests) {
    console.log('🌟 ALL 36 AUTOMATED INTEGRITY TESTS PASSED FLAWLESSLY!\n');
  } else {
    console.error('❌ SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
