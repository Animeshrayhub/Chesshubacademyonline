-- MIGRATION: Ensure session_notes and recording_url columns exist on public.classes table

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS session_notes text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS recording_url text;

COMMENT ON COLUMN public.classes.session_notes IS 'Coach observations, student attendance notes, and lesson summary.';
COMMENT ON COLUMN public.classes.recording_url IS 'Optional Google Drive or cloud storage URL for the recorded live session.';
