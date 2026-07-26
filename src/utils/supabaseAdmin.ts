import { createClient } from '@/lib/supabase/clientWrapper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Admin client to bypass Row Level Security. Only run on server.
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must only be executed in a server environment.');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
