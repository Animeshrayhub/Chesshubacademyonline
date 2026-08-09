'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const Chessboard = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

// ─── Types ────────────────────────────────────────────────────────────────────
type PieceCode = string; // react-chessboard format: "wK", "bP", etc.
type PositionObj = Record<string, PieceCode>; // { e1: "wK", e8: "bK", ... }
type SelectedTool = PieceCode | 'trash' | null;

export interface BoardEditorWorkspaceProps {
  initialFen?: string;
  onFenChange?: (fen: string) => void;
  onLoadIntoClassroom?: (fen: string) => void;
  onSaveToCurriculum?: (fen: string) => void;
  className?: string;
}

// ─── FEN ↔ Position-Object Helpers ───────────────────────────────────────────
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Parse a FEN placement string into a position object. */
function fenPlacementToPosition(placement: string): PositionObj {
  const pos: PositionObj = {};
  const ranks = placement.split('/');
  for (let ri = 0; ri < Math.min(ranks.length, 8); ri++) {
    const rankNum = 8 - ri;
    let fi = 0;
    for (const ch of ranks[ri]) {
      if (ch >= '1' && ch <= '8') {
        fi += parseInt(ch, 10);
      } else if (fi < 8) {
        const file = FILES[fi];
        const isWhite = ch === ch.toUpperCase();
        pos[`${file}${rankNum}`] = `${isWhite ? 'w' : 'b'}${ch.toUpperCase()}`;
        fi++;
      }
    }
  }
  return pos;
}

/** Convert a position object back to a FEN placement string. */
function positionToFenPlacement(pos: PositionObj): string {
  const rankStrings: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let empty = 0;
    let row = '';
    for (const file of FILES) {
      const piece = pos[`${file}${rank}`];
      if (piece) {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        const type = piece[1]; // e.g. 'K', 'P'
        row += piece[0] === 'w' ? type.toUpperCase() : type.toLowerCase();
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty;
    rankStrings.push(row);
  }
  return rankStrings.join('/');
}

/** Build a full FEN string from position + flags. */
function buildFen(
  pos: PositionObj,
  turn: 'w' | 'b',
  castling: { WK: boolean; WQ: boolean; BK: boolean; BQ: boolean },
  ep: string,
  halfMove: number,
  fullMove: number
): string {
  const placement = positionToFenPlacement(pos);
  let cStr = '';
  if (castling.WK) cStr += 'K';
  if (castling.WQ) cStr += 'Q';
  if (castling.BK) cStr += 'k';
  if (castling.BQ) cStr += 'q';
  if (!cStr) cStr = '-';
  return `${placement} ${turn} ${cStr} ${ep || '-'} ${halfMove} ${fullMove}`;
}

/** Parse a full FEN string into its parts. Returns null on failure. */
function parseFenString(fenInput: string): {
  fen: string;
  pos: PositionObj;
  turn: 'w' | 'b';
  castling: { WK: boolean; WQ: boolean; BK: boolean; BQ: boolean };
  ep: string;
  halfMove: number;
  fullMove: number;
} | null {
  try {
    const trimmed = fenInput.trim();
    const parts = trimmed.split(/\s+/);
    if (!parts[0]) return null;
    const pos = fenPlacementToPosition(parts[0]);
    const turn = (parts[1] === 'b' ? 'b' : 'w') as 'w' | 'b';
    const cStr = parts[2] || '-';
    const castling = {
      WK: cStr.includes('K'),
      WQ: cStr.includes('Q'),
      BK: cStr.includes('k'),
      BQ: cStr.includes('q'),
    };
    const ep = parts[3] || '-';
    const halfMove = parseInt(parts[4] || '0', 10);
    const fullMove = parseInt(parts[5] || '1', 10);
    const fen = buildFen(pos, turn, castling, ep, halfMove, fullMove);
    return { fen, pos, turn, castling, ep, halfMove, fullMove };
  } catch {
    return null;
  }
}

// ─── Position Validation Helper ──────────────────────────────────────────────
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}

