'use client';

import React, { useState } from 'react';
import { updateMyStudentProfileAction } from '@/actions/students';

interface StudentGeneralSettingsFormProps {
  initialData: {
    displayName: string;
    email: string;
    timezone: string;
    level: string;
  };
}

const TIMEZONES = [
  { value: 'UTC+5:30 (India Standard Time)', label: 'UTC+5:30 (India Standard Time)' },
  { value: 'UTC-5 (Eastern Standard Time)', label: 'UTC-5 (Eastern Standard Time)' },
  { value: 'UTC-8 (Pacific Standard Time)', label: 'UTC-8 (Pacific Standard Time)' },
  { value: 'UTC+0 (Greenwich Mean Time)', label: 'UTC+0 (Greenwich Mean Time)' },
  { value: 'UTC+1 (Central European Time)', label: 'UTC+1 (Central European Time)' },
  { value: 'UTC+8 (Singapore/China Time)', label: 'UTC+8 (Singapore/China Standard Time)' },
  { value: 'UTC+10 (Australian Eastern Time)', label: 'UTC+10 (Australian Eastern Time)' },
];

export default function StudentGeneralSettingsForm({ initialData }: StudentGeneralSettingsFormProps) {
  const [timezone, setTimezone] = useState(initialData.timezone || 'UTC+5:30 (India Standard Time)');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await updateMyStudentProfileAction({ timezone });
      if (res.success) {
        setSuccessMsg('🎉 General profile & timezone preferences saved successfully!');
      } else {
        setErrorMsg(res.error?.message || 'Failed to save settings.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
          Display Name
        </label>
        <input
          type="text"
          value={initialData.displayName}
          disabled
          className="w-full px-4 py-3 rounded-xl border border-border bg-slate-100 text-text-primary font-semibold text-sm cursor-not-allowed opacity-90"
        />
        <p className="text-[11px] text-text-secondary mt-1">
          To update your official registered name, please contact your academy coach or admin.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
          Academic Email Address
        </label>
        <input
          type="email"
          value={initialData.email}
          disabled
          className="w-full px-4 py-3 rounded-xl border border-border bg-slate-100 text-text-primary font-semibold text-sm cursor-not-allowed opacity-90"
        />
        <p className="text-[11px] text-text-secondary mt-1">
          Your official login email linked to your ChessHub Academy student account.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
          Academy Level
        </label>
        <input
          type="text"
          value={initialData.level.toUpperCase()}
          disabled
          className="w-full px-4 py-3 rounded-xl border border-border bg-slate-100 text-text-primary font-bold text-sm uppercase cursor-not-allowed opacity-90"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
          Local Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-text-secondary mt-1">
          Ensures your live class schedules and tournament times are displayed accurately.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving Changes...' : 'Save General Changes'}
        </button>
      </div>
    </form>
  );
}
