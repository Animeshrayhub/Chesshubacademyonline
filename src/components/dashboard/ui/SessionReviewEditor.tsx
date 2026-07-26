'use client';

import React, { useState, useTransition } from 'react';
import { saveSessionNotesAction } from '@/actions/classes';

interface SessionReviewEditorProps {
  classId: string;
  initialNotes: string;
}

export default function SessionReviewEditor({ classId, initialNotes }: SessionReviewEditorProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const MAX = 3000;

  const handleSave = () => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      const res = await saveSessionNotesAction(classId, notes);
      if (res?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        setError(res?.error?.message || 'Failed to save notes. Please try again.');
      }
    });
  };


  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Session Notes</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Write what was covered today — students will see this when they view the session review.
          </p>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {notes.length}/{MAX}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={notes}
        onChange={(e) => {
          if (e.target.value.length <= MAX) setNotes(e.target.value);
        }}
        placeholder={`Examples:\n• Covered the Italian Opening and Giuoco Piano variation\n• Practiced fork and pin tactics (15 puzzles)\n• Homework: Complete Chapter 3, puzzles 1–10\n• Great improvement in endgame technique!`}
        rows={12}
        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all leading-relaxed font-mono"
      />

      {/* Actions row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          {error && (
            <p className="text-xs text-red-400 font-semibold">{error}</p>
          )}
          {saved && (
            <div className="inline-flex items-center gap-1.5 text-xs text-green-400 font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Notes saved successfully!
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || notes.trim().length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-surface-dark font-bold text-sm rounded-xl transition-all"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save Notes
            </>
          )}
        </button>
      </div>

      {/* Formatting tips */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
        <strong className="text-slate-400">Tips:</strong> Use bullet points (•) for structure. Include topics covered, tactics practiced, homework assigned, and any personal feedback for the student.
      </div>
    </div>
  );
}
