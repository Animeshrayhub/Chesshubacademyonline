'use client';

import React, { useState } from 'react';

export interface RecentRecordingData {
  id: string;
  classId: string;
  title: string;
  recordingUrl: string;
  recordingSource: string;
  durationSeconds: number;
  date: string;
  coachNotes?: string | null;
}

interface RecentClassRecordingsWidgetProps {
  recording?: RecentRecordingData | null;
}

export default function RecentClassRecordingsWidget({
  recording,
}: RecentClassRecordingsWidgetProps) {
  const [isPlayingModalOpen, setIsPlayingModalOpen] = useState(false);

  // Format duration in mm:ss or hh:mm
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  // Convert Google Drive view URL to embed URL if needed
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com') && url.includes('/view')) {
      return url.replace('/view', '/preview');
    }
    return url;
  };

  const formattedDate = recording?.date
    ? new Date(recording.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent Session';

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shadow-md">
            📹
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              <span>Recent Class Vault &amp; Coach Feedback</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                HD Lesson
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Review your coach&apos;s analysis, key takeaways, and lesson video
            </p>
          </div>
        </div>

        <a
          href="/dashboard/student/recordings"
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          <span>All Recordings</span>
          <span>➔</span>
        </a>
      </div>

      {!recording ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl">
            🎞️
          </div>
          <div>
            <p className="text-sm font-bold text-slate-300">No session recordings yet</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Your coach will publish session recordings and tactical homework feedback here after your live classes.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white">{recording.title}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                  {formatDuration(recording.durationSeconds)}
                </span>
                <span className="text-xs text-slate-400">• {formattedDate}</span>
              </div>

              {recording.coachNotes && (
                <div className="pt-2 text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 text-sm">💬</span>
                  <div>
                    <span className="font-extrabold text-amber-300">Coach Feedback: </span>
                    <span className="italic">{recording.coachNotes}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlayingModalOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-900/40 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto"
            >
              <span>▶</span>
              <span>WATCH RECORDING</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {isPlayingModalOpen && recording && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPlayingModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="text-xl">📹</span>
                <div>
                  <h4 className="text-sm font-black text-white">{recording.title}</h4>
                  <p className="text-xs text-slate-400">
                    {formattedDate} • {formatDuration(recording.durationSeconds)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlayingModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
                aria-label="Close video player"
              >
                ✕
              </button>
            </div>

            {/* Video Content */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {recording.recordingUrl.includes('drive.google.com') ? (
                <iframe
                  src={getEmbedUrl(recording.recordingUrl)}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  title={recording.title}
                />
              ) : (
                <video
                  src={recording.recordingUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                >
                  Your browser does not support HTML5 video.
                </video>
              )}
            </div>

            {/* Coach Takeaways in Modal */}
            {recording.coachNotes && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <span className="text-amber-400 text-base">💡</span>
                <div>
                  <span className="font-extrabold text-amber-300 block mb-0.5">Coach Lesson Notes:</span>
                  <span>{recording.coachNotes}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
