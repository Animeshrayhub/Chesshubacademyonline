'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = () => {
    setChecking(true);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Animated Icon Header */}
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-gold animate-bounce">
          <span className="text-4xl">🛠️</span>
        </div>

        <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 uppercase tracking-widest inline-block mb-3">
          Scheduled Maintenance
        </span>

        <h1 className="text-2xl font-extrabold font-heading text-white mb-3">
          We&apos;ll Be Back Soon!
        </h1>

        <p className="text-xs text-slate-400 leading-relaxed mb-8">
          ChessHub Academy is currently undergoing scheduled platform updates to optimize live classrooms and improve overall service performance.
        </p>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mb-8 text-left space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>System Status</span>
            </span>
            <span className="text-amber-400 font-mono text-[11px]">UPGRADING</span>
          </div>
          <p className="text-[11px] text-slate-500">
            No action is required from you. All student data, attendance, and class records remain 100% safe.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-3 px-5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-gold transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            {checking ? '🔄 Checking Server Status...' : '🔄 Refresh & Try Again'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>ChessHub Academy © 2026</span>
          <Link
            href="/login"
            className="text-amber-400 hover:text-amber-300 font-semibold transition-colors underline underline-offset-2"
          >
            Admin Portal Access →
          </Link>
        </div>
      </div>
    </div>
  );
}
