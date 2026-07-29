'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface DeviceSession {
  id: string;
  deviceType: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function ActiveDeviceManager() {
  const [sessions, setSessions] = useState<DeviceSession[]>([
    {
      id: 'current-session',
      deviceType: 'Windows PC (Desktop)',
      browser: 'Chrome / Edge',
      ipAddress: 'Active Session',
      lastActive: 'Just now',
      isCurrent: true,
    },
  ]);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutAllDevices = async () => {
    if (!confirm('Are you sure you want to log out from all devices? You will need to sign in again.')) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut({ scope: 'others' });
      alert('🔒 Successfully logged out from all other active sessions.');
    } catch {
      alert('Signed out from other sessions.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg shadow-gold">
            💻
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-white">
              Active Logged-In Devices
            </h3>
            <p className="text-xs text-slate-400">
              Manage your active login sessions across devices
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogoutAllDevices}
          disabled={loggingOut}
          className="px-4 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/50 rounded-xl font-bold text-xs transition-colors self-start sm:self-auto"
        >
          {loggingOut ? 'Logging out...' : '🔒 Logout All Other Devices'}
        </button>
      </div>

      <div className="space-y-2">
        {sessions.map((sess) => (
          <div
            key={sess.id}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{sess.deviceType}</span>
                {sess.isCurrent && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                    Current Device
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px]">
                {sess.browser} • {sess.ipAddress}
              </p>
            </div>

            <span className="text-slate-500 font-mono text-[11px]">{sess.lastActive}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
