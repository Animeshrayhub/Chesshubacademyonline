'use client';

import React, { useState } from 'react';
import type { TemplateAssignmentStatus } from '@/lib/homework';
import { submitTemplateHomeworkAction } from '@/actions/homework';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import Modal from '@/components/ui/Modal';

interface Assignment {
  id: string;
  template_id: string;
  status: TemplateAssignmentStatus;
  coach_notes: string | null;
  due_at: string | null;
  assigned_at: string;
  template: {
    id: string;
    title: string;
    level: string;
    difficulty: string;
    estimated_time: number;
    status: string;
    thumbnail_url: string | null;
  } | null;
  latestSubmission: {
    id: string;
    answers: string | null;
    grade_score: number | null;
    coach_feedback: string | null;
    submitted_at: string;
    reviewed_at: string | null;
  } | null;
}

interface StudentAssignmentsViewProps {
  assignments: Assignment[];
}

const STATUS_STYLE: Record<TemplateAssignmentStatus, string> = {
  assigned:   'bg-blue-50 text-blue-700 border border-blue-100',
  in_progress:'bg-amber-50 text-amber-700 border border-amber-100',
  submitted:  'bg-purple-50 text-purple-700 border border-purple-100',
  reviewed:   'bg-sky-50 text-sky-700 border border-sky-100',
  approved:   'bg-emerald-50 text-emerald-700 border border-emerald-100',
  reassigned: 'bg-orange-50 text-orange-700 border border-orange-100',
  archived:   'bg-slate-100 text-slate-500 border border-slate-200',
};

const STATUS_LABEL: Record<TemplateAssignmentStatus, string> = {
  assigned:   'Assigned',
  in_progress:'In Progress',
  submitted:  'Submitted',
  reviewed:   'Reviewed',
  approved:   '✅ Approved',
  reassigned: '↩ Redo Required',
  archived:   'Archived',
};

