'use client';

import React from 'react';

interface ClassroomThemeModalProps {
  isOpen: boolean;
  activeTheme: string;
  onSelectTheme: (theme: string) => void;
  onClose: () => void;
}

const THEMES = [
  { id: 'navy', name: 'Dark Navy (Default)', darkSquare: '#2b2b4c', lightSquare: '#dedeff', icon: '🎨' },
  { id: 'wood', name: 'Classic Wood', darkSquare: '#b58863', lightSquare: '#f0d9b5', icon: '🪵' },
  { id: 'green', name: 'Tournament Green', darkSquare: '#769656', lightSquare: '#eeeed2', icon: '🟩' },
  { id: 'glass', name: 'Midnight Glass', darkSquare: '#1e1e38', lightSquare: '#383868', icon: '🌌' },
];

export default function ClassroomThemeModal({
  isOpen,
  activeTheme,
  onSelectTheme,
  onClose,
}: ClassroomThemeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#0f0f24] border border-[#2a2a52] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-[#222248] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h3 className="font-extrabold text-sm text-white">Board Theme Customization</h3>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-[#8888aa] hover:text-white">✕</button>
        </div>

        <div className="space-y-2.5">
          {THEMES.map((theme) => {
            const isSelected = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isSelected ? 'bg-[#1e1e3d] border-emerald-500 ring-1 ring-emerald-500' : 'bg-[#080816] border-[#222248] hover:border-[#3a3a6e]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{theme.icon}</span>
                  <span className="text-xs font-bold text-white">{theme.name}</span>
                </div>
                {/* Preview color swatch */}
                <div className="flex w-8 h-8 rounded-lg overflow-hidden border border-white/20 shrink-0">
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.lightSquare }} />
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.darkSquare }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
