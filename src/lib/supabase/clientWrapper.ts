import { createClient as originalCreateClient } from '@supabase/supabase-js';
import { getMockSupabaseClient } from './mockClient';
import { env } from '../env';

export function createClient(supabaseUrl: string, supabaseKey: string, options?: any) {
  // Check env validation safely or fall back to false if not loaded yet
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' || env.NEXT_PUBLIC_MOCK_AUTH === 'true';
  
  if (isMock) {
    return getMockSupabaseClient(options);
  }
  
  return originalCreateClient(supabaseUrl, supabaseKey, options);
}
