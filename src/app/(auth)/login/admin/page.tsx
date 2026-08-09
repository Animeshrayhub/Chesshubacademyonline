import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import LoginForm from '@/features/auth/LoginForm';
import { SITE_URL } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Admin Sign In | ChessHub Academy',
  description: 'Sign in to your ChessHub Academy admin account.',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/login/admin` },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Red/Admin branding */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a0505] via-[#2a0808] to-[#350a0a] flex-col justify-between overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.04] bg-chess-pattern" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-400 to-red-500" />
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <Link href="/login" className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg">
            <Image src="/logo/logo.jpg" alt="ChessHub Academy" width={48} height={48} className="h-12 w-auto bg-white p-0.5 rounded-lg object-contain shadow" />
            <div>
              <div className="text-white font-bold text-base">ChessHub Academy</div>
              <div className="text-white/40 text-xs">← Back to portal selection</div>
            </div>
          </Link>
          <div className="flex-1 flex flex-col justify-center py-10">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/25 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-xs font-semibold tracking-wide">Admin Portal</span>
              </span>
              <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Platform<br /><span className="text-red-400">Command Center</span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                Full control over users, classes, curriculum, payments, and platform analytics.
              </p>
            </div>

            {/* Security warning */}
            <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/40 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-lg flex-shrink-0">🔐</span>
                <div>
                  <div className="text-red-300 text-sm font-bold mb-1">Restricted Access</div>
                  <div className="text-white/50 text-xs leading-relaxed">
                    This portal is for authorized administrators only. All login attempts are logged and audited for security compliance.
                  </div>
                </div>
              </div>
            </div>

            <ul className="space-y-3">
              {['👤 User management (Students, Coaches)', '📅 Class & schedule management', '💰 Payments & demo bookings', '📊 Platform analytics & reports'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/70 text-sm">
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-white/25 text-xs">© {new Date().getFullYear()} ChessHub Academy — Admin Access</p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen lg:min-h-0 bg-slate-950 px-4 py-12 sm:px-8" id="main-content">
        <div className="lg:hidden mb-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-2">
            <span className="text-slate-500 text-sm">⚙️ Admin Portal</span>
          </Link>
        </div>
        <div className="w-full max-w-md">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-3xl border border-red-900/40 shadow-2xl shadow-red-950/20 px-8 py-10 sm:px-10">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/50 flex items-center justify-center text-2xl mb-4">⚙️</div>
              <h2 className="font-heading text-2xl font-bold text-white mb-2">Admin Sign In</h2>
              <p className="text-slate-400 text-sm">Enter your admin credentials. All sessions are monitored.</p>
            </div>
            <div className="[&_label]:text-slate-300 [&_input]:bg-slate-800/60 [&_input]:border-slate-700 [&_input]:text-white [&_input]:placeholder-slate-600 [&_button[type=submit]]:bg-red-700 [&_button[type=submit]]:hover:bg-red-600">
              <LoginForm />
            </div>
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-slate-500 text-sm">
                Not an admin?{' '}
                <Link href="/login" className="text-red-400 font-semibold hover:text-red-300 underline underline-offset-2 transition-colors">
                  Change role
                </Link>
              </p>
              <p className="text-slate-700 text-xs mt-2">
                🔒 Security monitoring active · All sessions audited
              </p>
            </div>
          </div>
          <p className="text-center text-slate-700 text-xs mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms-and-conditions" className="underline hover:text-slate-500">Terms</Link>{' '}and{' '}
            <Link href="/privacy-policy" className="underline hover:text-slate-500">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
