import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SITE_URL } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Sign In | ChessHub Academy',
  description: 'Sign in to ChessHub Academy — select your role to continue.',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/login` },
};

const ROLES = [
  {
    href: '/login/student',
    emoji: '🎓',
    title: 'Student',
    subtitle: 'Access lessons, homework & live classes',
    accent: 'from-emerald-600 to-teal-700',
    border: 'border-emerald-500/30',
    hover: 'hover:border-emerald-400/60 hover:shadow-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    href: '/login/coach',
    emoji: '🏋️',
    title: 'Coach',
    subtitle: 'Manage classes, assign homework & teach',
    accent: 'from-violet-600 to-purple-700',
    border: 'border-violet-500/30',
    hover: 'hover:border-violet-400/60 hover:shadow-violet-500/20',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  {
    href: '/login/admin',
    emoji: '⚙️',
    title: 'Admin',
    subtitle: 'Full platform management & analytics',
    accent: 'from-red-600 to-rose-700',
    border: 'border-red-500/30',
    hover: 'hover:border-red-400/60 hover:shadow-red-500/20',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
];

export default function LoginRolePickerPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#07071a] via-[#0d0d28] to-[#0a0a20] px-4 py-12">
      {/* Background chess pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-chess-pattern pointer-events-none" aria-hidden="true" />

      {/* Logo */}
      <Link href="/" className="mb-10 flex items-center gap-3 group" aria-label="ChessHub Academy home">
        <Image
          src="/logo/logo.jpg"
          alt="ChessHub Academy"
          width={56}
          height={56}
          className="rounded-xl border border-white/10 bg-white p-0.5 object-contain shadow-lg"
        />
        <div>
          <div className="text-white font-bold text-xl leading-tight font-heading">ChessHub Academy</div>
          <div className="text-white/40 text-xs">Member Portal</div>
        </div>
      </Link>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mb-2">
          Welcome Back
        </h1>
        <p className="text-white/50 text-base">Select your role to sign in</p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {ROLES.map((role) => (
          <Link
            key={role.href}
            href={role.href}
            className={`
              group relative flex flex-col items-center gap-4 p-8 rounded-2xl
              bg-white/5 backdrop-blur-md border ${role.border} ${role.hover}
              transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1
              cursor-pointer no-underline
            `}
          >
            {/* Role badge */}
            <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${role.badge}`}>
              {role.title}
            </span>

            {/* Emoji */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${role.accent} flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {role.emoji}
            </div>

            {/* Text */}
            <div className="text-center">
              <div className="text-white font-bold text-lg mb-1">{role.title} Portal</div>
              <div className="text-white/50 text-xs leading-relaxed">{role.subtitle}</div>
            </div>

            {/* Arrow */}
            <div className="mt-auto text-white/30 group-hover:text-white/70 transition-colors text-lg">→</div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-10 text-white/25 text-xs text-center max-w-sm">
        Accounts are managed by ChessHub Academy administrators.{' '}
        <Link href="/contact" className="underline hover:text-white/50 transition-colors">
          Contact support
        </Link>{' '}
        if you need help.
      </p>
    </div>
  );
}
