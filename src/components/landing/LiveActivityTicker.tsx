'use client';

import React, { useState, useEffect } from 'react';

interface ActivityItem {
  id: string;
  name: string;
  location: string;
  action: string;
  timeAgo: string;
  avatar: string;
}

const DIVERSE_ACTIVITIES: ActivityItem[] = [
  { id: '1', name: 'Kabir M.', location: 'Bengaluru', action: 'booked a Free 1v1 Demo Class', timeAgo: 'just now', avatar: '📅' },
  { id: '2', name: 'Diya R.', location: 'London', action: 'completed Knight Fork Tactics Chapter', timeAgo: '2m ago', avatar: '🏆' },
  { id: '3', name: 'Ethan S.', location: 'San Jose', action: 'solved 12 Daily Streak Puzzles', timeAgo: '4m ago', avatar: '⚡' },
  { id: '4', name: 'Advait K.', location: 'Delhi', action: 'booked a Free Demo Class', timeAgo: '5m ago', avatar: '♟️' },
  { id: '5', name: 'Rhea P.', location: 'Toronto', action: 'joined Sunday Arena Championship', timeAgo: '7m ago', avatar: '🥇' },
  { id: '6', name: 'Vivaan T.', location: 'Dubai', action: 'earned 450 XP Level 3 Badge', timeAgo: '8m ago', avatar: '🌟' },
  { id: '7', name: 'Devansh M.', location: 'Mumbai', action: 'booked a Free 1v1 Demo Class', timeAgo: '10m ago', avatar: '📅' },
  { id: '8', name: 'Liam O.', location: 'Chicago', action: 'completed Intermediate Level 2', timeAgo: '11m ago', avatar: '🎓' },
  { id: '9', name: 'Ananya B.', location: 'Hyderabad', action: 'solved 15 Speed Duel Puzzles', timeAgo: '13m ago', avatar: '⚡' },
  { id: '10', name: 'Noah W.', location: 'Sydney', action: 'unlocked Checkmate in 2 Certificate', timeAgo: '14m ago', avatar: '📜' },
  { id: '11', name: 'Ishaan V.', location: 'Singapore', action: 'booked a Free Demo Class', timeAgo: '16m ago', avatar: '♟️' },
  { id: '12', name: 'Aarav N.', location: 'Pune', action: 'completed Opening Theory Masterclass', timeAgo: '18m ago', avatar: '📖' },
  { id: '13', name: 'Sofia G.', location: 'San Francisco', action: 'won 1v1 Tactical Duel Match', timeAgo: '19m ago', avatar: '⚔️' },
  { id: '14', name: 'Reyansh S.', location: 'Chennai', action: 'booked a Free 1v1 Demo Class', timeAgo: '21m ago', avatar: '📅' },
  { id: '15', name: 'Oliver H.', location: 'Melbourne', action: 'solved 10 Endgame Technique Drills', timeAgo: '23m ago', avatar: '🏆' },
  { id: '16', name: 'Tanya K.', location: 'Kolkata', action: 'earned 7-Day Habit Streak Fire', timeAgo: '25m ago', avatar: '🔥' },
  { id: '17', name: 'Lucas C.', location: 'Dallas', action: 'joined Lichess Swiss Tournament', timeAgo: '27m ago', avatar: '🥇' },
  { id: '18', name: 'Shaurya P.', location: 'Ahmedabad', action: 'booked a Free Demo Class', timeAgo: '29m ago', avatar: '♟️' },
  { id: '19', name: 'Mia D.', location: 'Vancouver', action: 'completed Pin & Skewer Workbook', timeAgo: '31m ago', avatar: '📖' },
  { id: '20', name: 'Kian M.', location: 'New York', action: 'earned Grandmaster Student Honor', timeAgo: '33m ago', avatar: '👑' },
];

export default function LiveActivityTicker() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        // Pick a non-sequential random index to ensure high variety
        setCurrentIdx((prev) => {
          let next = Math.floor(Math.random() * DIVERSE_ACTIVITIES.length);
          if (next === prev) next = (prev + 1) % DIVERSE_ACTIVITIES.length;
          return next;
        });
        setVisible(true);
      }, 500);
    }, 7500);

    return () => clearInterval(timer);
  }, []);

  const current = DIVERSE_ACTIVITIES[currentIdx];

  return (
    <div
      className={`fixed bottom-20 left-5 z-40 transition-all duration-500 transform ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
      }`}
    >
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-xs text-white">
        <div className="w-8.5 h-8.5 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-base shrink-0 shadow-inner">
          {current.avatar}
        </div>
        <div className="text-[11px] leading-tight">
          <p className="font-bold text-slate-200">
            <strong className="text-amber-400 font-extrabold">{current.name}</strong> from {current.location}
          </p>
          <p className="text-slate-300 text-[10px] font-medium mt-0.5">{current.action}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] text-amber-300/90 font-mono font-bold">{current.timeAgo}</span>
            <span className="text-slate-600 text-[8px]">•</span>
            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
              <span>✓ Verified</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
