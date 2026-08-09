'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ClassroomScreenShareModalProps {
  isOpen: boolean;
  stream: MediaStream | null;
  coachName: string;
  onClose: () => void;
}

export default function ClassroomScreenShareModal({
  isOpen,
  stream,
  coachName,
  onClose,
}: ClassroomScreenShareModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, stream]);

  if (!isOpen || !stream) return null;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(300, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(75, z - 25));
  const handleResetZoom = () => setZoomLevel(100);

  const toggleNativeFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      } else {
        containerRef.current.requestFullscreen?.().catch(() => {});
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-[#0f0f1f] border border-[#222244] px-4 py-2.5 rounded-2xl mb-3 text-white shadow-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold text-sm">
            💻
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-sm text-white">
              {coachName}&apos;s Live Screen Share
            </h3>
            <p className="text-[10px] text-slate-400">High-Definition 1080p Stream · Zoom Level: <strong className="text-amber-400">{zoomLevel}%</strong></p>
          </div>
        </div>

        {/* Zoom Controls Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#1a1a32] p-1 rounded-xl border border-[#2a2a4a]">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 75}
              className="px-2.5 py-1 bg-[#252548] hover:bg-[#32325c] disabled:opacity-40 text-white font-extrabold text-xs rounded-lg transition-all"
              title="Zoom Out (-25%)"
            >
              🔍 -
            </button>
            <span className="text-xs font-mono font-extrabold text-amber-400 px-2 min-w-[50px] text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 300}
              className="px-2.5 py-1 bg-[#252548] hover:bg-[#32325c] disabled:opacity-40 text-white font-extrabold text-xs rounded-lg transition-all"
              title="Zoom In (+25%)"
            >
              🔍 +
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 bg-[#121224] hover:bg-[#1a1a32] text-slate-300 text-[10px] font-bold rounded-lg border border-[#2a2a4a]"
              title="Reset Zoom to 100%"
            >
              100%
            </button>
          </div>

          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className="px-3 py-1.5 bg-[#1a1a32] hover:bg-[#252548] border border-[#2a2a4a] text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            ⛶ Native Fullscreen
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-white font-extrabold flex items-center justify-center text-sm transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Screen Share Interactive Zoom Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full bg-black rounded-2xl border border-[#222244] overflow-auto relative flex items-center justify-center shadow-2xl"
      >
        <div
          className="transition-transform duration-150 origin-center flex items-center justify-center min-w-full min-h-full"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
