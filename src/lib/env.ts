import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal('')),
  NEXT_PUBLIC_MOCK_AUTH: z.string().optional(),
});

const getEnv = () => ({
  get NEXT_PUBLIC_SUPABASE_URL() {
    const val = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!val || !val.startsWith('http')) {
      throw new Error('Supabase configuration is missing or invalid.');
    }
    return val;
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    const val = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!val || val.length < 20) {
      throw new Error('Supabase configuration is missing or invalid.');
    }
    return val;
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    if (typeof window !== 'undefined') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY must NEVER be accessed in client code.');
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  },
  get NEXT_PUBLIC_MOCK_AUTH() {
    return process.env.NEXT_PUBLIC_MOCK_AUTH || 'false';
  },
});

export const env = getEnv();

