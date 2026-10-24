'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { ChessboardAdapter } from '@/components/dashboard/ui/ChessboardWrapper';
import {
  type BoardArrow,
  type BoardHighlight,
  type BoardOrientation,
  type StudentBoardColorPermission,
  type CoachQuestion,
} from '@/lib/classroom-v2/types';
import { validateChessMove } from '@/lib/classroom-v2/validation';
import { Chess } from 'chess.js';
import { chessSounds } from '@/lib/classroom-v2/chessSounds';

export type BoardThemeId = 'emerald' | 'wood' | 'blue' | 'slate' | 'sandcastle';

export interface BoardThemePreset {
  id: BoardThemeId;
  name: string;
  darkSquareColor: string;
  lightSquareColor: string;
}

export const BOARD_THEMES: BoardThemePreset[] = [
  { id: 'emerald', name: 'Emerald Green', darkSquareColor: '#779952', lightSquareColor: '#edeed1' },
  { id: 'wood', name: 'Walnut Wood', darkSquareColor: '#b58863', lightSquareColor: '#f0d9b5' },
  { id: 'blue', name: 'Tournament Blue', darkSquareColor: '#4f759b', lightSquareColor: '#dbe3e8' },
  { id: 'slate', name: 'Obsidian Slate', darkSquareColor: '#334155', lightSquareColor: '#94a3b8' },
  { id: 'sandcastle', name: 'Sandcastle Gold', darkSquareColor: '#ca9b52', lightSquareColor: '#f3e5ab' },
];

function CapturedPiecesList({
  pieces,
  isWhite,
}: {
  pieces: string[];
  isWhite: boolean;
}) {
  if (pieces.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1 hover:space-x-0.5 transition-all py-0.5 overflow-x-auto max-w-[140px] sm:max-w-xs scrollbar-none">
      {pieces.map((p, idx) => {
        const symbol =
          p[1] === 'Q' ? '♛' :
          p[1] === 'R' ? '♜' :
          p[1] === 'B' ? '♝' :
          p[1] === 'N' ? '♞' : '♟';

        return (
          <span
            key={`${p}-${idx}`}
            className={`text-sm leading-none select-none transition-transform hover:scale-125 ${
              isWhite
                ? 'text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                : 'text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.25)]'
            }`}
            title={`${isWhite ? 'White' : 'Black'} ${p[1]}`}
          >
            {symbol}
          </span>
        );
      })}
    </div>
  );
}

interface ClassroomBoardProps {
  fen: string;
  orientation: BoardOrientation;
  isLocked: boolean;
  canMove: boolean;
  allowedColor?: StudentBoardColorPermission;
  allowIllegalMoves?: boolean;
  arrows?: BoardArrow[];
  highlights?: BoardHighlight[];
  showCoords?: boolean;
  showSquareLabels?: boolean;
  darkSquareColor?: string;
  lightSquareColor?: string;
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  onDrawChange?: (arrows: BoardArrow[], highlights: BoardHighlight[]) => void;
  className?: string;
  boardScale?: number;
  isCoach?: boolean;
  activeDrawColor?: string;
  studentShowcaseMode?: boolean;
  activeQuestion?: CoachQuestion | null;
  onAnswerMove?: (san: string) => Promise<boolean>;
  lastMove?: { from: string; to: string } | null;
}

