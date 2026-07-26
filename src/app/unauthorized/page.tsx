import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getDashboardRoute } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Access Denied | ChessHub Academy',
  description: 'You do not have the required permissions to access this page.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const dashboardRoute = user
    ? await getDashboardRoute(user.role.toLowerCase() as any)
    : '/login';


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1f5e] via-[#09153d] to-[#040a21] px-4 relative overflow-hidden">
      {/* Chess pattern background overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" 
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md z-10">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Card */}
        <main className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative">
          {/* Top Gold Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 via-accent to-accent/40 rounded-t-3xl" />

          {/* Access Denied Icon */}
          <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center mx-auto mb-6">
            <svg 
              className="w-8 h-8 text-accent" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>

          <h1 className="font-heading text-2xl font-bold text-white mb-3">
            Access Denied
          </h1>
          
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            You do not have the required role permissions to view the page at this path. Please contact your administrator if you believe this is an error.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3.5">
            <Link
              href={dashboardRoute}
              className="
                block w-full py-3.5 px-6 rounded-xl font-bold text-sm
                bg-accent hover:bg-yellow-500 text-surface-dark
                shadow-lg shadow-accent/10 hover:shadow-none
                transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
              "
            >
              {user ? 'Return to Dashboard' : 'Back to Login'}
            </Link>

            {user && (
              <form 
                action={async () => {
                  'use server';
                  const { logOut } = await import('@/lib/auth');
                  await logOut();
                  const { redirect } = await import('next/navigation');
                  redirect('/login');
                }}
              >
                <button
                  type="submit"
                  className="
                    w-full py-3.5 px-6 rounded-xl font-bold text-sm
                    bg-white/5 hover:bg-white/10 text-white border border-white/10
                    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20
                  "
                >
                  Sign Out
                </button>
              </form>
            )}
          </div>

          {/* Academy Tagline */}
          <p className="text-white/20 text-xs mt-8 font-medium">
            ChessHub Academy Member Security Portal
          </p>
        </main>
      </div>
    </div>
  );
}
