'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { gradeHomeworkSubmissionAction, assignChapterToStudentAction, assignChapterToClassAction } from '@/actions/homework';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';
import CoachProgressHeatmap from './CoachProgressHeatmap';
import type { TableColumn } from '@/types/dashboard';

interface HomeworkReviewRegistryProps {
  submissions: Array<{
    id: string;
    studentName: string;
    workbookTitle: string;
    chapterTitle: string;
    assignedAt: string;
    status: string;
    submission: {
      id: string;
      answers: string;
      pdfSubmissionPath: string | null;
      submittedAt: string;
      gradeScore: number | null;
      coachFeedback: string | null;
    } | null;
  }>;
  coachProfileId?: string;
  students?: Array<{ id: string; name: string; email: string; level: string }>;
  classes?: Array<{ id: string; name: string }>;
  chapters?: Array<{ id: string; workbookId: string; workbookTitle: string; chapterNumber: number; title: string; questionsCount: number; hasPgn: boolean; pgnData?: string | null }>;
  workbooks?: Array<{ id: string; title: string; track: string }>;
}

const COLUMNS: TableColumn[] = [
  { key: 'student', label: 'Student Name' },
  { key: 'workbook', label: 'Workbook / Track' },
  { key: 'chapter', label: 'Chapter' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Grade & Review' },
];

export default function HomeworkReviewRegistry({
  submissions,
  coachProfileId = '',
  students = [],
  classes = [],
  chapters = [],
  workbooks = [],
}: HomeworkReviewRegistryProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'submissions' | 'heatmap'>('submissions');
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState<typeof submissions[0] | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [approveAndUnlock, setApproveAndUnlock] = useState(true);
  
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Assign Homework Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'student' | 'class'>('student');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedWorkbookId, setSelectedWorkbookId] = useState('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Map submissions & chapters for Progress Heatmap
  const heatmapStudents = students.map(st => ({
    id: st.id,
    name: st.name,
    level: st.level,
  }));

  const heatmapChapters = chapters.map(ch => ({
    id: ch.id,
    workbookTitle: ch.workbookTitle,
    chapterNumber: ch.chapterNumber,
    title: ch.title,
  }));

  const heatmapRecords = submissions.map(s => {
    const studentObj = students.find(st => st.name === s.studentName || st.id === (s as any).studentId || st.id === (s as any).studentProfileId);
    const chapterObj = chapters.find(ch => ch.title === s.chapterTitle || `${ch.chapterNumber}. ${ch.title}` === s.chapterTitle || ch.id === (s as any).chapterId);

    const sId = studentObj?.id || (s as any).studentId || s.studentName;
    const cId = chapterObj?.id || (s as any).chapterId || s.chapterTitle;

    return {
      studentId: sId,
      chapterId: cId,
      status: (s.status === 'reviewed' ? 'passed' : s.status === 'reassigned' ? 'reassigned' : s.status === 'submitted' ? 'passed' : 'not_started') as any,
      score: s.submission?.gradeScore ?? null,
      attemptsCount: s.submission ? 1 : 0,
      lastAttemptAt: s.submission?.submittedAt,
      feedback: s.submission?.coachFeedback || undefined,
    };
  });

  const handleReviewClick = (sub: typeof submissions[0]) => {
    setSelectedSub(sub);
    setScore(sub.submission?.gradeScore !== null ? String(sub.submission?.gradeScore) : '');
    setFeedback(sub.submission?.coachFeedback || '');
    setApproveAndUnlock(true);
    setFormSuccess(false);
    setFormError('');
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setFormError('');
    setFormSuccess(false);

    startTransition(async () => {
      const res = await gradeHomeworkSubmissionAction(
        selectedSub.id,
        Number(score),
        feedback,
        approveAndUnlock
      );
      if (res.success) {
        setFormSuccess(true);
        setTimeout(() => {
          setSelectedSub(null);
        }, 1000);
      } else {
        setFormError(res.error?.message || 'Failed to submit grade.');
      }
    });
  };

  const openAssignModal = () => {
    setIsAssignModalOpen(true);
    setAssignSuccess(false);
    setAssignError('');
    setSelectedStudentId(students[0]?.id || '');
    setSelectedClassId(classes[0]?.id || '');
    setSelectedWorkbookId(workbooks[0]?.id || '');
    const firstCh = chapters.find((c) => !workbooks[0]?.id || c.workbookId === workbooks[0]?.id);
    setSelectedChapterIds(firstCh?.id ? [firstCh.id] : (chapters[0]?.id ? [chapters[0].id] : []));
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');
    setAssignSuccess(false);

    if (selectedChapterIds.length === 0) {
      setAssignError('Please select at least one chapter / puzzle set.');
      return;
    }

    startTransition(async () => {
      let successCount = 0;
      let firstError = '';

      for (const chId of selectedChapterIds) {
        if (assignMode === 'student') {
          if (!selectedStudentId) {
            setAssignError('Please select a student.');
            return;
          }
          const res = await assignChapterToStudentAction({
            chapterId: chId,
            studentProfileId: selectedStudentId,
            coachProfileId,
            dueAt: dueAt || undefined,
          });
          if (res.success) successCount++;
          else if (!firstError) firstError = res.error?.message || 'Failed to assign chapter.';
        } else {
          if (!selectedClassId) {
            setAssignError('Please select a class.');
            return;
          }
          const res = await assignChapterToClassAction({
            chapterId: chId,
            classId: selectedClassId,
            coachProfileId,
            dueAt: dueAt || undefined,
          });
          if (res.success) successCount++;
          else if (!firstError) firstError = res.error?.message || 'Failed to assign chapter.';
        }
      }

      if (successCount > 0) {
        setAssignSuccess(true);
        setTimeout(() => {
          setIsAssignModalOpen(false);
          router.refresh();
        }, 1200);
      } else {
        setAssignError(firstError || 'Failed to assign selected homework.');
      }
    });
  };

  const availableChapters = selectedWorkbookId
    ? chapters.filter((c) => c.workbookId === selectedWorkbookId)
    : chapters;

  const filtered = submissions.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.workbookTitle.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map((s) => ({
    student: <span className="font-semibold text-text-primary">{s.studentName}</span>,
    workbook: <span className="text-text-secondary text-xs">{s.workbookTitle}</span>,
    chapter: <span className="text-text-secondary text-xs">{s.chapterTitle}</span>,
    status: (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
          s.status === 'reviewed'
            ? 'bg-green-50 text-green-700 border-green-100'
            : s.status === 'submitted'
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-slate-50 text-slate-700 border-slate-100'
        }`}
      >
        {s.status}
      </span>
    ),
    action: (
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/dashboard/coach/homework/analytics/${s.id}`}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-border"
        >
          📊 Analytics
        </a>
        {s.submission ? (
          <button
            type="button"
            onClick={() => handleReviewClick(s)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-all"
          >
            {s.status === 'reviewed' ? 'Update Grade' : 'Grade & Review'}
          </button>
        ) : (
          <span className="text-slate-400 text-xs italic">Not submitted</span>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      {/* Header controls & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-surface-light rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'submissions'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            📋 Submissions List ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'heatmap'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            📊 Progress Heatmap
          </button>
        </div>

        {activeTab === 'submissions' && (
          <button
            type="button"
            onClick={openAssignModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>Assign Homework / Puzzles</span>
          </button>
        )}
      </div>

      {activeTab === 'heatmap' ? (
        <CoachProgressHeatmap
          students={heatmapStudents.length > 0 ? heatmapStudents : Array.from(new Set(submissions.map(s => s.studentName))).map(name => ({ id: name, name, level: 'STUDENT' }))}
          chapters={heatmapChapters.length > 0 ? heatmapChapters : Array.from(new Set(submissions.map(s => s.chapterTitle))).map((t, idx) => ({ id: t, workbookTitle: 'Workbook', chapterNumber: idx + 1, title: t }))}
          records={heatmapRecords}
        />
      ) : (
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Submissions Pending"
          emptyDescription="All assigned homework has been graded or students have not submitted yet."
          caption="Student Homework Submissions"
        />
      )}

      {/* Grade & Review Modal */}
      <Modal
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title={`Review Homework: ${selectedSub?.studentName || ''}`}
        maxWidthClass="max-w-4xl"
      >
        <form onSubmit={handleGradeSubmit} className="space-y-4">
          {formSuccess && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
              Grade and feedback saved successfully!
            </div>
          )}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {formError}
            </div>
          )}

          {(() => {
            const matchingChapter = chapters.find(
              (c) => c.title === selectedSub?.chapterTitle || c.id === (selectedSub as any)?.chapterId
            );
            const rawPgn = (selectedSub as any)?.pgnData || matchingChapter?.pgnData;

            let puzzleFen: string | undefined = undefined;
            if (rawPgn) {
              const fenMatch = rawPgn.match(/\[FEN\s+"([^"]+)"\]/i);
              if (fenMatch) {
                puzzleFen = fenMatch[1].trim();
              } else {
                const regMatch = rawPgn.match(/(?:[rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(?:\s+[wb]\s+[-KQkqA-Ha-h1-8]+\s+[-a-h1-8]+\s+\d+\s+\d+)?/);
                if (regMatch) puzzleFen = regMatch[0].trim();
                else puzzleFen = rawPgn.trim();
              }
            }

            // Play student's solution move on the board if available
            let solvedFen: string | undefined = puzzleFen;
            const studentMoveStr = selectedSub?.submission?.answers;
            if (puzzleFen && studentMoveStr) {
              try {
                const { Chess } = require('chess.js');
                const tempGame = new Chess(puzzleFen);
                const cleanMoves = studentMoveStr.replace(/\[[^\]]+\]/g, '').replace(/\{[^}]*\}/g, '').trim().split(/\s+/);
                for (const moveToken of cleanMoves) {
                  const m = moveToken.replace(/^\d+\./, '').trim();
                  if (m) {
                    try { tempGame.move(m); } catch {}
                  }
                }
                solvedFen = tempGame.fen();
              } catch {}
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Tactical Board Preview Column */}
                <div className="md:col-span-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Student Solved Position ({selectedSub?.chapterTitle})
                    </span>
                    {studentMoveStr && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                        {studentMoveStr}
                      </span>
                    )}
                  </div>
                  <div className="aspect-square bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-1 shadow-inner">
                    <ChessWorkspace
                      initialFen={solvedFen || puzzleFen}
                      showEngine={false}
                      readOnly={true}
                    />
                  </div>
                </div>

                {/* Grading Details Column */}
                <div className="md:col-span-6 space-y-4">
                  {/* Student Answers display */}
                  <div className="bg-slate-50 border border-border p-3.5 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Student Submission Answers
                    </span>
                    <div className="text-xs text-text-primary whitespace-pre-wrap font-mono max-h-32 overflow-y-auto font-bold bg-white p-2.5 rounded-lg border border-border">
                      {selectedSub?.submission?.answers || 'No answers provided.'}
                    </div>
                    {selectedSub?.submission?.pdfSubmissionPath && (
                      <div className="pt-2 border-t border-border/60">
                        <a
                          href={`/api/signed-url?path=${encodeURIComponent(selectedSub.submission.pdfSubmissionPath)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                        >
                          📄 View Attached Worksheet (PDF/Image)
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-1">
                      <Input
                        id="grade-score"
                        label="Score (e.g. 100)"
                        type="number"
                        min={0}
                        max={100}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2 pb-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          id="approve-unlock"
                          type="checkbox"
                          checked={approveAndUnlock}
                          onChange={(e) => setApproveAndUnlock(e.target.checked)}
                          className="h-4 w-4 text-primary border-border rounded focus:ring-primary/20 accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-text-primary">
                          Approve & Unlock Next
                        </span>
                      </label>
                    </div>
                  </div>

                  <Textarea
                    id="coach-feedback"
                    label="Coach Feedback Comments"
                    placeholder="Write constructive tactical reviews or tips for improvement..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    required
                  />

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setSelectedSub(null)}
                      className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Submitting...' : 'Save Grade & Review'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Assign Homework & Puzzles Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Homework & Tactical Puzzles"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {assignSuccess && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2">
              <span>✅</span>
              <span>Homework assigned and saved permanently to database!</span>
            </div>
          )}
          {assignError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {assignError}
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block mb-1.5">
              Assignment Target
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 border border-border rounded-xl">
              <button
                type="button"
                onClick={() => setAssignMode('student')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  assignMode === 'student' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👤 Individual Student
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('class')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  assignMode === 'class' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👥 Entire Class
              </button>
            </div>
          </div>

          {/* Target Dropdown */}
          {assignMode === 'student' ? (
            <div>
              <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block mb-1">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-border px-3 py-2.5 rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                required
              >
                {students.length === 0 ? (
                  <option value="">No students available</option>
                ) : (
                  students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.level}) — {s.email}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block mb-1">
                Select Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 border border-border px-3 py-2.5 rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                required
              >
                {classes.length === 0 ? (
                  <option value="">No classes available</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Workbook Track Selector */}
          <div>
            <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block mb-1">
              Curriculum Track / Workbook
            </label>
            <select
              value={selectedWorkbookId}
              onChange={(e) => {
                const newWb = e.target.value;
                setSelectedWorkbookId(newWb);
                const firstCh = chapters.find((c) => !newWb || c.workbookId === newWb);
                setSelectedChapterIds(firstCh?.id ? [firstCh.id] : []);
              }}
              className="w-full bg-slate-50 border border-border px-3 py-2.5 rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
            >
              <option value="">All Curriculum Tracks</option>
              {workbooks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.track})
                </option>
              ))}
            </select>
          </div>

          {/* Chapter / Puzzle Set Multi-Select Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block">
                Select Chapters / Tactical Puzzle Sets ({selectedChapterIds.length} Selected)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChapterIds(availableChapters.map((c) => c.id))}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Select All
                </button>
                <span className="text-[10px] text-text-secondary">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedChapterIds([])}
                  className="text-[10px] text-text-secondary font-semibold hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto bg-slate-50 border border-border rounded-xl p-2 space-y-1.5">
              {availableChapters.length === 0 ? (
                <p className="text-xs text-text-secondary italic p-2">No chapters available in this workbook.</p>
              ) : (
                availableChapters.map((ch) => {
                  const isChecked = selectedChapterIds.includes(ch.id);
                  return (
                    <label
                      key={ch.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                        isChecked
                          ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-sm'
                          : 'bg-white border-border text-text-primary hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChapterIds((prev) => [...prev, ch.id]);
                            } else {
                              setSelectedChapterIds((prev) => prev.filter((id) => id !== ch.id));
                            }
                          }}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <span>
                          Ch {ch.chapterNumber}: {ch.title} ({ch.workbookTitle})
                        </span>
                      </div>
                      {ch.hasPgn && (
                        <span className="text-[10px] font-bold bg-amber-400/20 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          ⚡ Interactive PGN
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Due Date (Optional) */}
          <Input
            id="due-at"
            label="Due Date (optional)"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>{isPending ? 'Saving...' : 'Assign & Save Permanently'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

