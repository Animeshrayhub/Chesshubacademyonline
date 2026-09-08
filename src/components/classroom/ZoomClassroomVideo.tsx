'use client';

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { getZoomSignatureAction } from '@/actions/zoom';

export interface ZoomClassroomVideoHandle {
  toggleMute: () => Promise<boolean>;
  toggleVideo: () => Promise<boolean>;
  isMuted: () => boolean;
  isVideoOn: () => boolean;
  changeViewType: (viewType: 'gallery' | 'speaker') => Promise<void>;
  muteAll: () => Promise<boolean>;
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
  onNetworkQualityChange?: (quality: 'good' | 'poor') => void;
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
      onNetworkQualityChange,
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

    const propsRef = useRef({
      classId,
      propMeetingNumber,
      passCode,
      userName,
      userEmail,
      onMeetingJoin,
      onMeetingEnd,
      onConnectionChange,
      onMediaStatusChange,
      onNetworkQualityChange,
    });
    useEffect(() => {
      propsRef.current = {
        classId,
        propMeetingNumber,
        passCode,
        userName,
        userEmail,
        onMeetingJoin,
        onMeetingEnd,
        onConnectionChange,
        onMediaStatusChange,
        onNetworkQualityChange,
      };
    });

    const updateMediaStateFromClient = useCallback(() => {
      try {
        if (!clientRef.current) return;
        const curUser = clientRef.current.getCurrentUser?.();
        if (curUser) {
          const isVideo = Boolean(curUser.bVideoOn);
          const isMute = Boolean(curUser.muted);
          setVideoActive((prev) => (prev !== isVideo ? isVideo : prev));
          setAudioMuted((prev) => (prev !== isMute ? isMute : prev));
          propsRef.current.onMediaStatusChange?.({ isVideoOn: isVideo, isMuted: isMute });
        }
      } catch {}
    }, []);

    useImperativeHandle(ref, () => ({
      toggleMute: async () => {
        if (!clientRef.current || !isJoinedRef.current) return false;
        try {
          const nextMute = !audioMuted;

          // 1. Try Zoom Embedded SDK programmatic mute API
          try {
            const curUser = clientRef.current.getCurrentUser?.();
            if (typeof clientRef.current.mute === 'function') {
              await clientRef.current.mute(nextMute, curUser?.userId);
            }
          } catch (apiErr) {
            console.warn('[Zoom client.mute]', apiErr);
          }

          // 2. Also trigger click on Zoom's native internal Unmute/Mute button in the DOM
          if (containerRef.current) {
            const buttons = Array.from(containerRef.current.querySelectorAll('button, [role="button"]'));
            const targetBtn = buttons.find((btn) => {
              const text = (btn.textContent || '').toLowerCase();
              const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
              const title = (btn.getAttribute('title') || '').toLowerCase();
              return (
                aria.includes('mute') ||
                aria.includes('audio') ||
                text.includes('mute') ||
                text.includes('unmute') ||
                title.includes('mute') ||
                btn.className.includes('audio') ||
                btn.className.includes('mute')
              );
            }) as HTMLElement | undefined;
            if (targetBtn) {
              targetBtn.click();
            }
          }

          setAudioMuted(nextMute);
          propsRef.current.onMediaStatusChange?.({ isVideoOn: videoActive, isMuted: nextMute });
          return nextMute;
        } catch (err) {
          console.warn('[Zoom toggleMute error]', err);
          return audioMuted;
        }
      },
      toggleVideo: async () => {
        if (!clientRef.current || !isJoinedRef.current) return false;
        try {
          const nextVideo = !videoActive;

          // In Zoom Embedded SDK, camera toggle is triggered directly via Zoom's internal button
          if (containerRef.current) {
            const buttons = Array.from(containerRef.current.querySelectorAll('button, [role="button"]'));
            const targetBtn = buttons.find((btn) => {
              const text = (btn.textContent || '').toLowerCase();
              const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
              const title = (btn.getAttribute('title') || '').toLowerCase();
              return (
                aria.includes('video') ||
                aria.includes('camera') ||
                text.includes('start') ||
                text.includes('stop') ||
                text.includes('video') ||
                title.includes('video') ||
                btn.className.includes('video') ||
                btn.className.includes('camera')
              );
            }) as HTMLElement | undefined;
            if (targetBtn) {
              targetBtn.click();
            }
          }

          setVideoActive(nextVideo);
          propsRef.current.onMediaStatusChange?.({ isVideoOn: nextVideo, isMuted: audioMuted });
          return nextVideo;
        } catch (err) {
          console.warn('[Zoom toggleVideo error]', err);
          updateMediaStateFromClient();
          return videoActive;
        }
      },
      isMuted: () => audioMuted,
      isVideoOn: () => videoActive,
      changeViewType: async (viewType: 'gallery' | 'speaker') => {
        if (!clientRef.current || !isJoinedRef.current) return;
        try {
          if (typeof clientRef.current.setViewType === 'function') {
            await clientRef.current.setViewType(viewType);
          }
        } catch (err) {
          console.warn('[Zoom changeViewType]', err);
        }
      },
      muteAll: async () => {
        if (!clientRef.current || !isJoinedRef.current) return false;
        try {
          if (typeof clientRef.current.muteAll === 'function') {
            await clientRef.current.muteAll(true);
            return true;
          }
        } catch (err) {
          console.warn('[Zoom muteAll error]', err);
        }
        return false;
      },
    }));