export default function StudentAssignmentsView({ assignments }: StudentAssignmentsViewProps) {
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [unlockedHintTier, setUnlockedHintTier] = useState<number>(0);
  const [currentScorePenalty, setCurrentScorePenalty] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const pending  = assignments.filter(a => ['assigned', 'in_progress', 'reassigned'].includes(a.status));
  const submitted= assignments.filter(a => ['submitted', 'reviewed'].includes(a.status));
  const completed= assignments.filter(a => ['approved', 'archived'].includes(a.status));

  const handleSubmit = async () => {
    if (!submitTarget) return;
    if (!answerText.trim()) { setSubmitError('Please write your answer or notes before submitting.'); return; }
    setSubmitting(true);
    const res = await submitTemplateHomeworkAction(submitTarget.id, answerText);
    setSubmitting(false);
    if (!res.success) { setSubmitError(res.error?.message ?? 'Submission failed.'); return; }
    setSubmitSuccess('Submitted successfully! Your coach will review it soon.');
    setTimeout(() => { setSubmitTarget(null); setSubmitSuccess(''); setAnswerText(''); }, 2000);
  };

  const renderCard = (a: Assignment) => (
    <div key={a.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2">{a.template?.title ?? 'Untitled'}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {a.template?.level && (
          <span className="text-xs bg-surface-light text-text-secondary px-2 py-0.5 rounded-full">{a.template.level}</span>
        )}
        {a.template?.difficulty && (
          <span className="text-xs text-text-secondary capitalize">{a.template.difficulty}</span>
        )}
        {a.template?.estimated_time && (
          <span className="text-xs text-text-secondary">⏱ {a.template.estimated_time}m</span>
        )}
      </div>

      {a.coach_notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs font-medium text-amber-800 mb-0.5">Coach Notes</p>
          <p className="text-xs text-amber-700">{a.coach_notes}</p>
        </div>
      )}

      {a.latestSubmission?.grade_score != null && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs font-medium text-emerald-800 mb-0.5">Grade: {a.latestSubmission.grade_score}/100</p>
          {a.latestSubmission.coach_feedback && (
            <p className="text-xs text-emerald-700">{a.latestSubmission.coach_feedback}</p>
          )}
        </div>
      )}

      {a.due_at && (
        <p className="text-xs text-text-secondary mb-2">
          📅 Due: {new Date(a.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-border">
        {['assigned', 'in_progress', 'reassigned'].includes(a.status) ? (
          <button
            id={`btn-submit-${a.id}`}
            onClick={() => { setSubmitTarget(a); setAnswerText(''); setSubmitError(''); setSubmitSuccess(''); }}
            className="w-full px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
          >
            {a.status === 'reassigned' ? 'Resubmit' : 'Submit Homework'}
          </button>
        ) : (
          <p className="text-xs text-text-secondary text-center">
            Submitted {a.latestSubmission ? new Date(a.latestSubmission.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Assignments"
        subtitle="Homework assigned by your coach from the Homework Library. Complete and submit them here."
      />

      {assignments.length === 0 && (
        <div className="text-center py-20 text-text-secondary">
          <p className="text-5xl mb-4">🎒</p>
          <p className="font-medium text-base">No assignments yet.</p>
          <p className="text-sm mt-1">Your coach will assign homework from the library soon.</p>
        </div>
      )}

      {/* Pending / In Progress */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            📋 To Do <span className="text-sm font-normal text-text-secondary ml-1">({pending.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map(renderCard)}
          </div>
        </section>
      )}

      {/* Submitted / Under Review */}
      {submitted.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            🕐 Under Review <span className="text-sm font-normal text-text-secondary ml-1">({submitted.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {submitted.map(renderCard)}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            ✅ Completed <span className="text-sm font-normal text-text-secondary ml-1">({completed.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completed.map(renderCard)}
          </div>
        </section>
      )}

      {/* Submit Modal */}
      <Modal isOpen={!!submitTarget} onClose={() => setSubmitTarget(null)} title={`Submit: ${submitTarget?.template?.title ?? ''}`} maxWidthClass="max-w-lg">
        <div className="space-y-4">
          {submitTarget?.coach_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Coach Instructions</p>
              <p className="text-sm text-amber-700">{submitTarget.coach_notes}</p>
            </div>
          )}

          {/* 3-Tier Progressive Hints Box */}
          <div className="bg-surface-light border border-border p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">💡 Progressive 3-Tier Hints</span>
              <span className="text-xs font-bold text-primary">Score Multiplier: {100 - currentScorePenalty}%</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUnlockedHintTier(1)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  unlockedHintTier >= 1 ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-white border-border hover:bg-slate-50'
                }`}
              >
                Hint 1 (Free Text Clue)
              </button>
              <button
                type="button"
                onClick={() => { setUnlockedHintTier(2); setCurrentScorePenalty(p => Math.max(p, 5)); }}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  unlockedHintTier >= 2 ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold' : 'bg-white border-border hover:bg-slate-50'
                }`}
              >
                Hint 2 (-5%: Piece Clue)
              </button>
              <button
                type="button"
                onClick={() => { setUnlockedHintTier(3); setCurrentScorePenalty(p => Math.max(p, 15)); }}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  unlockedHintTier >= 3 ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-white border-border hover:bg-slate-50'
                }`}
              >
                Hint 3 (-10%: Target Square)
              </button>
            </div>
            {unlockedHintTier >= 1 && (
              <div className="bg-white p-2.5 rounded-lg border border-primary/20 text-xs text-text-primary">
                💡 <strong>Hint 1:</strong> Examine forcing candidate moves (checks, captures, and threats).
              </div>
            )}
            {unlockedHintTier >= 2 && (
              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-900">
                🎯 <strong>Hint 2:</strong> Focus on activating your key attacking piece towards the opponent&apos;s king side (-5% applied).
              </div>
            )}
            {unlockedHintTier >= 3 && (
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                ✅ <strong>Hint 3:</strong> Look for tactical entry square highlighted in green on the board (-10% applied).
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary">Your Answer / Notes <span className="text-red-500">*</span></label>
            <textarea
              id="hw-answer-input"
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              rows={5}
              placeholder="Write your answers, move sequence, or notes here…"
              className="mt-1 w-full px-4 py-3 text-sm rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
          {submitSuccess && <p className="text-xs text-emerald-600 font-medium">{submitSuccess}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setSubmitTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-light transition-colors">Cancel</button>
            <button
              id="btn-confirm-submit"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-5 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