export default function ClassroomBoard({
  fen,
  orientation = 'white',
  isLocked = false,
  canMove = true,
  allowedColor = 'both',
  allowIllegalMoves = false,
  arrows = [],
  highlights = [],
  showCoords = true,
  showSquareLabels = false,
  darkSquareColor = '#779952',
  lightSquareColor = '#edeed1',
  onMove,
  onDrawChange,
  className = '',
  boardScale = 1,
  isCoach = false,
  activeDrawColor = '#10b981',
  studentShowcaseMode = false,
  activeQuestion = null,
  onAnswerMove,
  lastMove: propLastMove,
}: ClassroomBoardProps) {
  // Dual Mode: Student private local canvas (arrows & square highlights)
  const [localStudentArrows, setLocalStudentArrows] = useState<BoardArrow[]>([]);
  const [localStudentHighlights, setLocalStudentHighlights] = useState<BoardHighlight[]>([]);

  // Last Move tracking for highlighting source and target squares
  const [internalLastMove, setInternalLastMove] = useState<{ from: string; to: string } | null>(null);
  const effectiveLastMove = propLastMove !== undefined ? propLastMove : internalLastMove;

  // Interactive Play Move as Answer state for students
  const [submittedAnswerMove, setSubmittedAnswerMove] = useState<string | null>(null);

  // Selected square for Click-to-Move and Legal Move indicator dots
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Board Theme customization with localStorage persistence
  const [selectedThemeId, setSelectedThemeId] = useState<BoardThemeId>('emerald');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chesshub_board_theme') as BoardThemeId;
      if (saved && BOARD_THEMES.some((t) => t.id === saved)) {
        setSelectedThemeId(saved);
      }
    } catch {}
  }, []);

  const handleSelectTheme = (id: BoardThemeId) => {
    setSelectedThemeId(id);
    setShowThemeMenu(false);
    try {
      localStorage.setItem('chesshub_board_theme', id);
    } catch {}
  };

  const currentTheme = BOARD_THEMES.find((t) => t.id === selectedThemeId) || BOARD_THEMES[0];
  const effectiveDarkColor = currentTheme.darkSquareColor || darkSquareColor;
  const effectiveLightColor = currentTheme.lightSquareColor || lightSquareColor;

  useEffect(() => {
    setSubmittedAnswerMove(null);
  }, [activeQuestion?.id]);

  const isQuestionAnswerMode = Boolean(!isCoach && activeQuestion);

  // Compute legal moves for the selected piece
  const legalMoves = useMemo(() => {
    if (!selectedSquare || !fen) return [];
    try {
      const chess = new Chess(fen.trim());
      return chess.moves({ square: selectedSquare as any, verbose: true });
    } catch {
      return [];
    }
  }, [selectedSquare, fen]);

  // Keyboard shortcut: Press 'C' to clear visual annotations, 'Escape' to deselect piece / close theme menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') {
        setSelectedSquare(null);
        setShowThemeMenu(false);
      }
      if (e.key === 'c' || e.key === 'C') {
        if (isCoach || studentShowcaseMode) {
          onDrawChange?.([], []);
        }
        setLocalStudentArrows([]);
        setLocalStudentHighlights([]);
        setSelectedSquare(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCoach, studentShowcaseMode, onDrawChange]);

  // Automatically clear student private drawings and selected square on new move
  useEffect(() => {
    setSelectedSquare(null);
    if (!isCoach) {
      setLocalStudentArrows([]);
      setLocalStudentHighlights([]);
    }
  }, [fen, isCoach]);

  // Track previous FEN to trigger audio sounds on piece moves, captures, checks, and castles
  const prevFenRef = useRef<string>(fen);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFenRef.current = fen;
      return;
    }

    if (prevFenRef.current && fen && prevFenRef.current !== fen) {
      try {
        const currChess = new Chess(fen.trim());
        const isCheck = currChess.inCheck();

        // Automatically detect and update the last move squares
        try {
          const prevChess = new Chess(prevFenRef.current.trim());
          const candidateMoves = prevChess.moves({ verbose: true });
          const currPiecePlacement = fen.trim().split(' ')[0];
          const matched = candidateMoves.find((m) => {
            const testChess = new Chess(prevFenRef.current.trim());
            testChess.move(m);
            return testChess.fen().split(' ')[0] === currPiecePlacement;
          });
          if (matched) {
            setInternalLastMove({ from: matched.from, to: matched.to });
          } else {
            // Non-sequential move (e.g., custom FEN loaded or position cleared)
            setInternalLastMove(null);
          }
        } catch {
          setInternalLastMove(null);
        }

        // Count pieces to detect capture
        const prevPieces = prevFenRef.current.split(' ')[0].replace(/[^a-zA-Z]/g, '');
        const currPieces = fen.split(' ')[0].replace(/[^a-zA-Z]/g, '');
        const isCapture = currPieces.length < prevPieces.length;

        // Detect castling (king moved 2 squares)
        let isCastle = false;
        try {
          const prevBoard = new Chess(prevFenRef.current.trim()).board();
          const currBoard = currChess.board();
          (['w', 'b'] as const).forEach((color) => {
            let prevKingCol = -1;
            let currKingCol = -1;
            for (let r = 0; r < 8; r++) {
              for (let c = 0; c < 8; c++) {
                const p1 = prevBoard[r][c];
                if (p1 && p1.type === 'k' && p1.color === color) prevKingCol = c;
                const p2 = currBoard[r][c];
                if (p2 && p2.type === 'k' && p2.color === color) currKingCol = c;
              }
            }
            if (prevKingCol !== -1 && currKingCol !== -1 && Math.abs(currKingCol - prevKingCol) === 2) {
              isCastle = true;
            }
          });
        } catch {}

        if (isCheck) {
          chessSounds.playCheck();
        } else if (isCastle) {
          chessSounds.playCastle();
        } else if (isCapture) {
          chessSounds.playCapture();
        } else {
          chessSounds.playMove();
        }
      } catch {
        chessSounds.playMove();
      }
    }
    prevFenRef.current = fen;
  }, [fen]);

  // Alert student with celebratory chime when coach delegates board turn to them
  const prevCanMoveRef = useRef(canMove);
  useEffect(() => {
    if (!prevCanMoveRef.current && canMove && !isCoach) {
      chessSounds.playSuccess();
    }
    prevCanMoveRef.current = canMove;
  }, [canMove, isCoach]);

  const effectiveArrows = useMemo(() => {
    if (isCoach) return arrows;
    return [...arrows, ...localStudentArrows];
  }, [isCoach, arrows, localStudentArrows]);

  const effectiveHighlights = useMemo(() => {
    if (isCoach) return highlights;
    return [...highlights, ...localStudentHighlights];
  }, [isCoach, highlights, localStudentHighlights]);

  // Convert canonical arrows to v5 Arrow objects and legacy tuples
  const v5Arrows = useMemo(() => {
    return effectiveArrows.map((a) => ({
      startSquare: a.from,
      endSquare: a.to,
      color: a.color || (isCoach ? activeDrawColor : 'rgba(139, 92, 246, 0.85)'),
    }));
  }, [effectiveArrows, isCoach, activeDrawColor]);

  const renderedArrows = useMemo<[string, string, string][]>(() => {
    return effectiveArrows.map((a) => [
      a.from,
      a.to,
      a.color || (isCoach ? activeDrawColor : 'rgba(139, 92, 246, 0.85)'),
    ]);
  }, [effectiveArrows, isCoach, activeDrawColor]);

  // State for interactive pawn promotion selector
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
    pieceColor: 'w' | 'b';
  } | null>(null);

  // Convert highlights, check (Yellow) and checkmate (Red) to square styles
  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // 1. Last Move Highlighting (Subtle warm amber/gold tone for source and target squares)
    if (effectiveLastMove) {
      const lastMoveBg = 'rgba(234, 179, 8, 0.28)';
      const lastMoveBorder = 'inset 0 0 0 2px rgba(234, 179, 8, 0.45)';
      if (effectiveLastMove.from) {
        styles[effectiveLastMove.from] = {
          backgroundColor: lastMoveBg,
          boxShadow: lastMoveBorder,
        };
      }
      if (effectiveLastMove.to) {
        styles[effectiveLastMove.to] = {
          backgroundColor: lastMoveBg,
          boxShadow: lastMoveBorder,
        };
      }
    }

    // 2. Custom annotations
    for (const h of effectiveHighlights) {
      styles[h.square] = {
        backgroundColor: h.color || (isCoach ? 'rgba(16, 185, 129, 0.45)' : 'rgba(139, 92, 246, 0.45)'),
        boxShadow: `inset 0 0 14px 2px ${h.color || (isCoach ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.4)')}`,
      };
    }

    // 3. Check & Checkmate pulsing highlight on King derived from canonical FEN
    try {
      if (fen && fen.trim()) {
        const chess = new Chess(fen.trim());
        const isCheck = chess.inCheck();
        const isCheckmate = chess.isCheckmate();

        if (isCheck || isCheckmate) {
          const board = chess.board();
          const turn = chess.turn();
          let kingSquare = '';
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const p = board[r][c];
              if (p && p.type === 'k' && p.color === turn) {
                const file = String.fromCharCode('a'.charCodeAt(0) + c);
                const rank = 8 - r;
                kingSquare = `${file}${rank}`;
                break;
              }
            }
            if (kingSquare) break;
          }

          if (kingSquare) {
            if (isCheckmate) {
              // Checkmate: Vivid crimson glow with pulsing radial gradient
              styles[kingSquare] = {
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.75) 45%, rgba(185, 28, 28, 0.35) 80%, transparent 100%)',
                boxShadow: 'inset 0 0 20px 6px rgba(220, 38, 38, 0.95), 0 0 16px rgba(239, 68, 68, 0.85)',
              };
            } else {
              // Check: Dynamic amber-orange radial pulse with glowing ring
              styles[kingSquare] = {
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.85) 0%, rgba(245, 158, 11, 0.6) 50%, rgba(234, 179, 8, 0.25) 80%, transparent 100%)',
                boxShadow: 'inset 0 0 18px 5px rgba(234, 88, 12, 0.95), 0 0 14px rgba(245, 158, 11, 0.8)',
              };
            }
          }
        }
      }
    } catch {}

    // 4. Selected piece highlight (Warm amber ring + subtle glow)
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] || {}),
        backgroundColor: 'rgba(245, 158, 11, 0.4)',
        boxShadow: 'inset 0 0 0 3px rgba(245, 158, 11, 0.95), inset 0 0 14px rgba(245, 158, 11, 0.35)',
      };

      // Destination dots and capture target rings for legal moves
      for (const move of legalMoves) {
        const destSquare = move.to;
        const isCapture = Boolean(move.captured);
        const existing = styles[destSquare] || {};

        styles[destSquare] = {
          ...existing,
          backgroundImage: isCapture
            ? 'radial-gradient(circle, transparent 52%, rgba(239, 68, 68, 0.7) 54%, rgba(239, 68, 68, 0.7) 72%, transparent 74%)'
            : 'radial-gradient(circle, rgba(16, 185, 129, 0.85) 23%, transparent 25%)',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          cursor: 'pointer',
        };
      }
    }

    return styles;
  }, [effectiveHighlights, fen, selectedSquare, legalMoves, isCoach, effectiveLastMove]);

  const handleSelectPromotion = useCallback(
    async (promoPiece: 'q' | 'r' | 'b' | 'n') => {
      if (!pendingPromotion) return;
      const { from, to } = pendingPromotion;
      setPendingPromotion(null);
      setInternalLastMove({ from, to });
      await onMove(from, to, promoPiece);
    },
    [pendingPromotion, onMove]
  );

  const handlePieceDrop = useCallback(
    (arg0: any, arg1?: any, arg2?: any): boolean => {
      setSelectedSquare(null);
      let sourceSquare = '';
      let targetSquare = '';
      let piece = '';

      // Check if called with react-chessboard v5 object: { piece, sourceSquare, targetSquare }
      if (arg0 && typeof arg0 === 'object' && ('sourceSquare' in arg0 || 'targetSquare' in arg0)) {
        sourceSquare = arg0.sourceSquare || '';
        targetSquare = arg0.targetSquare || '';
        piece = arg0.piece?.pieceType || (typeof arg0.piece === 'string' ? arg0.piece : '');
      } else {
        // Called with legacy signature: (sourceSquare, targetSquare, piece)
        sourceSquare = typeof arg0 === 'string' ? arg0 : '';
        targetSquare = typeof arg1 === 'string' ? arg1 : '';
        piece = typeof arg2 === 'string' ? arg2 : (arg2?.pieceType || '');
      }

      if (!sourceSquare || !targetSquare || sourceSquare === targetSquare) {
        return false;
      }

      // ── Play Move as Answer for interactive coach question prompts ────────
      if (isQuestionAnswerMode) {
        const validation = validateChessMove(
          fen,
          { from: sourceSquare, to: targetSquare },
          false
        );
        if (validation.valid && validation.san) {
          const san = validation.san;
          chessSounds.playMove();
          setLocalStudentArrows([{ from: sourceSquare, to: targetSquare, color: '#10b981' }]);
          setSubmittedAnswerMove(san);
          onAnswerMove?.(san);
        } else {
          chessSounds.playFail();
        }
        // Always snap piece back to puzzle position on shared board
        return false;
      }

      if (!canMove || isLocked || allowedColor === 'none') {
        return false;
      }

      // Check allowed piece color for student (white only, black only, or both)
      if (allowedColor && allowedColor !== 'both') {
        let pieceColor: 'w' | 'b' | null = null;
        if (piece && typeof piece === 'string') {
          if (piece.startsWith('w') || piece.startsWith('W')) pieceColor = 'w';
          else if (piece.startsWith('b') || piece.startsWith('B')) pieceColor = 'b';
        }
        if (!pieceColor && fen && sourceSquare) {
          try {
            const c = new Chess(fen);
            const p = c.get(sourceSquare as any);
            if (p) pieceColor = p.color;
          } catch {}
        }
        if (allowedColor === 'white' && pieceColor !== 'w') {
          return false;
        }
        if (allowedColor === 'black' && pieceColor !== 'b') {
          return false;
        }
      }

      // Check pawn promotion: Player MUST choose promotion piece (Queen, Rook, Bishop, Knight)
      const isWhitePawnPromotion = piece === 'wP' && targetSquare[1] === '8' && (sourceSquare[1] === '7' || allowIllegalMoves);
      const isBlackPawnPromotion = piece === 'bP' && targetSquare[1] === '1' && (sourceSquare[1] === '2' || allowIllegalMoves);
      if (isWhitePawnPromotion || isBlackPawnPromotion) {
        // Pre-validate that at least one promotion move is valid
        const testValidation = validateChessMove(
          fen,
          { from: sourceSquare, to: targetSquare, promotion: 'q' },
          allowIllegalMoves
        );
        if (testValidation.valid) {
          setPendingPromotion({
            from: sourceSquare,
            to: targetSquare,
            pieceColor: isWhitePawnPromotion ? 'w' : 'b',
          });
          return false;
        }
      }

      // Synchronously validate the move against the current board FEN
      const validation = validateChessMove(
        fen,
        { from: sourceSquare, to: targetSquare },
        allowIllegalMoves
      );

      if (!validation.valid || !validation.newFen) {
        // Invalid move: play subtle fail sound and return false smoothly
        chessSounds.playFail();
        return false;
      }

      // Valid legal or free move!
      // Fire onMove to update optimistic state and persist/broadcast via server.
      setInternalLastMove({ from: sourceSquare, to: targetSquare });
      onMove(sourceSquare, targetSquare);

      // Return true so react-chessboard sets manuallyDroppedPieceAndSquare.
      // The piece stays cleanly at targetSquare with zero snap-back or re-animation glitch.
      return true;
    },
    [canMove, isLocked, allowedColor, onMove, fen, allowIllegalMoves, isQuestionAnswerMode, onAnswerMove]
  );

  // Click-to-Move handler: tap piece to select, tap legal destination to move
  const handleSquareClick = useCallback(
    (arg0: any) => {
      const square = typeof arg0 === 'string' ? arg0 : (arg0?.square || '');
      if (!square) return;

      if (isLocked || (!canMove && !isQuestionAnswerMode) || allowedColor === 'none') {
        setSelectedSquare(null);
        return;
      }

      // If a piece is already selected
      if (selectedSquare) {
        // Clicking the currently selected square deselects it
        if (square === selectedSquare) {
          setSelectedSquare(null);
          return;
        }

        // Check if clicked square is among the legal moves or free moves
        const matchingMove = legalMoves.find((m) => m.to === square);
        const isLegal = Boolean(matchingMove) || allowIllegalMoves;

        if (isLegal) {
          const from = selectedSquare;
          const to = square;

          // ── Play Move as Answer for interactive coach question prompts ────────
          if (isQuestionAnswerMode) {
            const validation = validateChessMove(
              fen,
              { from, to },
              false
            );
            if (validation.valid && validation.san) {
              const san = validation.san;
              chessSounds.playMove();
              setLocalStudentArrows([{ from, to, color: '#10b981' }]);
              setSubmittedAnswerMove(san);
              onAnswerMove?.(san);
            } else {
              chessSounds.playFail();
            }
            setSelectedSquare(null);
            return;
          }

          // Check pawn promotion
          let isPromotion = false;
          let promoColor: 'w' | 'b' = 'w';
          try {
            const chess = new Chess(fen.trim());
            const piece = chess.get(from as any);
            if (piece && piece.type === 'p') {
              if (piece.color === 'w' && to[1] === '8') {
                isPromotion = true;
                promoColor = 'w';
              } else if (piece.color === 'b' && to[1] === '1') {
                isPromotion = true;
                promoColor = 'b';
              }
            }
          } catch {}

          if (isPromotion) {
            setSelectedSquare(null);
            setPendingPromotion({
              from,
              to,
              pieceColor: promoColor,
            });
            return;
          }

          // Synchronously validate and make the move
          const validation = validateChessMove(
            fen,
            { from, to },
            allowIllegalMoves
          );

          if (!validation.valid || !validation.newFen) {
            chessSounds.playFail();
            setSelectedSquare(null);
            return;
          }

          setSelectedSquare(null);
          setInternalLastMove({ from, to });
          onMove(from, to);
          return;
        }

        // Clicked a square that is NOT a legal move:
        // Check if user clicked another piece belonging to their allowed side
        try {
          const chess = new Chess(fen.trim());
          const piece = chess.get(square as any);
          if (piece) {
            const pieceColor = piece.color;
            const sideToMove = (fen.split(' ')[1] as 'w' | 'b') || 'w';

            let canSelect = false;
            if (isQuestionAnswerMode) {
              canSelect = sideToMove === pieceColor;
            } else {
              const matchesTurn = allowIllegalMoves || sideToMove === pieceColor;
              const matchesAllowed =
                allowedColor === 'both' ||
                (allowedColor === 'white' && pieceColor === 'w') ||
                (allowedColor === 'black' && pieceColor === 'b');
              canSelect = Boolean(matchesTurn && matchesAllowed);
            }

            if (canSelect) {
              setSelectedSquare(square);
              return;
            }
          }
        } catch {}

        // Clicked invalid empty square or opponent square: deselect
        setSelectedSquare(null);
        return;
      }

      // No square currently selected: select piece if valid
      try {
        const chess = new Chess(fen.trim());
        const piece = chess.get(square as any);
        if (!piece) return;

        const pieceColor = piece.color;
        const sideToMove = (fen.split(' ')[1] as 'w' | 'b') || 'w';

        let canSelect = false;
        if (isQuestionAnswerMode) {
          canSelect = sideToMove === pieceColor;
        } else {
          const matchesTurn = allowIllegalMoves || sideToMove === pieceColor;
          const matchesAllowed =
            allowedColor === 'both' ||
            (allowedColor === 'white' && pieceColor === 'w') ||
            (allowedColor === 'black' && pieceColor === 'b');
          canSelect = Boolean(matchesTurn && matchesAllowed);
        }

        if (canSelect) {
          setSelectedSquare(square);
        }
      } catch {}
    },
    [
      isLocked,
      canMove,
      isQuestionAnswerMode,
      allowedColor,
      selectedSquare,
      legalMoves,
      allowIllegalMoves,
      fen,
      onAnswerMove,
      onMove,
    ]
  );

  const isDraggable = Boolean((canMove && !isLocked && allowedColor !== 'none') || isQuestionAnswerMode);

  const canDragPiece = useCallback(
    (args: any) => {
      if (!isDraggable) return false;
      const pt: string =
        args?.piece?.pieceType ||
        args?.pieceType ||
        (typeof args?.piece === 'string' ? args.piece : '') ||
        (typeof args === 'string' ? args : '');

      const isWhitePiece = pt.startsWith('w') || pt.startsWith('W');
      const isBlackPiece = pt.startsWith('b') || pt.startsWith('B');

      const sideToMove = (fen.split(' ')[1] as 'w' | 'b') || 'w';
      if (isQuestionAnswerMode) {
        return sideToMove === 'w' ? isWhitePiece : isBlackPiece;
      }

      // Strict turn enforcement: piece must match the active sideToMove in FEN
      if (!allowIllegalMoves) {
        if (sideToMove === 'w' && !isWhitePiece) return false;
        if (sideToMove === 'b' && !isBlackPiece) return false;
      }

      if (allowedColor === 'white') {
        return isWhitePiece;
      }
      if (allowedColor === 'black') {
        return isBlackPiece;
      }
      return true;
    },
    [isDraggable, allowedColor, fen, allowIllegalMoves, isQuestionAnswerMode]
  );

  const maxBoardDimension = Math.round(620 * (boardScale || 1));

  const currentSideToMove = (fen.split(' ')[1] as 'w' | 'b') || 'w';
  const isMyTurn =
    allowedColor === 'both' ||
    (allowedColor === 'white' && currentSideToMove === 'w') ||
    (allowedColor === 'black' && currentSideToMove === 'b');

  const checkStatus = useMemo<'checkmate' | 'check' | null>(() => {
    if (!fen || !fen.trim()) return null;
    try {
      const c = new Chess(fen.trim());
      if (c.isCheckmate()) return 'checkmate';
      if (c.inCheck()) return 'check';
      return null;
    } catch {
      return null;
    }
  }, [fen]);

  // Calculate captured pieces and material imbalance
  const materialData = useMemo(() => {
    if (!fen || !fen.trim()) {
      return {
        capturedByWhite: [] as string[],
        capturedByBlack: [] as string[],
        whiteAdvantage: 0,
        blackAdvantage: 0,
      };
    }

    const initialWhite: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const initialBlack: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

    const boardPart = fen.trim().split(' ')[0];
    const currentWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    let whiteMaterial = 0;
    let blackMaterial = 0;

    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    for (const char of boardPart) {
      if (char >= '1' && char <= '8') continue;
      if (char === '/') continue;

      const lower = char.toLowerCase();
      if (values[lower] !== undefined) {
        if (char === char.toUpperCase()) {
          // White piece
          currentWhite[lower] = (currentWhite[lower] || 0) + 1;
          whiteMaterial += values[lower];
        } else {
          // Black piece
          currentBlack[lower] = (currentBlack[lower] || 0) + 1;
          blackMaterial += values[lower];
        }
      }
    }

    // Captured by White = Black pieces missing from board
    const capturedByWhite: string[] = [];
    (['p', 'n', 'b', 'r', 'q'] as const).forEach((piece) => {
      const missing = Math.max(0, (initialBlack[piece] || 0) - (currentBlack[piece] || 0));
      for (let i = 0; i < missing; i++) {
        capturedByWhite.push(`b${piece.toUpperCase()}`);
      }
    });

    // Captured by Black = White pieces missing from board
    const capturedByBlack: string[] = [];
    (['p', 'n', 'b', 'r', 'q'] as const).forEach((piece) => {
      const missing = Math.max(0, (initialWhite[piece] || 0) - (currentWhite[piece] || 0));
      for (let i = 0; i < missing; i++) {
        capturedByBlack.push(`w${piece.toUpperCase()}`);
      }
    });

    const diff = whiteMaterial - blackMaterial;

    return {
      capturedByWhite,
      capturedByBlack,
      whiteAdvantage: diff > 0 ? diff : 0,
      blackAdvantage: diff < 0 ? Math.abs(diff) : 0,
    };
  }, [fen]);

  const topIsBlack = orientation === 'white';
  const topCaptured = topIsBlack ? materialData.capturedByBlack : materialData.capturedByWhite;
  const topAdvantage = topIsBlack ? materialData.blackAdvantage : materialData.whiteAdvantage;
  const topPlayerName = topIsBlack ? 'Black' : 'White';
  const topPlayerIcon = topIsBlack ? '⚫' : '⚪';
  const topCapturedIsWhite = topIsBlack;

  const bottomIsWhite = orientation === 'white';
  const bottomCaptured = bottomIsWhite ? materialData.capturedByWhite : materialData.capturedByBlack;
  const bottomAdvantage = bottomIsWhite ? materialData.whiteAdvantage : materialData.blackAdvantage;
  const bottomPlayerName = bottomIsWhite ? 'White' : 'Black';
  const bottomPlayerIcon = bottomIsWhite ? '⚪' : '⚫';
  const bottomCapturedIsWhite = !bottomIsWhite;

  return (
    <div className={`relative flex items-center justify-center select-none w-full h-full min-h-0 ${className}`}>
      {/* Board Locked Overlay Banner */}
      {isLocked && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-rose-600/90 backdrop-blur-md text-white font-extrabold text-xs rounded-xl shadow-lg border border-rose-500 flex items-center gap-1.5 animate-pulse">
          <span>🔒</span>
          <span>Board Locked by Coach</span>
        </div>
      )}

      {/* Student Color Assignment Overlay Badge */}
      {!isLocked && (allowedColor === 'white' || allowedColor === 'black') && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-slate-900/90 backdrop-blur-md text-white font-extrabold text-xs rounded-xl shadow-lg border border-slate-750 flex items-center gap-1.5 animate-in fade-in">
          <span>{allowedColor === 'white' ? '⚪' : '⚫'}</span>
          <span>{allowedColor === 'white' ? 'You play White' : 'You play Black'}</span>
        </div>
      )}

      {/* Turn Indicator Banner */}
      {!isLocked && (
        <div className="absolute top-3 right-3 z-20 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-xs font-extrabold rounded-xl border border-slate-750 shadow-lg flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className={isMyTurn ? 'text-emerald-300' : 'text-slate-400'}>
            {currentSideToMove === 'w' ? '⚪ White\'s Turn' : '⚫ Black\'s Turn'}
            {allowedColor !== 'both' && (isMyTurn ? ' (Your Turn)' : ' (Opponent)')}
          </span>
          {checkStatus === 'checkmate' && (
            <span className="px-1.5 py-0.5 rounded-md bg-rose-600/95 text-white font-black text-[10px] animate-pulse border border-rose-400/60 shadow-sm flex items-center gap-0.5">
              <span>👑</span>
              <span>Checkmate</span>
            </span>
          )}
          {checkStatus === 'check' && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/95 text-slate-950 font-black text-[10px] animate-pulse border border-amber-300 shadow-sm flex items-center gap-0.5">
              <span>⚠️</span>
              <span>Check</span>
            </span>
          )}
        </div>
      )}

      {/* Student Showcase Mode Banner */}
      {studentShowcaseMode && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-xl border border-indigo-400/60 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 select-none">
          <span>✨</span>
          <span>{isCoach ? 'Showcase Active: Students can annotate live' : 'Showcase Active: Your arrows are live to the entire class!'}</span>
        </div>
      )}

      {/* Interactive Question Answer Mode Banner for Students */}
      {isQuestionAnswerMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md px-3.5 py-2 bg-gradient-to-r from-blue-600/95 to-indigo-600/95 backdrop-blur-md text-white font-extrabold text-xs rounded-2xl shadow-2xl border border-blue-400/80 flex items-center justify-between gap-2 animate-in fade-in select-none">
          <div className="flex items-center gap-2 truncate">
            <span className="text-base animate-bounce">🎯</span>
            <div className="truncate">
              <span className="text-[10px] uppercase tracking-wider text-blue-200 block font-black">
                {submittedAnswerMove ? 'Move Submitted to Coach' : 'Find the Move Prompt'}
              </span>
              <span className="text-xs font-bold text-white truncate block">
                {submittedAnswerMove
                  ? `Your answer: ${submittedAnswerMove} (Sent Privately)`
                  : activeQuestion?.text || 'Drag your piece to play answer!'}
              </span>
            </div>
          </div>
          {submittedAnswerMove && (
            <button
              type="button"
              onClick={() => {
                setSubmittedAnswerMove(null);
                setLocalStudentArrows([]);
              }}
              className="px-2 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900 text-blue-200 text-[10px] font-black border border-blue-400/50 transition-colors shrink-0 cursor-pointer"
              title="Change your answer move"
            >
              Change
            </button>
          )}
        </div>
      )}

      {/* Board & Material Bar Wrapper */}
      <div
        className="w-full flex flex-col items-center justify-center min-h-0 relative"
        style={{ maxWidth: `${maxBoardDimension}px` }}
      >
        {/* Top Player Material Bar */}
        <div className="w-full flex items-center justify-between px-2.5 py-1 mb-1 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-md backdrop-blur-xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs">{topPlayerIcon}</span>
            <span className="text-[11px] font-black text-slate-300">{topPlayerName}</span>
            <CapturedPiecesList pieces={topCaptured} isWhite={topCapturedIsWhite} />
          </div>
          {topAdvantage > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black shadow-xs shrink-0">
              +{topAdvantage}
            </span>
          )}
        </div>

        <div
          id="classroom-board"
          data-can-move={String(isDraggable)}
          style={{
            width: '100%',
            maxWidth: `${maxBoardDimension}px`,
            maxHeight: '100%',
          }}
          className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-850 bg-slate-900 relative"
        >
        <ChessboardAdapter
          position={fen}
          boardOrientation={orientation}
          arePiecesDraggable={isDraggable}
          allowDragging={isDraggable}
          canDragPiece={canDragPiece}
          onPieceDrop={handlePieceDrop}
          onPieceDragBegin={() => setSelectedSquare(null)}
          onSquareClick={handleSquareClick}
          onPieceClick={handleSquareClick}
          arrows={v5Arrows}
          customArrows={renderedArrows}
          customArrowColor={isCoach ? activeDrawColor : 'rgba(139, 92, 246, 0.85)'}
          arrowColor={isCoach ? activeDrawColor : 'rgba(139, 92, 246, 0.85)'}
          onArrowsChange={(newArrows: any) => {
            let parsed: BoardArrow[] = [];
            const defaultColor = isCoach ? activeDrawColor : 'rgba(139, 92, 246, 0.85)';
            if (Array.isArray(newArrows)) {
              parsed = newArrows.map((a: any) => {
                if (Array.isArray(a)) {
                  return { from: a[0], to: a[1], color: a[2] || defaultColor };
                }
                return {
                  from: a.startSquare || a.from,
                  to: a.endSquare || a.to,
                  color: a.color || defaultColor,
                };
              });
            }
            if (isCoach || studentShowcaseMode) {
              onDrawChange?.(parsed, highlights);
            } else {
              const coachKeys = new Set(arrows.map((ca) => `${ca.from}-${ca.to}`));
              const studentOnly = parsed.filter((pa) => !coachKeys.has(`${pa.from}-${pa.to}`));
              setLocalStudentArrows(studentOnly);
            }
          }}
          onSquareRightClick={(square: string) => {
            if (!square) return;
            const highlightColor = isCoach
              ? (activeDrawColor === '#ef4444'
                  ? 'rgba(239, 68, 68, 0.5)'
                  : activeDrawColor === '#3b82f6'
                  ? 'rgba(59, 130, 246, 0.5)'
                  : activeDrawColor === '#f59e0b'
                  ? 'rgba(245, 158, 11, 0.5)'
                  : 'rgba(16, 185, 129, 0.5)')
              : 'rgba(139, 92, 246, 0.5)';

            if (isCoach || studentShowcaseMode) {
              const exists = highlights.some((h) => h.square === square);
              const newHighlights = exists
                ? highlights.filter((h) => h.square !== square)
                : [...highlights, { square, color: highlightColor }];
              onDrawChange?.(arrows, newHighlights);
            } else {
              setLocalStudentHighlights((prev) => {
                const exists = prev.some((h) => h.square === square);
                if (exists) return prev.filter((h) => h.square !== square);
                return [...prev, { square, color: highlightColor }];
              });
            }
          }}
          squareStyles={customSquareStyles}
          customSquareStyles={customSquareStyles}
          showCoordinates={showCoords}
          showBoardNotation={showCoords}
          customDarkSquareStyle={{ backgroundColor: effectiveDarkColor }}
          customLightSquareStyle={{ backgroundColor: effectiveLightColor }}
          darkSquareStyle={{ backgroundColor: effectiveDarkColor }}
          lightSquareStyle={{ backgroundColor: effectiveLightColor }}
          animationDuration={150}
          customBoardStyle={{
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        />

        {/* 64-Square Coordinate Overlay (Controlled by showSquareLabels toggle) */}
        {showSquareLabels && (
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none select-none z-10">
            {(orientation === 'white'
              ? [8, 7, 6, 5, 4, 3, 2, 1]
              : [1, 2, 3, 4, 5, 6, 7, 8]
            ).map((rank) =>
              (orientation === 'white'
                ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
                : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
              ).map((file) => {
                const square = `${file}${rank}`;
                return (
                  <div key={square} className="relative flex items-start justify-start p-1">
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold leading-none text-slate-100 opacity-60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {square}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Board Theme Customizer Floating Button & Popover */}
        <div className="absolute bottom-3 left-3 z-30">
          <button
            type="button"
            onClick={() => setShowThemeMenu((prev) => !prev)}
            className="w-7 h-7 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700/80 shadow-lg flex items-center justify-center transition-all cursor-pointer backdrop-blur-md group"
            title="Change board theme"
          >
            <span className="text-xs transition-transform group-hover:rotate-12">🎨</span>
          </button>

          {showThemeMenu && (
            <div className="absolute bottom-9 left-0 p-2 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col gap-1 w-44 z-40 animate-in fade-in slide-in-from-bottom-2">
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-0.5 flex items-center justify-between">
                <span>Board Theme</span>
                <span className="text-[9px] text-slate-500 font-normal">Presets</span>
              </div>
              {BOARD_THEMES.map((theme) => {
                const isActive = theme.id === selectedThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full overflow-hidden border border-slate-600 flex shrink-0 shadow-xs">
                      <div className="w-1/2 h-full" style={{ backgroundColor: theme.lightSquareColor }} />
                      <div className="w-1/2 h-full" style={{ backgroundColor: theme.darkSquareColor }} />
                    </div>
                    <span className="truncate flex-1 text-[11px]">{theme.name}</span>
                    {isActive && <span className="text-amber-400 text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pawn Promotion Piece Selector Overlay */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in select-none">
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Choose Promotion Piece
              </span>
              <div className="flex items-center gap-2.5">
                {[
                  { key: 'q' as const, label: 'Queen', icon: pendingPromotion.pieceColor === 'w' ? '♕' : '♛' },
                  { key: 'r' as const, label: 'Rook', icon: pendingPromotion.pieceColor === 'w' ? '♖' : '♜' },
                  { key: 'b' as const, label: 'Bishop', icon: pendingPromotion.pieceColor === 'w' ? '♗' : '♝' },
                  { key: 'n' as const, label: 'Knight', icon: pendingPromotion.pieceColor === 'w' ? '♘' : '♞' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    data-promotion-choice={item.key}
                    onClick={() => handleSelectPromotion(item.key)}
                    className="flex flex-col items-center justify-center w-14 h-16 bg-slate-800 hover:bg-slate-700 hover:border-amber-500 border border-slate-700 rounded-xl transition-all shadow-md group cursor-pointer"
                  >
                    <span className="text-3xl filter drop-shadow group-hover:scale-110 transition-transform text-white">
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-amber-400 mt-1">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPendingPromotion(null)}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Student Active Turn Banner */}
        {canMove && !isCoach && !isQuestionAnswerMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white text-xs font-black shadow-xl shadow-emerald-950/80 border border-emerald-400/80 flex items-center gap-2 animate-bounce select-none pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>🎯 IT&apos;S YOUR TURN TO MOVE! ({allowedColor === 'white' ? 'Playing White ⚪' : allowedColor === 'black' ? 'Playing Black ⚫' : 'Both Colors ⚔️'})</span>
          </div>
        )}

        {/* Student Private Calculation Canvas Indicator & Clear Button */}
        {!isCoach && (localStudentArrows.length > 0 || localStudentHighlights.length > 0) && (
          <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 bg-purple-950/90 backdrop-blur-md text-purple-200 border border-purple-700/60 rounded-xl shadow-lg flex items-center gap-2 text-[11px] font-bold animate-in fade-in">
            <span className="flex items-center gap-1">
              <span>✏️</span>
              <span>My Private Notes ({localStudentArrows.length + localStudentHighlights.length})</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setLocalStudentArrows([]);
                setLocalStudentHighlights([]);
              }}
              className="px-1.5 py-0.5 rounded bg-purple-800/80 hover:bg-purple-700 text-white text-[10px] cursor-pointer"
              title="Clear my private calculation drawings"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Bottom Player Material Bar */}
      <div className="w-full flex items-center justify-between px-2.5 py-1 mt-1 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-md backdrop-blur-xs select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs">{bottomPlayerIcon}</span>
          <span className="text-[11px] font-black text-slate-300">{bottomPlayerName}</span>
          <CapturedPiecesList pieces={bottomCaptured} isWhite={bottomCapturedIsWhite} />
        </div>
        {bottomAdvantage > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black shadow-xs shrink-0">
            +{bottomAdvantage}
          </span>
        )}
      </div>
    </div>
  </div>
);
}