    /**
     * Reads the actual rendered dimensions of the container element.
     * Waits for the DOM to be laid out before reading — avoids reading 0x0
     * when the container is still in flex/grid computation.
     */
    const getContainerDimensions = useCallback((): { width: number; height: number } => {
      if (!containerRef.current) return { width: 360, height: 240 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        width: rect.width > 20 ? Math.floor(rect.width) : 360,
        height: rect.height > 20 ? Math.floor(rect.height) : 240,
      };
    }, []);

    const initZoomMeeting = useCallback(async () => {
      if (!containerRef.current) return;
      // Prevent remounting — Zoom must NOT be re-initialized on resize/re-render
      if (isInitializedRef.current) return;

      setIsLoading(true);
      setStatusText('Connecting to video cloud…');

      try {
        const { classId: cId, propMeetingNumber: pMn, passCode: pCode, userName: uName, userEmail: uEmail } = propsRef.current;
        const sigRes = await getZoomSignatureAction(cId);
        if (!sigRes.success || !sigRes.data) {
          throw new Error(sigRes.error?.message || 'Failed to authenticate video session.');
        }

        const { signature, sdkKey, zak, meetingNumber: apiMn } = sigRes.data;
        const finalMeetingNumber = pMn || apiMn;

        // Read actual layout dimensions after DOM has settled
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const { width, height } = getContainerDimensions();

        const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default;
        const zoomClient = ZoomMtgEmbedded.createClient();
        clientRef.current = zoomClient;

        isInitializedRef.current = true;

        await zoomClient.init({
          zoomAppRoot: containerRef.current,
          language: 'en-US',
          patchJsMedia: true,
          maximumVideosInGalleryView: 25,
          customize: {
            video: {
              isResizable: true,
              defaultViewType: 'gallery' as any,
              viewSizes: {
                default: {
                  width: Math.max(500, width),
                  height: Math.max(280, height),
                },
                ribbon: {
                  width: 320,
                  height: 480,
                },
              },
            },
            meetingInfo: ['topic', 'host', 'mn', 'pwd'],
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
            password: pCode,
            userName: uName,
            userEmail: uEmail || `${uName.toLowerCase().replace(/\s+/g, '')}@chesshub.academy`,
            zak: zak || undefined,
          });
        } finally {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
        }

        isJoinedRef.current = true;
        setIsJoined(true);
        propsRef.current.onMeetingJoin?.();
        propsRef.current.onConnectionChange?.('connected');

        // Start computer audio & unmute immediately after joining (Requirement A1)
        try {
          if (typeof (zoomClient as any)?.startAudio === 'function') {
            await (zoomClient as any).startAudio();
          }
          if (typeof (zoomClient as any)?.mute === 'function') {
            const curUser = (zoomClient as any).getCurrentUser?.();
            await (zoomClient as any).mute(false, curUser?.userId);
          }
        } catch (audioErr) {
          console.warn('[Zoom startAudio Notice]', audioErr);
        }

        // Automated Camera and Mic Activation Function (Requirement A1)
        const autoEnableMedia = () => {
          if (!containerRef.current || !clientRef.current) return;
          try {
            // 1. Programmatic unmute
            if (typeof clientRef.current.mute === 'function') {
              const curUser = clientRef.current.getCurrentUser?.();
              clientRef.current.mute(false, curUser?.userId).catch(() => {});
            }

            // 2. Programmatic video start
            if (typeof clientRef.current.startVideo === 'function') {
              clientRef.current.startVideo().catch(() => {});
            }

            // 3. Trigger native Zoom DOM toolbar buttons for start video and audio
            const buttons = Array.from(
              containerRef.current.querySelectorAll('button, [role="button"]')
            ) as HTMLElement[];

            // Trigger Start Video button if not already active
            const videoBtn = buttons.find((btn) => {
              const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
              const title = (btn.getAttribute('title') || '').toLowerCase();
              const text = (btn.textContent || '').toLowerCase();
              return (
                (aria.includes('start video') ||
                  aria.includes('start my video') ||
                  aria.includes('turn on camera') ||
                  title.includes('start video') ||
                  text.includes('start video')) &&
                !aria.includes('stop') &&
                !text.includes('stop') &&
                !title.includes('stop')
              );
            });
            if (videoBtn) {
              videoBtn.click();
            }

            // Trigger Join Audio / Unmute button if needed
            const audioBtn = buttons.find((btn) => {
              const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
              const title = (btn.getAttribute('title') || '').toLowerCase();
              const text = (btn.textContent || '').toLowerCase();
              return (
                (aria.includes('join audio') ||
                  aria.includes('unmute') ||
                  title.includes('unmute') ||
                  text.includes('unmute')) &&
                !aria.includes('mute all') &&
                !text.includes('mute all')
              );
            });
            if (audioBtn) {
              audioBtn.click();
            }

            updateMediaStateFromClient();
          } catch (mErr) {
            console.warn('[Zoom autoEnableMedia error]', mErr);
          }
        };

        // Fire auto-enable immediately and at staggered intervals to accommodate DOM rendering
        setTimeout(autoEnableMedia, 200);
        setTimeout(autoEnableMedia, 700);
        setTimeout(autoEnableMedia, 1800);

        // Subscribe to QoS network statistics for Auto-degrade detection (Requirement A4)
        try {
          if (typeof (zoomClient as any).subscribeStatisticData === 'function') {
            (zoomClient as any).subscribeStatisticData({ audio: true, video: true, share: false });
          }
        } catch {}

        try {
          zoomClient.on('user-updated', () => {
            updateMediaStateFromClient();
          });
          zoomClient.on('user-added', () => {
            updateMediaStateFromClient();
          });
          zoomClient.on('user-removed', () => {
            updateMediaStateFromClient();
          });
          zoomClient.on('active-speaker', () => {
            updateMediaStateFromClient();
          });
          zoomClient.on('connection-change', (status: any) => {
            if (status?.state === 'Connected' || status?.state === 'Joined') {
              setIsLoading(false);
              propsRef.current.onConnectionChange?.('connected');
              setTimeout(autoEnableMedia, 300);
            }
          });
          zoomClient.on('network-quality-change', (payload: any) => {
            const level = Number(payload?.level ?? 3);
            const isPoor = level <= 1;
            propsRef.current.onNetworkQualityChange?.(isPoor ? 'poor' : 'good');
          });
          zoomClient.on('video-statistic-data-change', (payload: any) => {
            const avgLoss = Number(payload?.data?.avg_loss || 0);
            const rtt = Number(payload?.data?.rtt || 0);
            // Auto-degrade condition: packet loss > 15% or round trip time > 600ms
            if (avgLoss > 15 || rtt > 600) {
              propsRef.current.onNetworkQualityChange?.('poor');
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
    }, [getContainerDimensions, updateMediaStateFromClient]);

    const handleRetry = useCallback(() => {
      isInitializedRef.current = false;
      setErrorMsg(null);
      initZoomMeeting();
    }, [initZoomMeeting]);

    // Observe container resize
    useEffect(() => {
      if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 50 && height > 50 && clientRef.current && isJoinedRef.current) {
            try {
              if (typeof clientRef.current.recenterVideo === 'function') {
                clientRef.current.recenterVideo();
              }
            } catch {}
          }
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, [isMiniView]);

    // Mount-only initialization effect: runs ONCE on mount, leaves on true unmount
    useEffect(() => {
      let mounted = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow"
              >
                Retry Connection
              </button>
              {propMeetingNumber && (
                <a
                  href={`https://zoom.us/j/${String(propMeetingNumber).replace(/[^0-9]/g, '')}?pwd=${passCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shadow border border-slate-700 flex items-center gap-1"
                >
                  <span>↗</span>
                  <span>Zoom App</span>
                </a>
              )}
            </div>
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
