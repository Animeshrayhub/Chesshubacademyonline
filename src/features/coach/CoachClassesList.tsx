'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import CoachClassCompletionModal from './CoachClassCompletionModal';
import {
  getCoachGoogleMeetStatusAction,
  disconnectCoachGoogleMeetAction,
  createGoogleMeetForClassAction,
  type CoachGoogleStatusResult,
} from '@/actions/googleMeet';

export interface ClassData {
  id: string;
  schedule: string;
  duration_minutes: number;
  class_type: string;
  status: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  meeting_provider?: 'ZOOM' | 'GOOGLE_MEET' | null;
  google_meet_space_id?: string | null;
  google_meet_uri?: string | null;
  studentNames: string[];
  coachLoginTime?: string | null;
  country?: string;
  attendanceCount?: number;
  totalStudents?: number;
  updated_at?: string | null;
  completed_at?: string | null;
  reportNotes?: string | null;
  reportSubmittedAt?: string | null;
}

interface CoachClassesListProps {
  classes: ClassData[];
}

type TabType = 'ACTIVE' | 'UPCOMING' | 'COMPLETED';

export default function CoachClassesList({ classes: initialClasses }: CoachClassesListProps) {
  const router = useRouter();
  const [classList, setClassList] = useState<ClassData[]>(initialClasses || []);

  useEffect(() => {
    setClassList(initialClasses || []);
  }, [initialClasses]);

  // Google Meet integration state
  const [googleStatus, setGoogleStatus] = useState<CoachGoogleStatusResult | null>(null);
  const [isLoadingGoogleStatus, setIsLoadingGoogleStatus] = useState(true);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);
  const [creatingMeetClassId, setCreatingMeetClassId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await getCoachGoogleMeetStatusAction();
        if (isMounted && res.success && res.data) {
          setGoogleStatus(res.data);
        }
      } catch (err) {
        console.warn('Failed to load Google Meet status:', err);
      } finally {
        if (isMounted) setIsLoadingGoogleStatus(false);
      }
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isGoogleSuccess = urlParams.get('google_connected') === 'success' || urlParams.get('google_connected') === 'true';
      const rawGoogleError = urlParams.get('google_error') || urlParams.get('error');

      if (isGoogleSuccess) {
        setActionMessage({
          type: 'success',
          text: 'Google Meet connected successfully! You can now create Google Meet spaces for your classes.',
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (rawGoogleError) {
        const decoded = decodeURIComponent(rawGoogleError);
        let message = `Google connection failed: ${decoded}`;
        if (decoded === 'access_denied') {
          message = 'Google authorization was cancelled.';
        } else if (decoded === 'csrf_mismatch') {
          message = 'Session state expired. Please click Connect Google Meet again.';
        } else if (decoded === 'unauthorized') {
          message = 'Coach authorization required. Please log in and try again.';
        }
        setActionMessage({
          type: 'error',
          text: message,
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch fresh classes authoritative state directly into client state without requiring manual page reload
  const fetchFreshClasses = React.useCallback(async () => {
    try {
      const { getCoachClassesAction } = await import('@/actions/classes');
      const res = await getCoachClassesAction();
      if (res && res.success && Array.isArray(res.data)) {
        setClassList(res.data);
      }
    } catch (e) {
      console.warn('[CoachClassesList] Realtime sync error:', e);
    }
  }, []);

  // Realtime synchronization: Listen for class assignment, creation, and status updates
  useEffect(() => {
    const supabase = createSupabaseClient();
    const handleUpdate = () => {
      fetchFreshClasses();
      router.refresh();
    };

    const channel = supabase
      .channel('coach-classes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        handleUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        handleUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_students' },
        handleUpdate
      )
      .on('broadcast', { event: 'CLASS_ASSIGNED' }, handleUpdate)
      .on('broadcast', { event: 'CLASS_STARTED' }, handleUpdate)
      .on('broadcast', { event: 'CLASS_ENDED' }, handleUpdate)
      .subscribe();

    const handleFocus = () => handleUpdate();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleUpdate();
    });

    // Auto-polling fallback: ensures newly assigned classes appear within seconds without manual page reload
    const pollInterval = setInterval(() => {
      fetchFreshClasses();
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchFreshClasses, router]);

  const handleDisconnectGoogle = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect your Google Meet account? Existing Google Meet class links will remain active, but you will need to reconnect to generate new Google Meet spaces.'
      )
    ) {
      return;
    }
    setIsDisconnectingGoogle(true);
    try {
      const res = await disconnectCoachGoogleMeetAction();
      if (res.success) {
        setGoogleStatus({ isConnected: false, email: null, updatedAt: null });
        setActionMessage({ type: 'success', text: 'Google Meet account successfully disconnected.' });
      } else {
        setActionMessage({ type: 'error', text: res.error?.message || 'Failed to disconnect Google Meet.' });
      }
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e?.message || 'Failed to disconnect Google Meet.' });
    } finally {
      setIsDisconnectingGoogle(false);
    }
  };

  const handleCreateGoogleMeet = async (classId: string) => {
    if (!googleStatus?.isConnected) {
      if (
        confirm(
          'You need to connect your Google account before generating a Google Meet space. Would you like to connect now?'
        )
      ) {
        window.location.href = '/api/auth/google';
      }
      return;
    }

    setCreatingMeetClassId(classId);
    setActionMessage(null);
    try {
      const res = await createGoogleMeetForClassAction(classId);
      if (res.success && res.data) {
        setClassList((prev) =>
          prev.map((c) =>
            c.id === classId
              ? {
                  ...c,
                  meeting_provider: 'GOOGLE_MEET',
                  google_meet_space_id: res.data!.spaceId,
                  google_meet_uri: res.data!.meetingUri,
                }
              : c
          )
        );
        setActionMessage({
          type: 'success',
          text: `Google Meet space created! Meeting link: ${res.data.meetingUri}`,
        });
        router.refresh();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error?.message || 'Failed to create Google Meet space.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'An error occurred while creating Google Meet space.',
      });
    } finally {
      setCreatingMeetClassId(null);
    }
  };

  // Explicit START CLASS action with server-side transition & real-time broadcast (Requirement 4)
  const [startingClassId, setStartingClassId] = useState<string | null>(null);

  const handleStartClass = async (classId: string) => {
    setStartingClassId(classId);
    setActionMessage(null);
    try {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`class_start_time_${classId}`, Date.now().toString());
        } catch {}
      }
      const { startClassAction } = await import('@/actions/classes');
      const res = await startClassAction(classId);
      if (res.success) {
        router.push(`/classroom/${classId}`);
      } else {
        setActionMessage({
          type: 'error',
          text: res.error?.message || 'Failed to start class session.',
        });
        setStartingClassId(null);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to start class session.',
      });
      setStartingClassId(null);
    }
  };

  // Determine initial active tab: Default to ACTIVE if any live/in_progress classes exist, otherwise UPCOMING
  const hasActiveLiveClasses = (initialClasses || []).some(
    (c) => c.status === 'LIVE' || c.status === 'IN_PROGRESS'
  );
  const [activeTab, setActiveTab] = useState<TabType>(
    hasActiveLiveClasses ? 'ACTIVE' : 'UPCOMING'
  );
  const getLocalDateStr = (d: Date = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  // Default: show all classes for active tab (matches student portal behavior). Presets allow quick 1-click filtering.
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('ALL');
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'date-asc' | 'date-desc' | 'name' | 'duration'>('default');

  // Modals & Drawers
  const [hoveredRosterId, setHoveredRosterId] = useState<string | null>(null);
  const [selectedRosterClass, setSelectedRosterClass] = useState<ClassData | null>(null);
  const [completionClass, setCompletionClass] = useState<ClassData | null>(null);

  // Unclosed sessions check for sticky top amber banner (Decision Q7)
  const unclosedSessions = React.useMemo(() => {
    const now = Date.now();
    return classList.filter((c) => {
      const isMarkedLive = c.status === 'LIVE' || c.status === 'IN_PROGRESS';
      const schedEnd = new Date(c.schedule).getTime() + (c.duration_minutes || 45) * 60000;
      const isPastDueUnreported = schedEnd < now && !c.reportSubmittedAt && c.status !== 'COMPLETED';
      return isMarkedLive || isPastDueUnreported;
    });
  }, [classList]);

  // Extract student names list
  const allStudentNames = Array.from(
    new Set(classList.flatMap((c) => c.studentNames))
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
      const dateStr = getLocalDateStr(now);
      setStartDate(dateStr);
      setEndDate(dateStr);
      return;
    }
    if (type === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      setStartDate(getLocalDateStr(weekStart));
      setEndDate(getLocalDateStr(weekEnd));
      return;
    }
    if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(getLocalDateStr(firstDay));
      setEndDate(getLocalDateStr(lastDay));
    }
  };

  // Helper function for checking tab membership
  const matchesTab = (c: ClassData, tab: TabType) => {
    if (tab === 'ACTIVE') return c.status === 'LIVE' || c.status === 'IN_PROGRESS';
    if (tab === 'UPCOMING') return c.status === 'SCHEDULED';
    if (tab === 'COMPLETED') return c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE' || c.status === 'CONCLUDED_PENDING_REPORT';
    return false;
  };

  // Filter logic
  const filteredClasses = classList.filter((c) => {
    const classTime = new Date(c.schedule);

    // Tab Filtering
    if (!matchesTab(c, activeTab)) {
      return false;
    }

    // Date range filter: LIVE sessions are never hidden by date filters
    if (activeTab !== 'ACTIVE') {
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (classTime < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`);
        if (classTime > end) return false;
      }
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

  // Sort logic — TODAY's classes (26 Aug 2026) pinned to top of UPCOMING
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    if (sortBy === 'date-asc') return new Date(a.schedule).getTime() - new Date(b.schedule).getTime();
    if (sortBy === 'date-desc') return new Date(b.schedule).getTime() - new Date(a.schedule).getTime();
    if (sortBy === 'name') return (a.studentNames[0] || '').localeCompare(b.studentNames[0] || '');
    if (sortBy === 'duration') return b.duration_minutes - a.duration_minutes;

    // Default sorting logic per tab:
    if (activeTab === 'COMPLETED') {
      // NEWEST COMPLETED FIRST (by completed_at / updated_at DESC)
      const timeA = new Date(a.completed_at || a.updated_at || a.schedule).getTime();
      const timeB = new Date(b.completed_at || b.updated_at || b.schedule).getTime();
      return timeB - timeA;
    }

    if (activeTab === 'UPCOMING') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;

      const timeA = new Date(a.schedule).getTime();
      const timeB = new Date(b.schedule).getTime();

      const aIsToday = timeA >= todayStart && timeA < todayEnd;
      const bIsToday = timeB >= todayStart && timeB < todayEnd;
      const aIsFuture = timeA >= todayEnd;
      const bIsFuture = timeB >= todayEnd;
      const aIsPast = timeA < todayStart;
      const bIsPast = timeB < todayStart;

      // Group 1: TODAY's classes pinned to TOP!
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      // Group 2: FUTURE classes next
      if (aIsFuture && aIsPast) return -1;
      if (aIsPast && bIsFuture) return 1;

      // Within TODAY: sort by time ASC (earliest today first)
      if (aIsToday && bIsToday) return timeA - timeB;

      // Within FUTURE: sort by date ASC (closest future first)
      if (aIsFuture && bIsFuture) return timeA - timeB;

      // Within PAST unstarted: sort by date DESC (most recent past first)
      if (aIsPast && bIsPast) return timeB - timeA;

      return timeA - timeB;
    }

    if (activeTab === 'ACTIVE') {
      const aLive = a.status === 'LIVE' || a.status === 'IN_PROGRESS';
      const bLive = b.status === 'LIVE' || b.status === 'IN_PROGRESS';
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return new Date(a.schedule).getTime() - new Date(b.schedule).getTime();
    }

    return 0;
  });

  // Real dynamic calculation for COMPLETED tab metrics
  const completedClassesList = classList.filter(
    (c) => c.status === 'COMPLETED' || c.status === 'RECORDING_AVAILABLE'
  );

  const totalCompletedCount = completedClassesList.length;
  const individualCompletedCount = completedClassesList.filter(
    (c) => c.class_type?.toUpperCase() === 'PRIVATE' || c.class_type?.toUpperCase() === 'INDIVIDUAL'
  ).length;
  const groupCompletedCount = completedClassesList.filter(
    (c) => c.class_type?.toUpperCase() !== 'PRIVATE' && c.class_type?.toUpperCase() !== 'INDIVIDUAL'
  ).length;

  const totalMins = completedClassesList.reduce((acc, c) => acc + (c.duration_minutes || 60), 0);
  const indMins = completedClassesList
    .filter((c) => c.class_type?.toUpperCase() === 'PRIVATE' || c.class_type?.toUpperCase() === 'INDIVIDUAL')
    .reduce((acc, c) => acc + (c.duration_minutes || 60), 0);
  const grpMins = completedClassesList
    .filter((c) => c.class_type?.toUpperCase() !== 'PRIVATE' && c.class_type?.toUpperCase() !== 'INDIVIDUAL')
    .reduce((acc, c) => acc + (c.duration_minutes || 60), 0);

  const formatMinsToDuration = (mins: number) => {
    if (mins <= 0) return '0h 0m';
    const days = Math.floor(mins / (24 * 60));
    const remMins = mins % (24 * 60);
    const hours = Math.floor(remMins / 60);
    const m = remMins % 60;

    let res = '';
    if (days > 0) res += `${days}d `;
    if (hours > 0 || days > 0) res += `${hours}h `;
    res += `${m}m`;
    return res.trim();
  };

  const totalDurationFormatted = formatMinsToDuration(totalMins);
  const indDurationFormatted = formatMinsToDuration(indMins);
  const grpDurationFormatted = formatMinsToDuration(grpMins);

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
          ACTION / NOTIFICATION BANNER
      ═══════════════════════════════════════════════════════════════════ */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-sm transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">{actionMessage.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-extrabold text-sm px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          GOOGLE MEET INTEGRATION BANNER
      ═══════════════════════════════════════════════════════════════════ */}
      {!isLoadingGoogleStatus && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shrink-0">
              📹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                  Google Meet Integration
                </span>
                {googleStatus?.isConnected ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {googleStatus?.isConnected
                  ? `Connected Google Account: ${googleStatus.email || 'Active'}. You can generate Google Meet spaces for your classes.`
                  : 'Connect your Google account to automatically create live Google Meet spaces for your coaching sessions.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {googleStatus?.isConnected ? (
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                disabled={isDisconnectingGoogle}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all disabled:opacity-50"
              >
                {isDisconnectingGoogle ? 'Disconnecting...' : 'Disconnect Account'}
              </button>
            ) : (
              <a
                href="/api/auth/google"
                className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-extrabold rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                <span>🔗</span>
                <span>Connect Google Meet</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          STICKY AMBER ALERT BANNER — UNCLOSED / PENDING SESSIONS (Decision Q7)
      ═══════════════════════════════════════════════════════════════════ */}
      {unclosedSessions.length > 0 && (
        <div className="bg-amber-50/95 border border-amber-300/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-lg shrink-0">
              ⚠️
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">
                {unclosedSessions.length} Past Coaching Session{unclosedSessions.length > 1 ? 's' : ''} Awaiting Review
              </span>
              <p className="text-xs text-amber-800 mt-0.5">
                Submit attendance and lesson review notes to wrap up and notify students.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCompletionClass(unclosedSessions[0])}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>📝</span>
            <span>Wrap Up Session ({unclosedSessions[0].studentNames[0] || 'Student'})</span>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TOP BAR — Tabs & Filter Controls
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Tabs: ACTIVE | UPCOMING | COMPLETED */}
        <div className="flex items-center gap-6 border-b lg:border-b-0 border-slate-200 w-full lg:w-auto pb-2 lg:pb-0">
          {(['ACTIVE', 'UPCOMING', 'COMPLETED'] as TabType[]).map((tab) => {
            const count = classList.filter((c) => matchesTab(c, tab)).length;

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
            <option value="default">Default Sort</option>
            <option value="date-asc">Date (Asc ▾)</option>
            <option value="date-desc">Date (Desc ▴)</option>
            <option value="name">Name (A-Z)</option>
            <option value="duration">Duration</option>
          </select>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COMPLETED TAB SUMMARY METRIC CARDS
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'COMPLETED' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center shadow-sm">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Total Classes</span>
            <span className="text-3xl font-black text-purple-700 block my-1">
              {totalCompletedCount}
            </span>
            <span className="text-[11px] font-bold text-slate-500 block">
              Individual: {individualCompletedCount} | Group: {groupCompletedCount}
            </span>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center shadow-sm">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Total Duration</span>
            <span className="text-3xl font-black text-purple-700 block my-1">
              {totalDurationFormatted}
            </span>
            <span className="text-[11px] font-bold text-slate-500 block">
              Individual: {indDurationFormatted} | Group: {grpDurationFormatted}
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ROSTER CARDS LIST
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

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const todayEnd = todayStart + 24 * 60 * 60 * 1000;
            const classTime = new Date(c.schedule).getTime();

            const isToday = classTime >= todayStart && classTime < todayEnd;
            const isPastUncompleted = classTime < todayStart && c.status === 'SCHEDULED';

            return (
              <div
                key={c.id}
                className={`bg-white border rounded-2xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-4 relative group ${
                  isToday
                    ? 'border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                {/* Far Left: Index Number + Date Box */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-slate-400 w-4 text-center">{index + 1}</span>

                  <div className={`border rounded-xl px-3 py-1.5 flex items-center gap-3 text-center ${
                    isToday ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className={`text-xl font-black leading-none block ${isToday ? 'text-emerald-700' : 'text-purple-800'}`}>{dayNum}</span>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">{titleLabel}</h4>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-md shadow-sm animate-bounce flex items-center gap-1">
                        <span>🟢</span> TODAY
                      </span>
                    )}
                    {c.meeting_provider === 'GOOGLE_MEET' || (c.zoom_join_url && c.zoom_join_url.includes('meet.google.com')) ? (
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-extrabold rounded-md flex items-center gap-1 border border-teal-200">
                        <span>📹</span> Google Meet
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md flex items-center gap-1 border border-blue-200">
                        <span>🔷</span> Zoom
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExportIcs(c)}
                      className="text-pink-500 hover:scale-125 transition-transform text-xs"
                      title="Export Session to Calendar (.ics)"
                    >
                      📅
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">FIDE Instructor Session</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {c.coachLoginTime
                      ? `Coach Login: ${c.coachLoginTime}`
                      : 'Coach Login: Not Logged In Yet'}
                  </p>
                  {isCompleted && c.reportNotes && (
                    <div className="mt-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2 text-xs">
                      <span className="font-bold text-purple-800 text-[10px] uppercase tracking-wider block mb-0.5">
                        📝 Class Report & Feedback:
                      </span>
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                        &ldquo;{c.reportNotes}&rdquo;
                      </p>
                    </div>
                  )}
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
                      : isToday
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50 animate-pulse'
                      : isPastUncompleted
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-orange-500 text-white'
                  }`}>
                    {isLive ? 'In progress' : isCompleted ? 'Completed' : isToday ? 'Scheduled (Today)' : isPastUncompleted ? 'Missed / Expired' : 'Scheduled'}
                  </span>

                  {/* Action Buttons */}
                  {isCompleted ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCompletionClass(c)}
                        className="px-3 py-1 border border-purple-600 text-purple-700 hover:bg-purple-50 font-black text-xs rounded-xl tracking-wider transition-all"
                      >
                        SUMMARY / DETAILS
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Google Meet Action: Either direct Meet link button or Generate Meet button */}
                      {c.meeting_provider === 'GOOGLE_MEET' || (c.zoom_join_url && c.zoom_join_url.includes('meet.google.com')) ? (
                        <a
                          href={c.google_meet_uri || c.zoom_join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-xl border border-teal-200 transition-all flex items-center gap-1 shadow-2xs"
                          title="Open Google Meet Space in new tab"
                        >
                          <span>↗️</span>
                          <span className="hidden xl:inline">Meet</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCreateGoogleMeet(c.id)}
                          disabled={creatingMeetClassId === c.id}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 disabled:opacity-50 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 shadow-2xs"
                          title="Generate a Google Meet space for this class"
                        >
                          {creatingMeetClassId === c.id ? (
                            <>
                              <span className="animate-spin text-xs">⏳</span>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <span>📹</span>
                              <span>Create Meet</span>
                            </>
                          )}
                        </button>
                      )}

                      {c.status === 'SCHEDULED' ? (
                        <button
                          type="button"
                          onClick={() => handleStartClass(c.id)}
                          disabled={startingClassId === c.id}
                          className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl tracking-wider transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          title="Start class session: transitions to LIVE, activates session, and notifies students in real time"
                        >
                          {startingClassId === c.id ? (
                            <>
                              <span className="animate-spin text-xs">⏳</span>
                              <span>STARTING...</span>
                            </>
                          ) : (
                            <>
                              <span>▶</span>
                              <span>START CLASS</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <Link
                          href={`/classroom/${c.id}`}
                          className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl tracking-wider transition-all shadow-md flex items-center gap-1.5 group"
                        >
                          <span>🟢</span>
                          <span>ENTER LIVE CLASS</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setCompletionClass(c)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-xl shadow transition-all"
                      >
                        🏁 Complete Class
                      </button>
                    </div>
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

      {/* Class Completion Modal */}
      {completionClass && (
        <CoachClassCompletionModal
          isOpen={!!completionClass}
          onClose={() => setCompletionClass(null)}
          classId={completionClass.id}
          className={`${completionClass.class_type} Lesson (${completionClass.studentNames.join(', ')})`}
          durationMinutes={completionClass.duration_minutes || 45}
          students={completionClass.studentNames.map((name, idx) => ({
            id: `st-${idx}-${completionClass.id}`,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@student.com`,
          }))}
          onCompleted={(actualMins) => {
            const completedId = completionClass.id;
            const nowIso = new Date().toISOString();
            setClassList((prev) =>
              prev.map((c) =>
                c.id === completedId
                  ? { ...c, status: 'COMPLETED', duration_minutes: actualMins || c.duration_minutes, updated_at: nowIso, completed_at: nowIso }
                  : c
              )
            );
            setActiveTab('COMPLETED');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
