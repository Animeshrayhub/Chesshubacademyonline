'use client';

import React, { useState, useEffect, useRef } from 'react';

export type BackgroundType = 'none' | 'blur' | 'wood' | 'library' | 'neon' | 'custom';

interface ClassroomVirtualBackgroundModalProps {
  isOpen: boolean;
  currentBgType: BackgroundType;
  currentCustomUrl?: string;
  onClose: () => void;
  onApplyBackground: (bgType: BackgroundType, customUrl?: string) => void;
}

const PRESET_BACKGROUNDS = [
  { id: 'none', label: 'None (Original)', icon: '📷', preview: '' },
  { id: 'blur', label: 'Background Blur', icon: '✨', preview: '' },
  { id: 'wood', label: 'Classic Wood', icon: '🪵', preview: "https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png" },
  { id: 'library', label: 'Chess Library', icon: '📚', preview: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=500&fit=crop&q=85" },
  { id: 'neon', label: 'Cyberpunk Arena', icon: '⚡', preview: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=500&fit=crop&q=85" },
];

export default function ClassroomVirtualBackgroundModal({
  isOpen,
  currentBgType,
  currentCustomUrl,
  onClose,
  onApplyBackground,
}: ClassroomVirtualBackgroundModalProps) {
  const [selectedType, setSelectedType] = useState<BackgroundType>(currentBgType);
  const [customUrl, setCustomUrl] = useState<string>(currentCustomUrl || '');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          setPreviewStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {});
    } else {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
        setPreviewStream(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setCustomUrl(result);
          setSelectedType('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const activeWallpaperUrl = selectedType === 'custom'
    ? customUrl
    : PRESET_BACKGROUNDS.find((b) => b.id === selectedType)?.preview;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f1f] border border-[#222244] rounded-3xl p-6 w-full max-w-xl shadow-2xl text-white space-y-5">
        <div className="flex justify-between items-center border-b border-[#222244] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
              🖼️
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-white">Virtual Video Background</h3>
              <p className="text-xs text-slate-400">Apply blur or academy wallpapers to your camera feed</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-[#1e1e3e] hover:bg-[#2a2a4e] text-white flex items-center justify-center font-bold">
            ✕
          </button>
        </div>

        {/* Camera Preview */}
        <div className="relative w-full h-52 bg-[#0a0a1a] rounded-2xl overflow-hidden border border-[#222244] flex items-center justify-center group shadow-inner">
          {activeWallpaperUrl && selectedType !== 'none' && selectedType !== 'blur' && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-all"
              style={{ backgroundImage: `url(${activeWallpaperUrl})` }}
            />
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`relative z-10 w-full h-full object-cover transition-all ${
              selectedType === 'blur' ? 'blur-md opacity-90 scale-105' : selectedType !== 'none' ? 'opacity-85' : ''
            }`}
          />

          {/* ChessHub Watermark Overlay */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur rounded-lg border border-amber-500/30">
            <span className="text-xs">♟️</span>
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">ChessHub Academy</span>
          </div>
        </div>

        {/* Presets Selector Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {PRESET_BACKGROUNDS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedType(preset.id as BackgroundType)}
              className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1 transition-all ${
                selectedType === preset.id
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                  : 'bg-[#1a1a32] border-[#2a2a4a] text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="text-xl">{preset.icon}</span>
              <span className="text-xs font-bold text-center">{preset.label}</span>
            </button>
          ))}

          {/* Custom Upload Button */}
          <label className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
            selectedType === 'custom'
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
              : 'bg-[#1a1a32] border-[#2a2a4a] text-slate-300 hover:border-slate-600'
          }`}>
            <span className="text-xl">📤</span>
            <span className="text-xs font-bold text-center">Custom Image</span>
            <input type="file" accept="image/*" onChange={handleCustomUpload} className="hidden" />
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[#222244]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#1a1a32] hover:bg-[#252548] text-slate-300 text-xs font-bold rounded-xl transition-all">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyBackground(selectedType, customUrl);
              onClose();
            }}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all"
          >
            Apply Background
          </button>
        </div>
      </div>
    </div>
  );
}
