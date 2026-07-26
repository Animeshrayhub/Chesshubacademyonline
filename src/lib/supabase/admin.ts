import { createClient } from './clientWrapper';
import { env } from '../env';

export function createSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseAdmin must only be executed in a server environment.');
  }

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key';
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.');
  }

  const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    const isStorage = urlString.includes('/storage/v1');
    const timeoutMs = isStorage ? 120000 : 30000;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
      ...options,
      signal: options?.signal || controller.signal,
    }).finally(() => clearTimeout(id));
  };

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: customFetch,
    },
  });
}
