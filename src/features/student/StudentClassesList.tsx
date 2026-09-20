'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { playClassLiveChime } from '@/utils/kidAudio';

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
  attendanceStatus?: string | null;
  coachFeedback?: string | null;
  reportNotes?: string | null;
  reportSubmittedAt?: string | null;
  recording_url?: string | null;
  recording?: {
    id: string;
    url?: string | null;
    title?: string;
    durationSeconds?: number;
  } | null;
}

interface StudentClassesListProps {
  classes: ClassData[];
}

type TabType = 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
type CompletedSubFilter = 'ALL' | 'WITH_REPORT' | 'PENDING_REPORT';

function getCountdown(scheduleStr: string): { label: string; isPastDue: boolean } {
  const diff = new Date(scheduleStr).getTime() - Date.now();
  if (diff <= 0) {
    return { label: 'Starting soon', isPastDue: true };
  }
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 60) {
    return { label: `Starts in ${mins}m`, isPastDue: false };
  } else if (hours < 24) {
    const remMins = mins % 60;
    return { label: `Starts in ${hours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim(), isPastDue: false };
  } else if (days === 1) {
    return { label: 'Starts tomorrow', isPastDue: false };
  } else {
    return { label: `Starts in ${days} days`, isPastDue: false };
  }
}

export default function StudentClassesList({ classes: initialClasses }: StudentClassesListProps) {
  const router = useRouter();
  const rawClasses = initialClasses || [];

  // Determine initial active tab: Default to ACTIVE if any live/in_progress classes exist, otherwise UPCOMING
  const hasActiveLiveClasses = rawClasses.some(
    (c) => c.status === 'LIVE' || c.status === 'IN_PROGRESS'
  );
  const [activeTab, setActiveTab] = useState<TabType>(
    hasActiveLiveClasses ? 'ACTIVE' : 'UPCOMING'
  );

  const [completedSubFilter, setCompletedSubFilter] = useState<CompletedSubFilter>('ALL');

  // Date filter
  const getLocalToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'duration'>('date-asc');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<Array<{ id: string; title: string; message: string; created_at: string; is_read: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [playingRecordingUrl, setPlayingRecordingUrl] = useState<string | null>(null);
  const [selectedReviewClass, setSelectedReviewClass] = useState<ClassData | null>(null);

  // Live timer tick for real-time countdowns
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch authoritative DB state when live_sessions or classes status changes
  const refreshClassData = useCallback(() => {
    router.refresh();
  }, [router]);

  // Realtime listener for live_sessions & classes status changes
  useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel('student-classes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        (payload: any) => {
          if (payload.new && (payload.new as any).status === 'active') {
            playClassLiveChime();
          }
          refreshClassData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        (payload: any) => {
          if (payload.new && (payload.new as any).status === 'LIVE') {
            playClassLiveChime();
          }
          refreshClassData();
        }
      )
      .on('broadcast', { event: 'CLASS_STARTED' }, () => {
        playClassLiveChime();
        refreshClassData();
      })
      .on('broadcast', { event: 'CLASS_ENDED' }, () => {
        refreshClassData();
      })
      .subscribe();

    const handleFocus = () => refreshClassData();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshClassData();
    });

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshClassData]);

  // Fetch real notifications from database
  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotificationsList(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllNotificationsRead = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);

      setUnreadCount(0);
      setNotificationsList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const allCoaches = useMemo(() => {
    return Array.from(new Set(rawClasses.map((c) => c.coachName))).sort();
  }, [rawClasses]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let completed = 0;

    for (const c of rawClasses) {
      if (c.status === 'LIVE' || c.status === 'IN_PROGRESS') {
        active++;
      } else if (c.status === 'SCHEDULED') {
        upcoming++;
      } else {
        completed++;
      }
    }
    return { active, upcoming, completed };
  }, [rawClasses]);

  // Filter & Sort
  const filteredClasses = useMemo(() => {
    return rawClasses.filter((c) => {
      const classTime = new Date(c.schedule);

      if (activeTab === 'ACTIVE') {
        if (c.status !== 'LIVE' && c.status !== 'IN_PROGRESS') return false;
      } else if (activeTab === 'UPCOMING') {
        if (c.status !== 'SCHEDULED') return false;
      } else if (activeTab === 'COMPLETED') {
        const isCompletedType =
          c.status === 'COMPLETED' ||
          c.status === 'RECORDING_AVAILABLE' ||
          c.status === 'CONCLUDED_PENDING_REPORT';
        if (!isCompletedType) return false;

        const hasReport = !!(c.reportNotes || c.coachFeedback);
        if (completedSubFilter === 'WITH_REPORT' && !hasReport) return false;
        if (completedSubFilter === 'PENDING_REPORT' && hasReport) return false;
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
  }, [rawClasses, activeTab, completedSubFilter, startDate, endDate, selectedCoach]);

  const sortedClasses = useMemo(() => {
    return [...filteredClasses].sort((a, b) => {
      const aLive = a.status === 'LIVE' || a.status === 'IN_PROGRESS';
      const bLive = b.status === 'LIVE' || b.status === 'IN_PROGRESS';
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;

      if (sortBy === 'date-asc') return new Date(a.schedule).getTime() - new Date(b.schedule).getTime();
      if (sortBy === 'date-desc') return new Date(b.schedule).getTime() - new Date(a.schedule).getTime();
      if (sortBy === 'duration') return b.duration_minutes - a.duration_minutes;
      return 0;
    });
  }, [filteredClasses, sortBy]);

  const formatDateBox = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthYear = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const monthShort = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const dayName = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
    const timeStr = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dayNum, monthYear, monthShort, dayName, timeStr };
  };

  return (
    <div className="space-y-5 font-sans text-slate-800">
      {/* Top Filter Bar — Clean Apple-Style Frosted Header */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Main Tabs */}
        <div className="flex items-center gap-2 border-b lg:border-b-0 border-slate-200/80 w-full lg:w-auto pb-3 lg:pb-0">
          {(
            [
              { key: 'ACTIVE', label: 'Active', count: tabCounts.active, color: 'text-emerald-600' },
              { key: 'UPCOMING', label: 'Upcoming', count: tabCounts.upcoming, color: 'text-purple-600' },
              { key: 'COMPLETED', label: 'Completed', count: tabCounts.completed, color: 'text-slate-600' },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                data-testid={`tab-${tab.key.toLowerCase()}`}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
                {tab.key === 'ACTIVE' && tabCounts.active > 0 && !isSelected && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            className="border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 bg-white/90 focus:outline-none focus:border-purple-600 shadow-xs transition-colors"
          >
            <option value="ALL">All Coaches</option>
            {allCoaches.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center border border-slate-200/80 rounded-xl px-2.5 py-1 bg-white/90 text-xs shadow-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
            />
          </div>

          <span className="text-xs font-bold text-slate-400">to</span>

          <div className="flex items-center border border-slate-200/80 rounded-xl px-2.5 py-1 bg-white/90 text-xs shadow-xs">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const now = getLocalToday();
                setStartDate(now);
                setEndDate(now);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                startDate === getLocalToday() && endDate === getLocalToday()
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !startDate && !endDate
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white/90 focus:outline-none focus:border-purple-600 shadow-xs"
          >
            <option value="date-asc">Date: Earliest</option>
            <option value="date-desc">Date: Latest</option>
            <option value="duration">Duration</option>
          </select>

          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105 ml-1 relative cursor-pointer"
            title="Notifications"
          >
            <span className="text-xs">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Filters for COMPLETED tab (Decision Q3) */}
      {activeTab === 'COMPLETED' && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">Filter:</span>
          {(
            [
              { key: 'ALL', label: 'All Completed' },
              { key: 'WITH_REPORT', label: 'With Lesson Reports' },
              { key: 'PENDING_REPORT', label: 'Pending Review' },
            ] as const
          ).map((sub) => (
            <button
              key={sub.key}
              type="button"
              onClick={() => setCompletedSubFilter(sub.key)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                completedSubFilter === sub.key
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-white/80 border border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Notifications Drawer */}
      {showNotifications && (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xl space-y-2 animate-in fade-in slide-in-from-top-2 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Class Notifications</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-[10px] font-bold text-purple-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          {notificationsList.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No notifications at this time.</p>
          ) : (
            <div className="space-y-2 divide-y divide-slate-100">
              {notificationsList.map((notif) => (
                <div key={notif.id} className="pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${notif.is_read ? 'text-slate-700' : 'text-purple-900'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roster Cards — Clean Apple Minimalist Style */}
      <div className="space-y-3">
        {sortedClasses.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl text-slate-400">
              {activeTab === 'ACTIVE' ? '🎙️' : activeTab === 'UPCOMING' ? '📅' : '📜'}
            </div>
            <div>
              <p className="text-slate-800 font-bold text-sm">
                {activeTab === 'ACTIVE'
                  ? 'No Live Classes Right Now'
                  : activeTab === 'UPCOMING'
                  ? 'No Upcoming Classes Scheduled'
                  : 'No Completed Classes Found'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'ACTIVE'
                  ? 'Your coach unlocks the classroom when the session begins. You will hear a chime and the button will turn green automatically.'
                  : activeTab === 'UPCOMING'
                  ? 'You are all caught up! Check back later or adjust your date range.'
                  : 'Once you finish a coaching session, your lesson review notes, coach feedback, and recordings will appear here.'}
              </p>
            </div>
            {activeTab === 'ACTIVE' && tabCounts.upcoming > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('UPCOMING')}
                className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                View Upcoming Classes ({tabCounts.upcoming}) →
              </button>
            )}
          </div>
        ) : (
          sortedClasses.map((c, index) => {
            const { dayNum, monthShort, dayName, timeStr } = formatDateBox(c.schedule);
            const isPrivate = c.class_type === 'PRIVATE';
            const isLive = c.status === 'LIVE' || c.status === 'IN_PROGRESS';
            const isCompleted =
              c.status === 'COMPLETED' ||
              c.status === 'RECORDING_AVAILABLE' ||
              c.status === 'CONCLUDED_PENDING_REPORT';
            const isScheduled = c.status === 'SCHEDULED';
            const isPendingReport = c.status === 'CONCLUDED_PENDING_REPORT';
            const countdown = getCountdown(c.schedule);

            return (
              <div
                key={c.id}
                className={`group bg-white/90 backdrop-blur-md border rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_28px_-6px_rgba(0,0,0,0.06)] transition-all duration-300 flex flex-col gap-3.5 ${
                  isLive
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-gradient-to-r from-white via-white to-emerald-50/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Index + Apple-Style Calendar Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-300 w-4 text-center">{index + 1}</span>
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/90 shadow-xs flex flex-col items-center justify-center min-w-[76px]">
                      <div className="bg-slate-200/70 text-slate-700 text-[10px] font-black uppercase tracking-wider w-full py-1 text-center">
                        {monthShort}
                      </div>
                      <div className="py-1 text-center">
                        <span className="text-2xl font-black text-slate-900 leading-none block">{dayNum}</span>
                        <span className="text-[10px] font-semibold text-slate-500 block leading-tight mt-0.5">
                          {dayName} • {timeStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Title, Coach, Duration & Status Pills */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate tracking-tight">
                        {isPrivate ? 'Private Coaching Session' : 'Group Coaching Session'}
                      </h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                        {isPrivate ? '1-on-1' : 'Group'}
                      </span>
                      {c.recording_url && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span>🎬</span> Recording
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500 font-medium">
                      <span className="text-slate-700 font-semibold flex items-center gap-1">
                        <span>👤</span> {c.coachName}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{c.duration_minutes} Mins</span>

                      {/* Countdown badge for upcoming */}
                      {isScheduled && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                            <span>⏱️</span> {countdown.label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions & State Pill */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    {/* Live State Action */}
                    {isLive && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black tracking-wide">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          LIVE NOW
                        </span>
                        <Link
                          href={`/classroom/${c.id}`}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl tracking-wider transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5 animate-pulse hover:scale-105 active:scale-95"
                        >
                          <span>📹</span>
                          <span>JOIN CLASS NOW</span>
                        </Link>
                      </div>
                    )}

                    {/* Upcoming Scheduled State Action (Strict Coach Unlock - Decision Q4) */}
                    {isScheduled && (
                      <div className="flex items-center gap-2">
                        <div
                          className="px-4 py-2 bg-slate-100/90 border border-slate-200/90 text-slate-400 font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-not-allowed select-none shadow-xs"
                          title="Your coach will unlock this classroom when the session begins"
                        >
                          <span>🔒</span>
                          <span>Locked • Starts at {timeStr}</span>
                        </div>
                      </div>
                    )}

                    {/* Completed State Actions */}
                    {isCompleted && (
                      <div className="flex items-center gap-2">
                        {isPendingReport ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Report
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span>✓</span> Completed
                          </span>
                        )}

                        <button
                          type="button"
                          data-testid="view-review-btn"
                          onClick={() => setSelectedReviewClass(c)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs hover:scale-105 cursor-pointer"
                        >
                          <span>📖</span>
                          <span>Lesson Report</span>
                        </button>

                        {c.recording_url && (
                          <button
                            type="button"
                            onClick={() => setPlayingRecordingUrl(c.recording_url || null)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                            title="Watch Recording"
                          >
                            <span>▶</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Lesson Review for Completed Classes: What We Learned & Coach Feedback */}
                {isCompleted && (c.reportNotes || c.coachFeedback) && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs">📖</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">What We Learned</span>
                      </div>
                      {c.reportNotes ? (
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{c.reportNotes}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No topics recorded for this session.</p>
                      )}
                    </div>
                    <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs">🎯</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">Coach Feedback</span>
                      </div>
                      {c.coachFeedback ? (
                        <p className="text-xs text-purple-950 font-medium leading-relaxed whitespace-pre-wrap">{c.coachFeedback}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No written feedback submitted yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Completed Class Review & History Modal — Apple Clean Modal */}
      {selectedReviewClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Lesson Report & Learning Review
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Private Coaching Session with {selectedReviewClass.coachName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReviewClass(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Date & Time</span>
                <span className="text-slate-800 font-bold">
                  {new Date(selectedReviewClass.schedule).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  •{' '}
                  {new Date(selectedReviewClass.schedule).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Duration</span>
                <span className="text-slate-800 font-bold">{selectedReviewClass.duration_minutes} Minutes</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Coach</span>
                <span className="text-slate-800 font-bold">{selectedReviewClass.coachName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Attendance Status</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span>✓</span> {selectedReviewClass.attendanceStatus || 'Present / Attended'}
                </span>
              </div>
            </div>

            {/* What We Learned */}
            <div className="space-y-1.5 text-left">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>📖</span> What We Learned
              </span>
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-slate-700 leading-relaxed">
                {selectedReviewClass.reportNotes ? (
                  <p className="whitespace-pre-wrap">{selectedReviewClass.reportNotes}</p>
                ) : (
                  <p className="text-slate-400 italic">No specific curriculum notes recorded for this session.</p>
                )}
              </div>
            </div>

            {/* Coach Feedback */}
            <div className="space-y-1.5 text-left">
              <span className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯</span> Coach Feedback & Recommendations
              </span>
              <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-3.5 text-xs text-purple-950 leading-relaxed">
                {selectedReviewClass.coachFeedback ? (
                  <p className="whitespace-pre-wrap font-medium">{selectedReviewClass.coachFeedback}</p>
                ) : (
                  <p className="text-slate-400 italic">No personalized feedback submitted yet. Check back soon!</p>
                )}
              </div>
            </div>

            {/* Class Recording */}
            <div className="space-y-1.5 text-left">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎬</span> Class Recording
              </span>
              {selectedReviewClass.recording_url ? (
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Session Video Available</span>
                    <span className="text-[10px] text-slate-500">Duration: {selectedReviewClass.duration_minutes} Minutes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlayingRecordingUrl(selectedReviewClass.recording_url || null)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform hover:scale-105 cursor-pointer"
                  >
                    <span>▶</span> Watch Recording
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-400 italic">
                  Recording not available yet.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReviewClass(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {playingRecordingUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>🎬</span>
                <span>Class Video Recording</span>
              </h3>
              <button
                type="button"
                onClick={() => setPlayingRecordingUrl(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800">
              <iframe
                src={
                  playingRecordingUrl.includes('drive.google.com')
                    ? playingRecordingUrl.replace(/\/view(\?.*)?$/, '/preview')
                    : playingRecordingUrl
                }
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPlayingRecordingUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
