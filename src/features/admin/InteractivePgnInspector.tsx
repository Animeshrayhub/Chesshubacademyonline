'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { parsePgnToStudyTree, getMainlineMoves, type PgnStudyTree, type PgnMoveNode } from '@/lib/puzzles/pgnTreeEngine';
import { bulkImportPuzzlesAction, clearAllPuzzlesAction } from '@/actions/puzzles';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const MiniBoard = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

interface InteractivePgnInspectorProps {
  onSuccess: () => void;
}

export default function InteractivePgnInspector({ onSuccess }: InteractivePgnInspectorProps) {
  const [pgnText, setPgnText] = useState('');
  const [parsedStudies, setParsedStudies] = useState<PgnStudyTree[]>([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleParseText = (text: string) => {
    setPgnText(text);
    setErrorMsg('');
    setStatusMsg('');

    if (!text.trim()) {
      setParsedStudies([]);
      return;
    }

    try {
      // Split PGN by Event headers or double newlines before [Event
      const rawBlocks = text.split(/(?=\[\s*Event\s+)/i).filter((b) => b.trim().length > 0);
      const blocksToProcess = rawBlocks.length > 0 ? rawBlocks : [text];

      const studies: PgnStudyTree[] = blocksToProcess.map((b) => parsePgnToStudyTree(b));
      setParsedStudies(studies);
      setActivePreviewIdx(0);
    } catch (err: any) {
      setErrorMsg('Failed to parse PGN study. Check formatting.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleParseText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAllStudies = async () => {
    if (parsedStudies.length === 0) return;

    setSaving(true);
    setErrorMsg('');
    setStatusMsg('');

    const formattedPuzzles = parsedStudies.map((study, idx) => {
      const mainMoves = getMainlineMoves(study.rootNodes);
      return {
        title: study.title || `PGN Study #${idx + 1}`,
        fen: study.startingFen,
        solution: mainMoves,
        theme: 'pgnStudy tactics',
        difficulty: 'intermediate' as const,
        rating: 1500,
        track: 'beginner',
        chapterId: 'PGN Studies',
        hint1: study.rootNodes.length > 1 ? `${study.rootNodes.length} variations parsed` : undefined,
        explanation: study.rawPgn,
        source: 'pgn_import',
      };
    });

    const res = await bulkImportPuzzlesAction(formattedPuzzles);
    setSaving(false);

    if (res.success) {
      setStatusMsg(`✅ Successfully imported ${res.insertedCount} multi-variation studies into Central Puzzle Bank!`);
      setPgnText('');
      setParsedStudies([]);
      onSuccess();
    } else {
      setErrorMsg(res.error || 'Failed to save PGN studies.');
    }
  };

  const handleClearFakePuzzles = async () => {
    if (confirm('Are you sure you want to clear all fake puzzles from the Central Puzzle Bank?')) {
      await clearAllPuzzlesAction();
      setParsedStudies([]);
      onSuccess();
    }
  };

  const selectedStudy = parsedStudies[activePreviewIdx];

  // Helper to render move node tree recursively
  const renderMoveNodeTree = (nodes: PgnMoveNode[], depth = 0) => {
    if (!nodes || nodes.length === 0) return null;

    return (
      <div className="space-y-1 pl-2">
        {nodes.map((node) => (
          <div key={node.id} className="text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${node.isMainline ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                {node.moveNumber}.{node.turn === 'b' ? '..' : ''} {node.san}
              </span>
              {node.comment && <span className="text-slate-400 italic text-[11px]">&quot;{node.comment}&quot;</span>}
            </div>

            {node.children && node.children.length > 0 && (
              <div className="pl-3 border-l border-slate-800 mt-1">
                {renderMoveNodeTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
        <div>
          <h3 className="font-heading font-extrabold text-lg text-amber-400">
            Interactive PGN Study Inspector
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Paste raw PGN text with sub-variations in parentheses <code>(4... e5 5. Rxe5...)</code> or upload a file.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5">
            <span>📂</span>
            <span>Upload .PGN File</span>
            <input type="file" accept=".pgn,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleClearFakePuzzles}
            className="px-3.5 py-2 bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>🧹</span>
            <span>Clear All Fake Puzzles</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold shadow-md">
          {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/80 border border-red-500/40 text-red-300 rounded-2xl text-xs font-bold shadow-md">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Grid: Text Editor + Live Tree Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: PGN Text Input */}
        <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Paste PGN Study Movetext</span>
            <span className="text-[10px] font-mono text-amber-400">
              {parsedStudies.length} Study/Studies Detected
            </span>
          </div>

          <textarea
            value={pgnText}
            onChange={(e) => handleParseText(e.target.value)}
            rows={14}
            placeholder={`[Event "Rook Pawn Sweeper"]
[Date "2026.08.08"]
[FEN "8/4p3/8/8/pP2R1p1/8/4P3/8 b - - 0 4"]

4... a3 (4... e5 5. Rxe5 g3 6. Re3 a3 7. Rxg3 a2 8. Ra3 a1=Q 9. Ra2 9... Qb2 10. b5 Qxe2 11. Ra1 Qxb5 12. Rb1 Qb8 13. Rxb8) (4... g3) 5. Rxe7 *`}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-400 leading-relaxed shadow-inner"
          />

          <button
            type="button"
            onClick={handleSaveAllStudies}
            disabled={saving || parsedStudies.length === 0}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-2xl text-xs shadow-gold transition-all flex items-center justify-center gap-2"
          >
            {saving ? '⌛ Saving Studies...' : `⚡ Save ${parsedStudies.length} PGN Studies to Central Bank & Curriculum`}
          </button>
        </div>

        {/* Right Column: Live Board & Tree Inspector */}
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white min-h-[450px]">
          {selectedStudy ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-heading font-extrabold text-base text-white">{selectedStudy.title}</h4>
                  <span className="text-[11px] font-mono text-amber-400">
                    Orientation: {selectedStudy.orientation.toUpperCase()} &bull; Starting FEN Parsed
                  </span>
                </div>

                {parsedStudies.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActivePreviewIdx((prev) => Math.max(0, prev - 1))}
                      disabled={activePreviewIdx === 0}
                      className="px-2 py-1 bg-slate-800 disabled:opacity-30 rounded-lg text-xs"
                    >
                      ◀
                    </button>
                    <span className="text-xs font-mono px-2">
                      {activePreviewIdx + 1}/{parsedStudies.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePreviewIdx((prev) => Math.min(parsedStudies.length - 1, prev + 1))}
                      disabled={activePreviewIdx === parsedStudies.length - 1}
                      className="px-2 py-1 bg-slate-800 disabled:opacity-30 rounded-lg text-xs"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-[220px] h-[220px] shrink-0">
                  <MiniBoard
                    position={selectedStudy.startingFen.trim().split(' ')[0]}
                    boardOrientation={selectedStudy.orientation}
                    arePiecesDraggable={false}
                  />
                </div>

                <div className="flex-1 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Parsed Move Tree & Variation Branches
                  </h5>
                  {renderMoveNodeTree(selectedStudy.rootNodes)}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-amber-300 select-all overflow-x-auto">
                FEN: {selectedStudy.startingFen}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-3">
              <span className="text-4xl">♟️</span>
              <p className="text-xs font-semibold">
                Paste PGN text or upload a study file on the left to inspect multi-variation boards and save them.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
