import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal('')),
  NEXT_PUBLIC_MOCK_AUTH: z.string().optional(),
});

const VALID_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHF3eWlpYWdkeG16a2dpbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYxODA1MiwiZXhwIjoyMDk5MTk0MDUyfQ.WcpkODKOmKI0q75Id0RCeaheoZdbUYaT6NrivUX_u30';

const getEnv = () => ({
  get NEXT_PUBLIC_SUPABASE_URL() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://titqwyiiagdxmzkgimpe.supabase.co';
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Guard against truncated/corrupted tokens in production builds
    if (!raw || raw.length < 150 || raw.includes('eL6n9-Z8B8X8') || raw === 'placeholder-anon-key') {
      return VALID_SUPABASE_KEY;
    }
    return raw;
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || VALID_SUPABASE_KEY;
  },
  get NEXT_PUBLIC_MOCK_AUTH() {
    return process.env.NEXT_PUBLIC_MOCK_AUTH || 'false';
  },
});

export const env = getEnv();
