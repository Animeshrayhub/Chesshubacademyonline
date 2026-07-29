'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { AdminClassRow } from '@/lib/classes';

interface AdminRecordingPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: AdminClassRow | null;
  onEditRecordingLink?: (cls: AdminClassRow) => void;
}

export default function AdminRecordingPlayerModal({
  isOpen,
  onClose,
  classData,
  onEditRecordingLink,
}: AdminRecordingPlayerModalProps) {
  const [copied, setCopied] = useState(false);

  if (!classData) return null;

  const rawUrl = classData.recording_url || classData.zoom_join_url || '';

  // Transform Google Drive URL to preview embed format if applicable
  const getEmbedUrl = (url: string) => {
    if (!url) return '';

    // Google Drive share link convert to preview
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([^\/]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    if (url.includes('drive.google.com') && url.includes('id=')) {
      const match = url.match(/id=([^&]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    // YouTube convert to embed
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || '';
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
    }

    return url;
  };

  const embedUrl = getEmbedUrl(rawUrl);
  const isDirectVideo = rawUrl.endsWith('.mp4') || rawUrl.endsWith('.webm') || rawUrl.endsWith('.ogg');
  const isEmbeddable = embedUrl.includes('/preview') || embedUrl.includes('/embed/') || isDirectVideo;

  const handleCopyLink = () => {
    if (!rawUrl) return;
    navigator.clipboard.writeText(rawUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const coachName = classData.coach
    ? `${classData.coach.first_name} ${classData.coach.last_name}`
    : 'Assigned Coach';

  const dateStr = classData.scheduled_start
    ? new Date(classData.scheduled_start).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎥 Class Session Video Recording Player">
      <div className="space-y-4">
        {/* Class Details Bar */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div>
            <span className="text-slate-500 font-semibold block uppercase text-[10px]">COACH & CLASS</span>
            <span className="font-bold text-slate-100 text-sm">{coachName}</span>
            <span className="text-slate-400 text-xs ml-2">({classData.class_type} Lesson)</span>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block uppercase text-[10px]">RECORDED DATE</span>
            <span className="font-mono text-amber-300 font-bold">{dateStr}</span>
          </div>

          <div className="flex items-center gap-2">
            {onEditRecordingLink && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditRecordingLink(classData);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition"
              >
                ✏️ Edit Link
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!rawUrl}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg transition disabled:opacity-40"
            >
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>
        </div>

        {/* Video Player Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center relative shadow-2xl">
          {rawUrl ? (
            isDirectVideo ? (
              <video
                src={rawUrl}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
              >
                Your browser does not support HTML5 video.
              </video>
            ) : isEmbeddable ? (
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title="Class Recording Stream"
              />
            ) : (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center text-2xl mx-auto">
                  🔗
                </div>
                <h4 className="text-sm font-bold text-slate-200">External Recording Link Detected</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  This class recording is hosted on an external video provider ({rawUrl.substring(0, 45)}...). Click below to launch in a new window.
                </p>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition"
                >
                  <span>▶️ Watch Recording in New Tab</span>
                </a>
              </div>
            )
          ) : (
            <div className="p-6 text-center space-y-2">
              <div className="text-4xl text-slate-600">📹</div>
              <h4 className="text-sm font-bold text-slate-300">No Recording Link Attached Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Attach a Google Drive, Zoom, MP4, or YouTube video URL to publish the recording for this class.
              </p>
              {onEditRecordingLink && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditRecordingLink(classData);
                  }}
                  className="mt-2 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition"
                >
                  + Attach Recording Link Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
