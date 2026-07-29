import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { createClient } from './lib/supabase/clientWrapper';
import { env } from './lib/env';

export async function middleware(request: NextRequest) {
  // First update/refresh the session
  const response = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith('/dashboard');
  const isClassroom = pathname.startsWith('/classroom');

  if (isDashboard || isClassroom) {
    const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
    const cookieName = `sb-${projectRef}-auth-token`;
    const cookieValue = request.cookies.get(cookieName)?.value;
    
    let accessToken = '';
    if (cookieValue) {
      try {
        const parsed = JSON.parse(cookieValue);
        if (Array.isArray(parsed) && parsed[0]) {
          accessToken = parsed[0];
        }
      } catch (e) {}
    }

    const headers: Record<string, string> = {
      Cookie: request.headers.get('Cookie') || '',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers,
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

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

    // 1. Check if Maintenance Mode is active
    const { data: maintConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'MAINTENANCE_MODE')
      .maybeSingle();

    const isMaintenanceActive = maintConfig?.value === 'true';

    // Redirect to login if unauthenticated
    if (error || !user) {
      if (isMaintenanceActive && pathname !== '/maintenance' && pathname !== '/login') {
        return redirectWithCookies(new URL('/maintenance', request.url));
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return redirectWithCookies(loginUrl);
    }

    // Verify user role matches route prefix (ADMIN, COACH, STUDENT)
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_active) {
      // Redirect to login if user profile is inactive or missing
      const loginUrl = new URL('/login', request.url);
      return redirectWithCookies(loginUrl);
    }

    const role = profile.role; // 'ADMIN' | 'COACH' | 'STUDENT'
    console.log(`[Middleware] Path: ${pathname}, User: ${user?.email}, Role: ${role}, Active: ${profile.is_active}`);

    // If Maintenance Mode is active and user is NOT an Admin, redirect to /maintenance notice
    if (isMaintenanceActive && role !== 'ADMIN' && pathname !== '/maintenance') {
      console.log(`[Middleware] Redirecting ${role} to /maintenance because Maintenance Mode is ON.`);
      return redirectWithCookies(new URL('/maintenance', request.url));
    }
    
    // Redirect /dashboard root to role-specific dashboard path
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return redirectWithCookies(new URL(`/dashboard/${role.toLowerCase()}`, request.url));
    }

    // Redirect if they try to access a dashboard path of another role (ADMIN bypasses all checks)
    if (role !== 'ADMIN') {
      if (pathname.startsWith('/dashboard/admin') && role !== 'ADMIN') {
        console.log(`[Middleware] Redirect to /unauthorized: Admin path accessed by ${role}`);
        return redirectWithCookies(new URL('/unauthorized', request.url));
      }
      if (pathname.startsWith('/dashboard/coach') && role !== 'COACH') {
        console.log(`[Middleware] Redirect to /unauthorized: Coach path accessed by ${role}`);
        return redirectWithCookies(new URL('/unauthorized', request.url));
      }
      if (pathname.startsWith('/dashboard/student') && role !== 'STUDENT') {
        console.log(`[Middleware] Redirect to /unauthorized: Student path accessed by ${role}`);
        return redirectWithCookies(new URL('/unauthorized', request.url));
      }
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
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; frame-src 'self' https://meet.ffmuc.net https://meet.jit.si https://drive.google.com https://zoom.us; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; connect-src 'self' https:;"
  );

  return response;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/classroom', '/classroom/:path*'],
};
