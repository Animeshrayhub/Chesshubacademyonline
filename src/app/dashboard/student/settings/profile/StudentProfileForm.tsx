'use client';

import { useState } from 'react';
import { updateMyStudentProfileAction } from '@/actions/students';

interface StudentProfileFormProps {
  initialData: {
    avatarUrl: string;
    timezone: string;
    parentWhatsapp: string;
  };
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST - India)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export default function StudentProfileForm({ initialData }: StudentProfileFormProps) {
  const [photoUrl, setPhotoUrl] = useState(initialData.avatarUrl || '');
  const [timezone, setTimezone] = useState(initialData.timezone || 'UTC');
  const [phone, setPhone] = useState(initialData.parentWhatsapp || '');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await updateMyStudentProfileAction({
        photoUrl: photoUrl || null,
        timezone,
        phone,
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Your profile has been updated successfully.' });
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to update profile.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Photo URL */}
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Profile Photo URL</label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://example.com/your-photo.jpg"
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-2xs text-text-secondary mt-1.5 leading-relaxed">
            Provide a direct image URL for your profile picture.
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">My Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-2xs text-text-secondary mt-1.5 leading-relaxed">
            Selecting your correct timezone ensures your class schedules match your local time.
          </p>
        </div>

        {/* Phone / Whatsapp */}
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Phone / WhatsApp Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 99999 88888"
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-2xs text-text-secondary mt-1.5 leading-relaxed">
            Used by your coach for emergency contacts and class announcements.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all duration-155 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving Changes...
            </>
          ) : (
            'Save Profile Preferences'
          )}
        </button>
      </div>
    </form>
  );
}
