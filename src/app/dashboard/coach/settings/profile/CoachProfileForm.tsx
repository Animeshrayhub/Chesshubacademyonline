'use client';

import React, { useState } from 'react';
import { updateMyCoachProfileAction } from '@/actions/coaches';

interface CoachProfileFormProps {
  bio: string | null;
  languages: string[];
  whatsapp: string | null;
  experienceYears: number | null;
}

export default function CoachProfileForm({
  bio,
  languages,
  whatsapp,
  experienceYears,
}: CoachProfileFormProps) {
  const [bioText, setBioText] = useState(bio ?? '');
  const [languagesText, setLanguagesText] = useState(languages.join(', '));
  const [whatsappText, setWhatsappText] = useState(whatsapp ?? '');
  const [expYears, setExpYears] = useState(
    experienceYears !== null ? String(experienceYears) : ''
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await updateMyCoachProfileAction({
      bio: bioText,
      languages: languagesText.split(',').map((l) => l.trim()).filter(Boolean),
      whatsapp: whatsappText || undefined,
      experienceYears: expYears ? parseInt(expYears, 10) : undefined,
    });

    setLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Your profile has been updated successfully.' });
    } else {
      setMessage({
        type: 'error',
        text: res.error?.message || 'Failed to save changes. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
        <h3 className="text-base font-bold text-text-primary mb-1">Profile Customizations</h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          Update your public-facing biography, teaching specialties, contact details, and language preferences.
        </p>

        {message && (
          <div
            className={`mb-5 p-4 rounded-xl border text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="bio-field" className="block text-sm font-semibold text-text-primary mb-2">
              Trainer Biography
            </label>
            <textarea
              id="bio-field"
              rows={4}
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Describe your coaching background, achievements, and teaching style..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="languages-field"
              className="block text-sm font-semibold text-text-primary mb-2"
            >
              Languages Spoken{' '}
              <span className="text-text-secondary font-normal">(comma-separated)</span>
            </label>
            <input
              id="languages-field"
              type="text"
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
              placeholder="e.g. English, Hindi, Spanish"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="whatsapp-field"
              className="block text-sm font-semibold text-text-primary mb-2"
            >
              WhatsApp / Contact Number
            </label>
            <input
              id="whatsapp-field"
              type="tel"
              value={whatsappText}
              onChange={(e) => setWhatsappText(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="exp-field" className="block text-sm font-semibold text-text-primary mb-2">
              Years of Professional Experience
            </label>
            <input
              id="exp-field"
              type="number"
              min="0"
              max="60"
              value={expYears}
              onChange={(e) => setExpYears(e.target.value)}
              placeholder="e.g. 8"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150 disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
