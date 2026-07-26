import { createClient } from './clientWrapper';
import { cookies } from 'next/headers';
import { env } from '../env';

export function createSupabaseServer() {
  const cookieStore = cookies();
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].split('//')[1];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = cookieStore.get(cookieName)?.value;
  
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
