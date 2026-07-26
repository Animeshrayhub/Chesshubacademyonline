'use client';

import { useState } from 'react';

interface NewsletterFormProps {
  dark?: boolean;
}

export default function NewsletterForm({ dark = false }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 text-sm font-semibold ${dark ? 'text-accent' : 'text-primary'}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
          <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        You&apos;re subscribed! Thank you.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
      aria-label="Newsletter subscription form"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={dark ? 'Your email address' : 'Your email'}
        aria-label="Email address for newsletter"
        required
        className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg border text-sm placeholder:text-opacity-40 focus:outline-none focus:ring-1 transition-colors ${
          dark
            ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-accent focus:ring-accent'
            : 'bg-surface-light border-border text-text-primary placeholder:text-text-secondary/60 focus:border-primary focus:ring-primary'
        }`}
      />
      <button
        type="submit"
        disabled={loading}
        className={`px-4 py-2.5 font-semibold rounded-lg transition-colors shrink-0 text-sm disabled:opacity-60 ${
          dark
            ? 'bg-accent hover:bg-accent-hover text-surface-dark'
            : 'bg-primary hover:bg-primary-dark text-white'
        }`}
        aria-label="Subscribe to newsletter"
      >
        {loading ? '...' : 'Join'}
      </button>
    </form>
  );
}
