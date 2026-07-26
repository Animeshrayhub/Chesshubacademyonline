import { createClient } from './clientWrapper';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '../env';

/**
 * Updates and refreshes the Supabase user auth session in Next.js middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = request.cookies.get(cookieName)?.value;
  
  let accessToken = '';
  let refreshToken = '';
  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue);
      if (Array.isArray(parsed)) {
        accessToken = parsed[0] || '';
        refreshToken = parsed[1] || '';
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

  // Attempt to fetch user. If it fails, try to refresh using setSession.
  const { data: { user }, error } = await supabase.auth.getUser();

  if ((error || !user) && refreshToken) {
    try {
      // Session has expired or is invalid, attempt a refresh using setSession
      const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!refreshError && refreshData.session) {
        const session = refreshData.session;
        const serializedCookie = JSON.stringify([
          session.access_token,
          session.refresh_token,
          null,
          null
        ]);

        // Update cookie in the request headers so downstream handlers see it
        request.cookies.set(cookieName, serializedCookie);
        
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        // Set the cookie on the response so the browser stores it
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

  return response;
}
