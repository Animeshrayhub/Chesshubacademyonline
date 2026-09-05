'use client';

import React, { useState } from 'react';

interface BlunderedPuzzle {
  id: string;
  title: string;
  theme: string;
  themeColor: string;
  accuracy: number;
  totalAttempts: number;
  failureCount: number;
  avgTimeSeconds: number;
  fen: string;
}

interface BatchHealthRow {
  id: string;
  batchName: string;
  coachName: string;
  studentCount: number;
  activeChapter: string;
  completionRate: number;
  passingRate: number;
  overdueCount: number;
}

const SAMPLE_BLUNDERED_PUZZLES: BlunderedPuzzle[] = [
  {
    id: 'pz-101',
    title: 'Discovered Knight Fork on f7',
    theme: 'Fork',
    themeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    accuracy: 34,
    totalAttempts: 128,
    failureCount: 84,
    avgTimeSeconds: 62,
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/2P2N2/PPP2PPP/R1BQK2R w KQkq - 0 6',
  },
  {
    id: 'pz-102',
    title: 'Back-Rank Queen Deflection',
    theme: 'Deflection',
    themeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    accuracy: 41,
    totalAttempts: 110,
    failureCount: 65,
    avgTimeSeconds: 58,
    fen: '3r2k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1',
  },
  {
    id: 'pz-103',
    title: 'Pin Against Uncastled King',
    theme: 'Pin',
    themeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    accuracy: 46,
    totalAttempts: 95,
    failureCount: 51,
    avgTimeSeconds: 49,
    fen: 'r1b1k2r/ppppqppp/2n5/4n3/1bP2B2/4PN2/PP1N1PPP/R2QKB1R w KQkq - 0 8',
  },
  {
    id: 'pz-104',
    title: 'Zwischenzug Pawn Sacrifice',
    theme: 'Zwischenzug',
    themeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    accuracy: 49,
    totalAttempts: 88,
    failureCount: 45,
    avgTimeSeconds: 74,
    fen: 'r4rk1/1pp2ppp/p1np1q2/4p3/B3P1b1/2PP1N2/PP3PPP/R2QR1K1 b - - 0 12',
  },
  {
    id: 'pz-105',
    title: 'Rook & Bishop Smothered Mate Threat',
    theme: 'Checkmate',
    themeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    accuracy: 52,
    totalAttempts: 142,
    failureCount: 68,
    avgTimeSeconds: 45,
    fen: 'r2q1rk1/ppp2ppp/3p1n2/4p3/2BnP3/3P1Q2/PPP2PPP/RNB1K2R w KQ - 0 9',
  },
];

const SAMPLE_BATCH_HEALTH: BatchHealthRow[] = [
  {
    id: 'b-1',
    batchName: 'Junior Champions (Batch A)',
    coachName: 'Pradipta Patnaik',
    studentCount: 6,
    activeChapter: 'Chapter 3: Tactical Pins & Forks',
    completionRate: 94,
    passingRate: 88,
    overdueCount: 0,
  },
  {
    id: 'b-2',
    batchName: 'Tactical Masters (Batch B)',
    coachName: 'Rajesh Sharma',
    studentCount: 5,
    activeChapter: 'Chapter 2: King & Pawn Endgames',
    completionRate: 72,
    passingRate: 64,
    overdueCount: 3,
  },
  {
    id: 'b-3',
    batchName: 'Elite Duo (Batch D1)',
    coachName: 'Pradipta Patnaik',
    studentCount: 2,
    activeChapter: 'Chapter 4: Advanced Deflection',
    completionRate: 100,
    passingRate: 95,
    overdueCount: 0,
  },
];