function validateBoardPosition(pos: PositionObj, turn: 'w' | 'b'): ValidationResult {
  const warnings: string[] = [];
  let wKingCount = 0;
  let bKingCount = 0;
  let invalidPawns = 0;

  Object.entries(pos).forEach(([sq, piece]) => {
    if (piece === 'wK') wKingCount++;
    if (piece === 'bK') bKingCount++;
    if (piece[1] === 'P') {
      if (sq.endsWith('1') || sq.endsWith('8')) {
        invalidPawns++;
      }
    }
  });

  if (wKingCount === 0) warnings.push('White King (♔) is missing from the board');
  if (wKingCount > 1) warnings.push(`Multiple White Kings (${wKingCount}) found on board`);
  if (bKingCount === 0) warnings.push('Black King (♚) is missing from the board');
  if (bKingCount > 1) warnings.push(`Multiple Black Kings (${bKingCount}) found on board`);
  if (invalidPawns > 0) warnings.push(`${invalidPawns} Pawn(s) placed illegally on rank 1 or 8`);

  // Check if non-moving side is in check
  if (wKingCount === 1 && bKingCount === 1) {
    try {
      const fen = buildFen(pos, turn, { WK: false, WQ: false, BK: false, BQ: false }, '-', 0, 1);
      const chess = new Chess(fen);
      if (chess.inCheck()) {
        const oppTurn = turn === 'w' ? 'b' : 'w';
        const oppFen = buildFen(pos, oppTurn, { WK: false, WQ: false, BK: false, BQ: false }, '-', 0, 1);
        const oppChess = new Chess(oppFen);
        if (oppChess.inCheck()) {
          warnings.push(`Illegal state: Both Kings are in check simultaneously`);
        }
      }
    } catch {}
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

// ─── Piece Palette Configuration ─────────────────────────────────────────────
const PIECES: { id: PieceCode; label: string; symbol: string; color: 'w' | 'b' }[] = [
  { id: 'wK', label: 'White King', symbol: '♔', color: 'w' },
  { id: 'wQ', label: 'White Queen', symbol: '♕', color: 'w' },
  { id: 'wR', label: 'White Rook', symbol: '♖', color: 'w' },
  { id: 'wB', label: 'White Bishop', symbol: '♗', color: 'w' },
  { id: 'wN', label: 'White Knight', symbol: '♘', color: 'w' },
  { id: 'wP', label: 'White Pawn', symbol: '♙', color: 'w' },
  { id: 'bK', label: 'Black King', symbol: '♚', color: 'b' },
  { id: 'bQ', label: 'Black Queen', symbol: '♛', color: 'b' },
  { id: 'bR', label: 'Black Rook', symbol: '♜', color: 'b' },
  { id: 'bB', label: 'Black Bishop', symbol: '♝', color: 'b' },
  { id: 'bN', label: 'Black Knight', symbol: '♞', color: 'b' },
  { id: 'bP', label: 'Black Pawn', symbol: '♟', color: 'b' },
];

const PRESETS = [
  { name: 'Initial Setup', icon: '♟️', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { name: 'Empty Board', icon: '🧹', fen: '8/8/8/8/8/8/8/8 w - - 0 1' },
  { name: 'Back-Rank Mate', icon: '🏰', fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1' },
  { name: 'Knight Fork', icon: '🐴', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4n3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 5' },
  { name: 'Pin & Skewer', icon: '🎯', fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/R1BQK2R w KQkq - 0 5' },
  { name: 'Smothered Mate', icon: '👑', fen: '6rk/5Npp/8/8/8/8/5PPP/6K1 w - - 0 1' },
  { name: 'Rook Endgame', icon: '⚔️', fen: '8/8/4r3/3k4/8/8/3K1R2/8 w - - 0 1' },
  { name: 'King & Pawns', icon: '🌱', fen: '8/4p3/8/2k5/8/5K2/4P3/8 w - - 0 1' },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BoardEditorWorkspace({
  initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  onFenChange,
  onLoadIntoClassroom,
  onSaveToCurriculum,
  className = '',
}: BoardEditorWorkspaceProps) {
  // Position stored as object
  const [position, setPosition] = useState<PositionObj>(() => {
    const p = parseFenString(initialFen);
    return p ? p.pos : fenPlacementToPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  });

  // Position flags
  const [turn, setTurn] = useState<'w' | 'b'>(() => {
    const p = parseFenString(initialFen);
    return p ? p.turn : 'w';
  });
  const [castling, setCastling] = useState(() => {
    const p = parseFenString(initialFen);
    return p ? p.castling : { WK: true, WQ: true, BK: true, BQ: true };
  });
  const [ep, setEp] = useState(() => {
    const p = parseFenString(initialFen);
    return p ? p.ep : '-';
  });
  const [halfMove, setHalfMove] = useState(() => {
    const p = parseFenString(initialFen);
    return p ? p.halfMove : 0;
  });
  const [fullMove, setFullMove] = useState(() => {
    const p = parseFenString(initialFen);
    return p ? p.fullMove : 1;
  });

  // UI state
  const [selectedTool, setSelectedTool] = useState<SelectedTool>(null);
  const [viewMode, setViewMode] = useState<'single' | 'dual'>('dual');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [boardKey, setBoardKey] = useState(0);
  const [fenInputText, setFenInputText] = useState(initialFen);
  const [fenInputError, setFenInputError] = useState('');
  const [copied, setCopied] = useState(false);

  // Stable ref for onFenChange callback
  const onFenChangeRef = useRef(onFenChange);
  useEffect(() => {
    onFenChangeRef.current = onFenChange;
  });

  // Current output FEN (computed)
  const currentFen = buildFen(position, turn, castling, ep, halfMove, fullMove);
  const validation = validateBoardPosition(position, turn);

  // Fire onFenChange whenever position or flags change
  const emitFen = useCallback(
    (pos: PositionObj, t: 'w' | 'b', ca: typeof castling, epStr: string, hm: number, fm: number) => {
      const fen = buildFen(pos, t, ca, epStr, hm, fm);
      setFenInputText(fen);
      prevInitialFen.current = fen;
      if (onFenChangeRef.current) onFenChangeRef.current(fen);
    },
    []
  );

  // Sync when initialFen prop changes from outside
  const prevInitialFen = useRef(initialFen);
  useEffect(() => {
    if (initialFen !== prevInitialFen.current) {
      prevInitialFen.current = initialFen;
      const parsed = parseFenString(initialFen);
      if (parsed) {
        setPosition(parsed.pos);
        setTurn(parsed.turn);
        setCastling(parsed.castling);
        setEp(parsed.ep);
        setHalfMove(parsed.halfMove);
        setFullMove(parsed.fullMove);
        setFenInputText(initialFen);
        setFenInputError('');
        setBoardKey((k) => k + 1);
      }
    }
  }, [initialFen]);

  // Apply a pasted FEN string
  const handleApplyFen = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      const parsed = parseFenString(trimmed);
      if (!parsed) {
        setFenInputError('Could not parse FEN — check notation and try again.');
        return;
      }
      prevInitialFen.current = parsed.fen;
      setPosition(parsed.pos);
      setTurn(parsed.turn);
      setCastling(parsed.castling);
      setEp(parsed.ep);
      setHalfMove(parsed.halfMove);
      setFullMove(parsed.fullMove);
      setFenInputText(parsed.fen);
      setFenInputError('');
      setBoardKey((k) => k + 1);
      emitFen(parsed.pos, parsed.turn, parsed.castling, parsed.ep, parsed.halfMove, parsed.fullMove);
    },
    [emitFen]
  );

  // Drag-and-drop piece movement or palette drop
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string): boolean => {
      if (sourceSquare === targetSquare) return false;
      setPosition((prev) => {
        const next = { ...prev };
        if (sourceSquare === 'spare' || !prev[sourceSquare]) {
          next[targetSquare] = piece;
        } else {
          delete next[sourceSquare];
          next[targetSquare] = piece || prev[sourceSquare];
        }
        emitFen(next, turn, castling, ep, halfMove, fullMove);
        return next;
      });
      return true;
    },
    [turn, castling, ep, halfMove, fullMove, emitFen]
  );

  // Square click to place or remove piece using selected palette tool
  const handleSquareClick = useCallback(
    (square: string) => {
      if (!selectedTool) return;
      setPosition((prev) => {
        const next = { ...prev };
        if (selectedTool === 'trash') {
          delete next[square];
        } else {
          next[square] = selectedTool;
        }
        emitFen(next, turn, castling, ep, halfMove, fullMove);
        return next;
      });
    },
    [selectedTool, turn, castling, ep, halfMove, fullMove, emitFen]
  );

  // Turn toggle
  const handleTurnToggle = (newTurn: 'w' | 'b') => {
    setTurn(newTurn);
    emitFen(position, newTurn, castling, ep, halfMove, fullMove);
  };

  // Castling toggle
  const handleCastlingToggle = (flag: 'WK' | 'WQ' | 'BK' | 'BQ') => {
    const next = { ...castling, [flag]: !castling[flag] };
    setCastling(next);
    emitFen(position, turn, next, ep, halfMove, fullMove);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentFen);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearBoard = () => {
    const emptyPos: PositionObj = {};
    setPosition(emptyPos);
    emitFen(emptyPos, turn, { WK: false, WQ: false, BK: false, BQ: false }, '-', 0, 1);
    setBoardKey((k) => k + 1);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white space-y-5 ${className}`}>
      {/* ── Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
            🎨
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-amber-400">ChessHub Interactive Board Editor</h3>
            <p className="text-xs text-slate-400">
              Drag pieces onto the board, stamp with palette tools, or load tactical presets
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Dual Perspective vs Single View */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('dual')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'dual' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              👥 Dual View (W/B)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'single' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              👤 Single View
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearBoard}
            className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            🧹 Clear Board
          </button>
        </div>
      </div>

      {/* ── Position Validation Badge */}
      <div className="w-full">
        {validation.isValid ? (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span>✅</span>
            <span>Valid Chess Position (Ready for engines and live classroom play)</span>
          </div>
        ) : (
          <div className="p-3 bg-amber-950/40 border border-amber-500/40 text-amber-200 rounded-2xl text-xs space-y-1">
            <div className="font-bold flex items-center gap-2 text-amber-300">
              <span>⚠️</span>
              <span>Position Validation Warnings:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1 font-mono text-[11px]">
              {validation.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Academy Curriculum Presets Bar */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
          Curriculum & Tactical Presets:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleApplyFen(p.fen)}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-800 hover:border-amber-500/50 transition flex items-center gap-1.5 shadow-sm"
            >
              <span>{p.icon}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Work Area Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Col 1: Piece Palette Dock */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-3">
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
              {selectedTool && selectedTool !== 'trash'
                ? `Active Stamp: ${PIECES.find((p) => p.id === selectedTool)?.symbol} ${
                    PIECES.find((p) => p.id === selectedTool)?.label
                  }`
                : selectedTool === 'trash'
                ? '🗑️ Trash — click square to remove piece'
                : 'Drag piece to board OR click icon to stamp'}
            </p>

            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-1.5">
              White Pieces
            </span>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {PIECES.filter((p) => p.color === 'w').map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedTool(selectedTool === p.id ? null : p.id)}
                  title={`Click to stamp ${p.label}`}
                  className={`h-10 rounded-xl flex items-center justify-center text-2xl border transition-all ${
                    selectedTool === p.id
                      ? 'bg-amber-500/20 border-amber-400 scale-110 shadow-gold'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-100'
                  }`}
                >
                  {p.symbol}
                </button>
              ))}
            </div>

            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
              Black Pieces
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {PIECES.filter((p) => p.color === 'b').map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedTool(selectedTool === p.id ? null : p.id)}
                  title={`Click to stamp ${p.label}`}
                  className={`h-10 rounded-xl flex items-center justify-center text-2xl border transition-all ${
                    selectedTool === p.id
                      ? 'bg-amber-500/20 border-amber-400 scale-110 shadow-gold'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {p.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedTool(selectedTool === 'trash' ? null : 'trash')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1 ${
                selectedTool === 'trash'
                  ? 'bg-rose-500/30 border-rose-500 text-rose-300'
                  : 'bg-slate-900 border-slate-800 hover:bg-rose-500/10 text-slate-400'
              }`}
            >
              🗑️ Trash Tool
            </button>
            {selectedTool && (
              <button
                type="button"
                onClick={() => setSelectedTool(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Col 2: Interactive Boards */}
        <div className={`flex flex-col items-center gap-3 ${viewMode === 'dual' ? 'lg:col-span-6' : 'lg:col-span-5'}`}>
          <div className="w-full flex items-center justify-between text-xs px-1">
            <span className="font-bold text-amber-300 text-xs">
              Side to Move: {turn === 'w' ? '♔ White to Move' : '♚ Black to Move'}
            </span>
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1"
            >
              🔄 Flip Perspective
            </button>
          </div>

          <div className={`w-full grid gap-4 ${viewMode === 'dual' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* White View Board */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block text-center">
                White Perspective
              </span>
              <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-slate-950">
                <Chessboard
                  key={`white-${boardKey}`}
                  id="board-editor-white"
                  position={position}
                  onPieceDrop={handlePieceDrop}
                  onSquareClick={handleSquareClick}
                  boardOrientation="white"
                  arePiecesDraggable={!selectedTool || selectedTool === 'trash'}
                  customBoardStyle={{ borderRadius: '16px' }}
                  customDarkSquareStyle={{ backgroundColor: '#334155' }}
                  customLightSquareStyle={{ backgroundColor: '#94A3B8' }}
                />
              </div>
            </div>

            {/* Black View Board (Dual Perspective) */}
            {viewMode === 'dual' && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                  Black Perspective
                </span>
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-slate-950">
                  <Chessboard
                    key={`black-${boardKey}`}
                    id="board-editor-black"
                    position={position}
                    onPieceDrop={handlePieceDrop}
                    onSquareClick={handleSquareClick}
                    boardOrientation="black"
                    arePiecesDraggable={!selectedTool || selectedTool === 'trash'}
                    customBoardStyle={{ borderRadius: '16px' }}
                    customDarkSquareStyle={{ backgroundColor: '#334155' }}
                    customLightSquareStyle={{ backgroundColor: '#94A3B8' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Position Rules + FEN Input & Actions */}
        <div
          className={`bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-4 ${
            viewMode === 'dual' ? 'lg:col-span-3' : 'lg:col-span-4'
          }`}
        >
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Position Rules & Controls</h4>

          {/* Turn */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Side to Move
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['w', 'b'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTurnToggle(t)}
                  className={`py-2 rounded-xl font-bold text-xs border transition ${
                    turn === t
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {t === 'w' ? '♔ White' : '♚ Black'}
                </button>
              ))}
            </div>
          </div>

          {/* Castling */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Castling Rights
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(['WK', 'WQ', 'BK', 'BQ'] as const).map((flag) => (
                <label
                  key={flag}
                  className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition"
                >
                  <input
                    type="checkbox"
                    checked={castling[flag]}
                    onChange={() => handleCastlingToggle(flag)}
                    className="rounded accent-amber-500"
                  />
                  <span className="text-[11px]">
                    {flag === 'WK'
                      ? 'White O-O'
                      : flag === 'WQ'
                      ? 'White O-O-O'
                      : flag === 'BK'
                      ? 'Black O-O'
                      : 'Black O-O-O'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* En Passant */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              En Passant Target Square
            </label>
            <select
              value={ep}
              onChange={(e) => {
                const nextEp = e.target.value;
                setEp(nextEp);
                emitFen(position, turn, castling, nextEp, halfMove, fullMove);
              }}
              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
            >
              <option value="-">None (-)</option>
              <option value="a3">a3</option>
              <option value="b3">b3</option>
              <option value="c3">c3</option>
              <option value="d3">d3</option>
              <option value="e3">e3</option>
              <option value="f3">f3</option>
              <option value="g3">g3</option>
              <option value="h3">h3</option>
              <option value="a6">a6</option>
              <option value="b6">b6</option>
              <option value="c6">c6</option>
              <option value="d6">d6</option>
              <option value="e6">e6</option>
              <option value="f6">f6</option>
              <option value="g6">g6</option>
              <option value="h6">h6</option>
            </select>
          </div>

          {/* FEN Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">FEN Notation</label>
              <button
                type="button"
                onClick={handleCopyFen}
                className="text-[10px] text-amber-400 hover:underline font-bold transition"
              >
                {copied ? '✅ Copied!' : '📋 Copy FEN'}
              </button>
            </div>
            <textarea
              rows={3}
              value={fenInputText}
              onChange={(e) => {
                setFenInputText(e.target.value);
                setFenInputError('');
              }}
              onBlur={(e) => {
                if (e.target.value.trim() !== currentFen) handleApplyFen(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyFen(fenInputText);
                }
              }}
              placeholder="Paste FEN here then press Enter or Apply…"
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-400 resize-none transition-colors"
            />
            {fenInputError && <p className="text-[10px] text-red-400 mt-1 font-semibold">⚠️ {fenInputError}</p>}
            <button
              type="button"
              onClick={() => handleApplyFen(fenInputText)}
              className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl transition border border-slate-700"
            >
              ✅ Apply FEN String
            </button>
          </div>

          {/* Primary Classroom & Curriculum Action Buttons */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            {onLoadIntoClassroom && (
              <button
                type="button"
                onClick={() => onLoadIntoClassroom(currentFen)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>📡</span>
                <span>Load Into Live Classroom Board</span>
              </button>
            )}

            {onSaveToCurriculum && (
              <button
                type="button"
                onClick={() => onSaveToCurriculum(currentFen)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>Save Position to Curriculum</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
