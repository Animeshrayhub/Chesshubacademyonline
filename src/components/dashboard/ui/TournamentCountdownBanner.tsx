'use client';

import React, { useState, useEffect } from 'react';

interface TournamentCountdownBannerProps {
  title?: string;
  targetDate?: string; // ISO date string
  lichessUrl?: string;
}

export default function TournamentCountdownBanner({
  title = 'ChessHub Sunday Arena Championship',
  targetDate = new Date(Date.now() + 86400000 * 3).toISOString(),
  lichessUrl = 'https://lichess.org/tournament/arena',
}: TournamentCountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 72, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-indigo-900 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-amber-400/30">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center text-2xl shadow-inner">
          ⏳
        </div>
        <div>
          <span className="text-[10px] font-extrabold bg-black/20 border border-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit mb-1">
            TOURNAMENT COUNTDOWN
          </span>
          <h4 className="text-sm font-extrabold text-white">{title}</h4>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Countdown units */}
        <div className="flex items-center gap-2 text-center font-mono">
          <div className="bg-black/30 border border-white/10 px-2.5 py-1 rounded-xl">
            <span className="text-sm font-extrabold block text-amber-300">{timeLeft.hours}h</span>
          </div>
          <span className="text-xs font-bold text-amber-200">:</span>
          <div className="bg-black/30 border border-white/10 px-2.5 py-1 rounded-xl">
            <span className="text-sm font-extrabold block text-amber-300">{timeLeft.minutes}m</span>
          </div>
          <span className="text-xs font-bold text-amber-200">:</span>
          <div className="bg-black/30 border border-white/10 px-2.5 py-1 rounded-xl">
            <span className="text-sm font-extrabold block text-amber-300">{timeLeft.seconds}s</span>
          </div>
        </div>

        <a
          href={lichessUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
        >
          🏆 Join Arena
        </a>
      </div>
    </div>
  );
}
