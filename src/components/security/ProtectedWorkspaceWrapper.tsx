'use client';

import React from 'react';
import { useContentDrm, DrmUserMetadata } from '@/hooks/useContentDrm';
import { ContentWatermarkOverlay } from './ContentWatermarkOverlay';

interface ProtectedWorkspaceWrapperProps {
  children: React.ReactNode;
  userMetadata?: Partial<DrmUserMetadata>;
  watermarkOpacity?: number;
  watermarkDensity?: 'compact' | 'normal' | 'dense';
  preventRightClick?: boolean;
  preventDrag?: boolean;
  workspaceTitle?: string;
  className?: string;
}

export const ProtectedWorkspaceWrapper: React.FC<ProtectedWorkspaceWrapperProps> = ({
  children,
  userMetadata,
  watermarkOpacity = 0.16,
  watermarkDensity = 'normal',
  preventRightClick = true,
  preventDrag = true,
  workspaceTitle = 'Protected Academy Workspace',
  className = '',
}) => {
  const {
    drmMetadata,
    containerRef,
    isTampered,
    tamperCount,
    screenshotAlert,
    triggerScreenshotAlert,
    recoverWatermark,
    setIsTampered,
    setTamperCount,
  } = useContentDrm({
    user: userMetadata,
    onTamperDetected: (reason) => {
      setIsTampered(true);
      setTamperCount((prev) => prev + 1);
    },
  });

  return (
    <div
      ref={containerRef}
      onContextMenu={preventRightClick ? (e) => e.preventDefault() : undefined}
      onDragStart={preventDrag ? (e) => e.preventDefault() : undefined}
      className={`relative w-full h-full overflow-hidden select-none drm-protected-container ${className}`}
    >
      {/* Print Security CSS Shielding */}
      <style jsx global>{`
        @media print {
          .drm-protected-container {
            display: none !important;
          }
          body::after {
            content: 'SECURITY NOTICE: Printing or exporting ChessHub Academy protected materials is strictly prohibited.';
            display: block;
            padding: 40px;
            font-size: 20px;
            color: #ef4444;
            text-align: center;
            font-weight: bold;
          }
        }
      `}</style>

      {/* Security Status Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 z-30 relative">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-200">{workspaceTitle}</span>
          <span className="text-slate-500">|</span>
          <span className="bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded text-[11px] border border-slate-700/60">
            DRM Shield Active
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>HASH: {drmMetadata.sessionHash}</span>
            <span>•</span>
            <span>ID: {drmMetadata.userId}</span>
          </div>

          <button
            type="button"
            onClick={triggerScreenshotAlert}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded transition border border-slate-700"
          >
            Test Capture Guard
          </button>
        </div>
      </div>

      {/* Protected Main Workspace Content */}
      <div className={`relative w-full h-full transition-all duration-300 ${isTampered ? 'filter blur-md pointer-events-none' : ''}`}>
        {children}
      </div>

      {/* HTML5 Dynamic Canvas Watermark Overlay */}
      <ContentWatermarkOverlay
        metadata={drmMetadata}
        opacity={watermarkOpacity}
        density={watermarkDensity}
        onTamperDetected={() => setIsTampered(true)}
      />

      {/* Screenshot / Screen Capture Intercept Alert */}
      {screenshotAlert && (
        <div className="absolute inset-x-0 top-12 z-50 flex justify-center px-4 animate-bounce">
          <div className="bg-amber-950/90 border border-amber-500/50 text-amber-200 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-lg">
            <svg className="w-6 h-6 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-bold text-sm text-amber-100">Screen Capture Guard Triggered</div>
              <div className="text-xs text-amber-300/90">
                Screen capturing & printing are logged. Watermark session hash <code className="font-mono bg-amber-900/60 px-1 rounded">{drmMetadata.sessionHash}</code> is embedded in this workspace view.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tamper Recovery Alert Modal */}
      {isTampered && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-6 max-w-md shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">DRM Tamper Attempt Blocked</h3>
            <p className="text-xs text-slate-400 mb-4">
              DevTools DOM element removal or CSS style modification was detected ({tamperCount} event{tamperCount > 1 ? 's' : ''}). The workspace has been temporarily locked to protect proprietary chess materials.
            </p>
            <button
              type="button"
              onClick={recoverWatermark}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-xs rounded-lg shadow transition"
            >
              Verify Security & Unlock Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
