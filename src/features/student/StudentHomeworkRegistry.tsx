'use client';

import React, { useState, useEffect, useTransition } from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';
import PdfCanvasViewer from '@/components/dashboard/ui/PdfCanvasViewer';
import { submitHomeworkAction } from '@/actions/homework';
import { uploadFileAction } from '@/actions/storage';
import { useRouter } from 'next/navigation';
import type { TableColumn } from '@/types/dashboard';

interface StudentHomeworkRegistryProps {
  assignments: Array<{
    id: string;
    workbookTitle: string;
    track: string;
    chapterTitle: string;
    pgnData: string | null;
    pdfStoragePath: string | null;
    puzzleImages?: Array<{
      id: string;
      imageUrl: string;
      imagePath: string;
      page: number;
      title: string;
      cropBox: any;
    }>;
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
}

const COLUMNS: TableColumn[] = [
  { key: 'workbook', label: 'Workbook / Track' },
  { key: 'chapter', label: 'Chapter Title' },
  { key: 'assigned', label: 'Date Assigned' },
  { key: 'status', label: 'Status' },
  { key: 'score', label: 'Grade Score' },
  { key: 'action', label: 'Actions' },
];

export default function StudentHomeworkRegistry({ assignments }: StudentHomeworkRegistryProps) {
  const router = useRouter();
  const [selectedAsgn, setSelectedAsgn] = useState<typeof assignments[0] | null>(null);
  const [answers, setAnswers] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();

  const [activePuzzleIdx, setActivePuzzleIdx] = useState(0);
  const [puzzleAnswers, setPuzzleAnswers] = useState<string[]>([]);
  const [imageZoom, setImageZoom] = useState(1);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Parse structured string answers into array per puzzle
  const parseAnswers = (rawText: string, puzzlesCount: number): string[] => {
    const list = new Array(puzzlesCount).fill('');
    if (!rawText) return list;
    const segments = rawText.split(/(?=Puzzle \d+:)/i);
    let parsedAny = false;
    for (const segment of segments) {
      const match = segment.match(/Puzzle (\d+):\s*\n?([\s\S]*)/i);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < puzzlesCount) {
          list[idx] = match[2].trim();
          parsedAny = true;
        }
      }
    }
    if (!parsedAny && puzzlesCount > 0) {
      list[0] = rawText; // Fallback
    }
    return list;
  };

  const handleSolveClick = (asgn: typeof assignments[0]) => {
    setSelectedAsgn(asgn);
    const rawAnswers = asgn.submission?.answers || '';
    setAnswers(rawAnswers);

    // Initialize puzzle answers state
    const puz = asgn.puzzleImages || [];
    setPuzzleAnswers(parseAnswers(rawAnswers, puz.length));
    setActivePuzzleIdx(0);

    setPdfPath(asgn.submission?.pdfSubmissionPath || '');
    setFormSuccess(false);
    setFormError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormError('');

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('bucket', 'submissions');
      
      const fileSlug = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_');
      const uniquePath = `${Date.now()}_${fileSlug}`;
      uploadData.append('path', uniquePath);

      const res = await uploadFileAction(uploadData);
      if (res.success && res.data) {
        setPdfPath(res.data.path);
      } else {
        setFormError(res.error?.message || 'Failed to upload PDF file.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const handleHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsgn) return;

    setFormError('');
    setFormSuccess(false);

    // Format the final answers string if puzzles exist
    const puz = selectedAsgn.puzzleImages || [];
    const finalAnswers = puz.length > 0
      ? puz.map((p: any, idx: number) => `Puzzle ${idx + 1}:\n${puzzleAnswers[idx] || ''}`).join('\n\n')
      : answers;

    startTransition(async () => {
      const res = await submitHomeworkAction(selectedAsgn.id, finalAnswers, pdfPath || undefined);
      if (res.success) {
        // Close modal FIRST before any refresh so no stale state is accessed during re-render
        setSelectedAsgn(null);
        setFormSuccess(false);
        setPuzzleAnswers([]);
        setActivePuzzleIdx(0);
        setAnswers('');
        setPdfPath('');
        // Then refresh server data
        router.refresh();
      } else {
        setFormError(res.error?.message || 'Failed to submit homework.');
      }
    });
  };

  const rows = assignments.map((asgn) => {
    const formattedDate = new Date(asgn.assignedAt).toLocaleDateString('en-US', {
      dateStyle: 'medium',
    });
    return {
      workbook: (
        <div>
          <span className="font-semibold text-text-primary text-xs block">{asgn.workbookTitle}</span>
          <span className="text-text-secondary text-[10px] uppercase font-bold tracking-wider">{asgn.track}</span>
        </div>
      ),
      chapter: <span className="text-text-primary text-xs font-medium">{asgn.chapterTitle}</span>,
      assigned: <span className="text-text-secondary text-xs">{formattedDate}</span>,
      status: (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
            asgn.status === 'reviewed'
              ? 'bg-green-50 text-green-700 border-green-100'
              : asgn.status === 'submitted'
              ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-slate-50 text-slate-700 border-slate-100'
          }`}
        >
          {asgn.status}
        </span>
      ),
      score: (
        <span className="font-bold text-text-primary text-xs">
          {asgn.submission?.gradeScore !== null && asgn.submission?.gradeScore !== undefined
            ? `${asgn.submission.gradeScore} / 100`
            : '—'}
        </span>
      ),
      action: (
        <div className="flex flex-wrap gap-2">
          <a
            href={`/dashboard/student/homework/solve/${asgn.id}`}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
          >
            ⚡ Solve Puzzles
          </a>
          {asgn.status === 'reviewed' ? (
            <button
              type="button"
              onClick={() => handleSolveClick(asgn)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
            >
              View Submission
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSolveClick(asgn)}
              className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-all"
            >
              {asgn.status === 'submitted' ? 'Resubmit Notes' : 'Upload Notes'}
            </button>
          )}
        </div>
      ),
    };
  });

  // Check if we need to load a FEN coordinates string from the PGN data
  const initialFen = selectedAsgn?.pgnData && selectedAsgn.pgnData.startsWith('rnbqk')
    ? selectedAsgn.pgnData
    : undefined;

  return (
    <div className="space-y-6">
      {/* 🎯 Smart Mistake Review Bank Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xl">
            🎯
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Mistake Review Bank & Daily Warmup</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Spaced Repetition
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your past puzzle blunders with AI hints to boost your tactical accuracy!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (assignments.length > 0) {
              router.push(`/dashboard/student/homework/solve/${assignments[0].id}`);
            } else {
              alert('No pending homework chapters available for warmup yet.');
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
        >
          <span>⚡ Start 3-Min Warmup</span>
        </button>
      </div>

      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle="No Pending Homework Items"
        emptyDescription="Your assigned coach has not scheduled homework sets yet. Check again after your next live class."
        caption="My Assigned Homework Chapters"
      />

      {selectedAsgn && (
        <Modal
          isOpen={!!selectedAsgn}
          onClose={() => setSelectedAsgn(null)}
          title={`Homework Challenge: ${selectedAsgn?.chapterTitle}`}
          maxWidthClass={((selectedAsgn?.puzzleImages || []).length > 0 || initialFen) ? 'max-w-4xl' : 'max-w-2xl'}
        >
          <form onSubmit={handleHomeworkSubmit} className="space-y-5">
            {formSuccess && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
                Homework solved and submitted successfully!
              </div>
            )}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
                {formError}
              </div>
            )}

            {(() => {
              if (!selectedAsgn) return null;
              const puzList = selectedAsgn.puzzleImages || [];
              if (puzList.length === 0) {
              return (
                <div className="space-y-5">
                  {initialFen && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Interactive Wooden Practice Board</span>
                        <div className="border border-border rounded-2xl p-3 bg-slate-50/50">
                          <ChessWorkspace initialFen={initialFen} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Write Your Chess Moves & Solution</span>
                        <Textarea
                          id="homework-answers"
                          label="Answers / Move Log (e.g. 1.e4 e5 2.Nf3)"
                          placeholder="Record your tactical moves, FEN position observations, or descriptive analysis..."
                          value={answers}
                          onChange={(e) => setAnswers(e.target.value)}
                          rows={8}
                          required
                          disabled={selectedAsgn?.status === 'reviewed'}
                        />

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-text-secondary">
                            Upload Solution PDF / Image (Optional)
                          </label>
                          {pdfPath ? (
                            <div className="p-3 bg-slate-50 border border-border rounded-xl flex items-center justify-between text-xs">
                              <span className="text-text-primary font-medium truncate max-w-[200px]">
                                Attached: {pdfPath.split('_').slice(1).join('_') || pdfPath}
                              </span>
                              {selectedAsgn?.status !== 'reviewed' && (
                                <button
                                  type="button"
                                  onClick={() => setPdfPath('')}
                                  className="text-red-500 font-bold hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ) : (
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              onChange={handleFileChange}
                              disabled={uploading || selectedAsgn?.status === 'reviewed'}
                              className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            />
                          )}
                          {uploading && (
                            <p className="text-[10px] text-primary animate-pulse font-semibold">Uploading solution...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!initialFen && (
                    <div className="space-y-4">
                      <Textarea
                        id="homework-answers"
                        label="Submit Workbook Solutions"
                        placeholder="Type your answers, move solutions, or exercise notes..."
                        value={answers}
                        onChange={(e) => setAnswers(e.target.value)}
                        rows={8}
                        required
                        disabled={selectedAsgn?.status === 'reviewed'}
                      />

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-text-secondary">
                          Upload Solution PDF / Image (Optional)
                        </label>
                        {pdfPath ? (
                          <div className="p-3 bg-slate-50 border border-border rounded-xl flex items-center justify-between text-xs">
                            <span className="text-text-primary font-medium truncate max-w-[200px]">
                              Attached: {pdfPath.split('_').slice(1).join('_') || pdfPath}
                            </span>
                            {selectedAsgn?.status !== 'reviewed' && (
                              <button
                                type="button"
                                onClick={() => setPdfPath('')}
                                className="text-red-500 font-bold hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={handleFileChange}
                            disabled={uploading || selectedAsgn?.status === 'reviewed'}
                            className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                          />
                        )}
                        {uploading && (
                          <p className="text-[10px] text-primary animate-pulse font-semibold">Uploading solution...</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedAsgn?.submission?.coachFeedback && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Coach Review Feedback</span>
                      <p className="text-xs text-amber-900 italic">
                        &quot;{selectedAsgn.submission.coachFeedback}&quot;
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setSelectedAsgn(null)}
                      className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
                    >
                      Close
                    </button>
                    {selectedAsgn?.status !== 'reviewed' && (
                      <button
                        type="submit"
                        disabled={isPending || uploading}
                        className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isPending ? 'Submitting...' : 'Submit Answers'}
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // Wizard rendering if puzzles exist
            const currentPuzzle = puzList[activePuzzleIdx];
            const isCompleted = selectedAsgn?.status === 'reviewed';

            return (
              <div className="space-y-5">
                <div className="border border-border rounded-3xl p-5 bg-slate-50/50 space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <div>
                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                        Curriculum Interactive Challenge
                      </span>
                      <h4 className="text-sm font-bold text-text-primary mt-1">
                        {currentPuzzle.title || `Puzzle ${activePuzzleIdx + 1}`}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-text-secondary">
                        Puzzle {activePuzzleIdx + 1} of {puzList.length}
                      </span>
                    </div>
                  </div>                    {/* Puzzle details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Cropped image of the puzzle with Zoom options */}
                      <div className="flex flex-col border border-border rounded-2xl bg-white shadow-sm overflow-hidden min-h-[300px]">
                        {/* Zoom control bar */}
                        <div className="flex justify-between items-center bg-slate-50 border-b border-border px-3 py-2 text-xs">
                          <span className="font-bold text-text-secondary flex items-center gap-1">
                            🔍 Zoom Puzzle
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setImageZoom(z => Math.max(1, z - 0.25))}
                              className="w-6 h-6 flex items-center justify-center border border-border hover:bg-slate-200 rounded font-bold text-xs bg-white text-text-primary"
                              title="Zoom Out"
                            >
                              -
                            </button>
                            <span className="font-mono text-[10px] min-w-[32px] text-center text-text-primary">
                              {Math.round(imageZoom * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setImageZoom(z => Math.min(2.5, z + 0.25))}
                              className="w-6 h-6 flex items-center justify-center border border-border hover:bg-slate-200 rounded font-bold text-xs bg-white text-text-primary"
                              title="Zoom In"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageZoom(1);
                                setLightboxUrl(currentPuzzle.imageUrl);
                              }}
                              className="ml-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-[10px] transition-colors"
                              title="View Fullscreen"
                            >
                              Fullscreen
                            </button>
                          </div>
                        </div>

                        {/* Image viewport */}
                        <div className="flex-grow flex flex-col justify-center items-center p-4 bg-slate-50/50 overflow-auto relative select-none">
                          {currentPuzzle.imageUrl ? (
                            <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center' }}>
                              <img
                                src={currentPuzzle.imageUrl}
                                alt={currentPuzzle.title}
                                className="max-h-[220px] object-contain rounded-lg shadow-sm border border-slate-100 cursor-zoom-in hover:brightness-95 transition-all"
                                onClick={() => setLightboxUrl(currentPuzzle.imageUrl)}
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary italic">No puzzle image available.</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Answer submission box */}
                      <div className="space-y-4 flex flex-col justify-between">
                        <Textarea
                          id={`puzzle-ans-${activePuzzleIdx}`}
                          label="Your Solution / Moves"
                          placeholder="Write down the solution moves for this position..."
                          value={puzzleAnswers[activePuzzleIdx] || ''}
                          onChange={(e) => {
                            const newAns = [...puzzleAnswers];
                            newAns[activePuzzleIdx] = e.target.value;
                            setPuzzleAnswers(newAns);
                          }}
                          rows={6}
                          required
                          disabled={isCompleted}
                        />

                        {/* Navigation buttons */}
                        <div className="flex justify-between items-center gap-3 pt-3 border-t border-border/60">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={activePuzzleIdx === 0}
                            onClick={() => {
                              setActivePuzzleIdx((i) => i - 1);
                              setImageZoom(1);
                            }}
                            className="px-4 py-2 font-bold"
                          >
                            ← Previous
                          </Button>

                          {activePuzzleIdx < puzList.length - 1 ? (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setActivePuzzleIdx((i) => i + 1);
                                setImageZoom(1);
                              }}
                              className="px-4 py-2 font-bold"
                            >
                              Next Puzzle →
                            </Button>
                          ) : (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 border border-green-100 rounded-xl">
                              Last Puzzle Reached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                {selectedAsgn?.submission?.coachFeedback && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Coach Review Feedback</span>
                    <p className="text-xs text-amber-900 italic">
                      &quot;{selectedAsgn.submission.coachFeedback}&quot;
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedAsgn(null)}
                    className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
                  >
                    Close
                  </button>
                  {selectedAsgn?.status !== 'reviewed' && (
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-6 py-2 bg-accent hover:bg-accent-hover text-surface-dark rounded-xl text-xs font-bold transition-all shadow-gold"
                    >
                      {isPending ? 'Submitting...' : 'Finish & Submit'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </form>
      </Modal>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <Modal
          isOpen={!!lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          title="Puzzle Image - Detailed View"
          maxWidthClass="max-w-4xl"
        >
          <div className="flex flex-col items-center justify-center p-2 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center p-2">
              <img
                src={lightboxUrl}
                alt="Detailed puzzle image"
                className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            </div>
            <div className="mt-4 pb-2">
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="px-6 py-2 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-xs transition-colors shadow-gold"
              >
                Close Fullscreen
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
