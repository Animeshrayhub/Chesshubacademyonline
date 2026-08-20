'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getZoomSignatureAction } from '@/actions/zoom';

interface ZoomClassroomVideoProps {
  classId: string;
  meetingNumber: string;
  passcode?: string;
  userName: string;
  userEmail?: string;
  role: 'admin' | 'coach' | 'student';
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  onClassEndedByCoach?: () => void;
}

export default function ZoomClassroomVideo({
  classId,
  meetingNumber,
  passcode = 'chesshub',
  userName,
  userEmail,
  role,
  isAudioMuted = false,
  isVideoMuted = false,
  onClassEndedByCoach,
}: ZoomClassroomVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomClientRef = useRef<any>(null);
  const initStartedRef = useRef<boolean>(false);

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected'>('connecting');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'weak' | 'poor' | 'unknown'>('good');
  const [networkStats, setNetworkStats] = useState<{ uplink?: number; downlink?: number; level?: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Video Stage & Controls State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewType, setViewTypeState] = useState<'gallery' | 'speaker'>('gallery');
  const [localMuted, setLocalMuted] = useState<boolean>(isAudioMuted);
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [activeSpeakerName, setActiveSpeakerName] = useState<string | null>(null);

  const [diagInfo, setDiagInfo] = useState<{
    step: string;
    meetingNumber: string;
    role: number;
    sdkKeyPresent: boolean;
    sigPresent: boolean;
    zakPresent: boolean;
    errorText?: string;
  }>({
    step: 'IDLE',
    meetingNumber: meetingNumber || '',
    role: role === 'coach' || role === 'admin' ? 1 : 0,
    sdkKeyPresent: false,
    sigPresent: false,
    zakPresent: false,
  });

  const isCoach = role === 'coach' || role === 'admin';
  const cleanMeetingId = (meetingNumber || '').replace(/\s+/g, '');

  const updateAttendeesCount = useCallback((clientInstance: any) => {
    try {
      if (clientInstance && typeof clientInstance.getAttendeeslist === 'function') {
        const list = clientInstance.getAttendeeslist();
        if (Array.isArray(list) && list.length > 0) {
          setParticipantCount(list.length);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const startConnection = useCallback(async () => {
    if (!containerRef.current || !cleanMeetingId) {
      if (!cleanMeetingId) {
        setErrorMessage('Meeting ID is missing for this class session.');
        setConnectionState('error');
        setDiagInfo((prev) => ({ ...prev, step: 'FAILED', errorText: 'Missing meeting number' }));
      }
      return;
    }

    setConnectionState('connecting');
    setErrorMessage(null);
    setMediaPermissionDenied(false);

    setDiagInfo((prev) => ({ ...prev, step: 'MEDIA_PERM_CHECK', meetingNumber: cleanMeetingId, errorText: undefined }));

    try {
      // 1. Request browser media permissions cleanly beforehand
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr: any) {
          console.warn('Browser media permission check warning:', permErr);
          if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
            setMediaPermissionDenied(true);
          }
        }
      }

      setDiagInfo((prev) => ({ ...prev, step: 'FETCH_SIG' }));

      // 2. Fetch signature & host ZAK authorization from server action
      const sigResult = await getZoomSignatureAction(classId);

      if (!sigResult.success || !sigResult.data) {
        const errDetail = sigResult.error?.message || 'Failed to generate Zoom meeting signature.';
        throw new Error(errDetail);
      }

      const { signature, sdkKey, zak, meetingNumber: serverMeetingId, role: serverRole } = sigResult.data;
      const effectiveMeetingId = serverMeetingId || cleanMeetingId;

      setDiagInfo((prev) => ({
        ...prev,
        step: 'SIG_RECEIVED',
        meetingNumber: effectiveMeetingId,
        role: serverRole,
        sdkKeyPresent: Boolean(sdkKey && sdkKey !== 'dummy_sdk_key'),
        sigPresent: Boolean(signature && signature.length > 20),
        zakPresent: Boolean(zak),
      }));

      // 3. Dynamically import Zoom Meeting SDK embedded module (client-side only)
      setDiagInfo((prev) => ({ ...prev, step: 'IMPORT_SDK' }));
      const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default;
      const clientInstance = ZoomMtgEmbedded.createClient();
      zoomClientRef.current = clientInstance;

      // 4. Initialize embedded SDK client into target container with responsive layout options
      setDiagInfo((prev) => ({ ...prev, step: 'INIT_SDK' }));
      await clientInstance.init({
        zoomAppRoot: containerRef.current!,
        language: 'en-US',
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          video: {
            isResizable: true,
            defaultViewType: 'gallery' as any,
          },
          meetingInfo: ['topic', 'mn', 'participant'],
        },
      });

      // Register Zoom SDK event listeners
      clientInstance.on('connection-change', (payload: any) => {
        const stateStr = String(payload?.state || '').toLowerCase();
        if (stateStr.includes('connected') && !stateStr.includes('reconnecting')) {
          setConnectionState('connected');
          setDiagInfo((prev) => ({ ...prev, step: 'JOINED' }));
          updateAttendeesCount(clientInstance);
        } else if (stateStr.includes('reconnect')) {
          setConnectionState('reconnecting');
        } else if (stateStr.includes('closed') || stateStr.includes('ended')) {
          setConnectionState('disconnected');
        }
      });

      clientInstance.on('user-added', () => {
        updateAttendeesCount(clientInstance);
      });

      clientInstance.on('user-removed', () => {
        updateAttendeesCount(clientInstance);
      });

      clientInstance.on('user-updated', () => {
        updateAttendeesCount(clientInstance);
      });

      clientInstance.on('active-speaker', (payload: any) => {
        if (payload?.displayName || payload?.userName) {
          setActiveSpeakerName(payload.displayName || payload.userName);
        }
      });

      (clientInstance as any).on('network-quality', (payload: any) => {
        const level = payload?.level ?? payload?.quality ?? 3;
        const uplink = payload?.uplink;
        const downlink = payload?.downlink;
        setNetworkStats({ level, uplink, downlink });

        if (level <= 1) {
          setNetworkQuality('poor');
        } else if (level === 2) {
          setNetworkQuality('weak');
        } else if (level >= 3) {
          setNetworkQuality('good');
        }
      });

      // 5. Join Zoom meeting
      setDiagInfo((prev) => ({ ...prev, step: 'JOINING' }));
      const joinPayload: any = {
        signature,
        meetingNumber: effectiveMeetingId,
        password: passcode,
        userName: userName || (isCoach ? 'Coach' : 'Student'),
        userEmail: userEmail || `${(userName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '.')}@chesshub.online`,
      };

      if (serverRole === 1 && zak) {
        joinPayload.zak = zak;
      }

      await (clientInstance as any).join(joinPayload);

      setConnectionState('connected');
      setDiagInfo((prev) => ({ ...prev, step: 'JOINED' }));
      updateAttendeesCount(clientInstance);
    } catch (err: any) {
      console.error('Zoom Meeting SDK join failed:', err);
      const rawErrMsg = err?.message || err?.reason || err?.type || (typeof err === 'string' ? err : 'Unable to connect to Zoom meeting.');
      setConnectionState('error');
      setErrorMessage(rawErrMsg);
      setDiagInfo((prev) => ({ ...prev, step: 'FAILED', errorText: rawErrMsg }));
    }
  }, [classId, cleanMeetingId, isCoach, passcode, updateAttendeesCount, userEmail, userName]);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    startConnection();

    return () => {
      if (zoomClientRef.current) {
        try {
          zoomClientRef.current.leave();
        } catch (e) {
          console.warn('Error closing Zoom SDK client:', e);
        }
        zoomClientRef.current = null;
      }
      initStartedRef.current = false;
    };
  }, [startConnection]);

  const handleRetry = () => {
    initStartedRef.current = false;
    if (zoomClientRef.current) {
      try {
        zoomClientRef.current.leave();
      } catch (e) {
        // ignore
      }
      zoomClientRef.current = null;
    }
    startConnection();
  };

  const handleToggleMute = () => {
    if (zoomClientRef.current && typeof zoomClientRef.current.mute === 'function') {
      try {
        const nextState = !localMuted;
        zoomClientRef.current.mute(nextState);
        setLocalMuted(nextState);
      } catch (e) {
        console.warn('Toggle mute error:', e);
      }
    }
  };

  const handleToggleView = (targetView: 'gallery' | 'speaker') => {
    setViewTypeState(targetView);
    if (zoomClientRef.current && typeof zoomClientRef.current.setViewType === 'function') {
      try {
        zoomClientRef.current.setViewType(targetView);
      } catch (e) {
        console.warn('Set viewType error:', e);
      }
    }
  };

  return (
    <div
      className={`relative flex flex-col bg-[#0a0a1a] border border-[#222244] overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-3 z-50 rounded-2xl shadow-2xl border-indigo-500/50 ring-4 ring-indigo-500/20'
          : 'w-full h-full rounded-lg'
      }`}
    >
      {/* ── Top Bar: Network Quality, Speakers & Fullscreen Controls ── */}
      <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5">
          {connectionState === 'connected' && (
            <div className="px-2 py-0.5 bg-black/80 backdrop-blur rounded-md border border-white/10 flex items-center gap-1.5 text-[10px] font-semibold text-white">
              {networkQuality === 'good' && <span className="text-emerald-400">🟢 Good</span>}
              {networkQuality === 'weak' && <span className="text-amber-400">🟡 Weak</span>}
              {networkQuality === 'poor' && <span className="text-red-400 font-bold">🔴 Poor</span>}
            </div>
          )}

          {activeSpeakerName && (
            <div className="px-2 py-0.5 bg-indigo-950/80 backdrop-blur rounded-md border border-indigo-500/30 text-[10px] font-bold text-indigo-200 truncate max-w-[140px]">
              🗣️ {activeSpeakerName}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Developer Diagnostics Toggle for Coach */}
          {isCoach && (
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="px-2 py-0.5 bg-slate-900/90 hover:bg-slate-800 text-[10px] text-slate-300 font-mono rounded border border-slate-700 transition-colors shadow"
            >
              {showDiagnostics ? 'Hide Diag' : '🛠️ Diag'}
            </button>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-2 py-0.5 bg-indigo-600/90 hover:bg-indigo-500 text-[10px] font-bold text-white rounded border border-indigo-400/40 transition-colors shadow flex items-center gap-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Video Stage'}
          >
            <span>{isFullscreen ? '🗗' : '⛶'}</span>
            <span>{isFullscreen ? 'Exit' : 'Full Video'}</span>
          </button>
        </div>
      </div>

      {/* ── Diagnostic Panel Overlay (Coach/Admin Only) ── */}
      {isCoach && showDiagnostics && (
        <div className="absolute top-10 left-2 right-2 z-40 p-3 bg-[#0d0d21]/95 border border-indigo-500/40 rounded-lg text-[10px] font-mono text-slate-200 shadow-2xl space-y-1">
          <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1 text-indigo-300 font-bold">
            <span>ZOOM SDK DIAGNOSTICS</span>
            <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-700">{diagInfo.step}</span>
          </div>
          <div>Meeting ID: <span className="text-amber-300">{diagInfo.meetingNumber || 'MISSING'}</span></div>
          <div>Role: <span className="text-emerald-300">{diagInfo.role === 1 ? '1 (Host/Coach)' : '0 (Student)'}</span></div>
          <div>Meeting SDK credentials: <span className={diagInfo.sdkKeyPresent ? 'text-emerald-400' : 'text-red-400'}>{diagInfo.sdkKeyPresent ? 'YES' : 'NO (Check .env)'}</span></div>
          <div>JWT Signature: <span className={diagInfo.sigPresent ? 'text-emerald-400' : 'text-red-400'}>{diagInfo.sigPresent ? 'YES' : 'NO'}</span></div>
          <div>ZAK Token: <span className={diagInfo.role === 0 ? 'text-slate-400' : diagInfo.zakPresent ? 'text-emerald-400' : 'text-red-400'}>
            {diagInfo.role === 0 ? 'NOT REQUIRED' : diagInfo.zakPresent ? 'YES' : 'NO (Error/Unset)'}
          </span></div>
          <div>SDK initialization: <span className={diagInfo.step !== 'FAILED' && diagInfo.step !== 'IDLE' && diagInfo.step !== 'FETCH_SIG' && diagInfo.step !== 'SIG_RECEIVED' && diagInfo.step !== 'IMPORT_SDK' ? 'text-emerald-400' : 'text-amber-400'}>
            {diagInfo.step === 'JOINED' || diagInfo.step === 'JOINING' || diagInfo.step === 'INIT_SDK' ? 'PASS' : 'PENDING'}
          </span></div>
          <div>Meeting join: <span className={diagInfo.step === 'JOINED' ? 'text-emerald-400 font-bold' : diagInfo.step === 'FAILED' ? 'text-red-400 font-bold' : 'text-amber-400'}>
            {diagInfo.step === 'JOINED' ? 'PASS' : diagInfo.step === 'FAILED' ? 'FAIL' : 'JOINING...'}
          </span></div>
          <div>Participants Count: <span className="text-indigo-300 font-bold">{participantCount}</span></div>
          {diagInfo.errorText && (
            <div className="mt-1.5 p-1.5 bg-red-950/80 border border-red-500/40 text-red-200 rounded break-words">
              <strong>Error:</strong> {diagInfo.errorText}
            </div>
          )}
        </div>
      )}

      {/* ── Poor Network Warning Overlay ── */}
      {connectionState === 'connected' && networkQuality === 'poor' && (
        <div className="absolute top-10 right-2 z-30 px-2.5 py-1 bg-red-950/90 border border-red-500/50 rounded-md text-[10px] font-bold text-red-200 flex items-center gap-1.5 animate-pulse">
          <span>⚠️</span>
          <span>Poor internet connection</span>
        </div>
      )}

      {/* ── Reconnecting Status Banner ── */}
      {connectionState === 'reconnecting' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="w-6 h-6 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-xs font-bold text-amber-300">Reconnecting Video...</p>
          <p className="text-[10px] text-slate-400">Attempting to restore video connection without leaving classroom.</p>
        </div>
      )}

      {/* ── Media Permission Denied Warning ── */}
      {mediaPermissionDenied && (
        <div className="absolute top-10 left-2 right-2 z-30 px-3 py-1.5 bg-amber-950/90 border border-amber-500/40 rounded-md text-[10px] text-amber-200 font-medium flex items-center gap-1.5 shadow-lg">
          <span>📷</span>
          <span>Camera permission is blocked. Please allow camera access in your browser settings.</span>
        </div>
      )}

      {/* ── Connecting Loader ── */}
      {connectionState === 'connecting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a1a] gap-2 p-4">
          <div className="w-7 h-7 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Connecting to Embedded Zoom Video Stage...</p>
          <p className="text-[10px] text-slate-500 font-mono">Meeting #{cleanMeetingId}</p>
        </div>
      )}

      {/* ── Error Screen ── */}
      {connectionState === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a1a] border border-red-500/30 rounded-lg p-4 text-center gap-2">
          <span className="text-2xl">⚠️</span>
          <p className="text-xs font-bold text-red-300">{errorMessage || 'Unable to join video meeting.'}</p>
          <p className="text-[10px] text-slate-400">Chessboard & classroom features remain active.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded transition-colors"
          >
            Retry Video Connection
          </button>
        </div>
      )}

      {/* ── Zoom Meeting SDK Container Element ── */}
      <div
        ref={containerRef}
        id="zoom-embedded-video-container"
        className="w-full flex-1 min-h-[220px]"
        style={{
          visibility: connectionState === 'connected' ? 'visible' : 'hidden',
        }}
      />

      {/* ── Integrated Bottom Controls Bar ── */}
      {connectionState === 'connected' && (
        <div className="px-3 py-1.5 bg-[#070714] border-t border-[#1e1e3a] flex items-center justify-between gap-2 z-30 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 ${
                localMuted
                  ? 'bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-900'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span>{localMuted ? '🔇' : '🎙️'}</span>
              <span>{localMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* View Layout Selector */}
            <button
              type="button"
              onClick={() => handleToggleView(viewType === 'gallery' ? 'speaker' : 'gallery')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-200 rounded-lg transition-colors flex items-center gap-1"
              title="Switch Grid Layout"
            >
              <span>{viewType === 'gallery' ? '🔲' : '👤'}</span>
              <span>{viewType === 'gallery' ? 'Gallery View' : 'Speaker View'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
              👥 {participantCount} {participantCount === 1 ? 'Participant' : 'Participants'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

