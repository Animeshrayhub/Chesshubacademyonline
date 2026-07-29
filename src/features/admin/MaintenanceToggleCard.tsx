'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { getMaintenanceModeAction, setMaintenanceModeAction } from '@/actions/system';

export default function MaintenanceToggleCard() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getMaintenanceModeAction().then((res) => {
      if (res.success) {
        setIsEnabled(res.enabled);
      }
      setLoading(false);
    });
  }, []);

  const handleToggle = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    setMessage(null);

    startTransition(async () => {
      const res = await setMaintenanceModeAction(nextState);
      if (res.success) {
        setMessage(
          nextState
            ? '🔴 Maintenance Mode is now ACTIVE. Non-admin users are redirected to maintenance screen.'
            : '🟢 Maintenance Mode is OFF. Normal user operations restored.'
        );
      } else {
        setIsEnabled(!nextState); // Rollback
        alert(res.error || 'Failed to update Maintenance Mode');
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">System Maintenance Utility</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Control platform availability during scheduled server maintenance and system upgrades.
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            isEnabled
              ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
        >
          {loading ? '⏳ Checking...' : isEnabled ? '🔴 Maintenance Active' : '🟢 Operational'}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 border border-border/80 rounded-xl bg-surface/30 hover:bg-surface/50 transition-colors">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <span>🛡️ Global Maintenance Mode</span>
          </h4>
          <p className="text-xs text-text-secondary leading-relaxed max-w-md">
            When enabled, non-admin users (students, coaches, visitors) attempting to access student/coach portals or classrooms will be redirected to the dedicated maintenance notice page.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer select-none self-center">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggle}
            disabled={loading || isPending}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
        </label>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            isEnabled ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 space-y-2">
        <p className="font-bold text-slate-800 flex items-center gap-1.5">
          <span>ℹ️ How Maintenance Mode works:</span>
        </p>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
          <li><strong>Admins (`role === &apos;ADMIN&apos;`)</strong> retain full system access to manage settings and deploy updates.</li>
          <li><strong>Students & Coaches</strong> are gracefully redirected to the `/maintenance` screen with live status updates.</li>
          <li><strong>Database Integrity</strong>: Unsaved form submissions & live video classes are paused to prevent corrupted data.</li>
        </ul>
      </div>
    </div>
  );
}
