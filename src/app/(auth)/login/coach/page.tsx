import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import LoginForm from '@/features/auth/LoginForm';
import { SITE_URL } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Coach Sign In | ChessHub Academy',
  description: 'Sign in to your ChessHub Academy coach account.',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/login/coach` },
};

export default function CoachLoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Violet/Coach branding */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a0a3e] via-[#250e55] to-[#2e1266] flex-col justify-between overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.04] bg-chess-pattern" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 via-purple-300 to-violet-400" />
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <Link href="/login" className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg">
            <Image src="/logo/logo.jpg" alt="ChessHub Academy" width={48} height={48} className="h-12 w-auto bg-white p-0.5 rounded-lg object-contain shadow" />
            <div>
              <div className="text-white font-bold text-base">ChessHub Academy</div>
              <div className="text-white/40 text-xs">← Back to portal selection</div>
            </div>
          </Link>
          <div className="flex-1 flex flex-col justify-center py-10">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-400/15 border border-violet-400/25 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-violet-400 text-xs font-semibold tracking-wide">Coach Portal</span>
              </span>
              <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Your Classroom<br /><span className="text-violet-400">Awaits.</span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                Manage your classes, assign homework, run live sessions, and track your students' progress.
              </p>
            </div>
            <ul className="space-y-3">
              {['🎯 Live classroom with board editor', '📋 Assign & grade homework', '🏆 Puzzle bank & curriculum library', '📊 Student performance analytics'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/70 text-sm">
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-white/25 text-xs">© {new Date().getFullYear()} ChessHub Academy</p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen lg:min-h-0 bg-slate-900 px-4 py-12 sm:px-8" id="main-content">
        <div className="lg:hidden mb-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-2">
            <span className="text-slate-400 text-sm">🏋️ Coach Portal</span>
          </Link>
        </div>
        <div className="w-full max-w-md">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-700/60 shadow-2xl px-8 py-10 sm:px-10">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-violet-900/50 border border-violet-700/40 flex items-center justify-center text-2xl mb-4">🏋️</div>
              <h2 className="font-heading text-2xl font-bold text-white mb-2">Coach Sign In</h2>
              <p className="text-slate-400 text-sm">Enter your credentials to access your coaching dashboard.</p>
            </div>
            {/* Override form styles for dark background */}
            <div className="[&_label]:text-slate-300 [&_input]:bg-slate-700/50 [&_input]:border-slate-600 [&_input]:text-white [&_input]:placeholder-slate-500 [&_button[type=submit]]:bg-violet-600 [&_button[type=submit]]:hover:bg-violet-700">
              <LoginForm />
            </div>
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-400 text-sm">
                Not a coach?{' '}
                <Link href="/login" className="text-violet-400 font-semibold hover:text-violet-300 underline underline-offset-2 transition-colors">
                  Change role
                </Link>
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Accounts are managed by ChessHub Academy administrators.
              </p>
            </div>
          </div>
          <p className="text-center text-slate-600 text-xs mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms-and-conditions" className="underline hover:text-slate-400">Terms</Link>{' '}and{' '}
            <Link href="/privacy-policy" className="underline hover:text-slate-400">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
