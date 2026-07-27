'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ClassroomRecorderProps {
  classId: string;
  isCoachOrAdmin: boolean;
}

interface LocalRecordingMeta {
  id: string;
  classId: string;
  fileName: string;
  recordedAt: string;
  durationSeconds: number;
  blobUrl?: string;
}

export default function ClassroomRecorder({ classId, isCoachOrAdmin }: ClassroomRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [savedRecordings, setSavedRecordings] = useState<LocalRecordingMeta[]>([]);
  const [showRecordingsModal, setShowRecordingsModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Load saved local recordings history from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`local_class_recordings_${classId}`);
      if (stored) {
        setSavedRecordings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load local class recordings:', e);
    }
  }, [classId]);

  if (!isCoachOrAdmin) return null;

  const startRecording = async () => {
    setStatusMessage('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined
      );

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        handleRecordingStop(stream);
      };

      // Stop recording automatically if user stops screen sharing from browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      recorder.start(1000); // collect chunks every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      startTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setRecordingSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start classroom screen recording:', err);
      setStatusMessage('⚠️ Screen recording canceled or not permitted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordingStop = (stream: MediaStream) => {
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // Stop all media tracks
    stream.getTracks().forEach((track) => track.stop());

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    if (blob.size === 0) {
      setStatusMessage('⚠️ Recording failed: No video data captured.');
      return;
    }

    const duration = recordingSeconds;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `ChessHub_Class_${classId.substring(0, 8)}_${dateStr}.webm`;

    // 1. Download automatically to local device
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    // 2. Save metadata to localStorage
    const meta: LocalRecordingMeta = {
      id: `rec-${Date.now()}`,
      classId,
      fileName,
      recordedAt: new Date().toLocaleString(),
      durationSeconds: duration,
      blobUrl,
    };

    const updated = [meta, ...savedRecordings];
    setSavedRecordings(updated);
    try {
      localStorage.setItem(`local_class_recordings_${classId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recording metadata to localStorage:', e);
    }

    setStatusMessage(`✅ Class recording saved to your device! (${fileName})`);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {statusMessage && (
        <span className="text-[11px] text-amber-300 font-bold bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg animate-fade-in">
          {statusMessage}
        </span>
      )}

      {isRecording ? (
        <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/60 px-3 py-1.5 rounded-xl shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-mono font-bold text-red-200">
            🔴 Recording {formatTimer(recordingSeconds)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg transition-colors ml-1 shadow-sm"
          >
            ⏹️ Stop & Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95"
          title="Record classroom screen & audio locally to device"
        >
          <span>🔴 Record Class (Local Device)</span>
        </button>
      )}

      {savedRecordings.length > 0 && (
        <button
          type="button"
          onClick={() => setShowRecordingsModal(true)}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1"
        >
          <span>💾 Local Recordings ({savedRecordings.length})</span>
        </button>
      )}

      {/* Local Recordings History Modal */}
      {showRecordingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-sm text-amber-400 flex items-center gap-2">
                <span>💾 Saved Local Class Recordings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRecordingsModal(false)}
                className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {savedRecordings.map((rec) => (
                <div key={rec.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-200 truncate max-w-[240px]">
                      {rec.fileName}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      ⏱️ {formatTimer(rec.durationSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>{rec.recordedAt}</span>
                    {rec.blobUrl && (
                      <a
                        href={rec.blobUrl}
                        download={rec.fileName}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px]"
                      >
                        Re-Download ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRecordingsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
