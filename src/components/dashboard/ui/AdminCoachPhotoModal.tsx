'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface AdminCoachPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachName?: string;
  currentImageUrl?: string;
  onSaveImageUrl: (url: string) => void;
}

export default function AdminCoachPhotoModal({
  isOpen,
  onClose,
  coachName = 'Coach Profile',
  currentImageUrl = '',
  onSaveImageUrl,
}: AdminCoachPhotoModalProps) {
  const [urlInput, setUrlInput] = useState(currentImageUrl);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Converts Google Drive view/sharing links into direct web image URLs
  const convertGoogleDriveUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();

    // Match Google Drive file ID: /d/FILE_ID/ or id=FILE_ID
    const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    return trimmed;
  };

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    const converted = convertGoogleDriveUrl(val);
    setPreviewUrl(converted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = convertGoogleDriveUrl(urlInput);
    if (!finalUrl) return;

    onSaveImageUrl(finalUrl);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
              🖼️
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-amber-400">
                Coach Profile Picture
              </h3>
              <p className="text-xs text-slate-400">Set photo for {coachName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <h4 className="text-base font-bold text-emerald-300">Profile Photo Saved!</h4>
            <p className="text-xs text-slate-400">Updated coach picture across landing page and portal.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live Image Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-400 shadow-md bg-slate-900 flex items-center justify-center relative">
                {previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewUrl('')}
                  />
                ) : (
                  <span className="text-3xl text-slate-600">📷</span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Live Image Preview
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Paste Image URL or Google Drive Link
              </label>
              <input
                type="text"
                required
                placeholder="https://drive.google.com/file/d/... or /coaches/animesh-ray.jpg"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <p className="text-[10px] text-amber-300/80 mt-1">
                💡 <strong>Google Drive Tip:</strong> Paste any shareable Google Drive link — it automatically converts to a direct image!
              </p>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold w-full py-2.5 text-xs shadow-lg"
            >
              💾 Save Coach Profile Picture
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
