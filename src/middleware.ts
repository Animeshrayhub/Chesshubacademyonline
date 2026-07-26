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

    // Redirect to login if unauthenticated
    if (error || !user) {
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

  return response;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/classroom', '/classroom/:path*'],
};
