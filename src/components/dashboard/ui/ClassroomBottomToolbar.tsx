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
  isBoardLocked?: boolean;
  allowIllegalMoves?: boolean;
  soundEnabled?: boolean;
  hasHandRaised?: boolean;
  onToggleMoveDots?: () => void;
  onToggleBoardLock?: () => void;
  onToggleIllegalMoves?: () => void;
  onToggleSound?: () => void;
  onRaiseHand?: () => void;
  onOpenMultiBoardGrid?: () => void;
  onOpenImportModal?: () => void;
  onOpenThemeModal?: () => void;
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
    'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 select-none flex-shrink-0 border';
  const styles = primary
    ? 'bg-rose-600 text-white border-rose-500 shadow hover:bg-rose-500 active:scale-95'
    : danger
    ? 'bg-rose-950/70 text-rose-300 border-rose-800/60 hover:bg-rose-900 active:scale-95'
    : active
    ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-500'
    : disabled
    ? 'bg-[#181820] text-[#444455] border-[#242430] cursor-not-allowed opacity-50'
    : 'bg-[#25252b] text-[#cccccc] border-[#383842] hover:bg-[#32323a] hover:text-white active:scale-95';

  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      <span className="text-[12px] leading-none font-mono">{icon}</span>
      {label && <span className="leading-none tracking-tight whitespace-nowrap">{label}</span>}
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
  isBoardLocked = false,
  allowIllegalMoves = false,
  soundEnabled = true,
  hasHandRaised = false,
  onToggleMoveDots,
  onToggleBoardLock,
  onToggleIllegalMoves,
  onToggleSound,
  onRaiseHand,
  onOpenMultiBoardGrid,
  onOpenImportModal,
  onOpenThemeModal,
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

      {/* Student Raise Hand Button */}
      {!isCoach && onRaiseHand && (
        <PillBtn
          icon="✋"
          label={hasHandRaised ? 'Hand Raised!' : 'Raise Hand'}
          onClick={onRaiseHand}
          active={hasHandRaised}
          primary={hasHandRaised}
          title="Notify coach you have a question"
        />
      )}

      <Divider />

      {/* Move Navigation */}
      <PillBtn icon="⏮" label="Start" onClick={onFirstMove} disabled={!canGoPrev} title="Jump to Start" />
      {isCoach && (
        <>
          <PillBtn icon="◀" label="Undo" onClick={onPrevMove} disabled={!canGoPrev} title="Previous Move" />
          <PillBtn icon="▶" label="Redo" onClick={onNextMove} disabled={!canGoNext} title="Next Move" />
        </>
      )}
      <PillBtn icon="⏭" label="Latest" onClick={onLastMove} disabled={!canGoNext} title="Jump to Latest" />

      <Divider />

      {/* Board & Theme Controls */}
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

      {/* Sound SFX & Theme Controls */}
      {onToggleSound && (
        <PillBtn
          icon={soundEnabled ? '🔊' : '🔇'}
          label={soundEnabled ? 'SFX ON' : 'SFX OFF'}
          onClick={onToggleSound}
          active={soundEnabled}
          title="Toggle Chess Sound Effects"
        />
      )}
      {onOpenThemeModal && (
        <PillBtn
          icon="🎨"
          label="Theme"
          onClick={onOpenThemeModal}
          title="Change Board Theme & Colors"
        />
      )}

      <Divider />

      {/* Coach-Only Tools */}
      {isCoach && (
        <>
          <PillBtn icon="🧠" label="Engine" onClick={onToggleEngine} active={showEngine} title="Toggle Engine Analysis" />
          <PillBtn icon="✏️" label="Editor" onClick={onSetPosition} primary title="Set Position / Board Editor" />
          {onOpenImportModal && (
            <PillBtn icon="📥" label="Import" onClick={onOpenImportModal} title="Import PGN or FEN" />
          )}
          {onOpenMultiBoardGrid && (
            <PillBtn icon="🗂️" label="Grid" onClick={onOpenMultiBoardGrid} title="Monitor all student boards" />
          )}
          <PillBtn icon="🗑️" label="Clear" onClick={onClearArrows} danger title="Clear Board / Pieces / Drawings" />
          {onToggleBoardLock && (
            <PillBtn
              icon={isBoardLocked ? '🔒' : '🔓'}
              label={isBoardLocked ? 'Moves: OFF' : 'Student Moves'}
              onClick={onToggleBoardLock}
              danger={isBoardLocked}
              active={!isBoardLocked}
              title={isBoardLocked ? 'Student moves locked by coach' : 'Students allowed to play moves'}
            />
          )}
          {onToggleIllegalMoves && (
            <PillBtn
              icon={allowIllegalMoves ? '⚡' : '🛡️'}
              label={allowIllegalMoves ? 'Free Moves' : 'Strict Rules'}
              onClick={onToggleIllegalMoves}
              active={allowIllegalMoves}
              title={allowIllegalMoves ? 'Free/Illegal Moves ON: Drag any piece anywhere' : 'Strict Rules ON: Only legal moves allowed'}
            />
          )}
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
