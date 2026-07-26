import { createClient } from '@/lib/supabase/clientWrapper';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export function createServerClient() {
  const cookieStore = cookies();
  const headers: Record<string, string> = {
    Cookie: cookieStore.toString(),
  };

  try {
    const projectRef = supabaseUrl.split('.')[0].split('//')[1];
    const cookieName = `sb-${projectRef}-auth-token`;
    const cookieVal = cookieStore.get(cookieName)?.value;
    if (cookieVal) {
      const parsed = JSON.parse(cookieVal);
      if (Array.isArray(parsed) && parsed[0]) {
        headers['Authorization'] = `Bearer ${parsed[0]}`;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Server side should not persist session globally
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });
}
