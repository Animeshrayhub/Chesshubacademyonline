'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import ZoomClassroomVideo, { type ZoomClassroomVideoHandle } from '@/components/classroom/ZoomClassroomVideo';

interface ClassroomZoomProps {
  classId: string;
  zoomMeetingId: string;
  zoomPasscode?: string;
  userName: string;
  role: 'admin' | 'coach' | 'student';
  isCoach: boolean;
  onMuteAllRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  className?: string;
  videoProvider?: 'ZOOM' | 'GOOGLE_MEET' | 'JITSI' | 'CUSTOM';
  meetingUrl?: string;
  coachName?: string;
}

export default function ClassroomZoom({
  classId,
  zoomMeetingId,
  zoomPasscode = 'chesshub',
  userName,
  role,
  isCoach,
  onMuteAllRef,
  className = '',
  videoProvider = 'ZOOM',
  meetingUrl = '',
  coachName = 'Academy Coach',
}: ClassroomZoomProps) {
  const zoomRef = useRef<ZoomClassroomVideoHandle>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor'>('good');
  const [isDegradedAudioOnly, setIsDegradedAudioOnly] = useState(false);
  const [isMutingAll, setIsMutingAll] = useState(false);
  const [muteAllSuccess, setMuteAllSuccess] = useState(false);

  // Companion window state
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic Meeting URL state (allows Coach/Admin to set/update meet link live in classroom)
  const [currentMeetingUrl, setCurrentMeetingUrl] = useState(meetingUrl);
  const [isEditingMeetUrl, setIsEditingMeetUrl] = useState(false);
  const [newMeetUrlInput, setNewMeetUrlInput] = useState('');
  const [isSavingMeetUrl, setIsSavingMeetUrl] = useState(false);

  useEffect(() => {
    if (meetingUrl) setCurrentMeetingUrl(meetingUrl);
  }, [meetingUrl]);

  // Determine effective provider
  const isGoogleMeet = videoProvider === 'GOOGLE_MEET' || (currentMeetingUrl && currentMeetingUrl.includes('meet.google.com')) || (!currentMeetingUrl && !zoomMeetingId);

  const effectiveMeetingUrl = currentMeetingUrl || (zoomMeetingId
    ? `https://zoom.us/j/${zoomMeetingId.replace(/[^0-9]/g, '')}?pwd=${zoomPasscode}`
    : '');

  const handleSaveMeetUrl = async () => {
    if (!newMeetUrlInput.trim()) return;
    setIsSavingMeetUrl(true);
    try {
      const { updateClassAction } = await import('@/actions/classes');
      const formatted = newMeetUrlInput.trim().startsWith('http')
        ? newMeetUrlInput.trim()
        : `https://${newMeetUrlInput.trim()}`;
      const res = await updateClassAction(classId, {
        videoProvider: 'GOOGLE_MEET',
        googleMeetUri: formatted,
      });
      if (res.success) {
        setCurrentMeetingUrl(formatted);
        setIsEditingMeetUrl(false);
      } else {
        alert(res.error?.message || 'Failed to update meeting link.');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating meeting link.');
    } finally {
      setIsSavingMeetUrl(false);
    }
  };

  const [layoutMode, setLayoutMode] = useState<'gallery' | 'speaker'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('classroom_zoom_layout');
      if (saved === 'speaker' || saved === 'gallery') return saved;
    }
    return 'gallery';
  });

  // Wire coach Mute All ref for ClassroomShell and ClassroomParticipants
  useEffect(() => {
    if (onMuteAllRef) {
      onMuteAllRef.current = async () => {
        if (!zoomRef.current) return false;
        const res = await zoomRef.current.muteAll();
        if (res) {
          setMuteAllSuccess(true);
          setTimeout(() => setMuteAllSuccess(false), 2500);
        }
        return res;
      };
    }
    return () => {
      if (onMuteAllRef) onMuteAllRef.current = null;
    };
  }, [onMuteAllRef]);

  // Request browser media permissions cleanly and non-blockingly on mount for Zoom
  useEffect(() => {
    if (!isGoogleMeet && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          setPermissionError(null);
        })
        .catch((err: any) => {
          console.warn('[Camera/Mic Permission Notice]', err?.message);
          setPermissionError(
            'Camera or Microphone was blocked by your browser. Click the lock icon in your address bar to enable, or continue in class.'
          );
        });
    }
  }, [isGoogleMeet]);

  const companionWinRef = useRef<Window | null>(null);

  // Open meeting in synchronized side-by-side companion window (40% width docked to right edge)
  const openCompanionWindow = useCallback((urlToOpen?: string) => {
    const target = urlToOpen || effectiveMeetingUrl;
    if (!target) return;

    if (typeof window !== 'undefined') {
      const screenW = window.screen.availWidth || 1280;
      const screenH = window.screen.availHeight || 800;
      const width = Math.max(480, Math.min(Math.round(screenW * 0.4), 720));
      const height = Math.max(580, Math.min(Math.round(screenH * 0.92), screenH - 60));
      const left = Math.max(0, screenW - width - 10);
      const top = 20;

      const win = window.open(
        target,
        'chesshub_companion_video',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes`
      );

      if (win) {
        companionWinRef.current = win;
        setIsCompanionOpen(true);
        try {
          win.focus();
        } catch {}
      } else {
        // Browser blocked popup window: fallback to new tab
        const tabWin = window.open(target, '_blank');
        if (tabWin) companionWinRef.current = tabWin;
        setIsCompanionOpen(true);
      }
    }
  }, [effectiveMeetingUrl]);

  const focusCompanionWindow = useCallback(() => {
    if (companionWinRef.current && !companionWinRef.current.closed) {
      try {
        companionWinRef.current.focus();
      } catch {}
    } else {
      openCompanionWindow();
    }
  }, [openCompanionWindow]);

  const handleCopyLink = () => {
    if (!effectiveMeetingUrl) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(effectiveMeetingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleMediaStatusChange = useCallback((status: { isVideoOn: boolean; isMuted: boolean }) => {
    setIsVideoOn(status.isVideoOn);
    setIsMuted(status.isMuted);
  }, []);

  const handleSelectLayout = async (mode: 'gallery' | 'speaker') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('classroom_zoom_layout', mode);
      await zoomRef.current?.changeViewType(mode);
    } catch {}
  };

  const handleToggleMute = async () => {
    if (zoomRef.current) {
      const nowMuted = await zoomRef.current.toggleMute();
      setIsMuted(nowMuted);
    } else {
      setIsMuted((prev) => !prev);
    }
  };

  const handleToggleVideo = async () => {
    if (zoomRef.current) {
      const nowOn = await zoomRef.current.toggleVideo();
      setIsVideoOn(nowOn);
      if (nowOn && isDegradedAudioOnly) {
        setIsDegradedAudioOnly(false);
      }
    } else {
      setIsVideoOn((prev) => !prev);
    }
  };

  const handleMuteAll = async () => {
    if (!isCoach || !zoomRef.current) return;
    setIsMutingAll(true);
    try {
      const success = await zoomRef.current.muteAll();
      if (success) {
        setMuteAllSuccess(true);
        setTimeout(() => setMuteAllSuccess(false), 2500);
      }
    } finally {
      setIsMutingAll(false);
    }
  };

  return (
    <div
      className={`relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 bg-slate-950' : 'w-full h-full'
      } ${className}`}
    >
      {/* ─── Header Bar ────────────────────────────────────────────── */}
      <div className="h-8 bg-slate-950/80 backdrop-blur-md px-3 border-b border-slate-800/80 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full ${isGoogleMeet ? 'bg-amber-400' : 'bg-blue-400'} animate-pulse shrink-0`} />
          <span className="font-extrabold text-[11px] text-slate-300 tracking-wide truncate">
            {isGoogleMeet ? 'Google Meet Live' : 'Zoom Live Session'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline truncate">
            {isGoogleMeet ? 'Video & Voice' : `#${zoomMeetingId || 'Live'}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Copy Meeting Link button */}
          {effectiveMeetingUrl && (
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Copy meeting join link"
            >
              <span>{copiedLink ? '✓' : '📋'}</span>
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {/* 1-Click Launch Button in Header */}
          {effectiveMeetingUrl && (
            <button
              type="button"
              onClick={() => openCompanionWindow()}
              className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold text-white transition-all flex items-center gap-1 shadow-sm ${
                isGoogleMeet
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
              title="Open video meeting in a side companion window"
            >
              <span>↗️</span>
              <span>{isGoogleMeet ? 'Open Meet' : 'Zoom Window'}</span>
            </button>
          )}

          {/* Coach-only: Zoom Gallery / Speaker Layout Selector (Zoom only) */}
          {!isGoogleMeet && isCoach && (
            <div className="hidden sm:flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => handleSelectLayout('gallery')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  layoutMode === 'gallery'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Gallery Grid View"
              >
                👥 Gallery
              </button>
              <button
                type="button"
                onClick={() => handleSelectLayout('speaker')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  layoutMode === 'speaker'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Active Speaker View"
              >
                👤 Speaker
              </button>
            </div>
          )}

          {!isGoogleMeet && (
            <button
              type="button"
              onClick={() => setIsMirrored((v) => !v)}
              className={`hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                isMirrored ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={isMirrored ? 'Disable Mirror' : 'Flip Mirror Camera'}
            >
              🪞 {isMirrored ? 'Mirrored' : 'Normal'}
            </button>
          )}

          <button
            type="button"
            data-testid="zoom-minimize-btn"
            onClick={() => setIsMinimized((v) => !v)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isMinimized ? 'Expand video area' : 'Minimize video area'}
          >
            {isMinimized ? 'Expand' : 'Minimize'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsExpanded((v) => !v);
              if (isMinimized) setIsMinimized(false);
            }}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isExpanded ? 'Collapse view' : 'Maximize video'}
          >
            {isExpanded ? 'Collapse' : 'Full'}
          </button>
        </div>
      </div>

      {/* ─── Main Video Area ────────────────────────────────────────── */}
      <div
        className={`flex-1 relative w-full h-full ${isMinimized ? 'hidden' : 'min-h-[140px]'} bg-slate-950 flex items-center justify-center overflow-hidden`}
        style={{ display: isMinimized ? 'none' : undefined }}
      >
        {/* CASE 1: GOOGLE MEET 1-CLICK COMPANION EXPERIENCE */}
        {isGoogleMeet ? (
          <div className="w-full h-full p-3.5 flex flex-col justify-between overflow-y-auto bg-radial from-slate-900 to-slate-950 select-none">
            {/* Top info card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base text-amber-400">
                    📹
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white tracking-wide">
                      Google Meet Video Session
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Coach: <span className="text-amber-300 font-bold">{coachName}</span>
                    </p>
                  </div>
                </div>

                {/* Equalizer Wave Indicator */}
                <div className="flex items-end gap-1 h-5 px-2 py-1 bg-slate-900/90 border border-slate-800 rounded-lg">
                  <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="w-1 h-5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                  <span className="w-1 h-2 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '250ms' }} />
                </div>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isCompanionOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[11px] font-bold text-slate-300">
                    {isCompanionOpen ? 'Live Call Running (Side Window)' : 'Click to Join Video & Audio'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isCompanionOpen ? '🟢 Active' : '🟡 Ready'}
                  </span>
                  {isCompanionOpen && (
                    <button
                      type="button"
                      onClick={focusCompanionWindow}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 cursor-pointer"
                      title="Bring Google Meet companion window to front"
                    >
                      🔍 Focus
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Big Kid-Friendly 1-Click Join Button */}
            <div className="my-2 space-y-2 text-center">
              {effectiveMeetingUrl ? (
                <button
                  type="button"
                  onClick={() => openCompanionWindow()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] group border border-emerald-400/30 animate-pulse cursor-pointer"
                >
                  <span className="text-base group-hover:rotate-12 transition-transform">🎥</span>
                  <span>{isCompanionOpen ? 'RE-OPEN GOOGLE MEET WINDOW' : 'JOIN GOOGLE MEET (1-CLICK)'}</span>
                </button>
              ) : (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-amber-300 flex items-center gap-1">
                      <span>🟡</span> Google Meet Link Not Set
                    </p>
                    {isCoach && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewMeetUrlInput('');
                          setIsEditingMeetUrl(true);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                      >
                        + Add Meet Link
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {isCoach
                      ? 'Click "+ Add Meet Link" to paste your Google Meet room URL for students.'
                      : 'Please wait for the Coach or Academy Admin to assign the Google Meet link.'}
                  </p>
                </div>
              )}

              {/* Inline Meet Link Editor for Coach */}
              {isEditingMeetUrl && isCoach && (
                <div className="p-3 bg-slate-950 border border-emerald-500/50 rounded-xl text-left space-y-2.5 animate-fadeIn">
                  <p className="text-[11px] font-bold text-emerald-300">Set Google Meet URL for this Class</p>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={newMeetUrlInput}
                    onChange={(e) => setNewMeetUrlInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => window.open('https://meet.google.com/new', '_blank')}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>↗️</span> Create New Meet
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingMeetUrl(false)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!newMeetUrlInput.trim() || isSavingMeetUrl}
                        onClick={handleSaveMeetUrl}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingMeetUrl ? 'Saving…' : 'Save & Publish'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick instructions for young students */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-[10px] text-slate-400 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <span>💡</span>
                  <span>Simple Instructions for Students:</span>
                </div>
                <p className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[8px]">1</span>
                  <span>Click the green <strong>Join Google Meet</strong> button above.</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[8px]">2</span>
                  <span>Click <strong>Allow</strong> for Camera & Microphone in Meet.</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[8px]">3</span>
                  <span>Keep this tab open to move your chess pieces and play with Coach!</span>
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{copiedLink ? '✓' : '📋'}</span>
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                {isCoach && effectiveMeetingUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewMeetUrlInput(effectiveMeetingUrl);
                      setIsEditingMeetUrl((v) => !v);
                    }}
                    className="text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>✏️</span>
                    <span>Edit Link</span>
                  </button>
                )}
              </div>

              <a
                href={effectiveMeetingUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold transition-colors"
              >
                <span>🌐 Open in New Tab</span>
              </a>
            </div>
          </div>
        ) : (
          /* CASE 2: ZOOM (EMBEDDED + 1-CLICK COMPANION RESCUE LAUNCHER) */
          <>
            <div
              className="w-full h-full transition-transform duration-200"
              style={{
                transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
              }}
            >
              <ZoomClassroomVideo
                ref={zoomRef}
                classId={classId}
                meetingNumber={zoomMeetingId}
                passCode={zoomPasscode}
                userName={userName}
                role={isCoach ? 1 : 0}
                onMediaStatusChange={handleMediaStatusChange}
                onNetworkQualityChange={setNetworkQuality}
                className="w-full h-full"
              />
            </div>

            {/* 1-Click Rescue Launcher overlay (Visible in top bar / banner so kids never get stuck) */}
            <div className="absolute top-2 right-2 z-20">
              <button
                type="button"
                onClick={() => openCompanionWindow()}
                className="px-2.5 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-lg backdrop-blur-xs border border-blue-400/40 transition-all cursor-pointer"
                title="Launch Zoom in companion window if video is black or audio fails"
              >
                <span>↗️</span>
                <span>Open in Companion Window</span>
              </button>
            </div>

            {/* Low-bandwidth alert banner with instant Audio-Only fallback button */}
            {networkQuality === 'poor' && (
              <div className="absolute top-2 left-2 right-2 z-30 text-[10px] text-amber-200 bg-amber-950/95 border border-amber-500/50 rounded-xl px-2.5 py-1.5 flex items-center justify-between shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="truncate font-semibold">Slow Network Detected • Board & Audio Prioritized</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isVideoOn) handleToggleVideo();
                    setIsDegradedAudioOnly(true);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] transition-all shrink-0 ml-2 shadow-sm cursor-pointer"
                >
                  Audio Only
                </button>
              </div>
            )}

            {/* Floating Quick Media Controls Bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-slate-900/95 border border-slate-700/90 rounded-full shadow-2xl backdrop-blur-md select-none pointer-events-auto">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`px-3 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${
                  isMuted
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isMuted ? 'Click to Unmute Microphone' : 'Click to Mute Microphone'}
              >
                <span>{isMuted ? '🔇' : '🎙️'}</span>
                <span className="text-[11px] font-mono font-bold">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button
                type="button"
                onClick={handleToggleVideo}
                className={`px-3 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${
                  !isVideoOn
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isVideoOn ? 'Click to Stop Camera' : 'Click to Start Camera'}
              >
                <span>{isVideoOn ? '📹' : '🚫'}</span>
                <span className="text-[11px] font-mono font-bold">{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
              </button>
            </div>

            {/* Non-blocking permission notification */}
            {permissionError && (
              <div className="absolute top-2 left-2 right-2 z-30 text-[11px] text-amber-200 bg-amber-950/90 border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-xl backdrop-blur-sm">
                <span className="leading-snug">⚠️ {permissionError}</span>
                <button
                  type="button"
                  onClick={() => setPermissionError(null)}
                  className="text-amber-400 hover:text-white ml-2 text-xs font-bold cursor-pointer"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Bottom Mini Control Toolbar ────────────────────────────── */}
      <div className="h-9 bg-slate-950/90 backdrop-blur-sm border-t border-slate-800 px-3 flex items-center justify-between">
        {isGoogleMeet ? (
          /* Google Meet bottom bar: Simple clean status and quick companion launcher */
          <div className="flex items-center justify-between w-full text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">🟡 Google Meet Mode</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Camera & Mic running in Meet window</span>
            </div>
            <button
              type="button"
              onClick={() => openCompanionWindow()}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[10px] cursor-pointer"
            >
              <span>↗️</span>
              <span>Re-open Window</span>
            </button>
          </div>
        ) : (
          /* Zoom bottom bar */
          <>
            {!isCoach ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleVideo}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    isVideoOn
                      ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                      : 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                  }`}
                  title={isVideoOn ? 'Camera is ON (click to turn OFF)' : 'Camera is OFF (click to turn ON)'}
                >
                  <span>{isVideoOn ? '📹' : '🚫'}</span>
                  <span className="text-[11px]">{isVideoOn ? 'Camera ON' : 'Camera OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    !isMuted
                      ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                      : 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                  }`}
                  title={!isMuted ? 'Mic is ON (click to mute)' : 'Mic is OFF (click to unmute)'}
                >
                  <span>{!isMuted ? '🎙️' : '🔇'}</span>
                  <span className="text-[11px]">{!isMuted ? 'Mic ON' : 'Mic OFF'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <span>{isMuted ? '🔇' : '🎙️'}</span>
                  <span className="text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleVideo}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer ${
                    !isVideoOn
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <span>{isVideoOn ? '📹' : '🚫'}</span>
                  <span className="text-[10px]">{isVideoOn ? 'Camera' : 'Start Video'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleMuteAll}
                  disabled={isMutingAll}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer ${
                    muteAllSuccess
                      ? 'bg-emerald-600 text-white shadow-emerald-900/40'
                      : 'bg-rose-950/60 border border-rose-700/50 hover:bg-rose-900/80 text-rose-300'
                  }`}
                  title="Mute all students in Zoom meeting"
                >
                  <span>{muteAllSuccess ? '✓' : '🔇'}</span>
                  <span className="text-[10px]">{muteAllSuccess ? 'All Muted' : 'Mute All'}</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 text-[10px] font-semibold">
              <span className={networkQuality === 'good' ? 'text-emerald-400' : 'text-amber-400'}>●</span>
              <span className="text-slate-400">{networkQuality === 'good' ? 'HD' : 'Auto-Degraded'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
