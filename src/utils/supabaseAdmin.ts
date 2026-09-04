import { createClient } from '@/lib/supabase/clientWrapper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

// Admin client to bypass Row Level Security. Only run on server.
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must only be executed in a server environment.');
  }
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey || supabaseServiceKey.length < 20) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing or invalid in server environment.');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
