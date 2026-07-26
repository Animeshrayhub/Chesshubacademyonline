'use client';

import Image from 'next/image';
import Link from 'next/link';
import LoginForm from './LoginForm';

const TRUST_ITEMS = [
  { icon: '🎓', text: 'FIDE-rated Grandmaster & International Master coaches' },
  { icon: '🖥️', text: 'Live online classes via Zoom, 7 days a week' },
  { icon: '📈', text: 'Structured curriculum from beginner to tournament level' },
  { icon: '🌍', text: 'Students from 20+ countries worldwide' },
];

export default function LoginContent() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL — Branding ─────────────────────────────────────── */}
      <div
        className="
          relative hidden lg:flex lg:w-1/2 xl:w-[55%]
          bg-gradient-to-br from-[#0c1f5e] via-primary-dark to-primary
          flex-col justify-between
          overflow-hidden
        "
        aria-hidden="true"
      >
        {/* Chess pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] bg-chess-pattern"
          aria-hidden="true"
        />

        {/* Gold top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-yellow-300 to-accent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
            aria-label="ChessHub Academy — return to home page"
          >
            <Image
              src="/logo/logo.jpg"
              alt="ChessHub Academy Logo"
              width={120}
              height={48}
              priority
              className="h-12 w-auto bg-white p-0.5 rounded-lg object-contain shadow-sm border border-border/10 transition-transform duration-300 hover:scale-105"
            />
          </Link>

          {/* Main content — centered vertically */}
          <div className="flex-1 flex flex-col justify-center py-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/25 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-accent text-xs font-semibold tracking-wide">Member Portal</span>
              </div>
              <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Welcome back to<br />
                <span className="text-accent">ChessHub Academy</span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                Sign in to access your dashboard, lessons, homework, and live classes.
              </p>
            </div>

            {/* Chess image */}
            <div className="relative w-full max-w-sm mb-10 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&h=380&fit=crop&q=80"
                alt="Students engaged in an online chess coaching session at ChessHub Academy"
                width={600}
                height={380}
                className="w-full h-auto object-cover"
                priority
              />
              {/* Rating badge overlay */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg">
                <span className="text-accent text-lg" aria-hidden="true">♛</span>
                <div>
                  <div className="text-text-primary text-xs font-bold leading-none">500+ Students</div>
                  <div className="text-text-secondary text-xs leading-none mt-0.5">across 20 countries</div>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <ul className="space-y-3" aria-label="Academy highlights">
              {TRUST_ITEMS.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70 text-sm">
                  <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer text */}
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} ChessHub Academy. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Card ───────────────────────────────────── */}
      <main
        className="
          flex-1 flex flex-col items-center justify-center
          min-h-screen lg:min-h-0
          bg-surface-light px-4 py-12 sm:px-8
        "
        id="main-content"
      >
        {/* Mobile logo — only shown below lg */}
        <div className="lg:hidden mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            aria-label="ChessHub Academy — return to home page"
          >
            <Image
              src="/logo/logo.jpg"
              alt="ChessHub Academy Logo"
              width={100}
              height={40}
              priority
              className="h-10 w-auto bg-white p-0.5 rounded-lg object-contain shadow-sm border border-border/10"
            />
          </Link>
          <p className="text-text-secondary text-sm mt-2">Member Portal</p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-border shadow-card px-8 py-10 sm:px-10">

            {/* Card header */}
            <div className="mb-8">
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
                Sign In
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Enter your credentials to access your account. Contact your administrator if you need assistance.
              </p>
            </div>

            {/* The form */}
            <LoginForm />

            {/* Support message */}
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-text-secondary text-sm">
                Having trouble signing in?{' '}
                <Link
                  href="/contact"
                  className="text-primary font-semibold hover:text-primary-dark underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Contact Support
                </Link>
              </p>
              <p className="text-text-secondary/60 text-xs mt-2">
                Accounts are managed by ChessHub Academy administrators.
                <br />
                Self-registration is not available.
              </p>
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-center text-text-secondary/50 text-xs mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms-and-conditions" className="underline hover:text-text-secondary transition-colors">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="underline hover:text-text-secondary transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
