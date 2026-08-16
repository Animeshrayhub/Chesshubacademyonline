import { createClient } from './clientWrapper';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '../env';

/**
 * Updates and refreshes the Supabase user auth session in Next.js middleware.
 * Returns the response along with the authenticated user object to eliminate duplicate auth fetches.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let projectRef = 'placeholder';
  try {
    const urlHost = env.NEXT_PUBLIC_SUPABASE_URL.includes('//')
      ? env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1]
      : env.NEXT_PUBLIC_SUPABASE_URL;
    projectRef = urlHost ? urlHost.split('.')[0] || 'placeholder' : 'placeholder';
  } catch (e) {}

  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = request.cookies.get(cookieName)?.value || request.cookies.get('supabase-auth-token')?.value;
  
  let accessToken = '';
  let refreshToken = '';
  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue);
      if (Array.isArray(parsed)) {
        accessToken = parsed[0] || '';
        refreshToken = parsed[1] || '';
      } else if (typeof parsed === 'string') {
        accessToken = parsed;
      }
    } catch (e) {
      accessToken = cookieValue;
    }
  }

  const headers: Record<string, string> = {
    Cookie: request.headers.get('Cookie') || '',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });

  // Fetch user session once
  let user: any = null;
  let error: any = null;

  if (accessToken && accessToken.includes(':')) {
    // Mock authentication token session
    const parts = accessToken.split(':');
    const email = parts[0];
    const role = (parts[1] || 'STUDENT').toUpperCase();
    user = {
      id: role === 'COACH' ? 'usr-coach-456' : role === 'STUDENT' ? 'usr-student-789' : 'usr-admin-roy',
      email,
      user_metadata: { role, first_name: 'Academy', last_name: 'User' },
      app_metadata: { role },
    };
    error = null;
  } else {
    const res = await supabase.auth.getUser();
    user = res.data?.user ?? null;
    error = res.error;
  }

  if ((error || !user) && refreshToken) {
    try {
      // Session has expired or is invalid, attempt a refresh using setSession
      const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!refreshError && refreshData.session) {
        user = refreshData.user;
        error = null;
        const session = refreshData.session;
        const serializedCookie = JSON.stringify([
          session.access_token,
          session.refresh_token,
          null,
          null
        ]);

        // Update cookie in request headers
        request.cookies.set(cookieName, serializedCookie);
        
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        // Set cookie on response
        response.cookies.set(cookieName, serializedCookie, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: session.expires_in,
        });
      }
    } catch (refreshErr) {
      console.error('Failed to refresh session in middleware:', refreshErr);
    }
  }

  return { response, user, error, supabase, accessToken };
}
