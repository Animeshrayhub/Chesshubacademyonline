'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface ClassData {
  id: string;
  schedule: string;
  duration_minutes: number;
  class_type: string;
  status: string;
  coachName: string;
  zoom_join_url?: string;
  firstJoinedAt?: string | null;
  wasPresent?: boolean;
}

interface StudentClassesListProps {
  classes: ClassData[];
}

type TabType = 'ACTIVE' | 'UPCOMING' | 'COMPLETED';

export default function StudentClassesList({ classes: initialClasses }: StudentClassesListProps) {
  const rawClasses = initialClasses || [];

  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'duration'>('date-asc');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const allCoaches = Array.from(new Set(rawClasses.map((c) => c.coachName))).sort();

  // Filter & Sort
  const filteredClasses = rawClasses.filter((c) => {
    const classTime = new Date(c.schedule);

    if (activeTab === 'ACTIVE' && c.status !== 'LIVE' && c.status !== 'IN_PROGRESS' && c.status !== 'SCHEDULED') {
      return false;
    }
    if (activeTab === 'UPCOMING' && c.status !== 'SCHEDULED') {
      return false;
    }
    if (activeTab === 'COMPLETED' && c.status !== 'COMPLETED' && c.status !== 'RECORDING_AVAILABLE') {
      return false;
    }

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (classTime < start) return false;
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`);
      if (classTime > end) return false;
    }

    if (selectedCoach !== 'ALL') {
      if (!c.coachName.toLowerCase().includes(selectedCoach.toLowerCase())) return false;
    }

    return true;
  });

  const sortedClasses = [...filteredClasses].sort((a, b) => {
    const aLive = a.status === 'LIVE' || a.status === 'IN_PROGRESS';
    const bLive = b.status === 'LIVE' || b.status === 'IN_PROGRESS';
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;

    if (sortBy === 'date-asc') return new Date(a.schedule).getTime() - new Date(b.schedule).getTime();
    if (sortBy === 'date-desc') return new Date(b.schedule).getTime() - new Date(a.schedule).getTime();
    if (sortBy === 'duration') return b.duration_minutes - a.duration_minutes;
    return 0;
  });

  const formatDateBox = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthYear = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const dayName = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
    const timeStr = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dayNum, monthYear, dayName, timeStr };
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Top Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-6 border-b lg:border-b-0 border-slate-200 w-full lg:w-auto pb-2 lg:pb-0">
          {(['ACTIVE', 'UPCOMING', 'COMPLETED'] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-black uppercase tracking-wider transition-all relative pb-1.5 ${
                activeTab === tab ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-purple-600 shadow-sm"
          >
            <option value="ALL">Select Coach</option>
            {allCoaches.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 bg-white text-xs shadow-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
            />
          </div>

          <span className="text-xs font-bold text-slate-400">To</span>

          <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 bg-white text-xs shadow-sm">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-purple-600 shadow-sm"
          >
            <option value="date-asc">Asc ▾</option>
            <option value="date-desc">Desc ▴</option>
            <option value="duration">Duration</option>
          </select>

          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            className="w-8 h-8 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 ml-1 relative"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showNotifications && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase">Student Notifications</h4>
            <button type="button" onClick={() => setUnreadCount(0)} className="text-[10px] font-bold text-purple-700">Mark read</button>
          </div>
          <p className="text-xs text-slate-600">🎓 Coach Animesh Ray started your live session!</p>
        </div>
      )}

      {/* Roster Cards */}
      <div className="space-y-3">
        {sortedClasses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-slate-600 font-bold text-sm">No classes found</p>
            <p className="text-xs text-slate-400 mt-1">Adjust your date range or coach filter to view class schedules.</p>
          </div>
        ) : (
          sortedClasses.map((c, index) => {
            const { dayNum, monthYear, dayName, timeStr } = formatDateBox(c.schedule);
            const titleLabel = `Private Coaching Session ( ${c.class_type === 'PRIVATE' ? 'Private' : 'Group'} - ${c.duration_minutes} Min )`;
            const isLive = c.status === 'LIVE' || c.status === 'IN_PROGRESS';
            const isCompleted = c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE';

            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-slate-400 w-4 text-center">{index + 1}</span>
                  <div className="border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 flex items-center gap-3 text-center">
                    <div>
                      <span className="text-xl font-black text-purple-800 leading-none block">{dayNum}</span>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">{monthYear}</span>
                    </div>
                    <div className="border-l border-slate-200 pl-3 text-left">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">{dayName}</span>
                      <span className="text-xs font-bold text-slate-700 block">{timeStr}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">{titleLabel}</h4>
                    <span className="text-pink-500 text-xs">📅</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">By {c.coachName}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-purple-600 text-lg">👥</span>

                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${
                    isLive ? 'bg-amber-500 text-white shadow-sm animate-pulse' : isCompleted ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {isLive ? 'In progress' : isCompleted ? 'Completed' : 'Scheduled'}
                  </span>

                  <Link
                    href={`/classroom/${c.id}`}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl tracking-wider transition-all shadow-md flex items-center gap-1.5 group"
                  >
                    <span>📹</span>
                    <span>ENTER CLASSROOM</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
