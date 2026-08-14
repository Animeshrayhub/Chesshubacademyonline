'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import BookDemoForm from '@/features/book-demo/BookDemoForm';

const TRUST_ITEMS = [
  {
    icon: (
      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    text: '100% Free — no credit card required',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
      </svg>
    ),
    text: 'FIDE-rated grandmaster or international master',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    text: 'Small group — maximum 6 students',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    text: 'Personalized level assessment included',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    text: 'Flexible scheduling — 7 days a week',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    text: 'Open to students from any country',
  },
];

const NEXT_STEPS = [
  {
    step: 1,
    title: 'Booking Confirmed',
    description: "You'll receive a confirmation email within 2 hours with your Zoom link.",
  },
  {
    step: 2,
    title: 'Coach Assigned',
    description: "We'll match your child with the most suitable FIDE-rated coach for their level.",
  },
  {
    step: 3,
    title: 'Demo Class',
    description: 'Attend the live 30-minute class via Zoom. No setup required.',
  },
  {
    step: 4,
    title: 'Feedback & Enrollment',
    description: "After the class, we'll share your child's assessment and program recommendation.",
  },
];

function SuccessState({ name }: { name: string }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center mx-auto mb-8">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-green-500" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="font-heading text-3xl font-bold text-text-primary mb-3">
        Demo Booked Successfully! 🎉
      </h2>
      <p className="text-text-secondary text-lg mb-10 max-w-lg mx-auto">
        Thank you, <strong>{name}</strong>! Your free demo class request has been received. Our team will send a confirmation email within 2 hours.
      </p>
      <div className="max-w-xl mx-auto text-left mb-10">
        <h3 className="font-heading font-bold text-text-primary text-xl mb-6 text-center">
          What Happens Next
        </h3>
        <div className="space-y-4">
          {NEXT_STEPS.map((s) => (
            <div key={s.step} className="flex gap-4 p-5 bg-surface-light rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                {s.step}
              </div>
              <div>
                <div className="font-semibold text-text-primary mb-1">{s.title}</div>
                <div className="text-text-secondary text-sm leading-relaxed">{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
        >
          Back to Home
        </Link>
        <Link
          href="/blog"
          className="inline-flex items-center justify-center px-8 py-4 border-2 border-border text-text-secondary hover:border-primary hover:text-primary font-semibold rounded-xl transition-colors"
        >
          Read Chess Tips
        </Link>
      </div>
    </div>
  );
}

export default function BookDemoContent() {
  const [submitted, setSubmitted] = useState(false);
  const [parentName, setParentName] = useState('');

  return (
    <>
      {/* Hero */}
      <section
        className="pt-28 pb-16 bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] text-white chess-bg relative overflow-hidden"
        aria-label="Book demo hero"
      >
        <Container className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-accent text-sm font-semibold">100% Free · No Commitment</span>
          </div>
          <h1 className="font-heading text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight">
            Book Your Free{' '}
            <span className="text-gradient-gold">Demo Class</span>
          </h1>
          <p className="text-white/70 text-xl max-w-2xl mx-auto">
            Experience a real class with a grandmaster coach. Zero cost. Zero commitment.
            See the ChessHub difference for yourself.
          </p>
        </Container>
      </section>

      <section className="section-py bg-surface-light" aria-label="Demo booking form">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
            {/* Form */}
            <div className="bg-white rounded-3xl border border-border shadow-card p-8 lg:p-10">
              {submitted ? (
                <SuccessState name={parentName} />
              ) : (
                <>
                  <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
                    Book Your Free Demo
                  </h2>
                  <p className="text-text-secondary text-sm mb-8">
                    Fill in the form below and we&apos;ll confirm your session within 2 hours.
                  </p>
                  <Suspense fallback={<div className="p-8 text-center text-text-secondary">Loading form...</div>}>
                    <BookDemoForm
                      onSuccess={(name) => {
                        setParentName(name);
                        setSubmitted(true);
                      }}
                    />
                  </Suspense>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-border p-7 shadow-card">
                <h2 className="font-heading font-bold text-text-primary text-lg mb-5">
                  What&apos;s Included in the Demo
                </h2>
                <ul className="space-y-4">
                  {TRUST_ITEMS.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                      {item.icon}
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-primary-dark to-primary rounded-3xl p-7 text-white chess-bg relative overflow-hidden">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-accent/30 mb-4" aria-hidden="true">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill="currentColor" />
                </svg>
                <blockquote>
                  <p className="text-white/80 text-sm leading-relaxed italic mb-5">
                    &ldquo;We tried three other platforms before ChessHub. Nothing compares. The coaches are genuinely qualified and the free demo sold us completely.&rdquo;
                  </p>
                  <footer className="text-xs text-white/50">— Emma T., Parent · Toronto, Canada</footer>
                </blockquote>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '500+', label: 'Students Enrolled' },
                  { value: '5.0★', label: 'Average Rating' },
                  { value: '20+', label: 'Countries' },
                  { value: '98%', label: 'Would Recommend' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-border p-5 text-center shadow-sm">
                    <div className="font-heading font-bold text-2xl text-accent mb-1">{stat.value}</div>
                    <div className="text-text-secondary text-xs">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
