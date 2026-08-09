'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BackgroundType } from './ClassroomVirtualBackgroundModal';

interface ClassroomPreJoinModalProps {
  isOpen: boolean;
  userName: string;
  userRole: string;
  onJoin: (settings: { isAudioMuted: boolean; isVideoMuted: boolean; bgType: BackgroundType; customBgUrl?: string }) => void;
}

export default function ClassroomPreJoinModal({
  isOpen,
  userName,
  userRole,
  onJoin,
}: ClassroomPreJoinModalProps) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [bgType, setBgType] = useState<BackgroundType>('none');
  const [customBgUrl, setCustomBgUrl] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const getResilientStream = async (): Promise<MediaStream | null> => {
        if (!navigator?.mediaDevices?.getUserMedia) return null;
        try {
          return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          const fallbackStream = new MediaStream();
          try {
            const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
            videoOnly.getVideoTracks().forEach((t) => fallbackStream.addTrack(t));
          } catch {}
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioOnly.getAudioTracks().forEach((t) => fallbackStream.addTrack(t));
          } catch {}
          return fallbackStream.getTracks().length > 0 ? fallbackStream : null;
        }
      };

      getResilientStream()
        .then((stream) => {
          if (!stream) return;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          // Audio level meter using WebAudio API
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };
            updateMeter();
          } catch {}
        })
        .catch(() => {});
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const bgPreview = bgType === 'wood'
    ? "https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png"
    : bgType === 'library'
    ? "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=500&fit=crop&q=85"
    : bgType === 'neon'
    ? "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=500&fit=crop&q=85"
    : bgType === 'custom'
    ? customBgUrl
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a1a]/95 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-[#0f0f1f] border border-[#222244] rounded-3xl p-6 w-full max-w-lg shadow-2xl text-white space-y-5">
        <div className="text-center space-y-1">
          <span className="text-2xl">♟️</span>
          <h2 className="font-heading font-extrabold text-lg text-white">Live Classroom Audio & Video Check</h2>
          <p className="text-xs text-slate-400">Welcome, <span className="text-amber-400 font-bold">{userName}</span> ({userRole.toUpperCase()})</p>
        </div>

        {/* Video Preview Canvas */}
        <div className="relative w-full h-56 bg-[#0a0a1a] rounded-2xl overflow-hidden border border-[#222244] flex items-center justify-center shadow-inner">
          {bgPreview && bgType !== 'none' && bgType !== 'blur' && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${bgPreview})` }}
            />
          )}

          {!isVideoMuted ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`relative z-10 w-full h-full object-cover transition-all ${
                bgType === 'blur' ? 'blur-md opacity-90 scale-105' : bgType !== 'none' ? 'opacity-85' : ''
              }`}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-600 border-2 border-emerald-400 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Branding Watermark */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur rounded-lg border border-amber-500/30">
            <span className="text-xs">♟️</span>
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">ChessHub Academy</span>
          </div>

          {/* Controls Bar Overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between bg-black/70 backdrop-blur p-2 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isAudioMuted ? 'bg-red-600 text-white' : 'bg-[#1a1a32] text-slate-200 hover:bg-[#252548]'
                }`}
              >
                {isAudioMuted ? '🔇 Mic Muted' : '🎙️ Mic On'}
              </button>
              <button
                type="button"
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isVideoMuted ? 'bg-red-600 text-white' : 'bg-[#1a1a32] text-slate-200 hover:bg-[#252548]'
                }`}
              >
                {isVideoMuted ? '📷 Cam Off' : '📹 Cam On'}
              </button>
            </div>

            {/* Virtual Background Quick Select */}
            <select
              value={bgType}
              onChange={(e) => setBgType(e.target.value as BackgroundType)}
              className="px-2.5 py-1.5 bg-[#1a1a32] border border-[#2a2a4a] text-slate-200 text-xs font-bold rounded-lg focus:outline-none focus:border-amber-400"
            >
              <option value="none">Standard Cam</option>
              <option value="blur">Blur Background</option>
              <option value="wood">Walnut Wood</option>
              <option value="library">Grandmaster Library</option>
              <option value="neon">Neon Cyberpunk</option>
            </select>
          </div>
        </div>

        {/* Audio Mic Level Test */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span>Microphone Input Level Test</span>
            <span className="text-amber-400">{audioLevel > 5 ? '🎙️ Audio Detected' : 'Speak to test mic…'}</span>
          </div>
          <div className="w-full h-2.5 bg-[#1a1a32] rounded-full overflow-hidden border border-[#2a2a4a]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
              style={{ width: `${isAudioMuted ? 0 : audioLevel}%` }}
            />
          </div>
        </div>

        {/* Join Classroom Button */}
        <button
          type="button"
          onClick={() => {
            onJoin({ isAudioMuted, isVideoMuted, bgType, customBgUrl });
          }}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          <span>🚀</span>
          <span>Join Live Classroom Session</span>
        </button>
      </div>
    </div>
  );
}
