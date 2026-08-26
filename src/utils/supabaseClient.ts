import { createClient } from '@/lib/supabase/clientWrapper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

function getAuthHeader(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, rawValue] = cookie.trim().split('=');
      if (!rawValue) continue;
      if (name.includes('auth-token') || name.includes('access-token')) {
        const value = decodeURIComponent(rawValue);
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed[0]) {
            return { Authorization: `Bearer ${parsed[0]}` };
          }
          if (parsed.access_token) {
            return { Authorization: `Bearer ${parsed.access_token}` };
          }
          if (typeof parsed === 'string' && parsed.length > 20) {
            return { Authorization: `Bearer ${parsed}` };
          }
        } catch {
          if (value.length > 20) {
            return { Authorization: `Bearer ${value}` };
          }
        }
      }
    }
  } catch {}
  return {};
}

// Custom fetch wrapper that injects live authorization headers from cookies on every HTTP request
const dynamicAuthFetch = (url: RequestInfo | URL, options?: RequestInit) => {
  const authHeaders = getAuthHeader();
  const mergedHeaders = {
    ...(options?.headers || {}),
    ...authHeaders,
  };
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
};

// Standard client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: dynamicAuthFetch,
  },
});

