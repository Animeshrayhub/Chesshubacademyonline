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

// Mirrors the SDK Participant shape we care about
interface ParticipantInfo {
  userId: number;
  userName: string;
  audio: string;       // '' | 'computer' | 'phone'
  muted: boolean;
  bVideoOn: boolean;
  audioConnectionStatus?: number; // 0=NotConnect 1=Connecting 2=ConnectSuccess 3=ConnectFail
}

interface AudioDiagState {
  meetingJoined: boolean;
  audioConnected: boolean;       // audio === 'computer'
  audioConnectionStatus: number; // 0-3
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  micDetected: boolean;
  isMuted: boolean;              // from SDK getCurrentUser().muted
  isTalking: boolean;            // from active-speaker event
  autoplayBlocked: boolean;
  participants: ParticipantInfo[];
  sdkMuteError: string | null;
}

export default function ZoomClassroomVideo({
  classId,
  meetingNumber,
  passcode = 'chesshub',
  userName,
  userEmail,
  role,
  isAudioMuted = false,
  onClassEndedByCoach,
}: ZoomClassroomVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomClientRef = useRef<any>(null);
  const initStartedRef = useRef<boolean>(false);

  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected'
  >('connecting');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'weak' | 'poor' | 'unknown'>('good');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Video Stage & Layout State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewType, setViewTypeState] = useState<'gallery' | 'speaker'>('gallery');
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [activeSpeakerName, setActiveSpeakerName] = useState<string | null>(null);

  // ── AUDIO DIAGNOSTICS STATE ──────────────────────────────────────────────
  const [audioDiag, setAudioDiag] = useState<AudioDiagState>({
    meetingJoined: false,
    audioConnected: false,
    audioConnectionStatus: 0,
    micPermission: 'unknown',
    micDetected: false,
    isMuted: isAudioMuted,
    isTalking: false,
    autoplayBlocked: false,
    participants: [],
    sdkMuteError: null,
  });

  // Local muted state — kept in sync with SDK via user-updated events
  const [localMuted, setLocalMuted] = useState<boolean>(isAudioMuted);
  const [muteLoading, setMuteLoading] = useState<boolean>(false);

  // SDK init step diagnostics
  const [diagStep, setDiagStep] = useState<string>('IDLE');
  const [diagInfo, setDiagInfo] = useState<{
    meetingNumber: string;
    role: number;
    sdkKeyPresent: boolean;
    sigPresent: boolean;
    zakPresent: boolean;
    errorText?: string;
  }>({
    meetingNumber: meetingNumber || '',
    role: role === 'coach' || role === 'admin' ? 1 : 0,
    sdkKeyPresent: false,
    sigPresent: false,
    zakPresent: false,
  });

  const isCoach = role === 'coach' || role === 'admin';
  const cleanMeetingId = (meetingNumber || '').replace(/\s+/g, '');

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Reads full participant list from SDK and refreshes audioDiag.participants */
  const refreshParticipants = useCallback((clientInstance: any) => {
    try {
      if (!clientInstance || typeof clientInstance.getAttendeeslist !== 'function') return;
      const list: any[] = clientInstance.getAttendeeslist() || [];
      setParticipantCount(list.length);
      const mapped: ParticipantInfo[] = list.map((p: any) => ({
        userId: p.userId,
        userName: p.userName || p.displayName || 'Unknown',
        audio: p.audio ?? '',
        muted: p.muted ?? true,
        bVideoOn: p.video ?? p.bVideoOn ?? false,
        audioConnectionStatus: p.audioConnectionStatus ?? p.audioStatus ?? 0,
      }));
      setAudioDiag((prev) => ({ ...prev, participants: mapped }));
    } catch {
      // ignore
    }
  }, []);

  /** Reads current user audio state from SDK and updates audioDiag */
  const syncCurrentUserAudio = useCallback((clientInstance: any) => {
    try {
      if (!clientInstance || typeof clientInstance.getCurrentUser !== 'function') return;
      const me: any = clientInstance.getCurrentUser();
      if (!me) return;
      const audioConnected = me.audio === 'computer' || me.audio === 'phone';
      const audioConnStatus: number = me.audioConnectionStatus ?? me.audioStatus ?? (audioConnected ? 2 : 0);
      setAudioDiag((prev) => ({
        ...prev,
        audioConnected,
        audioConnectionStatus: audioConnStatus,
        isMuted: me.muted ?? prev.isMuted,
        meetingJoined: true,
      }));
      setLocalMuted(me.muted ?? false);
    } catch {
      // ignore
    }
  }, []);

  // ── Main Connection Flow ─────────────────────────────────────────────────

  const startConnection = useCallback(async () => {
    if (!containerRef.current || !cleanMeetingId) {
      if (!cleanMeetingId) {
        setErrorMessage('Meeting ID is missing for this class session.');
        setConnectionState('error');
        setDiagStep('FAILED');
        setDiagInfo((prev) => ({ ...prev, errorText: 'Missing meeting number' }));
      }
      return;
    }

    setConnectionState('connecting');
    setErrorMessage(null);
    setMediaPermissionDenied(false);
    setDiagStep('MEDIA_PERM_CHECK');

    try {
      // ── 1. Browser media permissions ───────────────────────────────────
      let micPermission: AudioDiagState['micPermission'] = 'unknown';
      let micDetected = false;

      if (navigator.permissions) {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          micPermission = perm.state as AudioDiagState['micPermission'];
        } catch {
          // Firefox doesn't support microphone query
        }
      }

      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          micDetected = stream.getAudioTracks().length > 0;
          micPermission = 'granted';
          stream.getTracks().forEach((t) => t.stop());
        } catch (permErr: any) {
          console.warn('[zoom] Media permission check:', permErr?.name, permErr?.message);
          if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
            micPermission = 'denied';
            setMediaPermissionDenied(true);
          }
        }
      }

      setAudioDiag((prev) => ({ ...prev, micPermission, micDetected }));

      // ── 2. Fetch server signature + ZAK ───────────────────────────────
      setDiagStep('FETCH_SIG');
      const sigResult = await getZoomSignatureAction(classId);

      if (!sigResult.success || !sigResult.data) {
        throw new Error(sigResult.error?.message || 'Failed to generate Zoom meeting signature.');
      }

      const { signature, sdkKey, zak, meetingNumber: serverMeetingId, role: serverRole } = sigResult.data;
      const effectiveMeetingId = serverMeetingId || cleanMeetingId;

      setDiagStep('SIG_RECEIVED');
      setDiagInfo((prev) => ({
        ...prev,
        meetingNumber: effectiveMeetingId,
        role: serverRole,
        sdkKeyPresent: Boolean(sdkKey && sdkKey !== 'dummy_sdk_key'),
        sigPresent: Boolean(signature && signature.length > 20),
        zakPresent: Boolean(zak),
      }));

      // ── 3. Import & create embedded SDK client ─────────────────────────
      setDiagStep('IMPORT_SDK');
      const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default;
      const clientInstance = ZoomMtgEmbedded.createClient();
      zoomClientRef.current = clientInstance;

      // ── 4. Init embedded client ────────────────────────────────────────
      setDiagStep('INIT_SDK');
      const appRoot = containerRef.current;
      if (!appRoot) {
        throw new Error('Zoom container DOM element is not mounted.');
      }

      await clientInstance.init({
        zoomAppRoot: appRoot,
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

      // ── 5. Register SDK event listeners ───────────────────────────────

      // Connection state
      clientInstance.on('connection-change', (payload: any) => {
        const stateStr = String(payload?.state || '').toLowerCase();
        if (stateStr.includes('connected') && !stateStr.includes('reconnecting')) {
          setConnectionState('connected');
          setDiagStep('JOINED');
          refreshParticipants(clientInstance);
        } else if (stateStr.includes('reconnect')) {
          setConnectionState('reconnecting');
        } else if (stateStr.includes('closed') || stateStr.includes('ended')) {
          setConnectionState('disconnected');
        }
      });

      // Participant join/leave
      clientInstance.on('user-added', () => {
        refreshParticipants(clientInstance);
      });
      clientInstance.on('user-removed', () => {
        refreshParticipants(clientInstance);
      });

      // ── CRITICAL: user-updated fires when audio connects/disconnects/mutes ──
      clientInstance.on('user-updated', (payload: any) => {
        refreshParticipants(clientInstance);
        // If this update is about the local user, sync our audio state
        syncCurrentUserAudio(clientInstance);

        // Detect autoplay blocked: remote participant has audio='computer' but we can't hear them
        // This is best-effort; the SDK doesn't expose a direct autoplay API
        if (!isCoach && payload?.audio === 'computer') {
          // Remote participant connected audio — check if audio context is suspended
          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              const testCtx = new AudioContext();
              if (testCtx.state === 'suspended') {
                setAudioDiag((prev) => ({ ...prev, autoplayBlocked: true }));
              }
              testCtx.close();
            }
          } catch {
            // ignore
          }
        }
      });

      // Active speaker (isTalking)
      clientInstance.on('active-speaker', (payload: any) => {
        const speakers: any[] = Array.isArray(payload) ? payload : [payload];
        const me = clientInstance.getCurrentUser?.();
        const iAmTalking = me ? speakers.some((s: any) => s.userId === me.userId) : false;
        setAudioDiag((prev) => ({ ...prev, isTalking: iAmTalking }));

        const first = speakers[0];
        if (first?.displayName || first?.userName) {
          setActiveSpeakerName(first.displayName || first.userName);
        }
      });

      // Network quality — CORRECT event name is 'network-quality-change' in SDK v6.x
      clientInstance.on('network-quality-change', (payload: any) => {
        const level = payload?.level ?? payload?.quality ?? 3;
        if (level <= 1) setNetworkQuality('poor');
        else if (level === 2) setNetworkQuality('weak');
        else setNetworkQuality('good');
      });

      // ── 6. Join meeting ────────────────────────────────────────────────
      setDiagStep('JOINING');
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
      setDiagStep('JOINED');
      setAudioDiag((prev) => ({ ...prev, meetingJoined: true }));

      // ── 7. Post-join: verify actual audio connection state ────────────
      // The SDK auto-connects audio after join; we verify immediately and after a delay
      syncCurrentUserAudio(clientInstance);
      refreshParticipants(clientInstance);

      // Re-check after 2s and 5s — audio connection may take a moment to register
      setTimeout(() => {
        syncCurrentUserAudio(clientInstance);
        refreshParticipants(clientInstance);
      }, 2000);
      setTimeout(() => {
        syncCurrentUserAudio(clientInstance);
        refreshParticipants(clientInstance);
      }, 5000);

    } catch (err: any) {
      const rawMsg =
        err?.message || err?.reason || err?.type || (typeof err === 'string' ? err : 'Unable to connect to Zoom meeting.');
      console.error('[zoom] SDK join failed:', rawMsg, err);
      setConnectionState('error');
      setErrorMessage(rawMsg);
      setDiagStep('FAILED');
      setDiagInfo((prev) => ({ ...prev, errorText: rawMsg }));
    }
  }, [classId, cleanMeetingId, isCoach, passcode, refreshParticipants, syncCurrentUserAudio, userEmail, userName]);

  // ── Mount / Unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    startConnection();

    return () => {
      if (zoomClientRef.current) {
        try {
          zoomClientRef.current.leave();
        } catch {
          // ignore
        }
        zoomClientRef.current = null;
      }
      initStartedRef.current = false;
    };
  }, [startConnection]);

  // ── Controls ─────────────────────────────────────────────────────────────

  const handleRetry = () => {
    initStartedRef.current = false;
    if (zoomClientRef.current) {
      try { zoomClientRef.current.leave(); } catch { /* ignore */ }
      zoomClientRef.current = null;
    }
    setAudioDiag({
      meetingJoined: false,
      audioConnected: false,
      audioConnectionStatus: 0,
      micPermission: 'unknown',
      micDetected: false,
      isMuted: false,
      isTalking: false,
      autoplayBlocked: false,
      participants: [],
      sdkMuteError: null,
    });
    startConnection();
  };

  /**
   * Mute/unmute via the SDK.
   * MUST be awaited — SDK returns ExecutedResult = Promise<string | ExecutedFailure>.
   * Only updates local state AFTER SDK confirms the operation.
   */
  const handleToggleMute = async () => {
    const client = zoomClientRef.current;
    if (!client || typeof client.mute !== 'function') return;
    if (muteLoading) return;

    const targetMuted = !localMuted;
    setMuteLoading(true);
    setAudioDiag((prev) => ({ ...prev, sdkMuteError: null }));

    try {
      const result = await client.mute(targetMuted);

      // SDK returns '' on success, or an ExecutedFailure object on failure
      if (result && typeof result === 'object' && 'type' in result) {
        const failure = result as { type: string; reason: string };
        const errMsg = `Mute failed: ${failure.type} — ${failure.reason}`;
        console.error('[zoom] mute ExecutedFailure:', failure);
        setAudioDiag((prev) => ({ ...prev, sdkMuteError: errMsg }));
        // Do NOT update localMuted — SDK rejected the operation
      } else {
        // Success — update React state and sync from SDK to confirm
        setLocalMuted(targetMuted);
        // Re-sync from SDK to get authoritative state
        setTimeout(() => syncCurrentUserAudio(client), 300);
      }
    } catch (e: any) {
      const errMsg = e?.message || 'Mute toggle failed';
      console.error('[zoom] mute exception:', e);
      setAudioDiag((prev) => ({ ...prev, sdkMuteError: errMsg }));
    } finally {
      setMuteLoading(false);
    }
  };

  const handleToggleView = (targetView: 'gallery' | 'speaker') => {
    setViewTypeState(targetView);
    if (zoomClientRef.current && typeof zoomClientRef.current.setViewType === 'function') {
      try {
        zoomClientRef.current.setViewType(targetView);
      } catch {
        // ignore
      }
    }
  };

  /**
   * Autoplay unlock — triggered by a deliberate user click.
   * Resumes suspended AudioContext instances so the browser allows remote audio playback.
   */
  const handleUnlockAudio = async () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        await ctx.resume();
        await ctx.close();
      }
      setAudioDiag((prev) => ({ ...prev, autoplayBlocked: false }));
      // Refresh participant audio after unlock
      setTimeout(() => refreshParticipants(zoomClientRef.current), 500);
    } catch {
      // ignore
    }
  };

  // ── Derived display values ────────────────────────────────────────────────

  const audioStatusLabel = audioDiag.audioConnected
    ? (audioDiag.isMuted ? '🔇 MUTED' : '🎙️ LIVE')
    : audioDiag.meetingJoined
    ? '⚠️ NO AUDIO'
    : '…';

  const audioStatusColor = audioDiag.audioConnected
    ? audioDiag.isMuted ? 'text-amber-300' : 'text-emerald-400'
    : 'text-red-400';

  const audioConnStatusLabel = ['Not Connected', 'Connecting…', 'Connected ✓', 'Failed ✗'][audioDiag.audioConnectionStatus] ?? 'Unknown';

  // Coach participants excluding self
  const remoteParticipants = audioDiag.participants.filter(
    (p) => p.userName !== userName && p.userName !== (isCoach ? 'Coach' : 'Student')
  );

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`relative flex flex-col bg-[#0a0a1a] border border-[#222244] overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-3 z-50 rounded-2xl shadow-2xl border-indigo-500/50 ring-4 ring-indigo-500/20'
          : 'w-full h-full rounded-lg'
      }`}
    >
      {/* ── Top Bar ── */}
      <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5">
          {/* Network quality badge */}
          {connectionState === 'connected' && (
            <div className="px-2 py-0.5 bg-black/80 backdrop-blur rounded-md border border-white/10 flex items-center gap-1.5 text-[10px] font-semibold text-white">
              {networkQuality === 'good' && <span className="text-emerald-400">🟢 Good</span>}
              {networkQuality === 'weak' && <span className="text-amber-400">🟡 Weak</span>}
              {networkQuality === 'poor' && <span className="text-red-400 font-bold">🔴 Poor</span>}
            </div>
          )}

          {/* Always-visible audio status indicator */}
          {connectionState === 'connected' && audioDiag.meetingJoined && (
            <div className={`px-2 py-0.5 bg-black/80 backdrop-blur rounded-md border border-white/10 text-[10px] font-bold ${audioStatusColor}`}>
              {audioStatusLabel}
            </div>
          )}

          {activeSpeakerName && (
            <div className="px-2 py-0.5 bg-indigo-950/80 backdrop-blur rounded-md border border-indigo-500/30 text-[10px] font-bold text-indigo-200 truncate max-w-[140px]">
              🗣️ {activeSpeakerName}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Diagnostics toggle — all roles in this build for debugging */}
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="px-2 py-0.5 bg-slate-900/90 hover:bg-slate-800 text-[10px] text-slate-300 font-mono rounded border border-slate-700 transition-colors shadow"
          >
            {showDiagnostics ? 'Hide Diag' : '🛠️ Diag'}
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-2 py-0.5 bg-indigo-600/90 hover:bg-indigo-500 text-[10px] font-bold text-white rounded border border-indigo-400/40 transition-colors shadow flex items-center gap-1"
          >
            <span>{isFullscreen ? '🗗' : '⛶'}</span>
            <span>{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>
        </div>
      </div>

      {/* ── Autoplay Blocked Banner (Student) ── */}
      {audioDiag.autoplayBlocked && (
        <div className="absolute top-10 left-2 right-2 z-40 px-3 py-2 bg-amber-950/95 border border-amber-500/60 rounded-xl text-[11px] text-amber-200 font-bold flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span>🔇</span>
            <span>Browser blocked audio. Click to enable coach audio.</span>
          </div>
          <button
            type="button"
            onClick={handleUnlockAudio}
            className="shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] rounded-lg transition-colors"
          >
            🔊 Enable Audio
          </button>
        </div>
      )}

      {/* ── Diagnostic Panel ── */}
      {showDiagnostics && (
        <div className="absolute top-10 left-2 right-2 z-40 p-3 bg-[#0d0d21]/97 border border-indigo-500/40 rounded-lg text-[10px] font-mono text-slate-200 shadow-2xl space-y-1.5 max-h-[70vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1 text-indigo-300 font-bold text-[11px]">
            <span>ZOOM SDK DIAGNOSTICS</span>
            <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-700">{diagStep}</span>
          </div>

          {/* Init info */}
          <div className="space-y-0.5">
            <div>Meeting ID: <span className="text-amber-300">{diagInfo.meetingNumber || 'MISSING'}</span></div>
            <div>Role: <span className="text-emerald-300">{diagInfo.role === 1 ? '1 (Host/Coach)' : '0 (Student)'}</span></div>
            <div>SDK Key: <span className={diagInfo.sdkKeyPresent ? 'text-emerald-400' : 'text-red-400'}>{diagInfo.sdkKeyPresent ? 'YES' : 'NO'}</span></div>
            <div>JWT Signature: <span className={diagInfo.sigPresent ? 'text-emerald-400' : 'text-red-400'}>{diagInfo.sigPresent ? 'YES' : 'NO'}</span></div>
            <div>ZAK Token: <span className={diagInfo.role === 0 ? 'text-slate-400' : diagInfo.zakPresent ? 'text-emerald-400' : 'text-red-400'}>{diagInfo.role === 0 ? 'N/A' : diagInfo.zakPresent ? 'YES' : 'NO'}</span></div>
            <div>Meeting Join: <span className={audioDiag.meetingJoined ? 'text-emerald-400 font-bold' : diagStep === 'FAILED' ? 'text-red-400 font-bold' : 'text-amber-400'}>{audioDiag.meetingJoined ? 'YES' : diagStep === 'FAILED' ? 'FAILED' : 'JOINING…'}</span></div>
          </div>

          {/* Audio diagnostics */}
          <div className="border-t border-slate-700 pt-1 space-y-0.5">
            <div className="text-indigo-300 font-bold uppercase tracking-wider text-[9px] mb-0.5">AUDIO STATE</div>
            <div>Audio Connected: <span className={audioDiag.audioConnected ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{audioDiag.audioConnected ? 'YES (computer)' : 'NO'}</span></div>
            <div>Audio Conn Status: <span className={audioDiag.audioConnectionStatus === 2 ? 'text-emerald-400' : audioDiag.audioConnectionStatus === 3 ? 'text-red-400' : 'text-amber-400'}>{audioDiag.audioConnectionStatus} — {audioConnStatusLabel}</span></div>
            <div>Mic Permission: <span className={audioDiag.micPermission === 'granted' ? 'text-emerald-400' : audioDiag.micPermission === 'denied' ? 'text-red-400' : 'text-amber-400'}>{audioDiag.micPermission.toUpperCase()}</span></div>
            <div>Mic Detected: <span className={audioDiag.micDetected ? 'text-emerald-400' : 'text-amber-400'}>{audioDiag.micDetected ? 'YES' : 'NO'}</span></div>
            <div>Muted (SDK): <span className={audioDiag.isMuted ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{audioDiag.isMuted ? 'YES (MUTED)' : 'NO (LIVE)'}</span></div>
            <div>Talking: <span className={audioDiag.isTalking ? 'text-emerald-400 font-bold animate-pulse' : 'text-slate-400'}>{audioDiag.isTalking ? 'YES' : 'NO'}</span></div>
            <div>Autoplay Blocked: <span className={audioDiag.autoplayBlocked ? 'text-red-400 font-bold' : 'text-emerald-400'}>{audioDiag.autoplayBlocked ? 'YES ⚠️' : 'NO'}</span></div>
            {audioDiag.sdkMuteError && (
              <div className="mt-1 p-1 bg-red-950/80 border border-red-500/40 text-red-300 rounded break-words">
                SDK Mute Error: {audioDiag.sdkMuteError}
              </div>
            )}
          </div>

          {/* Participant list */}
          <div className="border-t border-slate-700 pt-1">
            <div className="text-indigo-300 font-bold uppercase tracking-wider text-[9px] mb-0.5">PARTICIPANTS ({audioDiag.participants.length})</div>
            {audioDiag.participants.length === 0 ? (
              <div className="text-slate-500 italic">None yet</div>
            ) : (
              audioDiag.participants.map((p) => (
                <div key={p.userId} className="flex items-center gap-2 py-0.5 border-b border-slate-800 last:border-0">
                  <span className="text-slate-300 truncate max-w-[80px]">{p.userName}</span>
                  <span className={`${p.audio === 'computer' ? 'text-emerald-400' : 'text-red-400'}`}>
                    audio:{p.audio || 'none'}
                  </span>
                  <span className={`${p.muted ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {p.muted ? '🔇' : '🎙️'}
                  </span>
                  <span className={`${p.bVideoOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {p.bVideoOn ? '📷' : '📷✗'}
                  </span>
                </div>
              ))
            )}
          </div>

          {diagInfo.errorText && (
            <div className="mt-1 p-1.5 bg-red-950/80 border border-red-500/40 text-red-200 rounded break-words">
              <strong>Error:</strong> {diagInfo.errorText}
            </div>
          )}
        </div>
      )}

      {/* ── Poor Network Warning ── */}
      {connectionState === 'connected' && networkQuality === 'poor' && (
        <div className="absolute top-10 right-2 z-30 px-2.5 py-1 bg-red-950/90 border border-red-500/50 rounded-md text-[10px] font-bold text-red-200 flex items-center gap-1.5 animate-pulse">
          <span>⚠️</span><span>Poor connection</span>
        </div>
      )}

      {/* ── Media Permission Warning ── */}
      {mediaPermissionDenied && (
        <div className="absolute top-10 left-2 right-2 z-30 px-3 py-1.5 bg-amber-950/90 border border-amber-500/40 rounded-md text-[10px] text-amber-200 font-medium flex items-center gap-1.5 shadow-lg">
          <span>🎙️</span>
          <span>Microphone access is blocked. Enable it in browser settings, then retry.</span>
        </div>
      )}

      {/* ── Reconnecting Banner ── */}
      {connectionState === 'reconnecting' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="w-6 h-6 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-xs font-bold text-amber-300">Reconnecting Video…</p>
        </div>
      )}

      {/* ── Connecting Loader ── */}
      {connectionState === 'connecting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a1a] gap-2 p-4">
          <div className="w-7 h-7 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Connecting to Zoom Video Stage…</p>
          <p className="text-[10px] text-slate-500 font-mono">Meeting #{cleanMeetingId} · Step: {diagStep}</p>
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

      {/* ── Zoom Embedded Container ── */}
      <style>{`
        #zoom-embedded-video-container,
        #zoom-embedded-video-container *,
        [id*="zmmtg-root"],
        .aria-canvas,
        .video-canvas,
        .speaker-video,
        .video-avatar {
          background-color: #090914 !important;
        }
        #zoom-embedded-video-container canvas,
        #zoom-embedded-video-container video {
          object-fit: cover !important;
          border-radius: 0.75rem !important;
        }
      `}</style>
      <div
        ref={containerRef}
        id="zoom-embedded-video-container"
        className="w-full h-full flex-1 min-h-[220px] bg-[#090914] rounded-xl overflow-hidden"
        style={{ visibility: connectionState === 'connected' ? 'visible' : 'hidden' }}
      />

      {/* ── Bottom Controls Bar ── */}
      {connectionState === 'connected' && (
        <div className="px-3 py-1.5 bg-[#070714] border-t border-[#1e1e3a] flex items-center justify-between gap-2 z-30 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            {/* Mute/Unmute — calls SDK mute() asynchronously */}
            <button
              type="button"
              onClick={handleToggleMute}
              disabled={muteLoading}
              title={!audioDiag.audioConnected ? 'Audio not connected yet — use Zoom toolbar' : ''}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 disabled:opacity-60 ${
                localMuted
                  ? 'bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-900'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              } ${!audioDiag.audioConnected ? 'border-dashed opacity-70' : ''}`}
            >
              <span>{muteLoading ? '⏳' : localMuted ? '🔇' : '🎙️'}</span>
              <span>{muteLoading ? '…' : localMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* View Layout Selector */}
            <button
              type="button"
              onClick={() => handleToggleView(viewType === 'gallery' ? 'speaker' : 'gallery')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>{viewType === 'gallery' ? '🔲' : '👤'}</span>
              <span>{viewType === 'gallery' ? 'Gallery' : 'Speaker'}</span>
            </button>

            {/* Autoplay unlock — compact version always in controls when needed */}
            {audioDiag.autoplayBlocked && (
              <button
                type="button"
                onClick={handleUnlockAudio}
                className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 border border-amber-500/60 text-[10px] font-bold text-amber-100 rounded-lg transition-colors flex items-center gap-1 animate-pulse"
              >
                <span>🔊</span>
                <span>Enable Audio</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Audio connection status chip */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              audioDiag.audioConnected
                ? audioDiag.isMuted
                  ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                : 'bg-red-950/60 text-red-400 border-red-800/60'
            }`}>
              {audioDiag.audioConnected ? (audioDiag.isMuted ? '🔇 Muted' : '🎙️ Live') : '⚠️ No Audio'}
            </span>

            <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
              👥 {participantCount} {participantCount === 1 ? 'Participant' : 'Participants'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
