-- ==================================================
-- MIGRATION: 20260817100000_add_recording_url_to_classes.sql
-- Add recording_url column to public.classes table
-- ==================================================

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS recording_url TEXT;

COMMENT ON COLUMN public.classes.recording_url IS 'Optional Google Drive or cloud storage URL for the recorded live session.';
