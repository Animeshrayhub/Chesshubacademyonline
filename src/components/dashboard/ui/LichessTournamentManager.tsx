'use client';

import React, { useState } from 'react';

interface TournamentItem {
  id: string;
  title: string;
  lichessUrl: string;
  date: string;
  timeControl: string;
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
}

interface LichessTournamentManagerProps {
  initialTournaments?: TournamentItem[];
  userRole?: 'student' | 'coach' | 'admin';
}

export default function LichessTournamentManager({
  initialTournaments = [
    {
      id: 't-1',
      title: 'ChessHub Weekly Arena Blitz',
      lichessUrl: 'https://lichess.org/tournament/arena',
      date: 'Sunday, July 26 • 5:00 PM IST',
      timeControl: '3+0 Blitz',
      status: 'UPCOMING',
    },
    {
      id: 't-2',
      title: 'Academy Rapid Championship',
      lichessUrl: 'https://lichess.org/tournament/swiss',
      date: 'Friday, July 24 • 6:30 PM IST',
      timeControl: '10+0 Rapid',
      status: 'UPCOMING',
    },
  ],
  userRole = 'student',
}: LichessTournamentManagerProps) {
  const [tournaments, setTournaments] = useState<TournamentItem[]>(initialTournaments);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTc, setNewTc] = useState('3+0 Blitz');

  const handleAddTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newUrl) return;

    const newItem: TournamentItem = {
      id: `t-${Date.now()}`,
      title: newTitle,
      lichessUrl: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`,
      date: newDate || 'Upcoming Session',
      timeControl: newTc,
      status: 'UPCOMING',
    };

    setTournaments([newItem, ...tournaments]);
    setShowAddModal(false);
    setNewTitle('');
    setNewUrl('');
    setNewDate('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-md">
            🏆
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-amber-400">
              Lichess Academy Tournaments
            </h3>
            <p className="text-xs text-slate-400">
              Join coach-created Lichess tournaments directly with 1 click!
            </p>
          </div>
        </div>

        {(userRole === 'coach' || userRole === 'admin') && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1"
          >
            <span>+ Add Tournament Link</span>
          </button>
        )}
      </div>

      {/* List of Tournaments */}
      <div className="space-y-3">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 hover:border-amber-500/40 transition-all"
          >
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                  {t.timeControl}
                </span>
                <span className="text-xs text-slate-400 font-medium">{t.date}</span>
              </div>
              <h4 className="text-sm font-bold text-white">{t.title}</h4>
            </div>

            <a
              href={t.lichessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <span>🏆 Join Tournament on Lichess</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ))}
      </div>

      {/* Add Tournament Modal (Coach/Admin) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-base text-amber-400">
                Add Lichess Tournament Link
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tournament Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ChessHub Sunday Arena"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Lichess Tournament URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://lichess.org/tournament/xyz123"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Date & Time</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunday 5:00 PM"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Time Control</label>
                  <select
                    value={newTc}
                    onChange={(e) => setNewTc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="3+0 Blitz">3+0 Blitz</option>
                    <option value="5+0 Blitz">5+0 Blitz</option>
                    <option value="10+0 Rapid">10+0 Rapid</option>
                    <option value="15+10 Classical">15+10 Classical</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                🚀 Publish Lichess Tournament Link
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
