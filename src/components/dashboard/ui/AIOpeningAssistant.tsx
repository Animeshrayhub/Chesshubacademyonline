'use client';

import React, { useState } from 'react';

interface OpeningIdea {
  title: string;
  moves: string;
  color: 'White' | 'Black';
  style: string;
  keyIdea: string;
}

export default function AIOpeningAssistant() {
  const [selectedColor, setSelectedColor] = useState<'White' | 'Black'>('White');
  const [selectedStyle, setSelectedStyle] = useState('Tactical & Aggressive');

  const openings: OpeningIdea[] = [
    {
      title: 'The Italian Game (Evan’s Gambit)',
      moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4!?',
      color: 'White',
      style: 'Tactical & Aggressive',
      keyIdea: 'Sacrifice a pawn early on b4 to build a massive pawn center with c3 and d4 for rapid attack!',
    },
    {
      title: 'The Queen’s Gambit',
      moves: '1. d4 d5 2. c4!',
      color: 'White',
      style: 'Positional & Solid',
      keyIdea: 'Offer a wing pawn to gain central space and develop knights & bishops efficiently.',
    },
    {
      title: 'The Sicilian Defense (Dragon Variation)',
      moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
      color: 'Black',
      style: 'Tactical & Aggressive',
      keyIdea: 'Fianchetto dark-squared bishop on g7 to create powerful counter-attacks on White’s queenside.',
    },
    {
      title: 'The French Defense (Solid Structure)',
      moves: '1. e4 e6 2. d4 d5',
      color: 'Black',
      style: 'Positional & Solid',
      keyIdea: 'Build a solid pawn chain e6-d5 and strike back with c5 to undermine White’s central pawns.',
    },
  ];

  const filtered = openings.filter(
    (o) => o.color === selectedColor && (o.style === selectedStyle || selectedStyle === 'All')
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shadow-md">
            🤖
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-cyan-400">
              AI Opening Repertoire Assistant
            </h3>
            <p className="text-xs text-slate-400">
              Find custom recommended openings tailored to your play style!
            </p>
          </div>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Piece Color</label>
          <div className="flex bg-slate-900 rounded-xl p-1 gap-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedColor('White')}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedColor === 'White' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ♔ White
            </button>
            <button
              type="button"
              onClick={() => setSelectedColor('Black')}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedColor === 'Black' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ♚ Black
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Play Style</label>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="Tactical & Aggressive">Tactical & Aggressive</option>
            <option value="Positional & Solid">Positional & Solid</option>
            <option value="All">All Styles</option>
          </select>
        </div>
      </div>

      {/* Opening Cards */}
      <div className="space-y-3">
        {filtered.map((op, idx) => (
          <div key={idx} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-cyan-300">{op.title}</h4>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                {op.style}
              </span>
            </div>
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850 font-mono text-xs text-amber-400">
              {op.moves}
            </div>
            <p className="text-xs text-slate-300">
              💡 <strong>Strategic Concept:</strong> {op.keyIdea}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
