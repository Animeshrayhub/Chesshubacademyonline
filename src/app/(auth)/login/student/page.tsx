import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import LoginForm from '@/features/auth/LoginForm';
import { SITE_URL } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Student Sign In | ChessHub Academy',
  description: 'Sign in to your ChessHub Academy student account.',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/login/student` },
};

export default function StudentLoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Emerald/Student branding */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#042e22] via-[#064030] to-[#0a5a42] flex-col justify-between overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.04] bg-chess-pattern" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400" />
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <Link href="/login" className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg">
            <Image src="/logo/logo.jpg" alt="ChessHub Academy" width={48} height={48} className="h-12 w-auto bg-white p-0.5 rounded-lg object-contain shadow" />
            <div>
              <div className="text-white font-bold text-base">ChessHub Academy</div>
              <div className="text-white/40 text-xs">← Back to portal selection</div>
            </div>
          </Link>
          <div className="flex-1 flex flex-col justify-center py-10">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/25 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Student Portal</span>
              </span>
              <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Ready to<br /><span className="text-emerald-400">Master Chess?</span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                Access your live classes, homework, daily puzzles, and track your rating progress.
              </p>
            </div>
            <ul className="space-y-3">
              {['🎯 Daily tactical puzzles & streak challenges', '📚 Homework & curriculum access', '🎥 Live classroom sessions', '📊 Rating & progress tracker'].map((item) => (
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
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen lg:min-h-0 bg-surface-light px-4 py-12 sm:px-8" id="main-content">
        <div className="lg:hidden mb-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-2">
            <span className="text-text-secondary text-sm">🎓 Student Portal</span>
          </Link>
        </div>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-border shadow-card px-8 py-10 sm:px-10">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl mb-4">🎓</div>
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">Student Sign In</h2>
              <p className="text-text-secondary text-sm">Enter your credentials to access your student dashboard.</p>
            </div>
            <LoginForm />
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-text-secondary text-sm">
                Not a student?{' '}
                <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 underline underline-offset-2 transition-colors">
                  Change role
                </Link>
              </p>
              <p className="text-text-secondary/60 text-xs mt-2">
                Accounts are managed by ChessHub Academy administrators.
              </p>
            </div>
          </div>
          <p className="text-center text-text-secondary/50 text-xs mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms-and-conditions" className="underline hover:text-text-secondary">Terms</Link>{' '}and{' '}
            <Link href="/privacy-policy" className="underline hover:text-text-secondary">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
