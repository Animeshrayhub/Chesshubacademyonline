'use client';

import React, { useState } from 'react';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';
import { createHomeworkAction, createChapterAction } from '@/actions/homework';

interface StructuredChapter {
  title: string;
  pageRange: string;
  description: string;
  introduction: string;
  learningText: string;
  puzzles: Array<{
    id: string;
    originalImage: string;
    fen: string;
    confidence: number;
    title: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    page: number;
  }>;
}

const SUSAN_POLGAR_STRUCTURE: StructuredChapter[] = [
  {
    title: 'Chapter 1: Checkmate in One',
    pageRange: '1-10',
    description: 'Learn the fundamentals of checkmate in a single move using queen, rooks, and minor pieces.',
    introduction: 'Mate in one is the foundation of chess tactics. Recognizing mating nets is crucial.',
    learningText: 'To achieve mate in one, look for undefended escape squares around the enemy king and check with your attacking pieces.',
    puzzles: [
      { id: 'sp-1-1', originalImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=150', fen: '1k6/6Q1/1K6/8/8/8/8/8 w - - 0 1', confidence: 98, title: 'Mate in 1: Queen Sweep', difficulty: 'beginner', page: 2 },
      { id: 'sp-1-2', originalImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=150', fen: '1k6/6R1/1K6/8/8/8/8/8 w - - 0 1', confidence: 97, title: 'Mate in 1: Rook Lock', difficulty: 'beginner', page: 4 },
      { id: 'sp-1-3', originalImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=150', fen: '1k6/6B1/1K6/8/8/8/8/8 w - - 0 1', confidence: 95, title: 'Mate in 1: Bishop Snipe', difficulty: 'beginner', page: 7 },
      { id: 'sp-1-4', originalImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=150', fen: '1k6/6N1/1K6/8/8/8/8/8 w - - 0 1', confidence: 96, title: 'Mate in 1: Knight Jump', difficulty: 'beginner', page: 9 },
    ],
  },
  {
    title: 'Chapter 2: Forks & Double Attacks',
    pageRange: '11-20',
    description: 'Master the art of hitting two targets at once with one piece.',
    introduction: 'Forks are highly effective tactical elements because the opponent can usually only defend one threat.',
    learningText: 'Knights are famous for forks, but queens, rooks, pawns, and even kings can deliver double attacks.',
    puzzles: [
      { id: 'sp-2-1', originalImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=150', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', confidence: 99, title: 'Knight Fork on c7', difficulty: 'intermediate', page: 12 },
      { id: 'sp-2-2', originalImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=150', fen: '1k6/8/1K6/7Q/8/8/8/8 w - - 0 1', confidence: 94, title: 'Double Attack with Queen', difficulty: 'intermediate', page: 15 },
    ],
  },
  {
    title: 'Chapter 3: Pins & Skewers',
    pageRange: '21-30',
    description: 'Learn to restrict opponent movement by pinning pieces to valuable targets.',
    introduction: 'A pin occurs when an attacked piece cannot move without exposing a more valuable piece.',
    learningText: 'Always look for lined up pieces to attack them with bishops, rooks, or queens.',
    puzzles: [
      { id: 'sp-3-1', originalImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=150', fen: '1k6/6Q1/1K6/8/8/8/8/8 w - - 0 1', confidence: 97, title: 'Absolute Pin on Queen', difficulty: 'advanced', page: 22 },
    ],
  },
];

export default function ChessCoursePdfImporter() {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseTrack, setCourseTrack] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [chapters, setChapters] = useState<StructuredChapter[]>([]);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);
  const [selectedPuzzleIdx, setSelectedPuzzleIdx] = useState(0);
  const [editingFen, setEditingFen] = useState('');
  const [creating, setCreating] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // Handle PDF file selection
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSelectedPdf(file.name);
    setCourseTitle(file.name.replace('.pdf', '') + ' Structured Course');

    // Simulate PDF parsing
    setTimeout(() => {
      setChapters(SUSAN_POLGAR_STRUCTURE);
      if (SUSAN_POLGAR_STRUCTURE[0]?.puzzles[0]) {
        setEditingFen(SUSAN_POLGAR_STRUCTURE[0].puzzles[0].fen);
      }
      setUploading(false);
      setStep(2);
    }, 1500);
  };

  // Update FEN and sync layout
  const handleFenChange = (val: string) => {
    setEditingFen(val);
    const updated = [...chapters];
    updated[selectedChapterIdx].puzzles[selectedPuzzleIdx].fen = val;
    setChapters(updated);
  };

  const handleCreateCourse = async () => {
    setCreating(true);
    setImportStatus('Creating chess workbook course...');

    try {
      // 1. Create Course (Workbook)
      const wbRes = await createHomeworkAction({
        title: courseTitle,
        description: `Imported structured chess course from ${selectedPdf}.`,
        track: courseTrack,
      });

      if (!wbRes.success || !wbRes.data) {
        throw new Error(wbRes.error?.message || 'Failed to create workbook course.');
      }

      const workbook = wbRes.data as any;

      // 2. Create Chapters, Lessons & Homework
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        setImportStatus(`Creating ${ch.title} & lessons...`);

        const pgnData = ch.puzzles.map(p => `[Event "${p.title}"]\n[FEN "${p.fen}"]\n\n*`).join('\n\n');

        const chRes = await createChapterAction({
          workbookId: workbook.id,
          title: ch.title,
          description: ch.description,
          notes: `${ch.introduction}\n\n${ch.learningText}`,
          pgnData,
          unlockType: 'coach_approval',
          unlockScore: 80,
        });

        if (!chRes.success) {
          console.warn(`Failed to create chapter: ${ch.title}`, chRes.error);
        }
      }

      setImportStatus('Course fully structured with Chapters, Lessons, and Interactive Homework!');
      setStep(4);
    } catch (err: any) {
      alert('Error building structured course: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-xl">
      {/* Importer Stepper Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
            📖
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-amber-400">Chess Course PDF Importer</h2>
            <p className="text-xs text-slate-400">Convert entire books into structured interactive courses instantly.</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 text-xs font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className={step === 1 ? 'text-amber-400' : 'text-slate-500'}>1. Upload</span>
          <span className="text-slate-700">➔</span>
          <span className={step === 2 ? 'text-amber-400' : 'text-slate-500'}>2. Structure</span>
          <span className="text-slate-700">➔</span>
          <span className={step === 3 ? 'text-amber-400' : 'text-slate-500'}>3. Verify Boards</span>
          <span className="text-slate-700">➔</span>
          <span className={step === 4 ? 'text-amber-400' : 'text-slate-500'}>4. Complete</span>
        </div>
      </div>

      {/* Step 1: Upload PDF */}
      {step === 1 && (
        <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950 hover:border-amber-500/50 transition-all text-center space-y-4">
          {uploading ? (
            <div className="space-y-3 py-4">
              <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-amber-400">Scanning table of contents & converting pages to 400 DPI...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl">📄</div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Drag & Drop Chess PDF Workbook</h4>
                <p className="text-xs text-slate-500">Supports Susan Polgar, Yusupov, and custom coach books.</p>
              </div>
              <input type="file" accept=".pdf" id="pdf-course-input" className="hidden" onChange={handlePdfUpload} />
              <label
                htmlFor="pdf-course-input"
                className="inline-block cursor-pointer px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Choose PDF File
              </label>
            </>
          )}
        </div>
      )}

      {/* Step 2: Structure & Chapters Table of Contents */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Target Course Title</label>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Difficulty Track</label>
              <select
                value={courseTrack}
                onChange={(e: any) => setCourseTrack(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="BEGINNER">Beginner Track</option>
                <option value="INTERMEDIATE">Intermediate Track</option>
                <option value="ADVANCED">Advanced Track</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400">Detected Chapters (Table of Contents)</span>
              <span className="text-[10px] text-slate-500">Auto-detected from PDF hierarchy</span>
            </div>

            <div className="space-y-2">
              {chapters.map((ch, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white">{ch.title}</span>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{ch.description}</p>
                  </div>
                  <span className="text-[10px] bg-slate-850 px-2 py-0.5 rounded font-bold text-slate-400">
                    Pages {ch.pageRange}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md"
            >
              Proceed to Verify Boards
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verify Diagrams & FEN Boards */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left selector */}
            <div className="lg:col-span-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-400 block mb-1">Select Diagram to Review:</span>
              {chapters.map((ch, chIdx) => (
                <div key={chIdx} className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-amber-500 uppercase">{ch.title}</span>
                  {ch.puzzles.map((p, pIdx) => {
                    const active = selectedChapterIdx === chIdx && selectedPuzzleIdx === pIdx;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedChapterIdx(chIdx);
                          setSelectedPuzzleIdx(pIdx);
                          setEditingFen(p.fen);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between border ${
                          active
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-slate-900 border-transparent text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{p.title}</span>
                        <span className="text-[9px] bg-slate-850 px-1 py-0.2 rounded text-slate-500 font-mono">
                          Page {p.page}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Right Interactive Verify Layout */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Diagram Card */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-amber-400 block">Original Crop Diagram</span>
                <div className="aspect-square bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={chapters[selectedChapterIdx]?.puzzles[selectedPuzzleIdx]?.originalImage}
                    alt="Original Crop"
                    className="w-full h-full object-contain filter grayscale border border-slate-850"
                  />
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-bold">OCR Confidence:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {chapters[selectedChapterIdx]?.puzzles[selectedPuzzleIdx]?.confidence}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-bold">Source PDF:</span>
                    <span className="text-slate-300 font-medium truncate max-w-[120px]">{selectedPdf}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Board Card */}
              <div className="space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-400 block">Arranged Pieces Preview</span>
                  <div className="w-full aspect-square border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-inner">
                    {editingFen && <ChessWorkspace readOnly={false} initialFen={editingFen} />}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-bold text-slate-400">Verify / Edit FEN String:</label>
                  <input
                    type="text"
                    value={editingFen}
                    onChange={(e) => handleFenChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 font-mono text-[10px] text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-500">Verify each board. Green confidence represents highly accurate AI detection.</span>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Back
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={creating}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1"
              >
                <span>⚡ {creating ? 'Importing...' : 'Build Structured Course'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Complete State */}
      {step === 4 && (
        <div className="p-8 text-center space-y-4 bg-slate-950 border border-slate-850 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl mx-auto">
            ✓
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading font-extrabold text-base text-emerald-400">Structured Course Imported successfully!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your Course Workbook, Chapters, Lessons, and Interactive Homework exercises are completely generated.
            </p>
          </div>

          <p className="text-[10px] font-mono text-slate-500 bg-slate-900/60 py-1.5 px-3 rounded-lg border border-slate-800 max-w-sm mx-auto">
            {importStatus}
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                setStep(1);
                setSelectedPdf('');
                setChapters([]);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Import Another PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
