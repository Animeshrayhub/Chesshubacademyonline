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

      // 4. Initialize embedded SDK client into target container
      setDiagInfo((prev) => ({ ...prev, step: 'INIT_SDK' }));
      await clientInstance.init({
        zoomAppRoot: containerRef.current!,
        language: 'en-US',
      });

      // Register Zoom SDK event listeners
      clientInstance.on('connection-change', (payload: any) => {
        const stateStr = String(payload?.state || '').toLowerCase();
        if (stateStr.includes('connected') && !stateStr.includes('reconnecting')) {
          setConnectionState('connected');
          setDiagInfo((prev) => ({ ...prev, step: 'JOINED' }));
        } else if (stateStr.includes('reconnect')) {
          setConnectionState('reconnecting');
        } else if (stateStr.includes('closed') || stateStr.includes('ended')) {
          setConnectionState('disconnected');
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
        sdkKey,
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
    } catch (err: any) {
      console.error('Zoom Meeting SDK join failed:', err);
      const rawErrMsg = err?.message || err?.reason || err?.type || (typeof err === 'string' ? err : 'Unable to connect to Zoom meeting.');
      setConnectionState('error');
      setErrorMessage(rawErrMsg);
      setDiagInfo((prev) => ({ ...prev, step: 'FAILED', errorText: rawErrMsg }));
    }
  }, [classId, cleanMeetingId, isCoach, passcode, userEmail, userName]);

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

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0a1a] rounded-lg overflow-hidden border border-[#222244]">
      {/* ── Network Quality Badge & Diagnostics Toggle ── */}
      <div className="absolute top-2 left-2 z-30 flex items-center gap-2 pointer-events-auto">
        {connectionState === 'connected' && (
          <div className="px-2 py-1 bg-black/75 backdrop-blur rounded-md border border-white/10 flex items-center gap-1.5 text-[10px] font-semibold text-white group">
            {networkQuality === 'good' && <span className="text-emerald-400">🟢 Good</span>}
            {networkQuality === 'weak' && <span className="text-amber-400">🟡 Weak</span>}
            {networkQuality === 'poor' && <span className="text-red-400 font-bold">🔴 Poor</span>}
          </div>
        )}

        {/* Developer Diagnostics Toggle for Coach */}
        {isCoach && (
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="px-2 py-1 bg-slate-900/90 hover:bg-slate-800 text-[10px] text-slate-300 font-mono rounded border border-slate-700 transition-colors"
          >
            {showDiagnostics ? 'Hide Diag' : '🛠️ Diag'}
          </button>
        )}
      </div>

      {/* ── Diagnostic Panel Overlay (Coach/Admin Only) ── */}
      {isCoach && showDiagnostics && (
        <div className="absolute top-10 left-2 right-2 z-40 p-3 bg-[#0d0d21]/95 border border-indigo-500/40 rounded-lg text-[10px] font-mono text-slate-200 shadow-2xl space-y-1">
          <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1 text-indigo-300 font-bold">
            <span>ZOOM SDK DIAGNOSTICS</span>
            <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-700">{diagInfo.step}</span>
          </div>
          <div>Meeting ID: <span className="text-amber-300">{diagInfo.meetingNumber || 'MISSING'}</span></div>
          <div>Role: <span className="text-emerald-300">{diagInfo.role === 1 ? '1 (Host/Coach)' : '0 (Attendee/Student)'}</span></div>
          <div>SDK Key Present: <span className={diagInfo.sdkKeyPresent ? 'text-emerald-400' : 'text-red-400'}>{diagInfo.sdkKeyPresent ? 'YES' : 'NO (Check .env)'}</span></div>
          <div>JWT Signature: <span className={diagInfo.sigPresent ? 'text-emerald-400' : 'text-red-400'}>{diagInfo.sigPresent ? 'YES' : 'NO'}</span></div>
          <div>ZAK Token Present: <span className={diagInfo.zakPresent ? 'text-emerald-400' : 'text-amber-400'}>{diagInfo.zakPresent ? 'YES' : 'NO (Student/Unset)'}</span></div>
          {diagInfo.errorText && (
            <div className="mt-1.5 p-1.5 bg-red-950/80 border border-red-500/40 text-red-200 rounded break-words">
              <strong>Error:</strong> {diagInfo.errorText}
            </div>
          )}
        </div>
      )}

      {/* ── Poor Network Warning Overlay ── */}
      {connectionState === 'connected' && networkQuality === 'poor' && (
        <div className="absolute top-2 right-2 z-30 px-2.5 py-1 bg-red-950/90 border border-red-500/50 rounded-md text-[10px] font-bold text-red-200 flex items-center gap-1.5 animate-pulse">
          <span>⚠️</span>
          <span>Poor internet connection</span>
        </div>
      )}

      {/* ── Reconnecting Status Banner ── */}
      {connectionState === 'reconnecting' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="w-6 h-6 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-xs font-bold text-amber-300">Reconnecting...</p>
          <p className="text-[10px] text-slate-400">Attempting to restore video connection without leaving classroom.</p>
        </div>
      )}

      {/* ── Media Permission Denied Warning ── */}
      {mediaPermissionDenied && (
        <div className="absolute top-10 left-2 right-2 z-30 px-3 py-1.5 bg-amber-950/90 border border-amber-500/40 rounded-md text-[10px] text-amber-200 font-medium flex items-center gap-1.5 shadow-lg">
          <span>📷</span>
          <span>Please allow camera and microphone access in your browser.</span>
        </div>
      )}

      {/* ── Connecting Loader ── */}
      {connectionState === 'connecting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a1a] gap-2 p-4">
          <div className="w-7 h-7 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Connecting to Embedded Zoom Video...</p>
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
        className="w-full h-full min-h-[200px]"
        style={{
          visibility: connectionState === 'connected' ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
}
