'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BackgroundType } from './ClassroomVirtualBackgroundModal';
import ClassroomScreenShareModal from './ClassroomScreenShareModal';

interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  studentProfileId?: string;
}

interface ClassroomVideoGridProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remotePeers: any[];
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  reactionEmoji: string | null;
  coachName: string;
  userName: string;
  isCoach: boolean;
  students: StudentInfo[];
  onlineUserIds: string[];
  spotlightedStudentId: string | null;
  bgType?: BackgroundType;
  customBgUrl?: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRaiseHand: () => void;
  onSendEmojiReaction: (emoji: string) => void;
  onCoachMuteStudent: (studentName: string) => void;
  onCoachMuteAll?: () => void;
  onCoachStopStudentVideo: (studentName: string) => void;
  onToggleSpotlight: (studentId: string, studentName: string) => void;
  onOpenBgModal?: () => void;
}

type LayoutMode = 'sidebar' | 'grid' | 'spotlight';

function VideoElement({
  stream,
  isMuted = false,
  bgType = 'none',
  customBgUrl = '',
}: {
  stream: MediaStream | null;
  isMuted?: boolean;
  bgType?: BackgroundType;
  customBgUrl?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  if (!stream) return null;

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
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {bgPreview && bgType !== 'none' && bgType !== 'blur' && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgPreview})` }}
        />
      )}
      <video
        ref={(node) => {
          if (node && stream) {
            node.srcObject = stream;
            node.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        muted={isMuted}
        className={`relative z-10 w-full h-full object-cover rounded-lg transition-all ${
          bgType === 'blur' ? 'blur-md opacity-90 scale-105' : bgType !== 'none' ? 'opacity-85' : ''
        }`}
      />
    </div>
  );
}

export default function ClassroomVideoGrid({
  localStream,
  screenStream,
  remotePeers,
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  handRaised,
  reactionEmoji,
  coachName,
  userName,
  isCoach,
  students,
  onlineUserIds,
  spotlightedStudentId,
  bgType = 'none',
  customBgUrl = '',
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRaiseHand,
  onSendEmojiReaction,
  onCoachMuteStudent,
  onCoachMuteAll,
  onCoachStopStudentVideo,
  onToggleSpotlight,
  onOpenBgModal,
}: ClassroomVideoGridProps) {
  const emojis = ['👏', '👍', '🔥', '🎯', '💡', '❓'];
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('sidebar');
  const [showScreenZoomModal, setShowScreenZoomModal] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#0a0a1a] border-b border-[#222244] p-2 select-none">
      {/* Action & Controls Toolbar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e1e3a] flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-extrabold text-[#ccccee] uppercase tracking-wider">
            WebRTC ({onlineUserIds.length + 1} Live)
          </span>
        </div>

        {/* Layout & Media Controls */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Layout Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-[#121226] p-0.5 rounded-lg border border-[#2a2a4a]">
            <button
              type="button"
              onClick={() => setLayoutMode('sidebar')}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                layoutMode === 'sidebar' ? 'bg-amber-500 text-slate-950 font-extrabold shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Sidebar 1-Column View"
            >
              📱 Side (1-Col)
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                layoutMode === 'grid' ? 'bg-amber-500 text-slate-950 font-extrabold shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid 2-Column Prominent View"
            >
              🔲 Grid (2-Col)
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('spotlight')}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                layoutMode === 'spotlight' ? 'bg-amber-500 text-slate-950 font-extrabold shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Spotlight Active Speaker View"
            >
              🎯 Spotlight
            </button>
          </div>

          {/* Coach Master Mute All */}
          {isCoach && (
            <button
              type="button"
              onClick={onCoachMuteAll}
              className="px-2 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 text-[10px] font-extrabold rounded transition-colors"
              title="Mute all student microphones"
            >
              🤐 Mute All
            </button>
          )}

          {/* Virtual Background */}
          {onOpenBgModal && (
            <button
              type="button"
              onClick={onOpenBgModal}
              className="px-2 py-1 bg-[#1a1a32] hover:bg-[#252548] border border-[#2a2a4a] text-[#ccccee] text-[10px] font-bold rounded transition-colors"
              title="Virtual Backgrounds"
            >
              🖼️ Background
            </button>
          )}

          {/* Audio Mute/Unmute */}
          <button
            type="button"
            onClick={() => onToggleAudio()}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              isAudioMuted
                ? 'bg-red-950/80 text-red-300 border-red-700/60'
                : 'bg-[#1a1a32] text-[#ccccee] border-[#2a2a4a] hover:bg-[#252548]'
            }`}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? '🔇 Muted' : '🎙️ Mic On'}
          </button>

          {/* Video On/Off */}
          <button
            type="button"
            onClick={() => onToggleVideo()}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              isVideoMuted
                ? 'bg-red-950/80 text-red-300 border-red-700/60'
                : 'bg-[#1a1a32] text-[#ccccee] border-[#2a2a4a] hover:bg-[#252548]'
            }`}
            title={isVideoMuted ? 'Turn On Camera' : 'Turn Off Camera'}
          >
            {isVideoMuted ? '📷 Off' : '📹 Cam On'}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              isScreenSharing
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold animate-pulse'
                : 'bg-[#1a1a32] text-[#ccccee] border-[#2a2a4a] hover:bg-[#252548]'
            }`}
            title="Share desktop screen"
          >
            {isScreenSharing ? '💻 Sharing' : '💻 Screen'}
          </button>

          {/* Hand Raise */}
          {!isCoach && (
            <button
              type="button"
              onClick={onToggleRaiseHand}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                handRaised
                  ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce'
                  : 'bg-[#1a1a32] text-[#ccccee] border-[#2a2a4a] hover:bg-[#252548]'
              }`}
              title="Raise hand to ask question"
            >
              {handRaised ? '✋ Raised' : '✋ Raise'}
            </button>
          )}
        </div>
      </div>

      {/* Screen Share Active Canvas View with Zoom Controls */}
      {screenStream && (
        <div className="w-full h-44 bg-black rounded-xl overflow-hidden border border-amber-500/60 mb-2 relative group shadow-xl">
          <VideoElement stream={screenStream} isMuted={true} />
          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none z-20">
            <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-lg uppercase shadow">
              💻 Active Screen Share
            </span>
            <button
              type="button"
              onClick={() => setShowScreenZoomModal(true)}
              className="pointer-events-auto px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[10px] font-extrabold rounded-lg shadow-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>🔍</span>
              <span>View Big Screen (Zoom 300%)</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Tiles Grid — Differentiates Sidebar (1-col), Grid (2-col), and Spotlight */}
      <div className={`grid gap-2 overflow-y-auto max-h-60 transition-all ${
        layoutMode === 'sidebar'
          ? 'grid-cols-1'
          : layoutMode === 'spotlight'
          ? 'grid-cols-1'
          : 'grid-cols-2'
      }`}>
        {/* Coach Video Tile */}
        <div className={`relative bg-[#1a1a32] rounded-xl overflow-hidden border-2 border-amber-500/60 group flex flex-col items-center justify-center shadow-md transition-all ${
          layoutMode === 'sidebar' ? 'h-24' : layoutMode === 'spotlight' ? 'h-44' : 'h-36'
        }`}>
          {isCoach && localStream && !isVideoMuted ? (
            <VideoElement stream={localStream} isMuted={true} bgType={bgType} customBgUrl={customBgUrl} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-extrabold text-base border-2 border-emerald-400">
              {coachName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Branding Watermark Badge */}
          <div className="absolute top-1.5 left-2 z-20 flex items-center gap-1 px-2 py-0.5 bg-black/70 backdrop-blur rounded-md text-[9px] font-extrabold text-amber-400 border border-amber-500/30">
            <span>♟️</span>
            <span>CHESSHUB</span>
          </div>

          <span className="absolute bottom-1.5 left-2 z-20 text-[10px] font-extrabold text-white bg-black/70 px-2 py-0.5 rounded-md backdrop-blur truncate max-w-[85%]">
            {coachName.split(' ').slice(0, 2).join(' ')} {isCoach && '(You)'}
          </span>
          <span className="absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Student Video Tiles */}
        {students
          .filter((student) => {
            const studentName = `${student.firstName} ${student.lastName}`;
            const isOnline = onlineUserIds.some(
              (id: string) => id === studentName || id.toLowerCase().includes(student.firstName.toLowerCase())
            );
            const isMe = !isCoach && (studentName === userName || userName.toLowerCase().includes(student.firstName.toLowerCase()));
            const isPeer = remotePeers.some((p) => p.userName === studentName);
            return isOnline || isMe || isPeer;
          })
          .map((student, i) => {
            const studentName = `${student.firstName} ${student.lastName}`;
            const isOnline = onlineUserIds.some(
              (id: string) => id === studentName || id.toLowerCase().includes(student.firstName.toLowerCase())
            );
            const isMe = !isCoach && (studentName === userName || userName.toLowerCase().includes(student.firstName.toLowerCase()));
            const remotePeer = remotePeers.find((p) => p.userName === studentName);
            const studentStream = isMe ? localStream : remotePeer?.stream;

            const colors = ['#7c3aed', '#2563eb', '#d97706', '#16a34a', '#db2777'];
            const color = colors[i % colors.length];

            return (
              <div key={i} className={`relative bg-[#1a1a32] rounded-xl overflow-hidden border border-[#2a2a4a] flex flex-col items-center justify-center transition-all ${
                layoutMode === 'sidebar' ? 'h-24' : 'h-36'
              }`}>
                {studentStream && (!isMe || !isVideoMuted) ? (
                  <VideoElement stream={studentStream} isMuted={isMe} bgType={isMe ? bgType : 'none'} customBgUrl={isMe ? customBgUrl : ''} />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm border-2"
                    style={{ backgroundColor: color, borderColor: color }}
                  >
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                )}

                {/* Overlay Name */}
                <span className="absolute bottom-1.5 left-2 z-20 text-[10px] font-extrabold text-white bg-black/70 px-2 py-0.5 rounded-md backdrop-blur truncate max-w-[80%]">
                  {student.firstName} {student.lastName[0]}.{isMe && ' (You)'}
                </span>

                {/* Online Indicator */}
                <span className={`absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-[#444466]'}`} />

                {/* Coach Moderation Menu for Student Tile */}
                {isCoach && (
                  <div className="absolute top-1.5 left-2 z-30 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-black/80 p-1 rounded-md backdrop-blur border border-white/10">
                    <button
                      type="button"
                      onClick={() => onCoachMuteStudent(studentName)}
                      className="text-xs hover:text-red-400 px-1"
                      title="Mute Student Mic"
                    >
                      🎙️
                    </button>
                    <button
                      type="button"
                      onClick={() => onCoachStopStudentVideo(studentName)}
                      className="text-xs hover:text-red-400 px-1"
                      title="Turn Off Student Video"
                    >
                      📹
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSpotlight(student.studentProfileId || student.email, studentName)}
                      className="text-xs hover:text-amber-400 px-1"
                      title="Spotlight student board"
                    >
                      🎯
                    </button>
                  </div>
                )}
              </div>
            );
          })}

        {/* Empty state when no students have joined yet */}
        {students.filter((student) => {
          const studentName = `${student.firstName} ${student.lastName}`;
          const isOnline = onlineUserIds.some((id: string) => id === studentName || id.toLowerCase().includes(student.firstName.toLowerCase()));
          const isMe = !isCoach && (studentName === userName || userName.toLowerCase().includes(student.firstName.toLowerCase()));
          const isPeer = remotePeers.some((p) => p.userName === studentName);
          return isOnline || isMe || isPeer;
        }).length === 0 && (
          <div className="col-span-1 h-24 flex items-center justify-center rounded-xl border border-dashed border-[#2a2a4a] bg-[#0d0d1e]">
            <p className="text-[10px] text-[#555577] text-center px-2 leading-tight">Waiting for<br/>students...</p>
          </div>
        )}
      </div>

      {/* Live Reaction Emojis Bar */}
      <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-[#1e1e3a]">
        <span className="text-[9px] font-bold text-[#7777aa]">Live Reactions:</span>
        <div className="flex items-center gap-1">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendEmojiReaction(emoji)}
              className="text-xs hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
        {reactionEmoji && (
          <span className="text-sm animate-bounce font-bold">{reactionEmoji}</span>
        )}
      </div>

      {/* Screen Share High-Res Zoom Modal */}
      <ClassroomScreenShareModal
        isOpen={showScreenZoomModal}
        stream={screenStream}
        coachName={coachName}
        onClose={() => setShowScreenZoomModal(false)}
      />
    </div>
  );
}
