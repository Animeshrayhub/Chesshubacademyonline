'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { DbOpening, MoveResult, DbOpeningPosition } from '@/types/opening-teacher';

const OpeningLessonBoard = dynamic(() => import('@/features/openings/lesson/OpeningLessonBoard'), {
  ssr: false,
});

interface RepertoireClientProps {
  allOpenings: any[];
}

export default function RepertoireClient({ allOpenings }: RepertoireClientProps) {
  const [whiteRep, setWhiteRep] = useState<any[]>([]);
  const [blackRep, setBlackRep] = useState<any[]>([]);
  const [coverageScore, setCoverageScore] = useState(0);
  const [coverageDetails, setCoverageDetails] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Drill Mode State
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillResult, setDrillResult] = useState<MoveResult | null>(null);

  useEffect(() => {
    fetchRepertoire();
  }, []);

  const fetchRepertoire = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/opening/repertoire');
      const data = await res.json();

      if (data.whiteRepertoire) setWhiteRep(data.whiteRepertoire);
      if (data.blackRepertoire) setBlackRep(data.blackRepertoire);
      if (data.coverageScore !== undefined) setCoverageScore(data.coverageScore);
      if (data.coverageDetails) setCoverageDetails(data.coverageDetails);
    } catch (err) {
      console.error('[Fetch Repertoire]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const combinedRepertoire = [...whiteRep, ...blackRep];

  // Convert repertoire openings into drill positions
  const drillPositions: DbOpeningPosition[] = combinedRepertoire.map((op: any, idx) => ({
    id: `drill-${op.eco_code}`,
    chapter_id: 'drill',
    opening_id: op.id || op.eco_code,
    title: `${op.name} Memory Drill`,
    fen: op.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    board_orientation: op.color === 'black' ? ('black' as const) : ('white' as const),
    explanation: `You selected ${op.name} for your repertoire. Play the key move line: ${op.opening_moves}`,
    explanation_hindi: `आपने अपनी शब्दावली के लिए ${op.name_hindi || op.name} को चुना।`,
    recommended_moves: [op.opening_moves.split(' ')[0] || 'e4'],
    alternative_moves: [],
    wrong_moves: [],
    question: `Play the opening move for ${op.name}!`,
    question_hindi: `${op.name_hindi || op.name} के लिए पहला कदम खेलें!`,
    hints: [`The opening moves start with ${op.opening_moves}`],
    hints_hindi: [`ओपनिंग चाल ${op.opening_moves} से शुरू होती है`],
    tactical_theme: null,
    common_mistake_move: null,
    common_mistake_explanation: null,
    stockfish_eval: '+0.3',
    order_num: idx + 1,
    difficulty: op.difficulty,
    is_interactive: true,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const currentDrillOp = combinedRepertoire[drillIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/student/openings"
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Library
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📖</span> Personal Opening Repertoire Builder
            </h1>
          </div>

          {combinedRepertoire.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsDrillActive(!isDrillActive);
                setDrillIndex(0);
                setDrillResult(null);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              {isDrillActive ? 'Close Memory Drill' : '🧠 Launch Spaced Repetition Drill'}
            </button>
          )}
        </div>

        {/* Repertoire Coverage Summary Card */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Repertoire Completeness</span>
              <h2 className="text-2xl font-bold text-white mt-0.5">Coverage Score: {coverageScore}%</h2>
            </div>

            <div className="w-full sm:w-48 h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${coverageScore}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className={`p-3 rounded-xl border ${coverageDetails.hasWhiteE4 ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="font-bold">⬜ 1.e4 (White)</div>
              <div>{coverageDetails.hasWhiteE4 ? '✓ Covered' : 'Missing'}</div>
            </div>
            <div className={`p-3 rounded-xl border ${coverageDetails.hasWhiteD4 ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="font-bold">⬜ 1.d4 (White)</div>
              <div>{coverageDetails.hasWhiteD4 ? '✓ Covered' : 'Missing'}</div>
            </div>
            <div className={`p-3 rounded-xl border ${coverageDetails.hasBlackVsE4 ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="font-bold">⬛ vs 1.e4 (Black)</div>
              <div>{coverageDetails.hasBlackVsE4 ? '✓ Covered' : 'Missing'}</div>
            </div>
            <div className={`p-3 rounded-xl border ${coverageDetails.hasBlackVsD4 ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="font-bold">⬛ vs 1.d4 (Black)</div>
              <div>{coverageDetails.hasBlackVsD4 ? '✓ Covered' : 'Missing'}</div>
            </div>
          </div>
        </div>

        {/* Spaced Repetition Drill Mode */}
        {isDrillActive && drillPositions.length > 0 && (
          <div className="bg-slate-900/90 border border-emerald-700/50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div>
              <OpeningLessonBoard
                openingId={currentDrillOp?.id || ''}
                chapterNum={1}
                positions={drillPositions}
                currentPositionIndex={drillIndex}
                onMoveResult={(res) => setDrillResult(res)}
                language="en"
              />
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <span className="text-xs font-semibold text-emerald-400">MEMORY DRILL ({drillIndex + 1}/{drillPositions.length})</span>
                <h3 className="text-lg font-bold text-white mt-1">{currentDrillOp?.name}</h3>
                <p className="text-xs text-slate-400 mt-1">Play the opening move for your saved repertoire choice!</p>
              </div>

              {drillResult && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${drillResult.isCorrect ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-red-950 text-red-300 border-red-800'}`}>
                  {drillResult.isCorrect ? '🌟 Perfect! Memory test passed!' : '❌ Incorrect move for this repertoire.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Repertoire Catalogue List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* White Repertoire */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span>⬜</span> White Repertoire ({whiteRep.length})
            </h3>
            {whiteRep.map(op => (
              <div key={op.eco_code} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-mono text-blue-400">{op.eco_code}</div>
                  <div className="font-bold text-white text-sm">{op.name}</div>
                  <div className="text-xs font-mono text-slate-400">{op.opening_moves}</div>
                </div>
                <Link href={`/dashboard/student/openings/${op.id || op.eco_code}`} className="text-xs text-blue-400 hover:text-blue-300">
                  Study →
                </Link>
              </div>
            ))}
          </div>

          {/* Black Repertoire */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span>⬛</span> Black Repertoire ({blackRep.length})
            </h3>
            {blackRep.map(op => (
              <div key={op.eco_code} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-mono text-blue-400">{op.eco_code}</div>
                  <div className="font-bold text-white text-sm">{op.name}</div>
                  <div className="text-xs font-mono text-slate-400">{op.opening_moves}</div>
                </div>
                <Link href={`/dashboard/student/openings/${op.id || op.eco_code}`} className="text-xs text-blue-400 hover:text-blue-300">
                  Study →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
