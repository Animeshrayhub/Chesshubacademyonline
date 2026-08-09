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
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC({ classId, userName, userRole }: UseWebRTCOptions) {
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

  // Initialize local camera and microphone stream
  const initLocalStream = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Failed to access camera/mic for WebRTC:', err);
      return null;
    }
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
              senderId: userName,
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
                senderId: userName,
                senderRole: userRole,
                offer: pc.localDescription,
              },
            });
          })
          .catch((err) => console.error('Error creating WebRTC offer:', err));
      }

      return pc;
    },
    [userName, userRole]
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
        config: { broadcast: { self: false }, presence: { key: userName } },
      });

      channel
        .on('broadcast', { event: 'webrtc-join' }, ({ payload }: any) => {
          if (payload.senderId !== userName) {
            createPeerConnection(payload.senderId, payload.senderName, payload.senderRole, true);
          }
        })
        .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }: any) => {
          if (payload.targetId === userName) {
            const pc = createPeerConnection(payload.senderId, payload.senderId, payload.senderRole, false);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'webrtc-answer',
              payload: {
                targetId: payload.senderId,
                senderId: userName,
                answer,
              },
            });
          }
        })
        .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }: any) => {
          if (payload.targetId === userName) {
            const pc = peerConnectionsRef.current[payload.senderId];
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
          }
        })
        .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }: any) => {
          if (payload.targetId === userName) {
            const pc = peerConnectionsRef.current[payload.senderId];
            if (pc && payload.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
          }
        })
        .on('broadcast', { event: 'webrtc-[#toggle-audio]' }, ({ payload }: any) => {
          if (payload.targetId === userName) {
            toggleAudio(payload.forceState);
          }
        })
        .on('broadcast', { event: 'webrtc-[#toggle-video]' }, ({ payload }: any) => {
          if (payload.targetId === userName) {
            toggleVideo(payload.forceState);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const presentUsers = Object.values(state).flat();
          presentUsers.forEach((u: any) => {
            if (u.key !== userName && !peerConnectionsRef.current[u.key]) {
              createPeerConnection(u.key, u.key, 'student', true);
            }
          });
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ key: userName });
            channel.send({
              type: 'broadcast',
              event: 'webrtc-join',
              payload: { senderId: userName, senderName: userName, senderRole: userRole },
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
  }, [classId, userName, userRole]);

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
    if (!localStreamRef.current) return;

    const explicitState = typeof forceState === 'boolean' ? forceState : undefined;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const nextEnabled = explicitState !== undefined ? explicitState : !videoTrack.enabled;
      videoTrack.enabled = nextEnabled;
      setIsVideoMuted(!nextEnabled);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];
        if (newTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(newTrack);
          setIsVideoMuted(false);
        }
      } catch (e) {}
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
