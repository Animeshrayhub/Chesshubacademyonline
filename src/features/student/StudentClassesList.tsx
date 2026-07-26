'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import MakeupClassRequestModal from '@/components/dashboard/ui/MakeupClassRequestModal';

interface ClassData {
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

export default function StudentClassesList({ classes }: StudentClassesListProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMakeupModal, setShowMakeupModal] = useState(false);


  const handleCopyPasscode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPasscodeFromJoinUrl = (url?: string): string => {
    if (!url) return '';
    const match = url.match(/[?&]pwd=([^&]+)/);
    return match ? match[1] : '';
  };

  // Filtering logic
  const filteredClasses = classes.filter((c) => {
    const classTime = new Date(c.schedule);
    
    // Date Range Filter
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (classTime < start) return false;
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`);
      if (classTime > end) return false;
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      if (c.status !== statusFilter) return false;
    }

    // Coach Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!c.coachName.toLowerCase().includes(query)) return false;
    }

    return true;
  });

  // Calculate statistics based on filtered data
  const totalClasses = filteredClasses.length;
  const completedClasses = filteredClasses.filter(c => c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE').length;
  const upcomingClasses = filteredClasses.filter(c => c.status === 'SCHEDULED' || c.status === 'LIVE').length;
  const totalDuration = filteredClasses
    .filter(c => c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE')
    .reduce((acc, curr) => acc + curr.duration_minutes, 0);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Date Range & Filters Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-white font-bold flex items-center text-sm uppercase tracking-wider text-slate-400">
            <svg className="w-4 h-4 mr-2 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Classes & History Reports
          </h3>
          <button
            type="button"
            onClick={() => setShowMakeupModal(true)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>📅 Request Makeup Class</span>
          </button>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Class Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-accent transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live</option>
              <option value="COMPLETED">Completed</option>
              <option value="RECORDING_AVAILABLE">Recording Available</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Search Coach</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search coach name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-accent transition-all placeholder-slate-500"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {(startDate || endDate || statusFilter !== 'ALL' || searchQuery) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-accent hover:text-yellow-500 transition-colors flex items-center"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* KPI stats section */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
          <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Range Classes</dt>
          <dd className="mt-2 text-3xl font-extrabold text-white font-heading">{totalClasses}</dd>
          <dd className="mt-1 text-xs text-slate-500">Scheduled & attended</dd>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500" />
          <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attended Classes</dt>
          <dd className="mt-2 text-3xl font-extrabold text-green-400 font-heading">{completedClasses}</dd>
          <dd className="mt-1 text-xs text-slate-500">Completed & verified</dd>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500" />
          <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upcoming Scheduled</dt>
          <dd className="mt-2 text-3xl font-extrabold text-accent font-heading">{upcomingClasses}</dd>
          <dd className="mt-1 text-xs text-slate-500">Live board sessions</dd>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
          <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Study Time</dt>
          <dd className="mt-2 text-3xl font-extrabold text-purple-400 font-heading">{totalDuration} <span className="text-sm font-medium">min</span></dd>
          <dd className="mt-1 text-xs text-slate-500">Interactive live board hours</dd>
        </div>
      </dl>

      {/* Classes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-heading font-bold text-white text-base">Class Schedule Roster</h3>
          <span className="text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
            Showing {totalClasses} classes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Session Schedule</th>
                <th className="px-6 py-4">FIDE Instructor</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Portal Classroom Entry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto">
                      <p className="text-slate-400 font-semibold mb-1 text-sm">No classes found</p>
                      <p className="text-xs text-slate-500">
                        Adjust your date range or filters to view class completion histories.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((c) => {
                  const dateStr = new Date(c.schedule).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                      const passcode = getPasscodeFromJoinUrl(c.zoom_join_url);
                      const isFinished = c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE';

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="text-white font-medium text-xs">{dateStr}</span>
                              {passcode && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyPasscode(passcode, c.id)}
                                  className="self-start inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-accent font-mono bg-slate-950/40 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 px-1.5 py-0.5 rounded transition-all active:scale-95 cursor-pointer"
                                  title="Click to copy meeting passcode"
                                >
                                  <span>🔑 {copiedId === c.id ? 'Copied!' : `Passcode: ${passcode}`}</span>
                                  {copiedId !== c.id && (
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                      <td className="px-6 py-4 text-white text-xs font-semibold whitespace-nowrap">
                        {c.coachName}
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs whitespace-nowrap">
                        {c.duration_minutes} min
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.class_type === 'PRIVATE'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : c.class_type === 'BUDDY'
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {c.class_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase w-fit ${
                            c.status === 'LIVE'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : isFinished
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : c.status === 'CANCELLED'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {c.status}
                          </span>
                          {c.wasPresent ? (
                            <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                              ✓ Present
                            </span>
                          ) : isFinished ? (
                            <span className="text-[10px] text-slate-500 font-medium">
                              Absent
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isFinished ? (
                          <Link
                            href={`/classroom/${c.id}/review`}
                            className="inline-flex items-center justify-center px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold rounded-lg text-xs transition-colors"
                          >
                            View Feedback
                          </Link>
                        ) : (
                          <Link
                            href={`/classroom/${c.id}`}
                            className="inline-flex items-center justify-center px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg text-xs transition-colors"
                          >
                            Enter Classroom
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MakeupClassRequestModal isOpen={showMakeupModal} onClose={() => setShowMakeupModal(false)} />
    </div>
  );
}

