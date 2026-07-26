-- ==========================================
-- ADD session_notes COLUMN TO classes TABLE
-- Migration: 20260712000001_add_session_notes.sql
-- ==========================================

-- Safely add session_notes column if it doesn't already exist
alter table public.classes
  add column if not exists session_notes text default null;

-- Comment for documentation
comment on column public.classes.session_notes
  is 'Post-session review notes written by the coach after a class ends. Readable by enrolled students.';
