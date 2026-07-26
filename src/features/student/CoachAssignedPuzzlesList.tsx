'use client';

import React, { useState, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';
import { submitHomeworkAction } from '@/actions/homework';
import { useRouter } from 'next/navigation';

interface AssignmentData {
  id: string;
  workbookTitle: string;
  track: string;
  chapterTitle: string;
  pgnData: string | null;
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
}

interface CoachAssignedPuzzlesListProps {
  assignments: AssignmentData[];
}

export default function CoachAssignedPuzzlesList({ assignments }: CoachAssignedPuzzlesListProps) {
  const router = useRouter();
  const [selectedAsgn, setSelectedAsgn] = useState<AssignmentData | null>(null);
  const [answers, setAnswers] = useState('');
  const [formError, setFormError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter assignments that have PGN/FEN study positions
  const puzzleAssignments = assignments.filter((asgn) => asgn.pgnData);

  const handleOpenSolver = (asgn: AssignmentData) => {
    setSelectedAsgn(asgn);
    setAnswers(asgn.submission?.answers || '');
    setFormError('');
    setShowHint(false);
  };


  const handleSolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsgn) return;

    setFormError('');

    startTransition(async () => {
      const res = await submitHomeworkAction(selectedAsgn.id, answers, undefined);
      if (res.success) {
        setSelectedAsgn(null);
        setAnswers('');
        router.refresh();
      } else {
        setFormError(res.error?.message || 'Failed to submit homework.');
      }
    });
  };

  if (puzzleAssignments.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-slate-850 flex items-center justify-center mx-auto mb-4 border border-slate-800">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-white mb-1">No Assigned Study Puzzles</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Your coach has not assigned any workbook chapters containing interactive PGN/FEN studies to your account yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table grid listing the assigned puzzles */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-heading font-bold text-white text-base">Assigned Study Puzzles</h3>
          <span className="text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
            {puzzleAssignments.length} custom puzzles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Workbook / Chapter</th>
                <th className="px-6 py-4">Date Assigned</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {puzzleAssignments.map((asgn) => {
                const formattedDate = new Date(asgn.assignedAt).toLocaleDateString('en-US', {
                  dateStyle: 'medium',
                });
                
                const isSubmitted = asgn.status === 'submitted' || asgn.status === 'reviewed';

                return (
                  <tr key={asgn.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-white text-xs block mb-0.5">{asgn.chapterTitle}</span>
                        <span className="text-slate-400 text-[10px] font-medium tracking-wide uppercase">
                          {asgn.workbookTitle} • {asgn.track}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-xs">
                      {formattedDate}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        asgn.status === 'reviewed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : asgn.status === 'submitted'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {asgn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-xs font-semibold">
                      {asgn.submission?.gradeScore !== null && asgn.submission?.gradeScore !== undefined
                        ? `${asgn.submission.gradeScore} / 100`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenSolver(asgn)}
                        className={`inline-flex items-center justify-center px-3.5 py-1.5 font-bold rounded-lg text-xs transition-colors ${
                          isSubmitted
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700'
                            : 'bg-primary hover:bg-primary-dark text-white'
                        }`}
                      >
                        {isSubmitted ? 'View Workspace' : 'Solve & Submit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Solver Modal */}
      {selectedAsgn && (
        <Modal
          isOpen={!!selectedAsgn}
          onClose={() => setSelectedAsgn(null)}
          title={`Assigned study Board: ${selectedAsgn.chapterTitle}`}
          maxWidthClass="max-w-4xl"
        >
          <form onSubmit={handleSolveSubmit} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chess Board Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="block text-xs font-semibold text-slate-400">Interactive Study Board</span>
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
                  >
                    💡 {showHint ? 'Hide Hint' : 'Need a Hint?'}
                  </button>
                </div>
                {showHint && (
                  <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-medium animate-fadeIn">
                    💡 <strong>Hint:</strong> Look for tactical motifs like forks, checks, or undefended pieces!
                  </div>
                )}
                <div className="aspect-square bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-inner p-1">
                  {(() => {
                    let fenToLoad: string | undefined = undefined;
                    if (selectedAsgn.pgnData) {
                      const fenMatch = selectedAsgn.pgnData.match(/\[FEN\s+"([^"]+)"\]/i);
                      if (fenMatch) {
                        fenToLoad = fenMatch[1].trim();
                      } else {
                        const regMatch = selectedAsgn.pgnData.match(/(?:[rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(?:\s+[wb]\s+[-KQkqA-Ha-h1-8]+\s+[-a-h1-8]+\s+\d+\s+\d+)?/);
                        if (regMatch) fenToLoad = regMatch[0].trim();
                        else fenToLoad = selectedAsgn.pgnData.trim();
                      }
                    }
                    return (
                      <ChessWorkspace
                        initialFen={fenToLoad}
                        targetSolution={selectedAsgn.pgnData || undefined}
                        userRole="student"
                        showEngine={false}
                        onMove={(newFen, pgn) => {
                          if (pgn) {
                            const cleanMoves = pgn.replace(/\[[^\]]+\]/g, '').replace(/\{[^}]*\}/g, '').replace(/\$\d+/g, '').replace(/1\/2-1\/2|1-0|0-1|\*/g, '').trim();
                            setAnswers(cleanMoves);
                          }
                        }}
                      />
                    );
                  })()}
                </div>
              </div>


              {/* Answers & Feedback Form */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Write Your Answer / Moves</label>
                    <textarea
                      rows={6}
                      placeholder="e.g. 1. e4 e5 2. Nf3 Nc6..."
                      value={answers}
                      onChange={(e) => setAnswers(e.target.value)}
                      disabled={selectedAsgn.status === 'reviewed' || isPending}
                      className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {selectedAsgn.submission?.coachFeedback && (
                    <div className="bg-purple-950/20 border border-purple-900/50 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Coach Review Feedback</span>
                      <p className="text-xs text-purple-200 italic">“{selectedAsgn.submission.coachFeedback}”</p>
                    </div>
                  )}
                </div>

                {/* Form Errors & Submit Action */}
                <div className="pt-4 border-t border-slate-850">
                  {formError && <p className="text-xs text-red-500 font-medium mb-3">{formError}</p>}
                  <div className="flex justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedAsgn(null)}
                      className="text-slate-400 border-slate-800 hover:bg-slate-850"
                    >
                      Close Workspace
                    </Button>
                    {selectedAsgn.status !== 'reviewed' && (
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isPending}
                        className="bg-primary hover:bg-primary-dark text-white font-bold"
                      >
                        {isPending ? 'Submitting Solve...' : 'Submit Answers'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
