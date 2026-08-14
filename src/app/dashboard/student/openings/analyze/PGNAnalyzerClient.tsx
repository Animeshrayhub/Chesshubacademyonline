'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

interface AnalysisResult {
  matchedOpening: {
    eco_code: string;
    name: string;
    name_hindi?: string;
    difficulty: string;
    style: string;
  };
  totalMoves: number;
  openingAccuracy: number;
  deviationPly: number | null;
  deviationMoveNum: number | null;
  moveReports: Array<{
    moveNum: number;
    color: 'w' | 'b';
    san: string;
    fen: string;
    isBookMove: boolean;
    explanation: string;
  }>;
}

export default function PGNAnalyzerClient() {
  const [pgnInput, setPgnInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlyIndex, setCurrentPlyIndex] = useState(0);

  const [lichessUsername, setLichessUsername] = useState('');
  const [isFetchingLichess, setIsFetchingLichess] = useState(false);
  const [lichessGames, setLichessGames] = useState<any[]>([]);

  const handleFetchLichess = async () => {
    if (!lichessUsername.trim()) return;
    setIsFetchingLichess(true);
    setError(null);

    try {
      const res = await fetch('/api/opening/fetch-lichess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: lichessUsername.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch Lichess games');
      } else {
        setLichessGames(data.games || []);
      }
    } catch (err) {
      setError('Failed to connect to Lichess API.');
    } finally {
      setIsFetchingLichess(false);
    }
  };

  const samplePGNs = [
    {
      name: "Scholar's Mate (1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#)",
      pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#',
    },
    {
      name: "Fool's Mate (1.f3 e5 2.g4 Qh4#)",
      pgn: '1. f3 e5 2. g4 Qh4#',
    },
    {
      name: 'Italian Game (Main Line)',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+',
    },
  ];

  const handleAnalyze = async () => {
    if (!pgnInput.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/opening/analyze-pgn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: pgnInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to analyze PGN');
      } else {
        setResult(data);
        setCurrentPlyIndex(0);
      }
    } catch (err) {
      setError('An error occurred while analyzing the PGN.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentMoveReport = result?.moveReports[currentPlyIndex];
  const currentFen = currentMoveReport?.fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/student/openings"
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Library
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🔍</span> PGN Opening Theory Analyzer
            </h1>
          </div>
        </div>

        {/* Lichess Direct Sync Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <span>⚔️</span>
            <span>Import Recent Lichess Games</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Lichess Username (e.g. MagnusCarlsen)"
              value={lichessUsername}
              onChange={e => setLichessUsername(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleFetchLichess}
              disabled={!lichessUsername.trim() || isFetchingLichess}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium text-xs rounded-xl border border-slate-700 transition-colors"
            >
              {isFetchingLichess ? 'Fetching...' : 'Fetch Games 🔄'}
            </button>
          </div>

          {lichessGames.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pt-2">
              {lichessGames.map((g, idx) => (
                <button
                  key={g.id || idx}
                  type="button"
                  onClick={() => {
                    setPgnInput(g.pgn);
                    setError(null);
                  }}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex-shrink-0 transition-colors"
                >
                  <div className="text-xs font-bold text-white">Game #{idx + 1} ({g.speed})</div>
                  <div className="text-[11px] text-blue-300 font-mono">{g.opening?.name || 'Opening Game'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PGN Input Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white">Paste PGN Game Notation</label>
            <div className="flex gap-2">
              {samplePGNs.map(sample => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => {
                    setPgnInput(sample.pgn);
                    setError(null);
                  }}
                  className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                >
                  {sample.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={4}
            value={pgnInput}
            onChange={e => setPgnInput(e.target.value)}
            placeholder="Paste your PGN here (e.g. 1.e4 e5 2.Nf3 Nc6 3.Bc4...)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
          />

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/40 rounded-xl text-xs text-red-300">
              ⚠️ {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!pgnInput.trim() || isAnalyzing}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            {isAnalyzing ? 'Analyzing Opening...' : 'Analyze Opening Theory 🚀'}
          </button>
        </div>

        {/* Analysis Results View */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* Left: Replay Board */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="aspect-square max-w-md mx-auto">
                <ChessboardComponent id="pgn-analyzer-board" position={currentFen} />
              </div>

              {/* Step Navigation */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentPlyIndex(0)}
                  disabled={currentPlyIndex === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-white"
                >
                  ⏮ Start
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPlyIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentPlyIndex === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-white"
                >
                  ◀ Prev
                </button>

                <span className="text-xs text-slate-400 font-mono">
                  Move {currentPlyIndex + 1} / {result.moveReports.length}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPlyIndex(prev => Math.min(result.moveReports.length - 1, prev + 1))}
                  disabled={currentPlyIndex >= result.moveReports.length - 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-white"
                >
                  Next ▶
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPlyIndex(result.moveReports.length - 1)}
                  disabled={currentPlyIndex >= result.moveReports.length - 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-white"
                >
                  End ⏭
                </button>
              </div>
            </div>

            {/* Right: Theory Report */}
            <div className="space-y-4">
              {/* Matched Opening Summary Card */}
              <div className="bg-gradient-to-br from-blue-900/60 to-slate-900 border border-blue-700/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-blue-300">ECO {result.matchedOpening.eco_code}</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    {result.openingAccuracy}% Theory Match
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-white">{result.matchedOpening.name}</h2>

                <div className="flex items-center gap-4 text-xs text-slate-300">
                  <span>Track: <strong>{result.matchedOpening.difficulty}</strong></span>
                  <span>Style: <strong>{result.matchedOpening.style}</strong></span>
                </div>

                {result.deviationMoveNum && (
                  <div className="p-3 bg-amber-950/60 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                    ⚠️ Theory deviation occurred at <strong>Move {result.deviationMoveNum}</strong>.
                  </div>
                )}
              </div>

              {/* Move Explorer */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-white">Opening Move Breakdown</h3>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {result.moveReports.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentPlyIndex(idx)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        currentPlyIndex === idx
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">
                          {m.color === 'w' ? `${m.moveNum}.` : `${m.moveNum}...`}
                        </span>
                        <span className="font-bold">{m.san}</span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        m.isBookMove
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                      }`}>
                        {m.isBookMove ? '📖 Book' : '⚠️ Out of Book'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
