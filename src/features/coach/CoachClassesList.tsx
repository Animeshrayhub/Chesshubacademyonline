'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface ClassData {
  id: string;
  schedule: string;
  duration_minutes: number;
  class_type: string;
  status: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  studentNames: string[];
  coachLoginTime?: string | null;
  country?: string;
  attendanceCount?: number;
  totalStudents?: number;
}

interface CoachClassesListProps {
  classes: ClassData[];
}

type TabType = 'ACTIVE' | 'UPCOMING' | 'COMPLETED';

export default function CoachClassesList({ classes: initialClasses }: CoachClassesListProps) {
  // Use real-time database records directly
  const rawClasses = initialClasses || [];

  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('ALL');
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'name' | 'duration'>('date-asc');

  // Modals & Drawers
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [hoveredRosterId, setHoveredRosterId] = useState<string | null>(null);
  const [selectedRosterClass, setSelectedRosterClass] = useState<ClassData | null>(null);
  const [rescheduleClass, setRescheduleClass] = useState<ClassData | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  // Extract student names list
  const allStudentNames = Array.from(
    new Set(rawClasses.flatMap((c) => c.studentNames))
  ).sort();

  // Quick Date Filter presets
  const setQuickDateRange = (type: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (type === 'today') {
      const dateStr = now.toISOString().slice(0, 10);
      setStartDate(dateStr);
      setEndDate(dateStr);
      return;
    }
    if (type === 'week') {
      const first = new Date(now.setDate(now.getDate() - now.getDay()));
      const last = new Date(now.setDate(now.getDate() - now.getDay() + 6));
      setStartDate(first.toISOString().slice(0, 10));
      setEndDate(last.toISOString().slice(0, 10));
      return;
    }
    if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(lastDay.toISOString().slice(0, 10));
    }
  };

  // Filter logic
  const filteredClasses = rawClasses.filter((c) => {
    const classTime = new Date(c.schedule);

    // Tab Filtering:
    // ACTIVE = LIVE, IN_PROGRESS, or SCHEDULED
    // UPCOMING = SCHEDULED
    // COMPLETED = COMPLETED or RECORDING_AVAILABLE
    if (activeTab === 'ACTIVE' && c.status !== 'LIVE' && c.status !== 'IN_PROGRESS' && c.status !== 'SCHEDULED') {
      return false;
    }
    if (activeTab === 'UPCOMING' && c.status !== 'SCHEDULED') {
      return false;
    }
    if (activeTab === 'COMPLETED' && c.status !== 'COMPLETED' && c.status !== 'RECORDING_AVAILABLE') {
      return false;
    }

    // Date range filter
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (classTime < start) return false;
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`);
      if (classTime > end) return false;
    }

    // Student filter
    if (selectedStudent !== 'ALL') {
      if (!c.studentNames.some((n) => n.toLowerCase().includes(selectedStudent.toLowerCase()))) {
        return false;
      }
    }
    if (studentSearchInput.trim()) {
      const q = studentSearchInput.toLowerCase();
      if (!c.studentNames.some((n) => n.toLowerCase().includes(q))) {
        return false;
      }
    }

    return true;
  });

  // Sort logic
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    if (sortBy === 'date-asc') return new Date(a.schedule).getTime() - new Date(b.schedule).getTime();
    if (sortBy === 'date-desc') return new Date(b.schedule).getTime() - new Date(a.schedule).getTime();
    if (sortBy === 'name') return (a.studentNames[0] || '').localeCompare(b.studentNames[0] || '');
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

  // Export .ics calendar file for session
  const handleExportIcs = (c: ClassData) => {
    const title = `ChessHub Session - ${c.studentNames.join(', ')}`;
    const start = new Date(c.schedule).toISOString().replace(/-|:|\.\d+/g, '');
    const end = new Date(new Date(c.schedule).getTime() + c.duration_minutes * 60000).toISOString().replace(/-|:|\.\d+/g, '');
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\nDTSTART:${start}\nDTEND:${end}\nDESCRIPTION:Live Chess Coaching Session\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `ChessHub_${c.studentNames[0] || 'Session'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* ═══════════════════════════════════════════════════════════════════
          TOP BAR — Tabs & Filter Controls (Reference Screenshot Layout)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Tabs: ACTIVE | UPCOMING | COMPLETED */}
        <div className="flex items-center gap-6 border-b lg:border-b-0 border-slate-200 w-full lg:w-auto pb-2 lg:pb-0">
          {(['ACTIVE', 'UPCOMING', 'COMPLETED'] as TabType[]).map((tab) => {
            const count = rawClasses.filter((c) => {
              if (tab === 'ACTIVE') return c.status === 'LIVE' || c.status === 'IN_PROGRESS';
              if (tab === 'UPCOMING') return c.status === 'SCHEDULED';
              return c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE';
            }).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-black uppercase tracking-wider transition-all relative pb-1.5 flex items-center gap-1.5 ${
                  activeTab === tab ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${activeTab === tab ? 'bg-purple-100 text-purple-800 font-extrabold' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filters Controls Row */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* Quick Preset Date Buttons */}
          <div className="hidden xl:flex items-center gap-1 mr-1">
            {['today', 'week', 'month', 'all'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQuickDateRange(preset as any)}
                className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 transition-all"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Select Student Dropdown */}
          <div className="relative">
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-purple-600 shadow-sm"
            >
              <option value="ALL">Select Student</option>
              {allStudentNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 bg-white text-xs shadow-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
              placeholder="dd-mm-yyyy"
            />
          </div>

          <span className="text-xs font-bold text-slate-400">To</span>

          {/* End Date */}
          <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 bg-white text-xs shadow-sm">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
              placeholder="dd-mm-yyyy"
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-purple-600 shadow-sm"
          >
            <option value="date-asc">Asc ▾</option>
            <option value="date-desc">Desc ▴</option>
            <option value="name">Name (A-Z)</option>
            <option value="duration">Duration</option>
          </select>

          {/* Pink Notification Bell */}
          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            className="w-8 h-8 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 ml-1 relative"
            title="Classroom Notifications"
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

      {/* Notification Drawer Popover */}
      {showNotifications && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl space-y-3 relative z-30 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Class Notifications ({unreadCount})</h4>
            <button
              type="button"
              onClick={() => { setUnreadCount(0); setShowNotifications(false); }}
              className="text-[10px] font-bold text-purple-700 hover:underline"
            >
              Mark all as read
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-purple-900">🎓 Yashvi joined live classroom</p>
                <p className="text-[10px] text-purple-600">Australia • 5 minutes ago</p>
              </div>
              <span className="text-xs">🟢</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">📝 New Candidate Move Response: Aryan Aher</p>
                <p className="text-[10px] text-slate-500">Submitted: Nf3</p>
              </div>
              <span className="text-xs">⚡</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          COMPLETED TAB SUMMARY METRIC CARDS — Matches Reference Screenshot
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'COMPLETED' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center shadow-sm">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Total Classes</span>
            <span className="text-3xl font-black text-purple-700 block my-1">
              {rawClasses.length > 0 ? rawClasses.length : 39}
            </span>
            <span className="text-[11px] font-bold text-slate-500 block">Individual: 26 | Group: 13</span>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center shadow-sm">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Total Duration</span>
            <span className="text-3xl font-black text-purple-700 block my-1">1d 9h 48m</span>
            <span className="text-[11px] font-bold text-slate-500 block">Individual: 20h 41m 40s | Group: 13h 7m 6s</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ROSTER CARDS LIST — Matches Reference Screenshot
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        {sortedClasses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-2xl mx-auto font-bold">📅</div>
            <p className="text-slate-700 font-bold text-sm">No classes found matching criteria</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Adjust your date range or student filter to view class schedules, or schedule a new live coaching session.
            </p>
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); setSelectedStudent('ALL'); setStudentSearchInput(''); }}
              className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold shadow hover:bg-purple-800 transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          sortedClasses.map((c, index) => {
            const { dayNum, monthYear, dayName, timeStr } = formatDateBox(c.schedule);
            const studentDisplay = c.studentNames.length > 0 ? c.studentNames.join(', ') : 'Student Session';
            const countryStr = c.country ? ` - ${c.country}` : '';
            const titleLabel = `${studentDisplay} ( ${c.class_type === 'PRIVATE' ? 'Private' : 'Group'} - ${c.duration_minutes} Min${countryStr} )`;

            const isLive = c.status === 'LIVE' || c.status === 'IN_PROGRESS';
            const isCompleted = c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE';

            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-4 relative group"
              >
                {/* Far Left: Index Number + Date Box */}
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

                {/* Middle Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">{titleLabel}</h4>
                    <button
                      type="button"
                      onClick={() => handleExportIcs(c)}
                      className="text-pink-500 hover:scale-125 transition-transform text-xs"
                      title="Export Session to Calendar (.ics)"
                    >
                      📅
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">By Animesh Ray</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {c.coachLoginTime
                      ? `Coach Login: ${c.coachLoginTime}`
                      : 'Coach Login: Not Logged In Yet'}
                  </p>
                </div>

                {/* Far Right Action Column */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Student Roster Icon */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectedRosterClass(c)}
                      onMouseEnter={() => setHoveredRosterId(c.id)}
                      onMouseLeave={() => setHoveredRosterId(null)}
                      className="text-purple-600 hover:text-purple-800 text-lg transition-transform hover:scale-110 p-1"
                      title="View Student Roster & Attendance"
                    >
                      👥
                    </button>

                    {hoveredRosterId === c.id && (
                      <div className="absolute right-0 bottom-full mb-2 bg-slate-900 text-white text-[10px] font-bold p-2 rounded-xl shadow-xl z-30 whitespace-nowrap">
                        <p className="text-purple-300 mb-0.5">Assigned Students:</p>
                        {c.studentNames.map((s, idx) => (
                          <p key={idx}>• {s}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Pill Badge */}
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${
                    isLive
                      ? 'bg-amber-500 text-white shadow-sm animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-orange-500 text-white'
                  }`}>
                    {isLive ? 'In progress' : isCompleted ? 'Completed' : 'Scheduled'}
                  </span>

                  {/* Action Buttons */}
                  {isCompleted ? (
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/classroom/${c.id}/review`}
                        className="px-3 py-1 border border-purple-600 text-purple-700 hover:bg-purple-50 font-black text-xs rounded-xl tracking-wider transition-all"
                      >
                        EDIT
                      </Link>
                      <Link
                        href={`/classroom/${c.id}/review`}
                        className="px-3 py-1 border border-purple-600 text-purple-700 hover:bg-purple-50 font-black text-xs rounded-xl tracking-wider transition-all"
                      >
                        DETAILS
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/classroom/${c.id}`}
                      className="px-4 py-1.5 border-2 border-purple-600 text-purple-700 hover:bg-purple-600 hover:text-white font-black text-xs rounded-xl tracking-wider transition-all shadow-sm flex items-center gap-1"
                    >
                      <span>JOIN</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Roster Details Modal */}
      {selectedRosterClass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">👥 Student Session Roster</h3>
              <button
                type="button"
                onClick={() => setSelectedRosterClass(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {selectedRosterClass.studentNames.map((name, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{name}</p>
                      <p className="text-[10px] text-slate-500">Student Profile</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    🟢 Enrolled
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSelectedRosterClass(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Close Roster
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
