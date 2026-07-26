import { createClient } from './clientWrapper';
import { env } from '../env';

export function createSupabaseClient() {
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

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      fetch: customFetch,
    },
  });
}
