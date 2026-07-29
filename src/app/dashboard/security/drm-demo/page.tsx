'use client';

import React, { useState } from 'react';
import { ProtectedWorkspaceWrapper } from '@/components/security/ProtectedWorkspaceWrapper';
import MiniChessBoard from '@/components/dashboard/ui/MiniChessBoard';
import PageHeader from '@/components/dashboard/ui/PageHeader';

export default function DrmSecurityDemoPage() {
  const [opacity, setOpacity] = useState(0.18);
  const [density, setDensity] = useState<'compact' | 'normal' | 'dense'>('normal');
  const [userName, setUserName] = useState('Animesh Ray');
  const [userEmail, setUserEmail] = useState('animesh@chesshubacademy.com');

  // Starting position FEN
  const sampleFen = 'r1bqk2r/pp1pppbp/2n2np1/8/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 4 7';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Dynamic Canvas & Content DRM Watermarking"
        subtitle="Live DRM security suite protecting proprietary chess materials, live classrooms, and tactical puzzle banks."
      />

      {/* Control Panel & Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <h2 className="font-semibold text-sm text-slate-200">Live DRM Configurator</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Student Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Student Email</label>
              <input
                type="text"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Watermark Opacity</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.01"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Watermark Density</label>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'normal', 'dense'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={`py-1.5 px-2 capitalize rounded text-[11px] border transition ${
                      density === d
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300">Security Safeguards Active:</div>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>HTML5 Dynamic Canvas Overlay</li>
              <li>Steganographic Micro-Dots Fingerprinting</li>
              <li>DevTools DOM MutationObserver Lock</li>
              <li>Keyboard Shortcut & Print Guard</li>
            </ul>
          </div>
        </div>

        {/* Protected Interactive Board Workspace */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
          <ProtectedWorkspaceWrapper
            userMetadata={{
              userName,
              email: userEmail,
            }}
            watermarkOpacity={opacity}
            watermarkDensity={density}
            workspaceTitle="ChessHub Masterclass Workspace • Sicilian Dragon Strategy"
            className="flex-1 flex flex-col"
          >
            <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="text-center max-w-md">
                <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full font-mono">
                  PROPRIETARY LESSON MATERIAL
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-3 mb-1">
                  Grandmaster Opening Study: Sicilian Dragon
                </h3>
                <p className="text-xs text-slate-400">
                  Interactive move study for enrolled academy students. Move pieces on the board below to test piece interactivity through the DRM canvas.
                </p>
              </div>

              {/* Interactive Chess Board */}
              <div className="w-full max-w-md p-4 bg-slate-950 border border-slate-800 rounded-xl shadow-xl flex flex-col items-center">
                <MiniChessBoard initialFen={sampleFen} />
                <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <span className="font-mono text-emerald-400">White to move: 7. Be3</span>
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                    Interactive Sandbox
                  </span>
                </div>
              </div>

              <div className="text-center text-slate-500 text-xs max-w-lg">
                💡 <span className="text-slate-400 font-medium">Try Tampering:</span> Open DevTools, inspect the board or canvas, and try setting <code className="bg-slate-950 px-1 rounded text-rose-400">display: none</code> or deleting the canvas element. Watch the <code className="text-emerald-400 font-mono">MutationObserver</code> automatically restore security!
              </div>
            </div>
          </ProtectedWorkspaceWrapper>
        </div>
      </div>
    </div>
  );
}
