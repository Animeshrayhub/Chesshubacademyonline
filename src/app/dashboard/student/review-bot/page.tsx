'use client';

import React, { useState } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { requestGameReviewAction } from '@/actions/gameReview';
import type { AiGameReviewResult } from '@/lib/gameReview/aiGameReviewService';
import AiGameReviewCard from '@/features/student/AiGameReviewCard';

const SAMPLE_PGN_1 = `[Event "Scholar's Mate Demo"]
[Site "ChessHub Academy"]
[Date "2026.07.28"]
[White "Student Alex"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

const SAMPLE_PGN_2 = `[Event "Italian Game Tactics"]
[Site "ChessHub Academy"]
[Date "2026.07.28"]
[White "Student Mia"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O 12. Rfe1 c6 13. a4 1-0`;

export default function StudentAiReviewBotPage() {
  const [pgnText, setPgnText] = useState(SAMPLE_PGN_1);
  const [userColor, setUserColor] = useState<'white' | 'black'>('white');
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewResult, setReviewResult] = useState<AiGameReviewResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pgnText.trim()) {
      setErrorMsg('Please paste a PGN game text to analyze.');
      return;
    }

    setErrorMsg('');
    setAnalyzing(true);
    setReviewResult(null);

    const result = await requestGameReviewAction(pgnText, userColor);
    setAnalyzing(false);

    if (result.success) {
      setReviewResult(result);
    } else {
      setErrorMsg(result.error || 'Failed to analyze chess game.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Grandmaster Game Review Bot"
        subtitle="Paste your game PGN or select a sample game. AI will analyze your moves and generate plain-English Grandmaster feedback, accuracy score, and tactical lessons."
      />

      {/* Input Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
            <span>♟️ Game PGN Input</span>
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Your Color:</span>
            <button
              type="button"
              onClick={() => setUserColor('white')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                userColor === 'white'
                  ? 'bg-amber-500 text-slate-950 shadow-gold'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              ⚪ White
            </button>
            <button
              type="button"
              onClick={() => setUserColor('black')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                userColor === 'black'
                  ? 'bg-amber-500 text-slate-950 shadow-gold'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              ⬛ Black
            </button>
          </div>
        </div>

        {/* Sample Loaders */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold">Load Sample:</span>
          <button
            type="button"
            onClick={() => setPgnText(SAMPLE_PGN_1)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-semibold transition-colors"
          >
            📋 Sample 1 (Scholar&apos;s Mate)
          </button>
          <button
            type="button"
            onClick={() => setPgnText(SAMPLE_PGN_2)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-semibold transition-colors"
          >
            📋 Sample 2 (Italian Game)
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <textarea
            rows={5}
            value={pgnText}
            onChange={(e) => setPgnText(e.target.value)}
            placeholder="Paste your PGN game text here..."
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white resize-none focus:outline-none focus:border-amber-400"
          />

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={analyzing || !pgnText.trim()}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>AI Grandmaster Analyzing Game...</span>
                </>
              ) : (
                <>
                  <span>🤖 Run AI Game Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Review Results */}
      {reviewResult && <AiGameReviewCard review={reviewResult} />}
    </div>
  );
}
