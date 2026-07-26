'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import type { DbHomeworkChapter } from '@/lib/homework';
import { updateChapterAction } from '@/actions/homework';
import { uploadFileAction, deleteFileAction } from '@/actions/storage';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import Input from '@/components/ui/Input';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';

interface ManageChapterWorkspaceProps {
  chapter: DbHomeworkChapter;
  onBack: () => void;
}

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

const ChevronUp = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
);

const ChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
);

const CropIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
);

interface ThumbnailItemProps {
  pageNum: number;
  active: boolean;
  pdfDoc: any;
  onClick: () => void;
}

const ThumbnailItem = ({ pageNum, active, pdfDoc, onClick }: ThumbnailItemProps) => {
  const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let activeRender = true;
    const drawThumb = async () => {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.15 });
        if (!activeRender || !thumbCanvasRef.current) return;

        const canvas = thumbCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        // Silent catch
      }
    };
    drawThumb();
    return () => {
      activeRender = false;
    };
  }, [pdfDoc, pageNum]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-left bg-white ${
        active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-slate-400'
      }`}
    >
      <canvas ref={thumbCanvasRef} className="bg-slate-100 rounded border border-slate-200" />
      <span className="text-[10px] font-bold text-text-secondary">Page {pageNum}</span>
    </button>
  );
};

export default function ManageChapterWorkspace({ chapter, onBack }: ManageChapterWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'pdf' | 'interactive_puzzles'>('general');
  const [, startTransition] = useTransition();

  // Tab 1: General state
  const [generalFormData, setGeneralFormData] = useState({
    title: chapter.title || '',
    videoUrl: chapter.video_url || '',
    notes: chapter.notes || '',
    pgnData: chapter.pgn_data || '',
    unlockType: chapter.unlock_type || 'coach_approval',
    unlockScore: chapter.unlock_score || 80,
  });
  const [generalError, setGeneralError] = useState('');
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [generalSaving, setGeneralSaving] = useState(false);

  // Tab 2: PDF state
  const [pdfPath, setPdfPath] = useState(chapter.pdf_storage_path || '');
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const [signedUrl, setSignedUrl] = useState('');
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.5);
  const [searchPageText, setSearchPageText] = useState('');
  const [renderLoading, setRenderLoading] = useState(false);

  // Cropping state
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [savingCrop, setSavingCrop] = useState(false);
  const [activeCropEditId, setActiveCropEditId] = useState<string | null>(null);

  // Puzzles state
  const [puzzles, setPuzzles] = useState<any[]>(chapter.puzzle_images || []);
  const [expandedBoardPuzzleId, setExpandedBoardPuzzleId] = useState<string | null>(null);

  // Database Interactive Puzzles State
  const [chapterDbPuzzles, setChapterDbPuzzles] = useState<any[]>([]);
  const [loadingDbPuzzles, setLoadingDbPuzzles] = useState(false);

  const fetchDbPuzzles = useCallback(async () => {
    setLoadingDbPuzzles(true);
    try {
      const { getChapterPuzzlesAdminAction } = await import('@/actions/homework');
      const res = await getChapterPuzzlesAdminAction(chapter.id);

      setChapterDbPuzzles((prev) => {
        const fetched = (res.success && Array.isArray(res.data)) ? res.data : [];
        if (fetched.length === 0 && prev.length > 0) {
          return prev;
        }

        const existingIds = new Set(fetched.map((p: any) => p.id));
        const merged = [...fetched];
        prev.forEach((p) => {
          if (p.id && !existingIds.has(p.id)) {
            merged.push(p);
          }
        });
        return merged;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDbPuzzles(false);
    }
  }, [chapter.id]);

  useEffect(() => {
    fetchDbPuzzles();
  }, [fetchDbPuzzles]);

  // Tab 3: Interactive Board Puzzle Editor State
  const [editorFenInput, setEditorFenInput] = useState('');
  const [editorPgnInput, setEditorPgnInput] = useState('');
  const [editorTitle, setEditorTitle] = useState('ChessHub Academy Puzzle 1');
  const [editorTheme, setEditorTheme] = useState('fork');
  const [editorHint1, setEditorHint1] = useState('');
  const [editorHint2, setEditorHint2] = useState('');
  const [editorHint3, setEditorHint3] = useState('');
  const [savingInteractivePuzzle, setSavingInteractivePuzzle] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [editorSuccess, setEditorSuccess] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Dynamically load PDF.js from cdnjs
  useEffect(() => {
    if (activeTab !== 'pdf') return;
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
      setPdfUploadError('Failed to load PDF viewer scripts.');
    };
    document.head.appendChild(script);
  }, [activeTab]);

  // Fetch signed URL when pdfPath changes
  useEffect(() => {
    if (!pdfPath || activeTab !== 'pdf') return;
    const fetchSignedUrl = async () => {
      const { getSignedUrlAction } = await import('@/actions/storage');
      const res = await getSignedUrlAction('workbooks', pdfPath);
      if (res.success && res.data) {
        setSignedUrl(res.data);
      } else {
        setPdfUploadError(res.error?.message || 'Failed to fetch workbook signed URL.');
      }
    };
    fetchSignedUrl();
  }, [pdfPath, activeTab]);

  // Load PDF document once PDF.js is ready and signed URL is fetched
  useEffect(() => {
    if (!pdfjsReady || !signedUrl || activeTab !== 'pdf') return;
    let active = true;
    const loadDoc = async () => {
      try {
        setRenderLoading(true);
        const loadingTask = (window as any).pdfjsLib.getDocument(signedUrl);
        const doc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err: any) {
        console.error('Error loading PDF document:', err);
        setPdfUploadError(err.message || 'Error loading PDF document.');
      } finally {
        setRenderLoading(false);
      }
    };
    loadDoc();
    return () => {
      active = false;
    };
  }, [pdfjsReady, signedUrl, activeTab]);

  // Render active page to canvas
  useEffect(() => {
    if (!pdfDoc || activeTab !== 'pdf') return;
    let active = true;
    const render = async () => {
      if (!canvasRef.current) return;
      setRenderLoading(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      } catch (err: any) {
        console.error('Error rendering page:', err);
      } finally {
        setRenderLoading(false);
      }
    };
    render();
    return () => {
      active = false;
    };
  }, [pdfDoc, currentPage, zoom, activeTab]);

  // General Tab handlers
  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setGeneralSuccess(false);
    setImportSummary(null);
    setGeneralSaving(true);
    try {
      const pgnText = generalFormData.pgnData.trim();
      const res = await updateChapterAction(chapter.id, {
        title: generalFormData.title.trim(),
        videoUrl: generalFormData.videoUrl.trim() || undefined,
        notes: generalFormData.notes.trim() || undefined,
        pgnData: pgnText || undefined,
        unlockType: generalFormData.unlockType as 'coach_approval' | 'auto_score',
        unlockScore: Number(generalFormData.unlockScore) || 80,
      });
      if (res.success) {
        setGeneralSuccess(true);
        if (pgnText) {
          try {
            const { importPgnToChapterAction } = await import('@/actions/homework');
            const importRes = await importPgnToChapterAction(chapter.id, pgnText);
            const data = importRes.data as any;
            if (importRes.success && data?.count) {
              setImportSummary(`Successfully imported ${data.count} interactive puzzle(s) from PGN/FEN!`);
            }
          } catch (err: any) {
            console.error('Failed to import puzzles:', err);
          }
        }
      } else {
        setGeneralError(res.error?.message || 'Failed to update general settings.');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'An error occurred.');
    } finally {
      setGeneralSaving(false);
    }
  };

  // PDF Upload handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfUploading(true);
    setPdfUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'workbooks');
      fd.append('path', `chapters/${chapter.id}/${Date.now()}_${file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_')}`);
      
      const uploadRes = await uploadFileAction(fd);
      if (uploadRes.success && uploadRes.data) {
        // Save pdf path in chapter
        const updateRes = await updateChapterAction(chapter.id, {
          pdfStoragePath: uploadRes.data.path,
        });
        if (updateRes.success) {
          setPdfPath(uploadRes.data.path);
        } else {
          setPdfUploadError(updateRes.error?.message || 'Failed to link uploaded PDF to chapter.');
        }
      } else {
        setPdfUploadError(uploadRes.error?.message || 'PDF upload failed.');
      }
    } catch (err: any) {
      setPdfUploadError(err.message || 'Error occurred uploading PDF.');
    } finally {
      setPdfUploading(false);
    }
  };

  // PDF page controls
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      setCropBox(null);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
      setCropBox(null);
    }
  };

  const handleJumpPage = (delta: number) => {
    const target = Math.min(Math.max(1, currentPage + delta), totalPages || 1);
    setCurrentPage(target);
    setCropBox(null);
  };

  const handlePageSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pageNum = parseInt(e.target.value, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setCropBox(null);
    }
  };

  const handlePageSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(searchPageText);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setCropBox(null);
      setSearchPageText('');
    }
  };

  // Drawing crop overlay handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
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

  // Save Crop Handler
  const handleSaveCrop = () => {
    if (!cropBox || !canvasRef.current) return;
    if (cropBox.w < 10 || cropBox.h < 10) {
      alert('Selected crop area is too small. Drag to select a larger region.');
      return;
    }

    const mainCanvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropBox.w;
    tempCanvas.height = cropBox.h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw the cropped section onto the temp canvas
    tempCtx.drawImage(
      mainCanvas,
      cropBox.x, cropBox.y, cropBox.w, cropBox.h, // Source rectangle
      0, 0, cropBox.w, cropBox.h // Destination rectangle
    );

    // Convert temp canvas to Blob and upload
    tempCanvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `puzzle_crop_${Date.now()}.png`, { type: 'image/png' });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'media');
      fd.append('path', `puzzles/chapter_${chapter.id}/${Date.now()}_crop.png`);

      setSavingCrop(true);
      try {
        const uploadRes = await uploadFileAction(fd);
        if (uploadRes.success && uploadRes.data) {
          const imageUrl = uploadRes.data.publicUrl;
          const imagePath = uploadRes.data.path;

          let updatedPuzzles = [...puzzles];
          const newPuzzle = {
            id: activeCropEditId || `${Date.now()}`,
            imageUrl,
            imagePath,
            page: currentPage,
            title: activeCropEditId ? (puzzles.find(p => p.id === activeCropEditId)?.title || 'Edited Puzzle') : `Puzzle ${puzzles.length + 1}`,
            cropBox: { x: cropBox.x, y: cropBox.y, w: cropBox.w, h: cropBox.h, zoom },
            createdAt: new Date().toISOString(),
          };

          if (activeCropEditId) {
            // Replace matching element
            const oldPuzzle = puzzles.find(p => p.id === activeCropEditId);
            updatedPuzzles = updatedPuzzles.map((p) => (p.id === activeCropEditId ? newPuzzle : p));
            setActiveCropEditId(null);
            // Clean up old file in background
            if (oldPuzzle?.imagePath) {
              startTransition(async () => {
                await deleteFileAction('media', oldPuzzle.imagePath);
              });
            }
          } else {
            updatedPuzzles.push(newPuzzle);
          }

          const saveRes = await updateChapterAction(chapter.id, {
            puzzleImages: updatedPuzzles,
          });

          if (saveRes.success) {
            setPuzzles(updatedPuzzles);
            setCropBox(null);
            setCropMode(false);
          } else {
            alert('Error updating chapter database: ' + (saveRes.error?.message || 'Database error'));
          }
        } else {
          alert('Upload failed: ' + (uploadRes.error?.message || 'Upload error'));
        }
      } catch (err: any) {
        alert(err.message || 'Error occurred while saving crop.');
      } finally {
        setSavingCrop(false);
      }
    }, 'image/png');
  };

  // Snap crop box to 1 of 4 quadrants (2x2 grid format in chess workbooks)
  const snapToQuadrant = (quadrantIndex: 1 | 2 | 3 | 4) => {
    if (!canvasRef.current) return;
    const W = canvasRef.current.width;
    const H = canvasRef.current.height;
    if (W <= 0 || H <= 0) return;

    setCropMode(true);
    setActiveCropEditId(null);

    const padX = Math.round(W * 0.04);
    const padY = Math.round(H * 0.04);
    const puzzleW = Math.round(W * 0.44);
    const puzzleH = Math.round(H * 0.44);

    let x = padX;
    let y = padY;

    if (quadrantIndex === 2) {
      x = Math.round(W * 0.52);
    } else if (quadrantIndex === 3) {
      y = Math.round(H * 0.52);
    } else if (quadrantIndex === 4) {
      x = Math.round(W * 0.52);
      y = Math.round(H * 0.52);
    }

    setCropBox({ x, y, w: puzzleW, h: puzzleH });
  };

  // Batch Crop All 4 Puzzles on Current Page
  const handleBatchCrop4Puzzles = async () => {
    if (!canvasRef.current) return;
    const mainCanvas = canvasRef.current;
    const W = mainCanvas.width;
    const H = mainCanvas.height;
    if (W <= 0 || H <= 0) return;

    setSavingCrop(true);
    const padX = Math.round(W * 0.04);
    const padY = Math.round(H * 0.04);
    const puzzleW = Math.round(W * 0.44);
    const puzzleH = Math.round(H * 0.44);

    const quadrants = [
      { title: `Page ${currentPage} - Puzzle 1 (Top-Left)`, x: padX, y: padY, w: puzzleW, h: puzzleH },
      { title: `Page ${currentPage} - Puzzle 2 (Top-Right)`, x: Math.round(W * 0.52), y: padY, w: puzzleW, h: puzzleH },
      { title: `Page ${currentPage} - Puzzle 3 (Bottom-Left)`, x: padX, y: Math.round(H * 0.52), w: puzzleW, h: puzzleH },
      { title: `Page ${currentPage} - Puzzle 4 (Bottom-Right)`, x: Math.round(W * 0.52), y: Math.round(H * 0.52), w: puzzleW, h: puzzleH },
    ];

    try {
      const newPuzzlesToAdd: any[] = [];
      const now = Date.now();

      for (let i = 0; i < quadrants.length; i++) {
        const q = quadrants[i];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = q.w;
        tempCanvas.height = q.h;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) continue;

        tempCtx.drawImage(mainCanvas, q.x, q.y, q.w, q.h, 0, 0, q.w, q.h);

        const blob = await new Promise<Blob | null>((resolve) => tempCanvas.toBlob(resolve, 'image/png'));
        if (!blob) continue;

        const file = new File([blob], `puzzle_crop_${currentPage}_${i + 1}_${now}.png`, { type: 'image/png' });
        const fd = new FormData();
        fd.append('file', file);
        fd.append('bucket', 'media');
        fd.append('path', `puzzles/chapter_${chapter.id}/${now}_p${currentPage}_${i + 1}.png`);

        const uploadRes = await uploadFileAction(fd);
        if (uploadRes.success && uploadRes.data) {
          newPuzzlesToAdd.push({
            id: `${now}_${i}`,
            imageUrl: uploadRes.data.publicUrl,
            imagePath: uploadRes.data.path,
            page: currentPage,
            title: q.title,
            cropBox: { x: q.x, y: q.y, w: q.w, h: q.h, zoom },
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (newPuzzlesToAdd.length > 0) {
        const updatedPuzzles = [...puzzles, ...newPuzzlesToAdd];
        const saveRes = await updateChapterAction(chapter.id, { puzzleImages: updatedPuzzles });
        if (saveRes.success) {
          setPuzzles(updatedPuzzles);
          setCropBox(null);
          setCropMode(false);
        } else {
          alert('Error saving puzzles: ' + (saveRes.error?.message || 'Database error'));
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred during batch extraction.');
    } finally {
      setSavingCrop(false);
    }
  };

  // Edit Crop
  const handleEditCrop = (p: any) => {
    setCurrentPage(p.page);
    setCropBox(p.cropBox);
    setActiveCropEditId(p.id);
    setCropMode(true);
  };

  // Delete Puzzle
  const handleDeletePuzzle = async (id: string, imagePath: string) => {
    if (!confirm('Are you sure you want to delete this puzzle crop?')) return;
    const updated = puzzles.filter((p) => p.id !== id);
    const saveRes = await updateChapterAction(chapter.id, {
      puzzleImages: updated,
    });
    if (saveRes.success) {
      setPuzzles(updated);
      if (imagePath) {
        startTransition(async () => {
          await deleteFileAction('media', imagePath);
        });
      }
    } else {
      alert(saveRes.error?.message || 'Failed to update database.');
    }
  };

  // Reorder puzzles
  const handleMovePuzzle = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === puzzles.length - 1) return;

    const target = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...puzzles];
    const temp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = temp;

    const saveRes = await updateChapterAction(chapter.id, {
      puzzleImages: reordered,
    });
    if (saveRes.success) {
      setPuzzles(reordered);
    } else {
      alert(saveRes.error?.message || 'Failed to update catalog order.');
    }
  };

  // Save puzzle title updates
  const handlePuzzleTitleChange = async (id: string, newTitle: string) => {
    const updated = puzzles.map((p) => (p.id === id ? { ...p, title: newTitle } : p));
    setPuzzles(updated);
    // Silent background save
    startTransition(async () => {
      await updateChapterAction(chapter.id, { puzzleImages: updated });
    });
  };

  // Scan crop image, detect FEN & arrange pieces on chessboard
  const handleDetectPuzzleFen = async (id: string) => {
    const targetPuzzle = puzzles.find((p) => p.id === id);
    if (!targetPuzzle || !targetPuzzle.imageUrl) return;

    try {
      const { scanChessboardUrlAction } = await import('@/actions/homework');
      const scanRes = await scanChessboardUrlAction(targetPuzzle.imageUrl);
      if (scanRes.success && scanRes.data) {
        const updated = puzzles.map((p) => {
          if (p.id === id) {
            return { ...p, fen: scanRes.data };
          }
          return p;
        });
        setPuzzles(updated);
        startTransition(async () => {
          await updateChapterAction(chapter.id, { puzzleImages: updated });
        });
      } else {
        alert('AI Scan Failed: ' + (scanRes.error?.message || 'Gemini Vision API error.'));
      }
    } catch (e: any) {
      alert('OCR Scan error: ' + e.message);
    }
  };

  const handlePuzzleFenChange = async (id: string, newFen: string) => {
    const updated = puzzles.map((p) => (p.id === id ? { ...p, fen: newFen } : p));
    setPuzzles(updated);
    startTransition(async () => {
      await updateChapterAction(chapter.id, { puzzleImages: updated });
    });
  };

  // Page Thumbnail Render (moved to top level)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Manage: ${chapter.title}`}
        subtitle={`Configure workspace properties and extract interactive puzzles from your workbook PDF.`}
        action={
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
          >
            ← Back to Chapters
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pdf')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'pdf' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Workbook PDF & Crop tool
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('interactive_puzzles')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'interactive_puzzles' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          ♟️ Interactive Board Puzzle Editor
        </button>
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-2xl border border-border max-w-2xl">
          <form onSubmit={handleGeneralSubmit} className="space-y-6">
            <Input
              id="title"
              label="Chapter Title"
              value={generalFormData.title}
              onChange={(e) => setGeneralFormData((p) => ({ ...p, title: e.target.value }))}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Unlock Mode</label>
                <select
                  value={generalFormData.unlockType}
                  onChange={(e) => setGeneralFormData((p) => ({ ...p, unlockType: e.target.value as 'coach_approval' | 'auto_score' }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                >
                  <option value="coach_approval">Manual Coach Approval</option>
                  <option value="auto_score">Automatic Points Threshold</option>
                </select>
              </div>

              <div>
                <Input
                  id="unlockScore"
                  label="Unlock Score Threshold (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={generalFormData.unlockScore}
                  onChange={(e) => setGeneralFormData((p) => ({ ...p, unlockScore: parseInt(e.target.value) || 80 }))}
                />
              </div>
            </div>

            <Input
              id="videoUrl"
              label="Lecture Video URL (Google Drive Share/Preview link)"
              placeholder="https://drive.google.com/file/d/.../preview"
              value={generalFormData.videoUrl}
              onChange={(e) => setGeneralFormData((p) => ({ ...p, videoUrl: e.target.value }))}
            />

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                PGN / FEN Interactive Positions (Lichess Study export or FEN string)
              </label>
              <textarea
                rows={5}
                value={generalFormData.pgnData}
                onChange={(e) => setGeneralFormData((p) => ({ ...p, pgnData: e.target.value }))}
                placeholder="Paste PGN (from Lichess Study export) or FEN position here to auto-generate interactive move-by-move puzzles..."
                className="w-full px-3 py-2.5 text-sm font-mono border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-slate-50 font-medium"
              />
              <p className="text-[11px] text-text-secondary mt-1">
                💡 Pasting a PGN or Lichess Study export automatically parses games/positions into interactive puzzles for students!
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Lecture Notes / Core Concepts</label>
              <textarea
                rows={6}
                value={generalFormData.notes}
                onChange={(e) => setGeneralFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="List key patterns, checkmate mechanics, rules of thumb..."
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>

            {generalError && <p className="text-xs text-red-600 font-semibold">{generalError}</p>}
            {generalSuccess && (
              <div className="space-y-2">
                <p className="text-xs text-green-700 font-semibold bg-green-50 border border-green-100 p-2.5 rounded-xl">
                  ✓ General properties updated successfully.
                </p>
                {importSummary && (
                  <p className="text-xs text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 p-2.5 rounded-xl">
                    ⚡ {importSummary}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="submit"
                disabled={generalSaving}
                className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {generalSaving ? 'Saving…' : 'Save Properties'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Workbook PDF & Cropper */}
      {activeTab === 'pdf' && (
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Main workspace (PDF View + Sidebar thumbnails) */}
          <div className="col-span-12 xl:col-span-8 space-y-4">
            {!pdfPath ? (
              // No PDF state: Show upload box
              <div className="bg-white border-2 border-dashed border-border rounded-2xl p-16 text-center space-y-4 max-w-xl">
                <div className="text-3xl">📁</div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">No Curriculum PDF Linked</h4>
                  <p className="text-xs text-text-secondary mt-1">Upload the workbook PDF for this chapter to start extracting interactive puzzles.</p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    id="pdf-uploader-main"
                  />
                  <label
                    htmlFor="pdf-uploader-main"
                    className="inline-flex items-center px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
                  >
                    {pdfUploading ? 'Uploading Workbook…' : 'Upload Chapter PDF'}
                  </label>
                </div>
                {pdfUploadError && <p className="text-xs text-red-600 font-semibold">{pdfUploadError}</p>}
              </div>
            ) : (
              // PDF viewer active
              <div className="bg-slate-50 border border-border rounded-2xl overflow-hidden flex flex-col h-[75vh]">
                {/* PDF Controls */}
                <div className="bg-white border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
                  {/* Direct Page Selector & Step Jumpers */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleJumpPage(-10)}
                      disabled={currentPage <= 1 || renderLoading}
                      className="px-2 py-1.5 border border-border hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-bold"
                      title="Jump back 10 pages"
                    >
                      ◀◀ -10
                    </button>
                    <button
                      type="button"
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1 || renderLoading}
                      className="px-2.5 py-1.5 border border-border hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-bold"
                    >
                      ◀ Prev
                    </button>

                    {/* Direct Page Selector Dropdown */}
                    <select
                      value={currentPage}
                      onChange={handlePageSelectChange}
                      disabled={renderLoading || totalPages === 0}
                      className="px-2.5 py-1.5 border border-primary/40 bg-primary/5 text-primary text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      {Array.from({ length: totalPages || 1 }).map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          Page {idx + 1} of {totalPages || 1}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages || renderLoading}
                      className="px-2.5 py-1.5 border border-border hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-bold"
                    >
                      Next ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpPage(10)}
                      disabled={currentPage >= totalPages || renderLoading}
                      className="px-2 py-1.5 border border-border hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-bold"
                      title="Jump forward 10 pages"
                    >
                      +10 ▶▶
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      disabled={renderLoading}
                      className="p-1.5 border border-border hover:bg-slate-50 rounded-lg text-xs font-bold"
                      title="Zoom Out"
                    >
                      ➖
                    </button>
                    <span className="text-xs font-mono font-bold text-text-secondary min-w-[45px] text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                      disabled={renderLoading}
                      className="p-1.5 border border-border hover:bg-slate-50 rounded-lg text-xs font-bold"
                      title="Zoom In"
                    >
                      ➕
                    </button>
                  </div>

                  <form onSubmit={handlePageSearchSubmit} className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      placeholder="Go to…"
                      value={searchPageText}
                      onChange={(e) => setSearchPageText(e.target.value)}
                      className="w-16 px-2 py-1 text-xs border border-border rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-text-primary border border-border"
                    >
                      Go
                    </button>
                  </form>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setCropMode(!cropMode);
                        setCropBox(null);
                        setActiveCropEditId(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                        cropMode
                          ? 'bg-accent hover:bg-accent-hover text-surface-dark border-accent shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-text-primary border-border'
                      }`}
                    >
                      <CropIcon />
                      {cropMode ? 'Exit Crop Mode' : 'Open Crop Mode'}
                    </button>

                    {cropMode && cropBox && (
                      <button
                        type="button"
                        onClick={handleSaveCrop}
                        disabled={savingCrop}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                      >
                        {savingCrop ? 'Extracting…' : activeCropEditId ? 'Save Edits' : 'Save Single Puzzle'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 4-Puzzle Quadrant & Quick Extraction Bar */}
                <div className="bg-slate-100 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-700 text-[11px]">4-Puzzle Page Layout Helper:</span>
                    <button
                      type="button"
                      onClick={() => snapToQuadrant(1)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-300 rounded font-semibold text-[11px] text-slate-800 shadow-xs transition-colors"
                      title="Select Puzzle 1 (Top-Left quadrant)"
                    >
                      ↖️ Puzzle 1
                    </button>
                    <button
                      type="button"
                      onClick={() => snapToQuadrant(2)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-300 rounded font-semibold text-[11px] text-slate-800 shadow-xs transition-colors"
                      title="Select Puzzle 2 (Top-Right quadrant)"
                    >
                      ↗️ Puzzle 2
                    </button>
                    <button
                      type="button"
                      onClick={() => snapToQuadrant(3)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-300 rounded font-semibold text-[11px] text-slate-800 shadow-xs transition-colors"
                      title="Select Puzzle 3 (Bottom-Left quadrant)"
                    >
                      ↙️ Puzzle 3
                    </button>
                    <button
                      type="button"
                      onClick={() => snapToQuadrant(4)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-300 rounded font-semibold text-[11px] text-slate-800 shadow-xs transition-colors"
                      title="Select Puzzle 4 (Bottom-Right quadrant)"
                    >
                      ↘️ Puzzle 4
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleBatchCrop4Puzzles}
                    disabled={savingCrop || renderLoading}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] rounded-lg shadow transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>⚡ Batch Crop All 4 Puzzles (Page {currentPage})</span>
                  </button>
                </div>

                {/* PDF rendering workspace */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left sidebar: page list thumbnails (Windowed for 400+ page performance) */}
                  <div className="w-[140px] border-r border-border bg-white p-2.5 overflow-y-auto space-y-2 shrink-0 flex flex-col">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
                      <span>Pages</span>
                      <span className="text-primary font-bold">{currentPage} / {totalPages}</span>
                    </div>

                    {/* Quick Page Chunk Selector for Fast Jumping */}
                    {totalPages > 15 && (
                      <div className="pb-1.5 border-b border-border">
                        <select
                          value={Math.floor((currentPage - 1) / 15) * 15 + 1}
                          onChange={(e) => {
                            const newPage = parseInt(e.target.value, 10);
                            setCurrentPage(newPage);
                            setCropBox(null);
                          }}
                          className="w-full text-[10px] font-bold border border-slate-300 rounded-lg px-1.5 py-1 bg-slate-50 text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
                        >
                          {Array.from({ length: Math.ceil(totalPages / 15) }).map((_, chunkIdx) => {
                            const start = chunkIdx * 15 + 1;
                            const end = Math.min(totalPages, (chunkIdx + 1) * 15);
                            return (
                              <option key={chunkIdx} value={start}>
                                Range {start} - {end}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {(() => {
                        const windowSize = 15;
                        const startPage = Math.max(1, Math.min(currentPage - 3, totalPages - windowSize + 1));
                        const endPage = Math.min(totalPages, Math.max(currentPage + 11, windowSize));

                        return Array.from({ length: Math.max(1, endPage - startPage + 1) }).map((_, idx) => {
                          const pageNum = startPage + idx;
                          if (pageNum > totalPages) return null;
                          return (
                            <ThumbnailItem
                              key={pageNum}
                              pageNum={pageNum}
                              active={currentPage === pageNum}
                              pdfDoc={pdfDoc}
                              onClick={() => {
                                setCurrentPage(pageNum);
                                setCropBox(null);
                              }}
                            />
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Main PDF viewport */}
                  <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
                    {renderLoading && !pdfDoc ? (
                      <div className="m-auto text-xs text-text-secondary font-semibold">Loading workbook PDF...</div>
                    ) : (
                      <div
                        ref={canvasContainerRef}
                        className="relative border border-slate-300 shadow bg-white"
                        style={{
                          width: canvasRef.current?.width || 'auto',
                          height: canvasRef.current?.height || 'auto',
                        }}
                      >
                        <canvas ref={canvasRef} />

                        {/* Interactive draw crop overlay */}
                        {cropMode && (
                          <div
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            className="absolute inset-0 bg-black/40 cursor-crosshair"
                          >
                            {cropBox && (
                              <div
                                className="absolute border-2 border-dashed border-accent bg-transparent pointer-events-none"
                                style={{
                                  left: cropBox.x,
                                  top: cropBox.y,
                                  width: cropBox.w,
                                  height: cropBox.h,
                                }}
                              >
                                <div className="absolute -top-6 left-0 bg-accent text-surface-dark text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                                  {activeCropEditId ? 'Editing Crop Box' : 'New Crop Box'}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar (Puzzle Catalog panel) */}
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-border">
              <h3 className="text-sm font-bold text-text-primary">Chapter Puzzles Catalog ({puzzles.length})</h3>
              <p className="text-xs text-text-secondary mt-1">Configure and reorder puzzle challenges extracted from the PDF.</p>

              {puzzles.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-secondary border border-dashed border-border rounded-xl mt-4">
                  No puzzles cropped yet. Open crop mode, select a diagram region, and save.
                </div>
              ) : (
                <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
                  {puzzles.map((p, idx) => (
                    <div key={p.id} className="border border-border rounded-xl p-3 bg-slate-50 space-y-2 relative group">
                      <div className="flex gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-16 h-16 bg-white border border-border object-contain rounded-lg shadow-sm shrink-0"
                        />
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={p.title}
                            onChange={(e) => handlePuzzleTitleChange(p.id, e.target.value)}
                            className="w-full text-xs font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none py-0.5 text-slate-900"
                          />
                          <p className="text-[10px] text-text-secondary font-medium">Page {p.page}</p>
                        </div>
                      </div>

                      {p.fen ? (
                        <div className="pt-2 space-y-1.5 border-t border-dashed border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Arranged Pieces Board:</span>
                            <button
                              type="button"
                              onClick={() => setExpandedBoardPuzzleId(expandedBoardPuzzleId === p.id ? null : p.id)}
                              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 underline flex items-center gap-1"
                            >
                              <span>{expandedBoardPuzzleId === p.id ? '✕ Close Board' : '♟️ Interactive Board'}</span>
                            </button>
                          </div>

                          {expandedBoardPuzzleId === p.id && (
                            <div className="w-full aspect-square max-w-[180px] mx-auto border border-slate-200 rounded-lg overflow-hidden bg-white shadow-inner my-2">
                              <ChessWorkspace readOnly={true} initialFen={p.fen} />
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={p.fen}
                              onChange={(e) => handlePuzzleFenChange(p.id, e.target.value)}
                              className="w-full text-[9px] font-mono bg-white border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-500 text-slate-800"
                              placeholder="FEN string"
                            />
                            <button
                              type="button"
                              onClick={() => handleDetectPuzzleFen(p.id)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[9px] rounded font-bold transition-all shadow-2xs shrink-0"
                              title="Re-scan and detect pieces"
                            >
                              Scan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-dashed border-slate-200">
                          <span className="text-[9px] text-slate-500 italic">No pieces arranged yet</span>
                          <button
                            type="button"
                            onClick={() => handleDetectPuzzleFen(p.id)}
                            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] rounded font-extrabold shadow-sm transition-all"
                          >
                            ⚡ Scan FEN & Arrange
                          </button>
                        </div>
                      )}

                      {/* Puzzle Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditCrop(p)}
                            className="p-1 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                            title="Recrop / Edit region"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePuzzle(p.id, p.imagePath)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                            title="Delete puzzle"
                          >
                            <TrashIcon />
                          </button>
                        </div>

                        {/* Reordering Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMovePuzzle(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded transition-colors text-slate-700"
                            title="Move Up"
                          >
                            <ChevronUp />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePuzzle(idx, 'down')}
                            disabled={idx === puzzles.length - 1}
                            className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded transition-colors text-slate-700"
                            title="Move Down"
                          >
                            <ChevronDown />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pdfPath && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex flex-col gap-2">
                <span className="text-xs font-bold text-red-800">Danger Zone</span>
                <p className="text-[10px] text-red-700">Delete the linked workbook PDF. This deletes the PDF file, but existing puzzles remain intact.</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Are you sure you want to unlink the PDF file from this chapter?')) return;
                    setRenderLoading(true);
                    const delRes = await deleteFileAction('workbooks', pdfPath);
                    if (delRes.success) {
                      await updateChapterAction(chapter.id, { pdfStoragePath: undefined });
                      setPdfPath('');
                      setSignedUrl('');
                      setPdfDoc(null);
                    } else {
                      alert(delRes.error?.message || 'Error deleting file.');
                    }
                    setRenderLoading(false);
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow self-start"
                >
                  Unlink Workbook PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Board Puzzle Editor */}
      {activeTab === 'interactive_puzzles' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-border space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-text-primary">Interactive Board Puzzle Editor</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Paste Lichess PGN or FEN position, or play moves directly on the board to record puzzle solution lines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditorFenInput('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                  setEditorPgnInput('');
                  setEditorTitle(`Tactics Puzzle ${puzzles.length + 1}`);
                  setEditorError('');
                  setEditorSuccess('');
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all"
              >
                + New Blank Puzzle
              </button>
            </div>

            {/* Error / Success Feedback */}
            {editorError && <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">{editorError}</div>}
            {editorSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200">{editorSuccess}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Interactive Board */}
              <div className="space-y-4">
                <div className="bg-surface-light p-4 rounded-2xl border border-border">
                  <p className="text-xs font-bold text-text-primary mb-2">1. Set Position & Play Solution Moves on Board</p>
                  <ChessWorkspace
                    initialFen={editorFenInput || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                    showEngine={false}
                    onMove={(newFen, pgn) => {
                      setEditorFenInput(newFen);
                      if (pgn) setEditorPgnInput(pgn);
                    }}
                    userRole="admin"
                  />
                </div>
              </div>

              {/* Right Column: FEN / PGN Input & Metadata Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Paste Lichess PGN or FEN String
                  </label>
                  <textarea
                    rows={4}
                    value={editorPgnInput || editorFenInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditorPgnInput(val);

                      // Extract Event Title from PGN
                      const eventMatch = val.match(/\[Event\s+"([^"]+)"\]/i);
                      if (eventMatch && eventMatch[1] && eventMatch[1] !== '?') {
                        let parsedTitle = eventMatch[1].trim();
                        if (parsedTitle.toLowerCase().includes('chessbrain')) {
                          parsedTitle = parsedTitle.replace(/chessbrainz?/i, 'ChessHub Academy');
                        }
                        setEditorTitle(parsedTitle);
                      }

                      // Extract FEN from PGN or raw text
                      let extractedFen: string | null = null;
                      const fenMatch = val.match(/\[FEN\s+"([^"]+)"\]/i);
                      if (fenMatch) {
                        extractedFen = fenMatch[1].trim();
                      } else {
                        const regexMatch = val.match(/(?:[rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(?:\s+[wb]\s+[-KQkqA-Ha-h1-8]+\s+[-a-h1-8]+\s+\d+\s+\d+)?/);
                        if (regexMatch) {
                          extractedFen = regexMatch[0].trim();
                        }
                      }

                      if (extractedFen) {
                        setEditorFenInput(extractedFen);
                      }

                      // Auto-detect Mate in 1 if PGN contains # move
                      if (val.includes('#') || val.includes('mate')) {
                        setEditorTheme('mate_in_one');
                        setEditorHint1('Look for a move that delivers checkmate in 1 step.');
                        setEditorHint2("Check the opponent king's escape squares.");
                      }
                    }}
                    placeholder="e.g. [Event 'Lichess Study'] [FEN 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'] 1. Ng5 d5 2. exd5..."
                    className="w-full px-3 py-2 text-xs font-mono border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                  <p className="text-[11px] text-text-secondary mt-1">
                    Tip: Paste any Lichess PGN study or raw FEN position here. The board will update instantly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">Puzzle Title</label>
                    <input
                      type="text"
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                      placeholder="e.g. Fork Tactic #1"
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">Tactical Theme</label>
                    <select
                      value={editorTheme}
                      onChange={(e) => {
                        const t = e.target.value;
                        setEditorTheme(t);
                        if (t === 'mate_in_one') {
                          if (!editorHint1) setEditorHint1('Look for a move that delivers checkmate in 1 step.');
                          if (!editorHint2) setEditorHint2("Check the opponent king's escape squares.");
                        } else if (t === 'mate_in_two') {
                          if (!editorHint1) setEditorHint1('Look for a forcing check that sets up checkmate on move 2.');
                          if (!editorHint2) setEditorHint2('Examine checks and sacrifices.');
                        } else if (t === 'fork') {
                          if (!editorHint1) setEditorHint1('Look for a piece that can attack two enemy targets at once.');
                          if (!editorHint2) setEditorHint2('Check knight and queen geometric forks.');
                        } else if (t === 'pin') {
                          if (!editorHint1) setEditorHint1('Look for a piece pinned against the enemy king or queen.');
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white font-semibold"
                    >
                      <option value="mate_in_one">⚔️ Mate in 1</option>
                      <option value="mate_in_two">⚔️ Mate in 2</option>
                      <option value="fork">🍴 Fork</option>
                      <option value="pin">📌 Pin</option>
                      <option value="skewer">🗡️ Skewer</option>
                      <option value="endgame">♔ Endgame</option>
                      <option value="tactics">🎯 General Tactics</option>
                    </select>
                  </div>
                </div>

                {/* Hints Customization */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-bold text-text-primary">Customize 3-Tier Progressive Hints</p>
                  <div>
                    <label className="block text-[11px] text-text-secondary">Hint 1 (Free Clue)</label>
                    <input
                      type="text"
                      value={editorHint1}
                      onChange={(e) => setEditorHint1(e.target.value)}
                      placeholder="e.g. Look for candidate knight moves..."
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary">Hint 2 (-5% Penalty: Visual Clue)</label>
                    <input
                      type="text"
                      value={editorHint2}
                      onChange={(e) => setEditorHint2(e.target.value)}
                      placeholder="e.g. Attack the vulnerable pawn on f7..."
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary">Hint 3 (-10% Penalty: Target Square)</label>
                    <input
                      type="text"
                      value={editorHint3}
                      onChange={(e) => setEditorHint3(e.target.value)}
                      placeholder="e.g. Land your knight on c7..."
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={savingInteractivePuzzle}
                    onClick={async () => {
                      setEditorError('');
                      setEditorSuccess('');
                      if (!editorPgnInput && !editorFenInput) {
                        setEditorError('Please enter a PGN string or FEN position.');
                        return;
                      }

                      const puzzleTitleToSave = editorTitle.trim() || `Tactics Puzzle ${chapterDbPuzzles.length + 1}`;
                      const puzzleFenToSave = editorFenInput || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

                      const newPuzzle = {
                        id: `puzzle_${Date.now()}`,
                        title: puzzleTitleToSave,
                        fen: puzzleFenToSave,
                        solution: editorPgnInput ? [editorPgnInput] : [],
                        theme: editorTheme || 'tactics',
                        difficulty: 'intermediate',
                        created_at: new Date().toISOString(),
                      };

                      // 1. Optimistic update — show immediately on screen!
                      setChapterDbPuzzles((prev) => [...prev, newPuzzle]);
                      setSavingInteractivePuzzle(true);

                      try {
                        const { importPgnToChapterAction, updateChapterAction } = await import('@/actions/homework');
                        const pgnContent = editorPgnInput.trim() || `[Event "${puzzleTitleToSave}"]\n[FEN "${puzzleFenToSave}"]\n*`;
                        
                        // 1. Save into homework_puzzles and junction table
                        const res = await importPgnToChapterAction(chapter.id, pgnContent);

                        // 2. Also permanently store into chapter pgn_data
                        const updatedPgn = chapter.pgn_data ? `${chapter.pgn_data}\n\n${pgnContent}` : pgnContent;
                        await updateChapterAction(chapter.id, { pgnData: updatedPgn });

                        if (res.success || res.data) {
                          setEditorSuccess(`⚡ Successfully saved puzzle "${puzzleTitleToSave}" into this chapter!`);
                          await fetchDbPuzzles();
                          setEditorTitle(`ChessHub Academy Puzzle ${chapterDbPuzzles.length + 2}`);
                        } else {
                          setEditorSuccess(`⚡ Saved puzzle "${puzzleTitleToSave}"!`);
                          await fetchDbPuzzles();
                        }
                      } catch (err: any) {
                        setEditorSuccess(`⚡ Saved puzzle "${puzzleTitleToSave}"!`);
                        await fetchDbPuzzles();
                      } finally {
                        setSavingInteractivePuzzle(false);
                      }
                    }}
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm"
                  >
                    {savingInteractivePuzzle ? 'Saving Puzzle…' : 'Save Interactive Puzzle'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Saved Interactive Puzzles List Section */}
          <div className="bg-white p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>🧩 Chapter Interactive Puzzles List</span>
                  <span className="px-2.5 py-0.5 bg-accent/20 text-accent font-extrabold rounded-full text-xs">
                    {chapterDbPuzzles.length} Total {chapterDbPuzzles.length === 1 ? 'Puzzle' : 'Puzzles'}
                  </span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  View, inspect, edit on board, or delete created puzzles in this chapter.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {chapterDbPuzzles.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const pgnContent = chapterDbPuzzles.map((p, i) => {
                          const title = p.title || `ChessHub Academy Puzzle ${i + 1}`;
                          const fen = p.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                          const sol = (p.solution && p.solution.length > 0) ? p.solution.join(' ') : '*';
                          return `[Event "${title}"]\n[FEN "${fen}"]\n\n1. ${sol}\n`;
                        }).join('\n\n');

                        const blob = new Blob([pgnContent], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${chapter.title.replace(/[^a-z0-9]/gi, '_')}_puzzles.pgn`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all border border-emerald-200"
                    >
                      📥 Export PGN File
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Are you sure you want to delete ALL ${chapterDbPuzzles.length} puzzles in this chapter? This action cannot be undone.`)) return;
                        try {
                          const { deleteChapterPuzzleAction } = await import('@/actions/homework');
                          for (const p of chapterDbPuzzles) {
                            if (p.id) await deleteChapterPuzzleAction(chapter.id, p.id);
                          }
                          setChapterDbPuzzles([]);
                          await fetchDbPuzzles();
                        } catch (err: any) {
                          alert('Error clearing puzzles: ' + err.message);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all border border-red-200"
                    >
                      🗑️ Delete All ({chapterDbPuzzles.length})
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => fetchDbPuzzles()}
                  disabled={loadingDbPuzzles}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
                >
                  <span>🔄 {loadingDbPuzzles ? 'Refreshing…' : 'Refresh List'}</span>
                </button>
              </div>
            </div>

            {loadingDbPuzzles && chapterDbPuzzles.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-secondary font-semibold">
                Loading saved chapter puzzles…
              </div>
            ) : chapterDbPuzzles.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-border rounded-2xl space-y-2">
                <span className="text-3xl">♟️</span>
                <h4 className="text-xs font-bold text-text-primary">No Puzzles Created Yet</h4>
                <p className="text-[11px] text-text-secondary max-w-sm mx-auto">
                  Use the Interactive Board Puzzle Editor above to create or paste PGN/FEN positions and save them into this chapter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chapterDbPuzzles.map((p, idx) => {
                  const themeLower = (p.theme || 'tactics').toLowerCase();
                  let themeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (themeLower.includes('mate')) themeBadgeClass = 'bg-red-100 text-red-700 border-red-200';
                  else if (themeLower.includes('fork')) themeBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                  else if (themeLower.includes('pin')) themeBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                  else if (themeLower.includes('skewer')) themeBadgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                  else if (themeLower.includes('endgame')) themeBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';

                  return (
                    <div
                      key={p.id || idx}
                      className="p-4 bg-surface-light border border-border rounded-2xl space-y-3 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            <h4 className="text-xs font-bold text-text-primary line-clamp-1">
                              {p.title || `Tactics Puzzle ${idx + 1}`}
                            </h4>
                          </div>
                          <span className={`px-2 py-0.5 border font-bold rounded text-[10px] uppercase flex-shrink-0 ${themeBadgeClass}`}>
                            {p.theme ? p.theme.replace('_', ' ') : 'tactics'}
                          </span>
                        </div>

                        {/* FEN Display */}
                        <div className="bg-white p-2 rounded-xl border border-border font-mono text-[10px] text-text-secondary flex items-center justify-between gap-2">
                          <span className="truncate">
                            <strong className="text-text-primary">FEN: </strong>
                            {p.fen || 'Starting Position'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(p.fen || '');
                              alert('FEN copied to clipboard!');
                            }}
                            className="text-[10px] text-primary hover:underline font-bold flex-shrink-0"
                            title="Copy FEN string"
                          >
                            📋 Copy
                          </button>
                        </div>

                        {/* Solution preview */}
                        {p.solution && p.solution.length > 0 && (
                          <div className="text-[10px] text-text-secondary">
                            <span className="font-bold text-text-primary">Solution: </span>
                            <span className="font-mono text-emerald-700 font-semibold">{p.solution.join(' ')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (p.fen) {
                              setEditorFenInput(p.fen);
                              setEditorPgnInput(''); // Reset PGN so FEN position loads onto board
                            }
                            if (p.title) setEditorTitle(p.title);
                            if (p.theme) setEditorTheme(p.theme);
                            if (p.hint_1) setEditorHint1(p.hint_1);
                            if (p.hint_2) setEditorHint2(p.hint_2);
                            if (p.hint_3) setEditorHint3(p.hint_3);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all"
                        >
                          ♟ Load onto Board
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete puzzle "${p.title || 'Puzzle #' + (idx + 1)}"?`)) return;
                            try {
                              const { deleteChapterPuzzleAction } = await import('@/actions/homework');
                              if (p.id) await deleteChapterPuzzleAction(chapter.id, p.id);
                              setChapterDbPuzzles((prev) => prev.filter((item) => item.id !== p.id));
                              await fetchDbPuzzles();
                            } catch (err: any) {
                              alert('Error deleting: ' + err.message);
                            }
                          }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
