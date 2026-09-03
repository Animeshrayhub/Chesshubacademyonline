'use client';

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { getZoomSignatureAction } from '@/actions/zoom';

export interface ZoomClassroomVideoHandle {
  toggleMute: () => Promise<boolean>;
  toggleVideo: () => Promise<boolean>;
  isMuted: () => boolean;
  isVideoOn: () => boolean;
}

interface ZoomClassroomVideoProps {
  classId: string;
  meetingNumber?: string;
  passCode?: string;
  userName?: string;
  userEmail?: string;
  role?: number; // 1 for host (Coach), 0 for attendee (Student)
  onMeetingEnd?: () => void;
  onMeetingJoin?: () => void;
  onConnectionChange?: (state: 'connected' | 'reconnecting' | 'disconnected') => void;
  onMediaStatusChange?: (status: { isVideoOn: boolean; isMuted: boolean }) => void;
  className?: string;
  isMiniView?: boolean;
}

declare global {
  interface Window {
    ZoomMtg?: any;
  }
}

const ZoomClassroomVideo = forwardRef<ZoomClassroomVideoHandle, ZoomClassroomVideoProps>(
  function ZoomClassroomVideo(
    {
      classId,
      meetingNumber: propMeetingNumber,
      passCode = 'chesshub',
      userName = 'Participant',
      userEmail,
      role = 0,
      onMeetingEnd,
      onMeetingJoin,
      onConnectionChange,
      onMediaStatusChange,
      className = '',
      isMiniView = false,
    },
    ref
  ) {
    const [isJoined, setIsJoined] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [statusText, setStatusText] = useState('Initializing video session…');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [audioMuted, setAudioMuted] = useState(true);
    const [videoActive, setVideoActive] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<any>(null);
    const isJoinedRef = useRef(false);
    // Track whether Zoom has been initialized to prevent remounting
    const isInitializedRef = useRef(false);

    const updateMediaStateFromClient = useCallback(() => {
      try {
        if (!clientRef.current) return;
        const curUser = clientRef.current.getCurrentUser?.();
        if (curUser) {
          const isVideo = Boolean(curUser.bVideoOn);
          const isMute = Boolean(curUser.muted);
          setVideoActive(isVideo);
          setAudioMuted(isMute);
          onMediaStatusChange?.({ isVideoOn: isVideo, isMuted: isMute });
        }
      } catch {}
    }, [onMediaStatusChange]);

    useImperativeHandle(ref, () => ({
      toggleMute: async () => {
        if (!clientRef.current || !isJoinedRef.current) return false;
        try {
          const nextMute = !audioMuted;
          if (typeof clientRef.current.mute === 'function') {
            await clientRef.current.mute(nextMute);
          }
          setAudioMuted(nextMute);
          onMediaStatusChange?.({ isVideoOn: videoActive, isMuted: nextMute });
          return nextMute;
        } catch {
          return audioMuted;
        }
      },
      toggleVideo: async () => {
        if (!clientRef.current || !isJoinedRef.current) return false;
        updateMediaStateFromClient();
        return videoActive;
      },
      isMuted: () => audioMuted,
      isVideoOn: () => videoActive,
    }));

    /**
     * Reads the actual rendered dimensions of the container element.
     * Waits for the DOM to be laid out before reading — avoids reading 0x0
     * when the container is still in flex/grid computation.
     */
    const getContainerDimensions = useCallback((): { width: number; height: number } => {
      if (!containerRef.current) return { width: 320, height: 240 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        width: rect.width > 10 ? Math.floor(rect.width) : 320,
        height: rect.height > 10 ? Math.floor(rect.height) : 240,
      };
    }, []);

    const initZoomMeeting = useCallback(async () => {
      if (!containerRef.current) return;
      // Prevent remounting — Zoom must NOT be re-initialized on resize/re-render
      if (isInitializedRef.current) return;

      setIsLoading(true);
      setStatusText('Connecting to video cloud…');

      try {
        const sigRes = await getZoomSignatureAction(classId);
        if (!sigRes.success || !sigRes.data) {
          throw new Error(sigRes.error?.message || 'Failed to authenticate video session.');
        }

        const { signature, sdkKey, zak, meetingNumber: apiMn, role: apiRole } = sigRes.data;
        const finalMeetingNumber = propMeetingNumber || apiMn;

        // Read actual layout dimensions after DOM has settled (requestAnimationFrame)
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const { width, height } = getContainerDimensions();

        const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default;
        const zoomClient = ZoomMtgEmbedded.createClient();
        clientRef.current = zoomClient;

        isInitializedRef.current = true;

        await zoomClient.init({
          zoomAppRoot: containerRef.current,
          language: 'en-US',
          customize: {
            video: {
              isResizable: false,
              viewSizes: {
                default: {
                  width,
                  height,
                },
              },
            },
          },
        });

        // Clear loading state after init finishes, with a 5s safety timeout
        const safetyTimeout = setTimeout(() => {
          setIsLoading(false);
        }, 5000);

        try {
          await zoomClient.join({
            sdkKey,
            signature,
            meetingNumber: String(finalMeetingNumber).trim(),
            password: passCode,
            userName,
            userEmail: userEmail || `${userName.toLowerCase().replace(/\s+/g, '')}@chesshub.academy`,
            zak: zak || undefined,
          });
        } finally {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
        }

        isJoinedRef.current = true;
        setIsJoined(true);
        onMeetingJoin?.();
        onConnectionChange?.('connected');

        try {
          zoomClient.on('user-updated', () => {
            updateMediaStateFromClient();
          });
          zoomClient.on('connection-change', (status: any) => {
            if (status?.state === 'Connected' || status?.state === 'Joined') {
              setIsLoading(false);
            }
          });
        } catch {}

        updateMediaStateFromClient();
      } catch (err: any) {
        console.warn('[Zoom Video Notice]', err);
        isInitializedRef.current = false; // Allow retry
        setIsLoading(false);
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('device') || msg.toLowerCase().includes('media')) {
          setErrorMsg('Camera or Microphone is turned off. Click below to connect.');
        } else {
          setErrorMsg('Live video standby. Click below to connect.');
        }
      }
    }, [classId, propMeetingNumber, passCode, userName, userEmail, onMeetingJoin, onConnectionChange, updateMediaStateFromClient, getContainerDimensions]);

    const handleRetry = useCallback(() => {
      isInitializedRef.current = false;
      setErrorMsg(null);
      initZoomMeeting();
    }, [initZoomMeeting]);

    useEffect(() => {
      let mounted = true;
      if (mounted) {
        // Small delay to ensure container is fully laid out in the DOM
        const timer = setTimeout(() => {
          if (mounted) initZoomMeeting();
        }, 150);
        return () => {
          mounted = false;
          clearTimeout(timer);
          if (clientRef.current && isJoinedRef.current) {
            try {
              clientRef.current.leave();
            } catch {}
          }
        };
      }
    }, [initZoomMeeting]);

    return (
      <div className={`relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden rounded-2xl ${className}`}>
        {/* Non-blocking sleek progress pill — never obscures video canvas */}
        {isLoading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 border border-slate-700/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 shadow-xl pointer-events-none transition-opacity">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-slate-200">{statusText}</span>
          </div>
        )}

        {errorMsg && !isJoined && (
          <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2 text-lg">
              📹
            </div>
            <p className="text-xs font-bold text-slate-200 mb-1">Live Video Standby</p>
            <p className="text-[11px] text-slate-400 max-w-xs mb-3 leading-relaxed">{errorMsg}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/*
         * The Zoom Embedded SDK injects canvas/video elements into this div.
         * CSS classes on the parent force the injected elements to fill the container.
         * See globals.css for the #meetingSDKElement CSS overrides.
         * IMPORTANT: This div must NEVER be unmounted after Zoom initializes.
         */}
        <div
          ref={containerRef}
          id="meetingSDKElement"
          className="w-full h-full flex-1 relative zoom-sdk-container"
          style={{ minHeight: 0 }}
        />
      </div>
    );
  }
);

ZoomClassroomVideo.displayName = 'ZoomClassroomVideo';
export default ZoomClassroomVideo;