export default function CurriculumHealthMatrix() {
  const [remedialStatus, setRemedialStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  const [selectedTab, setSelectedTab] = useState<'puzzles' | 'batches' | 'openings'>('puzzles');
  const [drillSuccessNote, setDrillSuccessNote] = useState('');

  const handleGenerateRemedialDrill = () => {
    setRemedialStatus('generating');
    setTimeout(() => {
      setRemedialStatus('done');
      setDrillSuccessNote(
        '🎯 Remedial Drill generated! Bundled top 5 blundered tactics into "Weekly Remedial Review — Knight Forks & Deflection" and assigned to 8 students with accuracy < 70%.'
      );
      setTimeout(() => {
        setRemedialStatus('idle');
      }, 5000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with 1-Click Remedial Drill Generator */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🩺</span>
            <h2 className="text-lg font-bold text-white">Curriculum Health & Diagnostics Matrix</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
              Live Academy Analytics
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Detect common blunders across batches, monitor pass rates against the 70% threshold, and auto-dispatch targeted remedial puzzle drills.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateRemedialDrill}
          disabled={remedialStatus !== 'idle'}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
        >
          <span>{remedialStatus === 'generating' ? '⏳ Generating…' : '⚡ Auto-Generate Remedial Drill'}</span>
        </button>
      </div>

      {drillSuccessNote && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center justify-between animate-fadeIn">
          <span>{drillSuccessNote}</span>
          <button
            type="button"
            onClick={() => setDrillSuccessNote('')}
            className="text-emerald-400 hover:text-emerald-300 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Academy Completion Rate</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">84%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across all active batches</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase">70% Pass Threshold</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">79%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Students meeting passing grade</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Avg Puzzle Solving Time</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">54s</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Healthy calculation depth</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Top Blunder Motif</div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">Knight Forks</div>
          <div className="text-[10px] text-slate-500 mt-0.5">41% academy mistake rate</div>
        </div>
      </div>

      {/* Segment Selector */}
      <div className="flex border-b border-slate-800 gap-2 text-xs">
        <button
          onClick={() => setSelectedTab('puzzles')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            selectedTab === 'puzzles'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>⚠️ Most Blundered Puzzles ({SAMPLE_BLUNDERED_PUZZLES.length})</span>
        </button>
        <button
          onClick={() => setSelectedTab('batches')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            selectedTab === 'batches'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏫 Batch Mastery & Overdue Alerts ({SAMPLE_BATCH_HEALTH.length})</span>
        </button>
        <button
          onClick={() => setSelectedTab('openings')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            selectedTab === 'openings'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>♟️ Opening Deviation Tracker</span>
        </button>
      </div>

      {/* Tab 1: Most Blundered Puzzles Table */}
      {selectedTab === 'puzzles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Top 5 Tactical Mistake Positions</h3>
              <p className="text-[11px] text-slate-400">Positions with lowest student accuracy across homework workbooks</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Benchmark: ≥70%</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tactical Exercise</th>
                  <th className="py-3 px-4">Theme</th>
                  <th className="py-3 px-4">Academy Accuracy</th>
                  <th className="py-3 px-4">Failed Attempts</th>
                  <th className="py-3 px-4">Avg Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {SAMPLE_BLUNDERED_PUZZLES.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{p.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{p.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.themeColor}`}>
                        {p.theme}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.accuracy < 50 ? 'bg-rose-500' : 'bg-amber-500'}`}
                            style={{ width: `${p.accuracy}%` }}
                          />
                        </div>
                        <span className={`font-bold font-mono ${p.accuracy < 50 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {p.accuracy}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300 font-bold">{p.failureCount}</span>
                      <span className="text-slate-500"> / {p.totalAttempts} tries</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {p.avgTimeSeconds}s
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={handleGenerateRemedialDrill}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        + Add to Drill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Batch Mastery & Overdue Alerts */}
      {selectedTab === 'batches' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white">Batch Homework Health & Submissions</h3>
            <p className="text-[11px] text-slate-400">Batches falling below 70% passing threshold or with overdue submissions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Assigned Coach</th>
                  <th className="py-3 px-4">Active Homework</th>
                  <th className="py-3 px-4">Completion %</th>
                  <th className="py-3 px-4">Passing Rate (≥70%)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {SAMPLE_BATCH_HEALTH.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {b.batchName} ({b.studentCount} students)
                    </td>
                    <td className="py-3 px-4 text-slate-300">{b.coachName}</td>
                    <td className="py-3 px-4 text-slate-400">{b.activeChapter}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">{b.completionRate}%</td>
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold ${b.passingRate >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {b.passingRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {b.overdueCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                          ⚠️ {b.overdueCount} Overdue (48h+)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          ✅ On Track
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Opening Deviation Tracker */}
      {selectedTab === 'openings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Opening Repertoire Deviation Diagnostics</h3>
              <p className="text-[11px] text-slate-400">Most frequent move errors in coach-assigned repertoires</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30">
              Coach-Assigned View
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-blue-400 font-bold">C57</span>
                <span className="text-[10px] text-rose-400 font-bold">52% deviation</span>
              </div>
              <p className="text-xs font-bold text-white">Italian Game: Fried Liver Defense</p>
              <p className="text-[11px] text-slate-400">
                Students frequently play 5...Nxd5? instead of 5...Na5! against the Fried Liver Attack.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-blue-400 font-bold">B75</span>
                <span className="text-[10px] text-rose-400 font-bold">48% deviation</span>
              </div>
              <p className="text-xs font-bold text-white">Sicilian Dragon: Yugoslav Attack</p>
              <p className="text-[11px] text-slate-400">
                Premature castling on move 7 before executing ...d5 center break.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-blue-400 font-bold">D30</span>
                <span className="text-[10px] text-amber-400 font-bold">39% deviation</span>
              </div>
              <p className="text-xs font-bold text-white">Queen&apos;s Gambit Declined</p>
              <p className="text-[11px] text-slate-400">
                Inaccurate bishop placement on e7 without preparing ...c5 pawn break.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
