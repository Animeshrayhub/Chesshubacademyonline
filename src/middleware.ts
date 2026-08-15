import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // First update/refresh the session and re-use user object (eliminates duplicate auth fetch)
  const { response, user, error, supabase } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith('/dashboard');
  const isClassroom = pathname.startsWith('/classroom');

  if (isDashboard || isClassroom) {
    // Helper to preserve response cookies on redirect
    const redirectWithCookies = (url: URL) => {
      const redirectResponse = NextResponse.redirect(url);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          redirectResponse.headers.append(key, value);
        }
      });
      return redirectResponse;
    };

    // Fast exit if unauthenticated
    if (error || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return redirectWithCookies(loginUrl);
    }

    // Run Maintenance Check and Profile Fetch IN PARALLEL (50% reduction in latency!)
    const [maintRes, profileRes] = await Promise.all([
      supabase
        .from('system_config')
        .select('value')
        .eq('key', 'MAINTENANCE_MODE')
        .maybeSingle(),
      supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single(),
    ]);

    const isMaintenanceActive = maintRes.data?.value === 'true';
    const profile = profileRes.data;

    const userEmail = (user.email || '').toLowerCase();
    const userMetaRole = (user.user_metadata?.role || '').toString().toUpperCase();
    const profileName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.toLowerCase();

    let role = (profile?.role || user.user_metadata?.role || 'STUDENT').toString().toUpperCase(); // 'ADMIN' | 'COACH' | 'STUDENT'

    // If Maintenance Mode is active and user is NOT an Admin, redirect to /maintenance
    if (isMaintenanceActive && role !== 'ADMIN' && pathname !== '/maintenance') {
      return redirectWithCookies(new URL('/maintenance', request.url));
    }
    
    // Redirect /dashboard root to role-specific dashboard path
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return redirectWithCookies(new URL(`/dashboard/${role.toLowerCase()}`, request.url));
    }

    // Strict Role-Based Route Protection
    if (role === 'COACH' && pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/coach')) {
      return redirectWithCookies(new URL('/unauthorized', request.url));
    }

    if (role === 'STUDENT' && pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/student')) {
      return redirectWithCookies(new URL('/unauthorized', request.url));
    }
  }

  // Attach security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; frame-src 'self' https://meet.jit.si https://8x8.vc https://jitsi.riot.im https://meet.element.io https://meet.ffmuc.net https://drive.google.com https://zoom.us; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; connect-src 'self' https:;"
  );

  return response;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/classroom', '/classroom/:path*'],
};
