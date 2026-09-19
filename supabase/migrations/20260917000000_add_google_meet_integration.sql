-- Migration: Add Google Meet Integration tables & columns
-- 1. Create coach_google_tokens table for secure encrypted token storage
CREATE TABLE IF NOT EXISTS public.coach_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  google_account_email TEXT,
  encrypted_refresh_token TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_coach_google_token UNIQUE (coach_id)
);

-- Index for coach lookup
CREATE INDEX IF NOT EXISTS idx_coach_google_tokens_coach_id ON public.coach_google_tokens(coach_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.coach_google_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Add Google Meet and meeting_provider columns to public.classes table
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS meeting_provider VARCHAR(20) DEFAULT 'ZOOM',
  ADD COLUMN IF NOT EXISTS google_meet_space_id TEXT,
  ADD COLUMN IF NOT EXISTS google_meet_uri TEXT;

-- Enforce check constraint for meeting_provider if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_meeting_provider_check'
  ) THEN
    ALTER TABLE public.classes 
      ADD CONSTRAINT classes_meeting_provider_check 
      CHECK (meeting_provider IN ('ZOOM', 'GOOGLE_MEET'));
  END IF;
END $$;

COMMENT ON COLUMN public.classes.meeting_provider IS 'Live video platform provider: ZOOM or GOOGLE_MEET.';
COMMENT ON COLUMN public.classes.google_meet_space_id IS 'Unique Google Meet space identifier (spaces/xyz-abc-def).';
COMMENT ON COLUMN public.classes.google_meet_uri IS 'Google Meet direct meeting link for attendees and host.';
