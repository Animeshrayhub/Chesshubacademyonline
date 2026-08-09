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

interface PillBtnProps {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
  title?: string;
}

function PillBtn({ icon, label, onClick, active, disabled, danger, primary, title }: PillBtnProps) {
  const base =
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 select-none flex-shrink-0 border';
  const styles = primary
    ? 'bg-gradient-to-br from-[#c84b31] to-[#a83924] text-white border-[#c84b31]/60 shadow shadow-[#c84b31]/20 hover:brightness-110 active:scale-95'
    : danger
    ? 'bg-red-900/60 text-red-300 border-red-700/50 hover:bg-red-800/70 hover:text-red-100 active:scale-95'
    : active
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
    : disabled
    ? 'bg-[#0d0d1e] text-[#33334a] border-[#1a1a30] cursor-not-allowed opacity-50'
    : 'bg-[#14142a] text-[#9999bb] border-[#252545] hover:bg-[#1e1e3a] hover:text-white hover:border-[#3d3d66] active:scale-95';

  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      <span className="leading-none tracking-wide whitespace-nowrap">{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-[#1e1e3a] flex-shrink-0 mx-0.5" />;
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
      flex items-center flex-wrap gap-1.5 px-3 py-2
      bg-[#09091a]/95 backdrop-blur-sm border-t border-[#1a1a30]
      flex-shrink-0 w-full select-none
      shadow-[0_-4px_20px_rgba(0,0,0,0.5)]
    ">

      {/* Media Controls */}
      {onToggleAudio && (
        <PillBtn
          icon={isAudioMuted ? '🔇' : '🎙️'}
          label={isAudioMuted ? 'Unmute' : 'Mute'}
          onClick={() => onToggleAudio()}
          danger={isAudioMuted}
          active={!isAudioMuted}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        />
      )}
      {onToggleVideo && (
        <PillBtn
          icon={isVideoMuted ? '📷' : '📹'}
          label={isVideoMuted ? 'Cam Off' : 'Camera'}
          onClick={() => onToggleVideo()}
          danger={isVideoMuted}
          active={!isVideoMuted}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
        />
      )}

      <Divider />

      {/* Move Navigation */}
      <PillBtn icon="⏮" label="Start" onClick={onFirstMove} disabled={!canGoPrev} title="Jump to Start" />
      <PillBtn icon="◀" label="Undo" onClick={onPrevMove} disabled={!canGoPrev} title="Previous Move" />
      <PillBtn icon="▶" label="Redo" onClick={onNextMove} disabled={!canGoNext} title="Next Move" />
      <PillBtn icon="⏭" label="Latest" onClick={onLastMove} disabled={!canGoNext} title="Jump to Latest" />

      <Divider />

      {/* Board Controls */}
      <PillBtn icon="🔄" label="Reset" onClick={onReset} title="Reset to Teaching Position" />
      <PillBtn icon="⇅" label="Flip" onClick={onFlip} active={boardFlipped} title="Flip Board" />
      <PillBtn icon="#" label="Coords" onClick={onToggleCoordinates} active={showCoordinates} title="Toggle Coordinates" />
      {onToggleMoveDots && (
        <PillBtn
          icon="●"
          label="Dots"
          onClick={onToggleMoveDots}
          active={showMoveDots}
          title={showMoveDots ? 'Hide Move Hint Dots' : 'Show Move Hint Dots'}
        />
      )}

      <Divider />

      {/* Coach-Only Tools */}
      {isCoach && (
        <>
          <PillBtn icon="🧠" label="Engine" onClick={onToggleEngine} active={showEngine} title="Toggle Engine Analysis" />
          <PillBtn icon="🎨" label="Editor" onClick={onSetPosition} primary title="Set Position / Board Editor" />
          <PillBtn icon="🗑️" label="Clear" onClick={onClearArrows} danger title="Clear Board / Pieces / Drawings" />
          <Divider />
        </>
      )}

      {/* View Controls */}
      <PillBtn icon="≡" label="Moves" onClick={onToggleMoveList} active={showMoveList} title="Toggle Move Notation List" />
      <PillBtn
        icon={isFullscreen ? '⊡' : '⊞'}
        label={isFullscreen ? 'Exit FS' : 'Full'}
        onClick={onToggleFullscreen}
        active={isFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Board'}
      />
      <PillBtn
        icon={isRightPanelCollapsed ? '▷' : '◁'}
        label={isRightPanelCollapsed ? 'Panel' : 'Hide'}
        onClick={onToggleRightPanel}
        active={isRightPanelCollapsed}
        title={isRightPanelCollapsed ? 'Show Side Panel' : 'Hide Side Panel'}
      />
    </div>
  );
}
