'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import type { TeachingPosition } from '@/types/curriculum.types';
import { parseMovetextToTree, findMatchingMoveInTree, getOpponentAutoReply, type PgnMoveNode } from '@/lib/puzzles/pgnTreeEngine';
import ClassroomPuzzleToolbar from './ClassroomPuzzleToolbar';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

interface StudentInteractivePuzzleSolverProps {
  position: TeachingPosition | null;
  lessonPositions?: TeachingPosition[];
  positionIndex?: number;
  isCoach?: boolean;
  onPositionChange?: (newPos: TeachingPosition, index: number) => void;
  onPushToBoard?: (pos: TeachingPosition) => void;
}

export default function StudentInteractivePuzzleSolver({
  position,
  lessonPositions = [],
  positionIndex = 0,
  isCoach = false,
  onPositionChange,
  onPushToBoard,
}: StudentInteractivePuzzleSolverProps) {
  // Solver State
  const [chess, setChess] = useState<Chess | null>(null);
  const [fen, setFen] = useState<string>('');
  const [candidateNodes, setCandidateNodes] = useState<PgnMoveNode[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [lastMoveStatus, setLastMoveStatus] = useState<'correct' | 'wrong' | 'variation' | null>(null);

  // Coach Controls State
  const [solverMode, setSolverMode] = useState<'auto_reply' | 'free_move'>('auto_reply');
  const [hintsEnabled, setHintsEnabled] = useState<boolean>(true);
  const [revealSolution, setRevealSolution] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);

  // Initialize board state whenever position changes
  const initBoard = useCallback(() => {
    if (!position || !position.fen) return;

    try {
      const c = new Chess(position.fen);
      setChess(c);
      setFen(c.fen());
      setMoveHistory([]);
      setIsSolved(false);
      setLastMoveStatus(null);
      setShowHint(false);

      // Parse solution text or PGN movetext into tree
      const movetext = position.solution || '';
      const rootNodes = parseMovetextToTree(movetext, position.fen);
      setCandidateNodes(rootNodes);
    } catch {
      // Fallback
      setFen(position.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }
  }, [position]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  const handleDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!chess || isSolved) return false;

    // Check move validity with chess.js
    const chessCopy = new Chess(chess.fen());
    let moveObj: any = null;
    try {
      moveObj = chessCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
    } catch {
      return false;
    }

    if (!moveObj) return false;

    // Validate student move against candidate tree nodes
    const matchedNode = findMatchingMoveInTree(candidateNodes, moveObj.san, chess.fen());

    if (matchedNode) {
      // Correct Move (Mainline or Sub-variation)
      setChess(chessCopy);
      setFen(chessCopy.fen());
      setMoveHistory((prev) => [...prev, moveObj.san]);
      setLastMoveStatus(matchedNode.isMainline ? 'correct' : 'variation');

      // Check for opponent auto reply in Auto Reply mode
      const opponentReply = getOpponentAutoReply(matchedNode);

      if (solverMode === 'auto_reply' && opponentReply) {
        setCandidateNodes(opponentReply.children || []);
        // Auto play opponent reply move after brief delay
        setTimeout(() => {
          try {
            chessCopy.move(opponentReply.san);
            setChess(new Chess(chessCopy.fen()));
            setFen(chessCopy.fen());
            setMoveHistory((prev) => [...prev, opponentReply.san]);
            setCandidateNodes(opponentReply.children || []);

            if (!opponentReply.children || opponentReply.children.length === 0) {
              setIsSolved(true);
            }
          } catch {}
        }, 350);
      } else {
        setCandidateNodes(matchedNode.children || []);
        if (!matchedNode.children || matchedNode.children.length === 0) {
          setIsSolved(true);
        }
      }

      return true;
    } else {
      // Free Move Mode allows move experimentation; Auto Reply mode flags error
      if (solverMode === 'free_move') {
        setChess(chessCopy);
        setFen(chessCopy.fen());
        setMoveHistory((prev) => [...prev, moveObj.san]);
        setLastMoveStatus('correct');
        return true;
      } else {
        setLastMoveStatus('wrong');
        setTimeout(() => setLastMoveStatus(null), 1200);
        return false;
      }
    }
  };

  const handlePrevPuzzle = () => {
    if (positionIndex > 0 && lessonPositions[positionIndex - 1] && onPositionChange) {
      onPositionChange(lessonPositions[positionIndex - 1], positionIndex - 1);
    }
  };

  const handleNextPuzzle = () => {
    if (positionIndex < lessonPositions.length - 1 && lessonPositions[positionIndex + 1] && onPositionChange) {
      onPositionChange(lessonPositions[positionIndex + 1], positionIndex + 1);
    }
  };

  const handlePushPosition = () => {
    if (!position || !onPushToBoard) return;
    setIsPushing(true);
    onPushToBoard(position);
    setTimeout(() => setIsPushing(false), 800);
  };

  if (!position) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-500 space-y-2">
        <span className="text-3xl">🧩</span>
        <p className="text-xs font-semibold">No position selected. Choose a position from the curriculum drawer.</p>
      </div>
    );
  }

  const boardOrientation = position.boardOrientation || (position.fen.includes(' b ') ? 'black' : 'white');

  return (
    <div className="space-y-4 select-none">
      {/* Coach Classroom Navigation & Mode Toolbar */}
      {isCoach && (
        <ClassroomPuzzleToolbar
          currentPosition={position}
          totalPositions={lessonPositions.length}
          currentIndex={positionIndex}
          onPrev={handlePrevPuzzle}
          onNext={handleNextPuzzle}
          onReset={initBoard}
          solverMode={solverMode}
          onToggleSolverMode={setSolverMode}
          hintsEnabled={hintsEnabled}
          onToggleHints={() => setHintsEnabled((prev) => !prev)}
          revealSolution={revealSolution}
          onToggleRevealSolution={() => setRevealSolution((prev) => !prev)}
          onPushToStudents={onPushToBoard ? handlePushPosition : undefined}
          isPushing={isPushing}
        />
      )}

      {/* Move Status Alerts */}
      {lastMoveStatus === 'correct' && (
        <div className="p-2.5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
          <span>✅ Great Move! Main line sequence matched.</span>
          <span className="text-[10px] font-mono uppercase bg-emerald-900 px-2 py-0.5 rounded">Correct</span>
        </div>
      )}

      {lastMoveStatus === 'variation' && (
        <div className="p-2.5 bg-blue-950/90 border border-blue-500/50 text-blue-300 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
          <span>🔀 Alternate Variation Line Discovered!</span>
          <span className="text-[10px] font-mono uppercase bg-blue-900 px-2 py-0.5 rounded">Variation Branch</span>
        </div>
      )}

      {lastMoveStatus === 'wrong' && (
        <div className="p-2.5 bg-red-950/90 border border-red-500/50 text-red-300 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
          <span>❌ Incorrect Move. Try another line or request a hint.</span>
          <span className="text-[10px] font-mono uppercase bg-red-900 px-2 py-0.5 rounded">Try Again</span>
        </div>
      )}

      {isSolved && (
        <div className="p-3 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-400 text-amber-300 rounded-2xl text-xs font-extrabold flex items-center justify-between shadow-gold">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <span>Puzzle Solved! Tactical line complete.</span>
          </div>
          {isCoach && positionIndex < lessonPositions.length - 1 && (
            <button
              type="button"
              onClick={handleNextPuzzle}
              className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-extrabold shadow-md"
            >
              Next Puzzle ⏭️
            </button>
          )}
        </div>
      )}

      {/* Grid: Interactive Board + Move Tree Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
        {/* Interactive Chessboard */}
        <div className="md:col-span-2 flex flex-col items-center">
          <div className="w-full max-w-[420px] aspect-square shadow-2xl rounded-2xl overflow-hidden border border-slate-800">
            <ChessboardComponent
              position={fen ? fen.trim().split(' ')[0] : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'}
              onPieceDrop={handleDrop}
              boardOrientation={boardOrientation}
              arePiecesDraggable={!isSolved}
              customBoardStyle={{
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>
        </div>

        {/* Solver Sidebar: Moves History & Hints */}
        <div className="space-y-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Played Moves</h4>
              <span className="text-[10px] font-mono text-slate-400">{moveHistory.length} moves</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-amber-300 min-h-[90px] max-h-[140px] overflow-y-auto space-y-1">
              {moveHistory.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {moveHistory.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-bold">
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-600 text-[11px] italic">Drag pieces on board to solve...</span>
              )}
            </div>

            {/* Revealed Solution Box */}
            {(revealSolution || isCoach) && position.solution && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs space-y-1">
                <span className="font-bold block text-[10px] uppercase text-emerald-400">🔑 Solution Sequence</span>
                <span className="font-mono">{position.solution}</span>
              </div>
            )}

            {/* Hint Box */}
            {hintsEnabled && position.hint && (
              <div className="space-y-1">
                {!showHint ? (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>💡</span>
                    <span>Get Hint</span>
                  </button>
                ) : (
                  <div className="p-3 bg-amber-950/40 border border-amber-500/30 text-amber-300 rounded-2xl text-xs space-y-1">
                    <span className="font-bold block text-[10px] uppercase text-amber-400">💡 Tactical Hint</span>
                    <p>{position.hint}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Orientation: {boardOrientation.toUpperCase()}</span>
            <button type="button" onClick={initBoard} className="text-amber-400 hover:underline font-bold">
              🔄 Reset Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
