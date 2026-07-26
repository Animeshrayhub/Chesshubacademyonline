'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';
import { createPuzzleAction, scanChessboardImageAction, saveScannerApiKeyAction } from '@/actions/homework';

interface ScannedPuzzle {
  id: string;
  originalImage: string;
  detectedFen: string;
  fen: string;
  confidence: number;
  page: number;
  title: string;
  chapter: string;
  theme: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningObjective: string;
  description: string;
  hint1: string;
  hint2: string;
  hint3: string;
  solution: string;
  explanation: string;
  coachNotes: string;
  solveTime: string;
  tags: string;
  status: 'Draft' | 'Verified' | 'Published';
  sideToMove: 'w' | 'b';
  castlingRights: string;
  enPassant: string;
}

export default function InteractivePdfChessPuzzleScanner() {
  const [pdfName, setPdfName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<'width' | 'page'>('width');
  const [scanning, setScanning] = useState(false);
  const [scannedPuzzles, setScannedPuzzles] = useState<ScannedPuzzle[]>([]);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);

  // AI Scanner & Provider State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'ollama'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llava');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManualFenModal, setShowManualFenModal] = useState(false);
  const [manualFen, setManualFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [latestCropDataUrl, setLatestCropDataUrl] = useState<string | null>(null);
  const [scanErrorBanner, setScanErrorBanner] = useState<string | null>(null);
  const [saveKeyLoading, setSaveKeyLoading] = useState(false);

  // PDF.js State
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [renderLoading, setRenderLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Drag-crop state
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const activePuzzle = scannedPuzzles.find((p) => p.id === selectedPuzzleId) || null;

  // Dynamically load PDF.js
  useEffect(() => {
    if ((window as any).pdfjsLib) {
      setPdfjsReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsReady(true);
    };
    script.onerror = () => {
      setErrorMessage('Failed to load PDF viewer engine.');
    };
    document.head.appendChild(script);
  }, []);

  // Load PDF file when chosen
  useEffect(() => {
    if (!pdfFile || !pdfjsReady) return;
    let active = true;
    const loadPdfDoc = async () => {
      try {
        setRenderLoading(true);
        setErrorMessage('');
        const fileUrl = URL.createObjectURL(pdfFile);
        const loadingTask = (window as any).pdfjsLib.getDocument(fileUrl);
        const doc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setErrorMessage('Failed to parse uploaded PDF file.');
      } finally {
        setRenderLoading(false);
      }
    };
    loadPdfDoc();
    return () => {
      active = false;
    };
  }, [pdfFile, pdfjsReady]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let active = true;
    const renderPage = async () => {
      try {
        setRenderLoading(true);
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom, rotation });
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderCtx = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderCtx).promise;
      } catch (err: any) {
        console.error('Render page error:', err);
      } finally {
        setRenderLoading(false);
      }
    };
    renderPage();
    return () => {
      active = false;
    };
  }, [pdfDoc, currentPage, zoom, rotation]);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setPdfName(file.name);
    setScannedPuzzles([]);
    setSelectedPuzzleId(null);
    setCropBox(null);
    setIsCropMode(false);
  };

  // Bounding box draw handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const w = Math.abs(drawStart.x - currentX);
    const h = Math.abs(drawStart.y - currentY);

    setCropBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Perform AI Scan of Cropped Box Region
  const handleScanSelectedRegion = async () => {
    if (!canvasRef.current || !cropBox || cropBox.w < 10 || cropBox.h < 10) {
      alert('Please drag a selection box over a chessboard diagram first.');
      return;
    }

    setScanning(true);
    setScanErrorBanner(null);

    // Save crop image for potential manual fallback
    const mainCanvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropBox.w;
    tempCanvas.height = cropBox.h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      setScanning(false);
      alert('Failed to create canvas context.');
      return;
    }

    tempCtx.drawImage(
      mainCanvas,
      cropBox.x,
      cropBox.y,
      cropBox.w,
      cropBox.h,
      0,
      0,
      cropBox.w,
      cropBox.h
    );

    const cropDataUrl = tempCanvas.toDataURL('image/png');
    setLatestCropDataUrl(cropDataUrl);
    const base64Image = tempCanvas.toDataURL('image/jpeg').split(',')[1];

    try {
      const scanRes = await scanChessboardImageAction(base64Image, {
        provider: aiProvider,
        apiKey: geminiApiKey,
        localUrl: ollamaUrl,
        modelName: ollamaModel,
      });

      if (!scanRes.success || !scanRes.data) {
        const errorMsg = scanRes.error?.message || 'Vision AI failed to recognize chessboard position.';
        setScanErrorBanner(errorMsg);
        if (scanRes.isKeyMissing) {
          setShowSettingsModal(true);
        }
        return;
      }

      const detectedFen = scanRes.data;

      // Create puzzle card
      const newPuzzle: ScannedPuzzle = {
        id: `crop-${Date.now()}`,
        originalImage: cropDataUrl,
        detectedFen,
        fen: detectedFen,
        confidence: aiProvider === 'ollama' ? 90 : 95,
        page: currentPage,
        title: `Diagram (Page ${currentPage} Crop)`,
        chapter: `Chapter ${Math.floor(currentPage / 10) + 1}`,
        theme: 'tactics',
        difficulty: 'intermediate',
        learningObjective: `Analyze tactics using ${aiProvider === 'ollama' ? 'Local Ollama' : 'Gemini AI'} recognized positions.`,
        description: 'Solve the AI-recognized diagram puzzle.',
        hint1: 'Analyze the pawn structure and attacking lines.',
        hint2: 'Find checking options or forks.',
        hint3: 'Solve the key tactical move.',
        solution: '',
        explanation: 'Forks or mating threats arise from the active diagram.',
        coachNotes: 'Explain the visual recognition concept to the class.',
        solveTime: '60s',
        tags: `${aiProvider}-ocr, tactics`,
        status: 'Draft',
        sideToMove: 'w',
        castlingRights: '-',
        enPassant: '-',
      };

      setScannedPuzzles((prev) => [...prev, newPuzzle]);
      setSelectedPuzzleId(newPuzzle.id);
      setCropBox(null);
      setIsCropMode(false);
      setScanErrorBanner(null);
    } catch (err: any) {
      setScanErrorBanner(err?.message || 'Scanning encountered an unexpected error.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!geminiApiKey && aiProvider === 'gemini') {
      alert('Please enter your Gemini API Key first.');
      return;
    }
    setSaveKeyLoading(true);
    try {
      const res = await saveScannerApiKeyAction(geminiApiKey, aiProvider);
      if (res.success) {
        setShowSettingsModal(false);
        setScanErrorBanner(null);
        alert(`Saved ${aiProvider.toUpperCase()} setting! Click "Scan Crop" to process your image.`);
      } else {
        alert('Failed to save settings: ' + res.error);
      }
    } catch (e: any) {
      alert('Error saving API Key: ' + e.message);
    } finally {
      setSaveKeyLoading(false);
    }
  };

  const handleCreateManualPuzzle = () => {
    if (!latestCropDataUrl) {
      alert('Please crop a diagram image first.');
      return;
    }

    const newPuzzle: ScannedPuzzle = {
      id: `manual-${Date.now()}`,
      originalImage: latestCropDataUrl,
      detectedFen: manualFen,
      fen: manualFen,
      confidence: 100,
      page: currentPage,
      title: `Manual Diagram (Page ${currentPage})`,
      chapter: `Chapter ${Math.floor(currentPage / 10) + 1}`,
      theme: 'tactics',
      difficulty: 'intermediate',
      learningObjective: 'Analyze tactics using custom verified FEN position.',
      description: 'Solve the manually created diagram puzzle.',
      hint1: 'Look for attacking themes.',
      hint2: 'Identify checks or tactics.',
      hint3: 'Find the winning move sequence.',
      solution: '',
      explanation: 'Tactical analysis from manual FEN setup.',
      coachNotes: 'Verified manual entry.',
      solveTime: '60s',
      tags: 'manual-entry, tactics',
      status: 'Draft',
      sideToMove: 'w',
      castlingRights: '-',
      enPassant: '-',
    };

    setScannedPuzzles((prev) => [...prev, newPuzzle]);
    setSelectedPuzzleId(newPuzzle.id);
    setShowManualFenModal(false);
    setScanErrorBanner(null);
    setCropBox(null);
    setIsCropMode(false);
  };

  const handleSavePuzzleToLibrary = async (p: ScannedPuzzle) => {
    try {
      const res = await createPuzzleAction({
        fen: p.fen,
        solution: p.solution,
        title: p.title,
        difficulty: p.difficulty,
        theme: p.theme,
        hints: [p.hint1, p.hint2, p.hint3].filter(Boolean),
        status: p.status,
      });

      if (res.success) {
        alert(`⚡ Successfully saved "${p.title}" to the Puzzle Library with status: ${p.status}!`);
      } else {
        alert('Failed to save: ' + (res.error?.message || 'Database error'));
      }
    } catch (err: any) {
      alert('Error saving puzzle: ' + err.message);
    }
  };

  const handleUpdatePuzzleField = (field: keyof ScannedPuzzle, value: any) => {
    if (!selectedPuzzleId) return;
    const updated = scannedPuzzles.map((p) => {
      if (p.id === selectedPuzzleId) {
        const next = { ...p, [field]: value };
        if (field === 'sideToMove') {
          const parts = p.fen.split(/\s+/);
          parts[1] = value;
          next.fen = parts.join(' ');
        }
        return next;
      }
      return p;
    });
    setScannedPuzzles(updated);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-white relative">
      {/* Left Column: PDF Viewer Controls & Scanning (5 Cols) */}
      <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-base">
              📄
            </div>
            <span className="font-heading font-bold text-sm text-indigo-400">Interactive PDF Puzzle Scanner</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>⚙️ AI Settings</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${aiProvider === 'gemini' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {aiProvider === 'gemini' ? 'Gemini AI' : 'Ollama Free'}
              </span>
            </button>
          </div>
        </div>

        {/* Scan Error Banner */}
        {scanErrorBanner && (
          <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-2xl space-y-2 text-xs text-red-200">
            <div className="flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-red-300 block">AI Scanning Issue:</span>
                <p className="text-[11px] text-red-200/90 leading-tight">{scanErrorBanner}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
              >
                🔑 Configure Gemini Key
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiProvider('ollama');
                  setShowSettingsModal(true);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
              >
                🦙 Switch to Local Ollama
              </button>
              {latestCropDataUrl && (
                <button
                  type="button"
                  onClick={() => setShowManualFenModal(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
                >
                  🧩 Setup Position Manually
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upload State */}
        {!pdfName ? (
          <div className="p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/60 text-center space-y-3 flex-1 flex flex-col justify-center items-center">
            <div className="text-3xl text-slate-600">📁</div>
            <p className="text-xs text-slate-400 font-bold">Select a workbook or tactical PDF to begin page-by-page scanning.</p>
            <input type="file" accept=".pdf" id="pdf-scan-input" className="hidden" onChange={handlePdfUpload} />
            <label
              htmlFor="pdf-scan-input"
              className="cursor-pointer px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              Choose PDF
            </label>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Viewer Controls */}
            <div className="bg-slate-950 p-2.5 border border-slate-800 rounded-xl flex items-center justify-between gap-1 flex-wrap text-[11px] font-bold">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    setCropBox(null);
                  }}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800"
                >
                  ◀
                </button>
                <span className="text-amber-400 px-1 font-mono">
                  {currentPage} / {totalPages || '?'}
                </span>
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages || 1, p + 1));
                    setCropBox(null);
                  }}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800"
                >
                  ▶
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:bg-slate-850 rounded text-slate-400"
                  title="Zoom Out"
                >
                  ➖
                </button>
                <span className="font-mono text-slate-400 text-[10px]">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                  className="p-1 hover:bg-slate-850 rounded text-slate-400"
                  title="Zoom In"
                >
                  ➕
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFitMode(fitMode === 'width' ? 'page' : 'width')}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[9px]"
                >
                  Fit {fitMode === 'width' ? 'Page' : 'Width'}
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[9px]"
                  title="Rotate PDF"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div
              ref={canvasContainerRef}
              onMouseDown={isCropMode ? handleMouseDown : undefined}
              onMouseMove={isCropMode ? handleMouseMove : undefined}
              onMouseUp={isCropMode ? handleMouseUp : undefined}
              className={`flex-1 overflow-auto bg-slate-950 rounded-2xl border border-slate-800 relative flex items-center justify-center p-2 ${
                isCropMode ? 'cursor-crosshair' : ''
              }`}
            >
              {renderLoading && <div className="text-xs text-indigo-400 animate-pulse">Rendering Page...</div>}
              {errorMessage && <div className="text-xs text-red-400">{errorMessage}</div>}
              <canvas ref={canvasRef} className="max-w-full shadow-2xl rounded" />

              {/* Crop Bounding Box Overlay */}
              {cropBox && (
                <div
                  style={{
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.w}px`,
                    height: `${cropBox.h}px`,
                  }}
                  className="absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none rounded shadow-lg"
                >
                  <span className="absolute -top-5 left-0 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                    Selected Chess Diagram
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCropMode(!isCropMode);
                  setCropBox(null);
                }}
                disabled={!pdfDoc}
                className={`flex-1 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  isCropMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                <span>{isCropMode ? 'Drawing Selection Box...' : '✏️ Toggle Crop Mode'}</span>
              </button>

              {cropBox && cropBox.w > 10 && (
                <button
                  type="button"
                  onClick={handleScanSelectedRegion}
                  disabled={scanning}
                  className="px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                >
                  <span>⚡ {scanning ? 'AI Scanning...' : `Scan Crop with ${aiProvider === 'ollama' ? 'Ollama' : 'Gemini AI'}`}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Scan Result & Deep Verification Editor (7 Cols) */}
      <div className="xl:col-span-7 space-y-4 flex flex-col max-h-[85vh]">
        {scannedPuzzles.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 shrink-0">
              <span className="text-xs font-bold text-indigo-400">Scanned Page Results ({scannedPuzzles.length} boards)</span>
              <span className="text-[10px] text-slate-500">Each diagram is independently editable</span>
            </div>

            {/* Horizontal list */}
            <div className="flex gap-2 pb-2 overflow-x-auto shrink-0 select-none">
              {scannedPuzzles.map((p) => {
                const active = p.id === selectedPuzzleId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPuzzleId(p.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer min-w-[170px] transition-all ${
                      active
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img src={p.originalImage} alt={p.title} className="w-8 h-8 rounded object-cover filter grayscale" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-white block truncate">{p.title}</span>
                      <span className="text-[9px] text-emerald-400 font-mono">Conf: {p.confidence}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form Editor panel */}
            {activePuzzle && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Original Cropped Diagram:</span>
                    <div className="aspect-square bg-slate-900 border border-slate-850 rounded-xl overflow-hidden flex items-center justify-center">
                      <img src={activePuzzle.originalImage} alt="Crop" className="w-full h-full object-contain filter grayscale" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Playable Verify Board:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextTurn = activePuzzle.sideToMove === 'w' ? 'b' : 'w';
                          handleUpdatePuzzleField('sideToMove', nextTurn);
                        }}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[9px] font-bold"
                      >
                        Side: {activePuzzle.sideToMove === 'w' ? 'White' : 'Black'}
                      </button>
                    </div>
                    <div className="w-full aspect-square border border-slate-850 rounded-xl overflow-hidden bg-slate-900 shadow-inner">
                      <ChessWorkspace readOnly={false} initialFen={activePuzzle.fen} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-bold">Generated FEN:</span>
                    <span className="text-amber-400 font-mono">{activePuzzle.fen}</span>
                  </div>
                  <input
                    type="text"
                    value={activePuzzle.fen}
                    onChange={(e) => handleUpdatePuzzleField('fen', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-[10px] text-amber-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-3.5 text-xs text-slate-300">
                  <span className="text-xs font-bold text-indigo-400 block border-b border-slate-850 pb-1.5">Puzzle Library Attributes</span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Puzzle Title</label>
                      <input
                        type="text"
                        value={activePuzzle.title}
                        onChange={(e) => handleUpdatePuzzleField('title', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Theme</label>
                        <input
                          type="text"
                          value={activePuzzle.theme}
                          onChange={(e) => handleUpdatePuzzleField('theme', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none text-[10px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Difficulty</label>
                        <select
                          value={activePuzzle.difficulty}
                          onChange={(e: any) => handleUpdatePuzzleField('difficulty', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none text-[10px]"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Learning Objective</label>
                    <input
                      type="text"
                      value={activePuzzle.learningObjective}
                      onChange={(e) => handleUpdatePuzzleField('learningObjective', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Hints</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Hint 1"
                        value={activePuzzle.hint1}
                        onChange={(e) => handleUpdatePuzzleField('hint1', e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none text-[10px]"
                      />
                      <input
                        type="text"
                        placeholder="Hint 2"
                        value={activePuzzle.hint2}
                        onChange={(e) => handleUpdatePuzzleField('hint2', e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none text-[10px]"
                      />
                      <input
                        type="text"
                        placeholder="Hint 3"
                        value={activePuzzle.hint3}
                        onChange={(e) => handleUpdatePuzzleField('hint3', e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none text-[10px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-400">Correct Solution (Manually Entered Moves)</label>
                    <input
                      type="text"
                      placeholder="e.g. e2e4 g8f6 e4e5"
                      value={activePuzzle.solution}
                      onChange={(e) => handleUpdatePuzzleField('solution', e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono text-[11px] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Save Status</label>
                      <select
                        value={activePuzzle.status}
                        onChange={(e: any) => handleUpdatePuzzleField('status', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Verified">Verified</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleSavePuzzleToLibrary(activePuzzle)}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl shadow transition-colors flex items-center justify-center gap-1"
                      >
                        <span>💾 Save Puzzle to Library</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
            Toggle Crop Mode and drag a box selection over a chess diagram, then scan with AI.
          </div>
        )}
      </div>

      {/* --- AI PROVIDER & KEY SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <span className="font-heading font-bold text-sm text-indigo-400">AI Vision Model Configuration</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Provider Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Select Vision AI Provider:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAiProvider('gemini')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    aiProvider === 'gemini'
                      ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-indigo-300 flex items-center gap-1">
                    ☁️ Google Gemini Cloud
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">High accuracy, requires Gemini API Key.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider('ollama')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    aiProvider === 'ollama'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-300 flex items-center gap-1">
                    🦙 Ollama Local (100% Free)
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Runs locally on your PC (`ollama run llava`).</p>
                </button>
              </div>
            </div>

            {/* Provider Details */}
            {aiProvider === 'gemini' ? (
              <div className="space-y-2 bg-slate-950 p-4 border border-slate-800 rounded-2xl">
                <label className="text-xs font-bold text-indigo-300 block">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Key will be saved securely in system configuration.
                </p>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-2xl text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-emerald-300 block">Local Ollama Endpoint</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-emerald-300 block">Vision Model Name</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llava or llama3.2-vision"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Ensure your local terminal has started Ollama: <code className="text-emerald-400 font-mono">ollama run llava</code>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={saveKeyLoading}
                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-colors"
              >
                {saveKeyLoading ? 'Saving...' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MANUAL FEN SETUP MODAL --- */}
      {showManualFenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧩</span>
                <span className="font-heading font-bold text-sm text-amber-400">Manual FEN Position Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowManualFenModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cropped Diagram Snapshot:</span>
                {latestCropDataUrl ? (
                  <img src={latestCropDataUrl} alt="Cropped" className="w-full aspect-square object-contain bg-slate-950 border border-slate-800 rounded-xl" />
                ) : (
                  <div className="w-full aspect-square bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-600">
                    No Crop Available
                  </div>
                )}
              </div>

              <div className="space-y-3 flex flex-col justify-center">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-300 block">Enter FEN Notation</label>
                  <textarea
                    rows={4}
                    value={manualFen}
                    onChange={(e) => setManualFen(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                    placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Tip: Copy FEN from Lichess or Chess.com analysis board if scanning is offline.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowManualFenModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateManualPuzzle}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-colors"
              >
                ➕ Add Puzzle Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
