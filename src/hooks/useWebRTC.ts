'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';

export interface RemotePeer {
  peerId: string;
  userName: string;
  userRole: string;
  stream: MediaStream | null;
  audioMuted: boolean;
  videoMuted: boolean;
  isScreenSharing: boolean;
}

interface UseWebRTCOptions {
  classId: string;
  userName: string;
  userRole: 'admin' | 'coach' | 'student';
  userId?: string; // Added: stable user ID for peer identification
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export function useWebRTC({ classId, userName, userRole, userId }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [reactionEmoji, setReactionEmoji] = useState<string | null>(null);

  const [remotePeers, setRemotePeers] = useState<Record<string, RemotePeer>>({});

  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  // Use stable userId as peerId if available, fallback to userName
  const myPeerId = userId || userName;

  // Initialize local camera and microphone stream with fallback for separate track failures
  const initLocalStream = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) return null;
    if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
      return localStreamRef.current;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      console.warn('Joint audio/video request failed, attempting separate track acquisition:', err);
      stream = new MediaStream();

      // Separate audio acquisition
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        audioStream.getAudioTracks().forEach((t) => stream!.addTrack(t));
      } catch (audioErr) {
        console.warn('Audio device access failed:', audioErr);
      }

      // Separate video acquisition
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 } },
        });
        videoStream.getVideoTracks().forEach((t) => stream!.addTrack(t));
      } catch (videoErr) {
        console.warn('Video device access failed:', videoErr);
      }
    }

    if (stream && stream.getTracks().length > 0) {
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    }
    return null;
  }, []);

  // Create peer connection to another participant
  const createPeerConnection = useCallback(
    (peerId: string, peerName: string, peerRole: string, isInitiator: boolean) => {
      if (peerConnectionsRef.current[peerId]) {
        return peerConnectionsRef.current[peerId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[peerId] = pc;

      // Add local tracks to connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-ice',
            payload: {
              targetId: peerId,
              senderId: myPeerId,
              candidate: event.candidate,
            },
          });
        }
      };

      // Handle remote stream tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemotePeers((prev) => ({
          ...prev,
          [peerId]: {
            peerId,
            userName: peerName,
            userRole: peerRole,
            stream: remoteStream,
            audioMuted: false,
            videoMuted: false,
            isScreenSharing: false,
          },
        }));
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
          setRemotePeers((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        }
      };

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'webrtc-offer',
              payload: {
                targetId: peerId,
                senderId: myPeerId,
                senderRole: userRole,
                senderName: userName,
                offer: pc.localDescription,
              },
            });
          })
          .catch((err) => console.error('Error creating WebRTC offer:', err));
      }

      return pc;
    },
    [myPeerId, userName, userRole]
  );

  // Set up Supabase Realtime channel for WebRTC signaling
  useEffect(() => {
    if (!classId) return;

    initLocalStream().then(() => {
      const topic = `webrtc-signal:${classId}`;
      
      // Clean up any existing channel with this topic first
      if (typeof (supabase as any).getChannels === 'function') {
        const existing = (supabase as any).getChannels().find((c: any) => c.topic === `realtime:${topic}` || c.topic === topic);
        if (existing) {
          supabase.removeChannel(existing);
        }
      }

      const channel = supabase.channel(topic, {
        config: { broadcast: { self: false }, presence: { key: myPeerId } },
      });

      channel
        .on('broadcast', { event: 'webrtc-join' }, ({ payload }: any) => {
          if (payload.senderId !== myPeerId) {
            createPeerConnection(payload.senderId, payload.senderName || payload.senderId, payload.senderRole, true);
          }
        })
        .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }: any) => {
          if (payload.targetId === myPeerId) {
            const pc = createPeerConnection(payload.senderId, payload.senderName || payload.senderId, payload.senderRole, false);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'webrtc-answer',
              payload: {
                targetId: payload.senderId,
                senderId: myPeerId,
                answer,
              },
            });
          }
        })
        .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }: any) => {
          if (payload.targetId === myPeerId) {
            const pc = peerConnectionsRef.current[payload.senderId];
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
          }
        })
        .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }: any) => {
          if (payload.targetId === myPeerId) {
            const pc = peerConnectionsRef.current[payload.senderId];
            if (pc && payload.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
          }
        })
        .on('broadcast', { event: 'webrtc-[#toggle-audio]' }, ({ payload }: any) => {
          if (payload.targetId === myPeerId) {
            toggleAudio(payload.forceState);
          }
        })
        .on('broadcast', { event: 'webrtc-[#toggle-video]' }, ({ payload }: any) => {
          if (payload.targetId === myPeerId) {
            toggleVideo(payload.forceState);
          }
        })
        // Presence sync: discovers already-connected peers when joining late
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          Object.entries(state).forEach(([presenceKey, presences]: [string, any]) => {
            if (presenceKey !== myPeerId && !peerConnectionsRef.current[presenceKey]) {
              const presenceData = Array.isArray(presences) ? presences[0] : presences;
              const peerName = presenceData?.displayName || presenceKey;
              const peerRole = presenceData?.role || 'student';
              createPeerConnection(presenceKey, peerName, peerRole, true);
            }
          });
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            // Track presence with full metadata so late-joiners know our name & role
            await channel.track({
              key: myPeerId,
              displayName: userName,
              role: userRole,
            });
            // Also broadcast join event for legacy compatibility
            channel.send({
              type: 'broadcast',
              event: 'webrtc-join',
              payload: { senderId: myPeerId, senderName: userName, senderRole: userRole },
            });
          }
        });

      channelRef.current = channel;
    });

    return () => {
      // Clean up local tracks & connections
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, myPeerId, userName, userRole]);


  // Toggle Audio (Mute / Unmute Mic)
  const toggleAudio = async (forceState?: boolean | any) => {
    if (!localStreamRef.current) {
      await initLocalStream();
    }
    if (!localStreamRef.current) return;

    const explicitState = typeof forceState === 'boolean' ? forceState : undefined;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextEnabled = explicitState !== undefined ? explicitState : !audioTrack.enabled;
      audioTrack.enabled = nextEnabled;
      setIsAudioMuted(!nextEnabled);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = stream.getAudioTracks()[0];
        if (newTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(newTrack);
          setIsAudioMuted(false);
        }
      } catch (e) {}
    }
  };

  // Toggle Video (Camera On / Off)
  const toggleVideo = async (forceState?: boolean | any) => {
    if (!localStreamRef.current) {
      await initLocalStream();
    }

    const explicitState = typeof forceState === 'boolean' ? forceState : undefined;
    let videoTrack = localStreamRef.current?.getVideoTracks()[0];

    if (!videoTrack) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 } },
        });
        const newTrack = stream.getVideoTracks()[0];
        if (newTrack) {
          if (!localStreamRef.current) {
            localStreamRef.current = new MediaStream();
            setLocalStream(localStreamRef.current);
          }
          localStreamRef.current.addTrack(newTrack);
          videoTrack = newTrack;
          Object.values(peerConnectionsRef.current).forEach((pc) => {
            pc.addTrack(newTrack, localStreamRef.current!);
          });
        }
      } catch (e) {
        console.warn('Camera access failed:', e);
      }
    }

    if (videoTrack) {
      const nextEnabled = explicitState !== undefined ? explicitState : !videoTrack.enabled;
      videoTrack.enabled = nextEnabled;
      setIsVideoMuted(!nextEnabled);

      // Sync video track state across all peer connections
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack!);
        } else if (localStreamRef.current) {
          pc.addTrack(videoTrack!, localStreamRef.current);
        }
      });
    }
  };

  // Screen Share Toggle
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator?.mediaDevices?.getDisplayMedia) return;
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(displayStream);
        setIsScreenSharing(true);

        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  // Raise / Lower Hand
  const toggleRaiseHand = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'hand-raise',
      payload: { userName, raised: nextState },
    });
  };

  // Send Emoji Reaction
  const sendEmojiReaction = (emoji: string) => {
    setReactionEmoji(emoji);
    setTimeout(() => setReactionEmoji(null), 3000);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'emoji-reaction',
      payload: { userName, emoji },
    });
  };

  // Coach Mute Student Mic
  const coachMuteStudent = (studentName: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'webrtc-[#toggle-audio]',
      payload: { targetId: studentName, forceState: false },
    });
  };

  // Coach Stop Student Video
  const coachStopStudentVideo = (studentName: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'webrtc-[#toggle-video]',
      payload: { targetId: studentName, forceState: false },
    });
  };

  return {
    localStream,
    screenStream,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    handRaised,
    reactionEmoji,
    remotePeers: Object.values(remotePeers),
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleRaiseHand,
    sendEmojiReaction,
    coachMuteStudent,
    coachStopStudentVideo,
  };
}
