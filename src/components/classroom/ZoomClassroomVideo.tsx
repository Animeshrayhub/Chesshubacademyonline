'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected'>('connecting');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'weak' | 'poor' | 'unknown'>('good');
  const [networkStats, setNetworkStats] = useState<{ uplink?: number; downlink?: number; level?: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState<boolean>(false);

  const isCoach = role === 'coach' || role === 'admin';
  const cleanMeetingId = (meetingNumber || '').replace(/\s+/g, '');

  useEffect(() => {
    let isMounted = true;
    let clientInstance: any = null;

    async function initZoomSDK() {
      if (!containerRef.current || !cleanMeetingId) {
        if (!cleanMeetingId) {
          setErrorMessage('Meeting ID is missing for this class session.');
          setConnectionState('error');
        }
        return;
      }

      setConnectionState('connecting');
      setErrorMessage(null);
      setMediaPermissionDenied(false);

      try {
        // Request browser media permissions cleanly beforehand
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            // Stop tracks after checking permissions so Zoom SDK can acquire them
            stream.getTracks().forEach((track) => track.stop());
          } catch (permErr: any) {
            console.warn('Browser media permission check warning:', permErr);
            if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
              setMediaPermissionDenied(true);
            }
          }
        }

        // Dynamically import Zoom Meeting SDK embedded module (client-side only)
        const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default;
        clientInstance = ZoomMtgEmbedded.createClient();
        zoomClientRef.current = clientInstance;

        // Fetch signature & host ZAK authorization from server action (keeps ZOOM_CLIENT_SECRET 100% server-side)
        const sigResult = await getZoomSignatureAction(classId);

        if (!sigResult.success || !sigResult.data) {
          throw new Error(sigResult.error?.message || 'Failed to generate Zoom meeting signature.');
        }

        const { signature, sdkKey, zak, meetingNumber: serverMeetingId, role: serverRole } = sigResult.data;
        const effectiveMeetingId = serverMeetingId || cleanMeetingId;

        // Initialize embedded SDK client into target container
        await clientInstance.init({
          targetElement: containerRef.current,
          language: 'en-US',
          customize: {
            video: {
              isAutoViews: true,
            },
          },
        });

        // Register Zoom SDK event listeners
        clientInstance.on('connection-change', (payload: any) => {
          if (!isMounted) return;
          const stateStr = String(payload?.state || '').toLowerCase();
          if (stateStr.includes('connected') && !stateStr.includes('reconnecting')) {
            setConnectionState('connected');
          } else if (stateStr.includes('reconnect')) {
            setConnectionState('reconnecting');
          } else if (stateStr.includes('closed') || stateStr.includes('ended')) {
            setConnectionState('disconnected');
          }
        });

        clientInstance.on('network-quality', (payload: any) => {
          if (!isMounted) return;
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

        clientInstance.on('user-added', (payload: any) => {
          console.log('Zoom participant joined:', payload);
        });

        clientInstance.on('user-removed', (payload: any) => {
          console.log('Zoom participant left:', payload);
        });

        // Join Zoom meeting (passes ZAK token for Host/Coach start operation without Zoom login)
        const joinPayload: Record<string, any> = {
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

        await clientInstance.join(joinPayload);

        if (isMounted) {
          setConnectionState('connected');
        }
      } catch (err: any) {
        console.error('Zoom Meeting SDK join failed:', err);
        if (isMounted) {
          setConnectionState('error');
          setErrorMessage(err?.message || err?.reason || 'Unable to connect to Zoom meeting.');
        }
      }
    }

    initZoomSDK();

    return () => {
      isMounted = false;
      if (zoomClientRef.current) {
        try {
          zoomClientRef.current.leave();
        } catch (e) {
          console.warn('Error closing Zoom SDK client:', e);
        }
        zoomClientRef.current = null;
      }
    };
  }, [classId, cleanMeetingId, isCoach, passcode, userEmail, userName]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0a1a] rounded-lg overflow-hidden border border-[#222244]">
      {/* ── Network Quality Badge & Status Indicator ── */}
      {connectionState === 'connected' && (
        <div className="absolute top-2 left-2 z-30 px-2 py-1 bg-black/75 backdrop-blur rounded-md border border-white/10 flex items-center gap-1.5 text-[10px] font-semibold text-white pointer-events-auto group">
          {networkQuality === 'good' && <span className="text-emerald-400" title="Connection: Good">🟢 Good</span>}
          {networkQuality === 'weak' && <span className="text-amber-400" title="Connection: Weak">🟡 Weak</span>}
          {networkQuality === 'poor' && <span className="text-red-400 font-bold" title="Connection: Poor">🔴 Poor</span>}

          {/* Hover Statistics Popup if statistics exist */}
          {networkStats && (
            <div className="hidden group-hover:block absolute top-full left-0 mt-1 p-2 bg-[#0f0f23] border border-slate-700 rounded shadow-xl text-[9px] text-slate-300 whitespace-nowrap z-40">
              <div>Uplink: {networkStats.uplink ?? 'N/A'}</div>
              <div>Downlink: {networkStats.downlink ?? 'N/A'}</div>
              <div>Quality Score: {networkStats.level ?? 3}/5</div>
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
            onClick={() => setConnectionState('connecting')}
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
