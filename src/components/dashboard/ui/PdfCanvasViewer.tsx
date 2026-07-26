'use client';

import React, { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';

interface PdfCanvasViewerProps {
  signedUrl: string;
}

export default function PdfCanvasViewer({ signedUrl }: PdfCanvasViewerProps) {
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [renderLoading, setRenderLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load PDF.js dynamically
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
      setLoadError('Failed to load workbook reader scripts.');
    };
    document.head.appendChild(script);
  }, []);

  // Load PDF document once PDF.js is ready and signedUrl is available
  useEffect(() => {
    if (!pdfjsReady || !signedUrl) return;
    let active = true;
    const loadDoc = async () => {
      try {
        setRenderLoading(true);
        setLoadError('');
        const loadingTask = (window as any).pdfjsLib.getDocument(signedUrl);
        const doc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setLoadError('Failed to load workbook. Please try again.');
      } finally {
        if (active) setRenderLoading(false);
      }
    };
    loadDoc();
    return () => {
      active = false;
    };
  }, [pdfjsReady, signedUrl]);

  // Render active page when document, page number, or zoom changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let activeRender = true;

    const renderPage = async () => {
      try {
        setRenderLoading(true);
        const page = await pdfDoc.getPage(currentPage);
        if (!activeRender || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Render at high resolution based on zoom
        const viewport = page.getViewport({ scale: zoom * 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      } finally {
        if (activeRender) setRenderLoading(false);
      }
    };

    renderPage();

    return () => {
      activeRender = false;
    };
  }, [pdfDoc, currentPage, zoom]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-slate-50 flex flex-col h-[500px]">
      {/* Reader Controls Header */}
      <div className="bg-white border-b border-border p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-text-primary">Workbook Viewer</span>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 10))}
            disabled={currentPage <= 1 || renderLoading}
            className="px-2 py-1 text-[11px] font-bold"
            title="Jump back 10 pages"
          >
            ≪ -10
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || renderLoading}
            className="px-2.5 py-1 text-[11px] font-bold"
          >
            ← Prev
          </Button>

          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
            disabled={renderLoading || totalPages === 0}
            className="px-2 py-1 border border-border bg-slate-50 text-text-primary text-xs font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {Array.from({ length: totalPages || 1 }).map((_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                Page {idx + 1} of {totalPages || 1}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || renderLoading}
            className="px-2.5 py-1 text-[11px] font-bold"
          >
            Next →
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 10))}
            disabled={currentPage >= totalPages || renderLoading}
            className="px-2 py-1 text-[11px] font-bold"
            title="Jump forward 10 pages"
          >
            +10 ≫
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5 || renderLoading}
            className="w-8 h-8 flex items-center justify-center p-0 font-bold"
            title="Zoom Out"
          >
            －
          </Button>
          <span className="font-semibold text-text-secondary w-10 text-center text-[10px]">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2.5 || renderLoading}
            className="w-8 h-8 flex items-center justify-center p-0 font-bold"
            title="Zoom In"
          >
            ＋
          </Button>
        </div>
      </div>

      {/* Reader Page Viewport */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center relative">
        {renderLoading && (
          <div className="absolute inset-0 bg-slate-50/70 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[10px] text-text-secondary font-semibold">Loading workbook page...</span>
            </div>
          </div>
        )}

        {loadError ? (
          <div className="m-auto text-center p-6 space-y-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-xs font-semibold text-text-primary">{loadError}</p>
          </div>
        ) : !signedUrl ? (
          <p className="text-xs text-text-secondary italic m-auto">No workbook PDF available.</p>
        ) : (
          <div className="bg-white p-2 rounded-xl shadow-sm border border-border">
            <canvas ref={canvasRef} className="max-w-full h-auto rounded" />
          </div>
        )}
      </div>
    </div>
  );
}
