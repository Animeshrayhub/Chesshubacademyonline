'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ClassroomLocalRecorderProps {
  classId: string;
  isCoachOrAdmin: boolean;
}

export default function ClassroomLocalRecorder({ classId, isCoachOrAdmin }: ClassroomLocalRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Timer tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      timer = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getDisplayMedia) {
        alert('Screen recording is not supported in this browser.');
        return;
      }

      // Prompt coach/admin to select full screen or classroom tab
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });

      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264')
        ? 'video/mp4;codecs=h264'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Build Blob and trigger local device download (Google Drive / local save)
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `ChessHub_Classroom_Recording_${classId}_${dateStr}.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        setIsRecording(false);
        setIsPaused(false);
        setRecordingSeconds(0);
      };

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);
      setShowPrivacyNotice(true);
      setTimeout(() => setShowPrivacyNotice(false), 5000);
    } catch (err) {
      console.warn('Classroom recording cancelled or failed:', err);
    }
  };

  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  if (!isCoachOrAdmin) return null;

  return (
    <div className="flex items-center gap-2 relative">
      {showPrivacyNotice && (
        <div className="absolute right-0 top-9 z-50 bg-red-950 border border-red-500/50 text-white p-3 rounded-2xl text-xs font-bold shadow-2xl w-64 animate-bounce">
          <span>🎥 REC STARTED: Class recording active. Google Drive & local MP4 backup enabled.</span>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-600/80 p-1 rounded-lg shadow-lg">
          <div className="flex items-center gap-1 px-2 text-white font-extrabold text-[10px] tracking-wider uppercase">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-red-500 animate-ping'}`} />
            <span>{isPaused ? 'PAUSED' : `REC ${formatTime(recordingSeconds)}`}</span>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={togglePauseRecording}
            className="px-2 h-6 bg-[#1a1a32] hover:bg-[#252548] text-amber-300 font-bold text-[9px] rounded uppercase transition-all"
            title={isPaused ? 'Resume Recording' : 'Pause Recording'}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>

          {/* Stop & Save Button */}
          <button
            type="button"
            onClick={stopRecording}
            className="px-2 h-6 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[9px] rounded uppercase transition-all shadow"
            title="Stop & Save HD recording to device / Drive"
          >
            💾 Stop & Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="px-3 h-7 bg-[#1a1a32] hover:bg-[#252548] border border-[#2a2a4a] text-[#ccccee] hover:text-white font-bold text-[10px] rounded uppercase tracking-wider flex items-center gap-1.5 transition-all shadow"
          title="Record HD classroom video & audio (MP4 / Google Drive Backup)"
        >
          <span className="text-red-400">🔴</span>
          <span>Record Class</span>
        </button>
      )}
    </div>
  );
}
