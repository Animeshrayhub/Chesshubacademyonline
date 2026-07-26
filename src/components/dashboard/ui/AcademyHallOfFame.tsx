'use client';

import React from 'react';

interface HallOfFameStudent {
  rank: number;
  name: string;
  badge: string;
  stat: string;
  track: string;
  avatar: string;
}

export default function AcademyHallOfFame() {
  const champions: HallOfFameStudent[] = [
    {
      rank: 1,
      name: 'Aarav Sharma',
      badge: '🏆 Grandmaster Student of the Month',
      stat: '184 Puzzles Solved • 98% Accuracy',
      track: 'ADVANCED TRACK',
      avatar: '👑',
    },
    {
      rank: 2,
      name: 'Ananya Patel',
      badge: '⚡ Tactics Speed Champion',
      stat: '🔥 28-Day Daily Streak',
      track: 'INTERMEDIATE TRACK',
      avatar: '🌟',
    },
    {
      rank: 3,
      name: 'Rohan Gupta',
      badge: '📈 Top Rating Gainer (+140 ELO)',
      stat: '1650 Lichess Rapid Rating',
      track: 'BEGINNER TRACK',
      avatar: '🚀',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-xl text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-md">
            🏅
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-amber-400">
              Academy Hall of Fame
            </h3>
            <p className="text-xs text-slate-400">
              Honoring top student champions of the month!
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 px-3 py-1 rounded-full uppercase">
          July 2026 Honors
        </span>
      </div>

      {/* Champions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {champions.map((c) => (
          <div
            key={c.rank}
            className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-center space-y-2 relative overflow-hidden hover:border-amber-500/40 transition-all"
          >
            <div className="text-3xl mb-1">{c.avatar}</div>
            <div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase block w-fit mx-auto mb-1">
                {c.badge}
              </span>
              <h4 className="text-sm font-bold text-white">{c.name}</h4>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">{c.track}</span>
            </div>
            <div className="pt-2 border-t border-slate-850">
              <span className="text-xs font-mono font-bold text-amber-400">{c.stat}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
