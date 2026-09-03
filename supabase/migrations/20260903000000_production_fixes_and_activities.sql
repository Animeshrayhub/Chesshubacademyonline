-- ==============================================================================
-- CHESSHUB ACADEMY: PRODUCTION FIXES, MANUAL RECORDINGS V1, AND STUDENT ACTIVITIES
-- Migration: 20260903000000_production_fixes_and_activities.sql
-- ==============================================================================

-- 1. Ensure class_recordings has required columns for Manual Google Drive Recordings
ALTER TABLE IF EXISTS public.class_recordings
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS drive_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_class_recordings_class_active
  ON public.class_recordings (class_id, is_active);

-- Enable RLS on class_recordings
ALTER TABLE public.class_recordings ENABLE ROW LEVEL SECURITY;

-- Coach can insert/update/delete recordings for their classes
DROP POLICY IF EXISTS "Coaches can manage recordings for their classes" ON public.class_recordings;
CREATE POLICY "Coaches can manage recordings for their classes"
  ON public.class_recordings
  FOR ALL
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR class_id IN (SELECT id FROM public.classes WHERE coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    coach_id = auth.uid()
    OR class_id IN (SELECT id FROM public.classes WHERE coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Enrolled students can read active recordings for their enrolled classes ONLY
DROP POLICY IF EXISTS "Enrolled students can view active class recordings" ON public.class_recordings;
CREATE POLICY "Enrolled students can view active class recordings"
  ON public.class_recordings
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      class_id IN (
        SELECT class_id FROM public.class_students
        WHERE (student_id = auth.uid() OR student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()))
          AND archived_at IS NULL
      )
      OR coach_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    )
  );

-- 2. Unified student_activities table
CREATE TABLE IF NOT EXISTS public.student_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('CLASS', 'PUZZLE', 'DAILY_PUZZLE', 'BOT_GAME', 'HOMEWORK', 'CURRICULUM', 'PRACTICE')),
  activity_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0,
  result VARCHAR(50),
  score NUMERIC,
  accuracy NUMERIC(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_activities_student_created
  ON public.student_activities (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_activities_type
  ON public.student_activities (activity_type);

ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;

-- Student can read and insert their own activities
DROP POLICY IF EXISTS "Students can view own activities" ON public.student_activities;
CREATE POLICY "Students can view own activities"
  ON public.student_activities
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      WHERE sp.user_id = public.student_activities.student_id
        AND csa.coach_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Students can insert own activities" ON public.student_activities;
CREATE POLICY "Students can insert own activities"
  ON public.student_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('COACH', 'ADMIN')));

-- 3. Tactical Puzzle Results Table
CREATE TABLE IF NOT EXISTS public.puzzle_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  puzzle_source TEXT DEFAULT 'lichess',
  puzzle_id TEXT NOT NULL,
  puzzle_rating INTEGER,
  puzzle_themes TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'TACTICS',
  solved BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 1,
  time_seconds INTEGER DEFAULT 0,
  accuracy NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_puzzle_results_student_created
  ON public.puzzle_results (student_id, created_at DESC);

ALTER TABLE public.puzzle_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage own puzzle results" ON public.puzzle_results;
CREATE POLICY "Students can manage own puzzle results"
  ON public.puzzle_results
  FOR ALL
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      WHERE sp.user_id = public.puzzle_results.student_id
        AND csa.coach_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('COACH', 'ADMIN'))
  );

-- 4. Ensure notifications table RLS and indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
