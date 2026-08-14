import { createClient } from './clientWrapper';
import { cookies } from 'next/headers';
import { env } from '../env';

export function createSupabaseServer() {
  const cookieStore = cookies();
  let projectRef = 'placeholder';
  try {
    const urlHost = env.NEXT_PUBLIC_SUPABASE_URL.includes('//')
      ? env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1]
      : env.NEXT_PUBLIC_SUPABASE_URL;
    projectRef = urlHost ? urlHost.split('.')[0] || 'placeholder' : 'placeholder';
  } catch (e) {}
  
  let accessToken = '';
  const allCookies = cookieStore.getAll();

  // Find all Supabase auth cookie chunks (e.g. sb-titqwyiiagdxmzkgimpe-auth-token, sb-*-auth-token.0)
  const authCookieChunks = allCookies
    .filter(c => c.name.includes('auth-token') || c.name.includes('supabase'))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (authCookieChunks.length > 0) {
    const rawVal = authCookieChunks.map(c => c.value).join('');
    try {
      const parsed = JSON.parse(rawVal);
      if (Array.isArray(parsed) && parsed[0]) {
        accessToken = typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.access_token || '';
      } else if (parsed && typeof parsed === 'object' && parsed.access_token) {
        accessToken = parsed.access_token;
      }
    } catch (e) {
      if (rawVal.length > 20) {
        accessToken = rawVal;
      }
    }
  }

  // Also check standard Supabase cookie names
  if (!accessToken) {
    const mainCookie = cookieStore.get(`sb-${projectRef}-auth-token`) || cookieStore.get('supabase-auth-token');
    if (mainCookie?.value) {
      try {
        const parsed = JSON.parse(mainCookie.value);
        if (Array.isArray(parsed) && parsed[0]) {
          accessToken = typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.access_token || '';
        } else if (parsed && typeof parsed === 'object' && parsed.access_token) {
          accessToken = parsed.access_token;
        }
      } catch (e) {}
    }
  }

  const headers: Record<string, string> = {
    Cookie: cookieStore.toString(),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });
}
