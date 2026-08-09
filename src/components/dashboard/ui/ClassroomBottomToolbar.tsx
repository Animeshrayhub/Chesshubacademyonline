'use client';
import React from 'react';

interface ToolbarProps {
  isCoach: boolean;
  boardFlipped: boolean;
  showCoordinates: boolean;
  showEngine: boolean;
  showMoveList: boolean;
  showMoveDots?: boolean;
  isFullscreen: boolean;
  isRightPanelCollapsed: boolean;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onToggleMoveDots?: () => void;
  onFlip: () => void;
  onToggleCoordinates: () => void;
  onToggleEngine: () => void;
  onToggleMoveList: () => void;
  onToggleFullscreen: () => void;
  onToggleRightPanel: () => void;
  onClearArrows: () => void;
  onSetPosition: () => void;
  onPrevMove: () => void;
  onNextMove: () => void;
  onFirstMove: () => void;
  onLastMove: () => void;
  onReset: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

function ToolIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center justify-center w-full h-full">{children}</span>;
}

interface BtnProps {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}

function Btn({ title, onClick, active, disabled, danger, primary, children }: BtnProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative h-9 w-9 flex items-center justify-center rounded-lg text-sm font-bold
        transition-all duration-150 select-none flex-shrink-0
        ${primary
          ? 'bg-gradient-to-br from-[#c84b31] to-[#a83924] text-white shadow-lg shadow-[#c84b31]/30 hover:scale-105 hover:shadow-[#c84b31]/50 active:scale-95'
          : danger
          ? 'bg-gradient-to-br from-red-700 to-red-900 text-red-200 hover:from-red-600 hover:to-red-800 hover:text-white hover:scale-105 active:scale-95 shadow'
          : active
          ? 'bg-[#c84b31] text-white shadow-md shadow-[#c84b31]/20 ring-1 ring-[#c84b31]/60'
          : disabled
          ? 'text-[#33334a] cursor-not-allowed bg-[#0d0d1e]'
          : 'bg-[#14142a] text-[#9999bb] border border-[#252545] hover:bg-[#1e1e3a] hover:text-white hover:border-[#3d3d66] hover:scale-105 active:scale-95'
        }
      `}
    >
      <span className="text-sm leading-none">{children}</span>
      {/* Tooltip */}
      <span className="
        absolute bottom-full mb-2 left-1/2 -translate-x-1/2
        hidden group-hover:block z-50
        px-2 py-1 bg-[#07070f] text-white text-[10px] font-semibold rounded-lg
        shadow-xl border border-[#2a2a4a] whitespace-nowrap pointer-events-none
      ">
        {title}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="w-px h-7 bg-[#1e1e3a] flex-shrink-0 mx-0.5" />;
}

export default function ClassroomBottomToolbar({
  isCoach,
  boardFlipped,
  showCoordinates,
  showEngine,
  showMoveList,
  showMoveDots = true,
  isFullscreen,
  isRightPanelCollapsed,
  isAudioMuted = false,
  isVideoMuted = false,
  onToggleAudio,
  onToggleVideo,
  onToggleMoveDots,
  onFlip,
  onToggleCoordinates,
  onToggleEngine,
  onToggleMoveList,
  onToggleFullscreen,
  onToggleRightPanel,
  onClearArrows,
  onSetPosition,
  onPrevMove,
  onNextMove,
  onFirstMove,
  onLastMove,
  onReset,
  canGoPrev,
  canGoNext,
}: ToolbarProps) {
  return (
    <div className="
      flex items-center justify-center gap-1 px-3 py-1.5
      bg-[#0a0a18] border-t border-[#1a1a30]
      flex-shrink-0 w-full select-none
      shadow-[0_-2px_16px_rgba(0,0,0,0.4)]
    ">
      {/* Mic & Cam Controls in Bottom Toolbar */}
      {onToggleAudio && (
        <Btn title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'} onClick={() => onToggleAudio()} danger={isAudioMuted} active={!isAudioMuted}>
          {isAudioMuted ? '🔇' : '🎙️'}
        </Btn>
      )}

      {onToggleVideo && (
        <Btn title={isVideoMuted ? 'Turn On Cam' : 'Turn Off Cam'} onClick={() => onToggleVideo()} danger={isVideoMuted} active={!isVideoMuted}>
          {isVideoMuted ? '📷' : '📹'}
        </Btn>
      )}

      <Divider />

      {/* Group 1: View Toggles */}
      <Btn title="Toggle Move Notation" onClick={onToggleMoveList} active={showMoveList}>
        {/* List/notation icon */}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <line x1="2" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </Btn>

      <Btn title="Flip Board" onClick={onFlip} active={boardFlipped}>
        {/* Flip icon */}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2 5.5L5.5 2L9 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 9.5L9.5 13L6 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="5.5" y1="2" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="9.5" y1="5" x2="9.5" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </Btn>

      <Btn title="Toggle Board Coordinates (a-h / 1-8)" onClick={onToggleCoordinates} active={showCoordinates}>
        <span className="text-[11px] font-black tracking-tighter">a1</span>
      </Btn>

      {onToggleMoveDots && (
        <Btn title={showMoveDots ? 'Move Hint Dots: ON' : 'Move Hint Dots: OFF'} onClick={onToggleMoveDots} active={showMoveDots}>
          <span className="text-[11px] font-black">{showMoveDots ? '🔴' : '⚪'}</span>
        </Btn>
      )}

      {isCoach && (
        <Btn title="Toggle Engine Analysis" onClick={onToggleEngine} active={showEngine}>
          {/* Engine / brain icon */}
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="7.5" cy="7.5" r="2" fill="currentColor"/>
            <line x1="7.5" y1="2" x2="7.5" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="7.5" y1="11" x2="7.5" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="2" y1="7.5" x2="4" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="11" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </Btn>
      )}

      <Divider />

      {/* Group 2: Board Tools (Coach Only) */}
      {isCoach && (
        <>
          <Btn title="Set Position / Board Editor" onClick={onSetPosition} primary>
            {/* Grid/board icon */}
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="2" y="2" width="4.5" height="4.5" rx="0.5" fill="currentColor" opacity="0.9"/>
              <rect x="8.5" y="2" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="2" y="8.5" width="4.5" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="0.5" fill="currentColor" opacity="0.9"/>
            </svg>
          </Btn>

          <Btn title="Clear Board / Pieces / Drawings" onClick={onClearArrows} danger>
            {/* Trash icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 4h9M5.5 4V2.5h3V4M4.5 4l.5 7.5h4l.5-7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Btn>

          <Btn title="Reset to Teaching Position" onClick={onReset}>
            {/* Reset/undo icon */}
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M3.5 7.5A4 4 0 1 1 7.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M3.5 4.5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Btn>

          <Divider />
        </>
      )}

      {/* Group 3: Move Navigation */}
      <Btn title="Jump to Start" onClick={onFirstMove} disabled={!canGoPrev}>
        {/* |◀◀ */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="2" y1="2.5" x2="2" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 3L6 7l6 4V3z" fill="currentColor" opacity={canGoPrev ? 1 : 0.3}/>
        </svg>
      </Btn>

      <Btn title="Previous Move" onClick={onPrevMove} disabled={!canGoPrev}>
        {/* ◀ */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M10 3L4 7l6 4V3z" fill="currentColor" opacity={canGoPrev ? 1 : 0.3}/>
        </svg>
      </Btn>

      <Btn title="Next Move" onClick={onNextMove} disabled={!canGoNext}>
        {/* ▶ */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 3l6 4-6 4V3z" fill="currentColor" opacity={canGoNext ? 1 : 0.3}/>
        </svg>
      </Btn>

      <Btn title="Jump to Latest" onClick={onLastMove} disabled={!canGoNext}>
        {/* ▶▶| */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="12" y1="2.5" x2="12" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M2 3l6 4-6 4V3z" fill="currentColor" opacity={canGoNext ? 1 : 0.3}/>
        </svg>
      </Btn>

      <Divider />

      {/* Group 4: Layout */}
      <Btn title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen Board (F11)'} onClick={onToggleFullscreen} active={isFullscreen}>
        {isFullscreen ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2v3M9 2h3v3M5 12H2V9M9 12h3V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 5V2h3M9 2h3v3M2 9v3h3M12 9v3H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </Btn>

      <Btn
        title={isRightPanelCollapsed ? 'Expand Side Panel' : 'Collapse Side Panel'}
        onClick={onToggleRightPanel}
        active={isRightPanelCollapsed}
      >
        {isRightPanelCollapsed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="9.5" y1="1.5" x2="9.5" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M6 7L8 5M6 7L8 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="9.5" y1="1.5" x2="9.5" y2="12.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7L6 5M8 7L6 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
      </Btn>
    </div>
  );
}
