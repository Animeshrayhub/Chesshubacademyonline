-- ============================================================================
-- MIGRATION: 20260918000000_enforce_shared_class_lifecycle.sql
-- Description: Enforce single authoritative class lifecycle, isolated video 
--              provider constraints, and fast lookup indexes for ChessHub Academy.
-- ============================================================================

-- 1. Ensure meeting_provider column exists with strict isolation constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'meeting_provider'
  ) THEN
    ALTER TABLE public.classes ADD COLUMN meeting_provider VARCHAR(20) DEFAULT 'ZOOM';
  END IF;
END $$;

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_meeting_provider_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_meeting_provider_check 
  CHECK (meeting_provider IN ('ZOOM', 'GOOGLE_MEET'));

-- 2. Add Google Meet space columns if missing
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS google_meet_space_id TEXT,
  ADD COLUMN IF NOT EXISTS google_meet_uri TEXT;

-- 3. Ensure class_type constraint strictly enforces PRIVATE, BUDDY, GROUP
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_class_type_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_class_type_check 
  CHECK (class_type IN ('PRIVATE', 'BUDDY', 'GROUP'));

-- 4. Ensure status constraint strictly enforces standard states
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_status_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_status_check 
  CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'RECORDING_AVAILABLE', 'CANCELLED'));

-- 5. Performance Indexes for Realtime Status Lookups & Multi-Student Joins
CREATE INDEX IF NOT EXISTS idx_classes_status_start 
  ON public.classes (status, scheduled_start);

CREATE INDEX IF NOT EXISTS idx_classes_coach_status 
  ON public.classes (coach_id, status);

CREATE INDEX IF NOT EXISTS idx_class_students_student_class 
  ON public.class_students (student_id, class_id);

CREATE INDEX IF NOT EXISTS idx_class_students_class_id 
  ON public.class_students (class_id);

-- 6. Add RLS Policies for coach_google_tokens if not already created
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coach_google_tokens' AND policyname = 'Coaches manage own google tokens'
  ) THEN
    CREATE POLICY "Coaches manage own google tokens" 
      ON public.coach_google_tokens
      FOR ALL 
      TO authenticated
      USING (
        coach_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.coach_profiles cp 
          WHERE cp.id = coach_google_tokens.coach_id AND cp.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
