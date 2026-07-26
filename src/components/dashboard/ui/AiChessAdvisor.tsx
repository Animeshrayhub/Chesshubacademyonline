'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface WeaknessItem {
  id: string;
  topic: string;
  accuracy: number;
  status: 'Critical' | 'Needs Improvement' | 'Mastered';
  recommendedChapter: string;
}

interface AiChessAdvisorProps {
  studentName?: string;
  currentElo?: number;
  onAssignRecommendation?: (chapterName: string) => void;
}

export default function AiChessAdvisor({
  studentName = 'Aarav Sharma',
  currentElo = 1420,
  onAssignRecommendation,
}: AiChessAdvisorProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(true);

  const weaknesses: WeaknessItem[] = [
    {
      id: 'w1',
      topic: 'Knight Fork Tactics',
      accuracy: 62,
      status: 'Critical',
      recommendedChapter: 'Intermediate Chapter 4: Royal Knight Forks',
    },
    {
      id: 'w2',
      topic: 'Back-Rank Defense & Escape Squares',
      accuracy: 58,
      status: 'Critical',
      recommendedChapter: 'Polgar Chapter 12: Back-Rank Mates & Luft',
    },
    {
      id: 'w3',
      topic: 'Pin & Skewer Counterplay',
      accuracy: 74,
      status: 'Needs Improvement',
      recommendedChapter: 'Tactics Vol. 2: Breaking Absolute Pins',
    },
  ];

  const handleRunAiDiagnostic = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setReportGenerated(true);
    }, 1200);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-white relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
            🤖
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-lg text-amber-400">
              AI Personal Chess Advisor
            </h3>
            <p className="text-xs text-slate-400">
              Weakness Diagnostic & Personal Growth Recommendations for {studentName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunAiDiagnostic}
          disabled={analyzing}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
        >
          {analyzing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              <span>Analyzing Games & Tactics...</span>
            </>
          ) : (
            <>
              <span>⚡ Run AI Diagnostic Scan</span>
            </>
          )}
        </button>
      </div>

      {reportGenerated && (
        <div className="space-y-6 relative z-10">
          {/* Estimated Elo & Progress Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-slate-400">
                Estimated FIDE Elo
              </span>
              <p className="text-2xl font-black font-mono text-amber-400">{currentElo} Elo</p>
              <span className="text-[10px] text-emerald-400 font-bold">↑ +45 Elo this month</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-slate-400">
                Tactics Solving Accuracy
              </span>
              <p className="text-2xl font-black font-mono text-purple-400">78.4%</p>
              <span className="text-[10px] text-purple-300 font-bold">142 Puzzles Solved</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-slate-400">
                Primary Strength
              </span>
              <p className="text-sm font-bold text-emerald-400">Queen Mates & Pins (94%)</p>
              <span className="text-[10px] text-slate-400">Mastery Level: Advanced</span>
            </div>
          </div>

          {/* Weakness Diagnostic Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              🎯 AI Detected Tactical Weaknesses
            </h4>

            <div className="space-y-3">
              {weaknesses.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 hover:border-amber-500/40 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.topic}</span>
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          item.status === 'Critical'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Student Accuracy: <span className="font-bold text-amber-400">{item.accuracy}%</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAssignRecommendation && onAssignRecommendation(item.recommendedChapter)}
                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span>⚡ Assign Practice Homework</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
