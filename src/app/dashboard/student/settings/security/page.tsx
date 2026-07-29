import React from 'react';
import ActiveDeviceManager from '@/features/student/ActiveDeviceManager';

export default function StudentSecuritySettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 text-white space-y-2">
        <h3 className="text-base font-bold text-amber-400">Student Security & Password</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your account security is protected with encrypted Supabase auth. Credentials and role-based permissions are managed by the ChessHub Academy administration desk.
        </p>
      </div>

      <ActiveDeviceManager />
    </div>
  );
}
