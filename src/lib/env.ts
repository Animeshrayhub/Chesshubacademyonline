import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal('')),
  NEXT_PUBLIC_MOCK_AUTH: z.string().optional(),
});

const getEnv = () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    NEXT_PUBLIC_MOCK_AUTH: process.env.NEXT_PUBLIC_MOCK_AUTH || 'true',
  };

  // Perform validation
  const parsed = envSchema.safeParse(env);
  
  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
    // In production we should throw, in development we can fallback to placeholders to avoid breaking build steps
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment configuration validation failed.');
    }
  }

  return env;
};

export const env = getEnv();
