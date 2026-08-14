'use client';

import React, { useState } from 'react';
import type { IngestionResult } from '@/lib/openings/lichess-processor';

const VOLUMES = [
  { letter: 'A', name: 'Volume A: Flank Openings (1.c4, 1.Nf3, 1.f4, English, Bird)', desc: 'Flank pawn & knight openings' },
  { letter: 'B', name: 'Volume B: Semi-Open Games (Sicilian, Caro-Kann, Pirc, Scandinavian)', desc: 'Black responds with 1...c5, 1...c6, 1...d6' },
  { letter: 'C', name: 'Volume C: Open Games & French/Ruy Lopez (1.e4 e5, Italian, French)', desc: 'Classic 1.e4 e5 and French defense' },
  { letter: 'D', name: 'Volume D: Closed Games & Grünfeld (1.d4 d5, Queen\'s Gambit, Slav)', desc: 'Closed 1.d4 d5 systems & Grünfeld' },
  { letter: 'E', name: 'Volume E: Indian Defenses (Nimzo-Indian, King\'s Indian, Catalan)', desc: '1.d4 Nf6 hypermodern defenses' },
];

export default function IngestOpeningsClient() {
  const [selectedVolume, setSelectedVolume] = useState('C');
  const [batchLimit, setBatchLimit] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<IngestionResult | null>(null);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleRunIngestion = async () => {
    setIsProcessing(true);
    setError(null);
    setLastResult(null);
    addLog(`Initiating Lichess Database Ingestion for Volume ${selectedVolume} (Limit: ${batchLimit})...`);

    try {
      const res = await fetch('/api/admin/openings/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: selectedVolume, limit: batchLimit }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Ingestion failed');
        addLog(`❌ Ingestion Error: ${json.error}`);
      } else {
        setLastResult(json.data);
        setTotalAvailable(json.totalVolumeOpeningsAvailable);
        addLog(`✅ Successfully ingested ${json.data.openingsProcessed} openings, ${json.data.chaptersCreated} chapters, and ${json.data.positionsCreated} interactive positions!`);
        if (json.data.errors && json.data.errors.length > 0) {
          json.data.errors.forEach((e: string) => addLog(`⚠️ Warning: ${e}`));
        }
      }
    } catch (err: any) {
      setError('Connection failed');
      addLog(`❌ Ingestion Error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400">
              📥
            </div>
            <h1 className="text-2xl font-bold text-white">Lichess Opening Database Processor</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Ingest 3,000+ master chess openings from official Lichess open-source TSV repository (`github.com/lichess-org/chess-openings`).
          </p>
        </div>

        {/* Volume Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {VOLUMES.map(vol => (
            <div
              key={vol.letter}
              onClick={() => setSelectedVolume(vol.letter)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedVolume === vol.letter
                  ? 'bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-base">Volume {vol.letter}</span>
                {selectedVolume === vol.letter && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium mb-1">{vol.name}</p>
              <p className="text-[11px] text-slate-500">{vol.desc}</p>
            </div>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 font-medium">Openings Batch Size:</label>
            <select
              value={batchLimit}
              onChange={e => setBatchLimit(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value={10}>10 Openings</option>
              <option value={25}>25 Openings</option>
              <option value={50}>50 Openings</option>
              <option value={100}>100 Openings</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleRunIngestion}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <span>🚀</span>
            <span>{isProcessing ? 'Processing Lichess TSV...' : `Ingest Volume ${selectedVolume} Now`}</span>
          </button>
        </div>

        {/* Results Banner */}
        {lastResult && (
          <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 text-sm">
                ✅ Ingestion Summary for Volume {lastResult.volume}
              </span>
              {totalAvailable && (
                <span className="text-slate-400 font-mono">
                  {totalAvailable} total ECO entries available in TSV
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-emerald-900">
                <div className="text-xl font-bold text-white">{lastResult.openingsProcessed}</div>
                <div className="text-[11px] text-slate-400">Openings Created/Updated</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-emerald-900">
                <div className="text-xl font-bold text-white">{lastResult.chaptersCreated}</div>
                <div className="text-[11px] text-slate-400">8-Chapter Curricula</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-emerald-900">
                <div className="text-xl font-bold text-white">{lastResult.positionsCreated}</div>
                <div className="text-[11px] text-slate-400">Interactive Positions</div>
              </div>
            </div>
          </div>
        )}

        {/* Live Logs Console */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono text-slate-400">Live Ingestion Console Logs</span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-[11px] text-slate-500 hover:text-white"
            >
              Clear Logs
            </button>
          </div>

          <div className="h-40 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">No logs yet. Select a volume and click Ingest to start.</div>
            ) : (
              logs.map((log, idx) => <div key={idx}>{log}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
