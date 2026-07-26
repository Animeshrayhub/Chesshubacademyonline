import { createClient } from '@/lib/supabase/clientWrapper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Standard client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
