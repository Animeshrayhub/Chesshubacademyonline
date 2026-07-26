-- Migration: 20260715000000_add_buddy_class_type.sql
-- Drop old check constraints and add new ones to allow 'BUDDY' class type

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_class_type_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_class_type_check CHECK (class_type IN ('PRIVATE', 'BUDDY', 'GROUP'));

ALTER TABLE public.weekly_schedules DROP CONSTRAINT IF EXISTS weekly_schedules_class_type_check;
ALTER TABLE public.weekly_schedules ADD CONSTRAINT weekly_schedules_class_type_check CHECK (class_type IN ('PRIVATE', 'BUDDY', 'GROUP'));

-- Add column first_joined_at to track when a student first joins a class
ALTER TABLE public.class_students ADD COLUMN IF NOT EXISTS first_joined_at timestamp with time zone;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
