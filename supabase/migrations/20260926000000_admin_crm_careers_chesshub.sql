-- =============================================================================
-- CHESSHUB ACADEMY — ADMIN CONTROL CENTER, DEMO CRM & CAREERS ENGINE
-- Migration: 20260926000000_admin_crm_careers_chesshub.sql
-- Status: IDEMPOTENT, SAFE & BACKWARD-COMPATIBLE
-- Target Environment: ChessHub Academy (Strictly Isolated from DP Skill Tech)
-- =============================================================================

-- =============================================================================
-- 1. HELPER FUNCTIONS & ADMIN AUTHORIZATION GATE
-- =============================================================================

-- Helper function to deterministically verify Administrator privileges in RLS
-- Resolves strictly against public.users table (canonical identity store)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.is_active = true
      AND users.status = 'ACTIVE'
  );
$$;

-- =============================================================================
-- 2. ACADEMY USER CODE SEQUENCES & GENERATOR
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.user_code_admin_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.user_code_coach_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.user_code_student_seq START 1;

-- Revoke direct sequence modification from general roles
REVOKE ALL ON SEQUENCE public.user_code_admin_seq, public.user_code_coach_seq, public.user_code_student_seq FROM PUBLIC, anon, authenticated;

-- Concurrency-safe, deterministic user code generator function
CREATE OR REPLACE FUNCTION public.generate_user_code(p_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role TEXT := UPPER(COALESCE(p_role, 'STUDENT'));
  v_year TEXT := to_char(CURRENT_DATE, 'YYYY');
  v_next_val BIGINT;
BEGIN
  IF v_role = 'ADMIN' THEN
    v_next_val := nextval('public.user_code_admin_seq');
    RETURN 'ADM-' || LPAD(v_next_val::TEXT, 5, '0');
  ELSIF v_role = 'COACH' THEN
    v_next_val := nextval('public.user_code_coach_seq');
    RETURN 'COA-' || LPAD(v_next_val::TEXT, 5, '0');
  ELSIF v_role = 'STUDENT' THEN
    v_next_val := nextval('public.user_code_student_seq');
    RETURN 'STU-' || v_year || '-' || LPAD(v_next_val::TEXT, 5, '0');
  ELSE
    v_next_val := nextval('public.user_code_student_seq');
    RETURN 'USR-' || LPAD(v_next_val::TEXT, 5, '0');
  END IF;
END;
$$;

-- Restrict direct RPC execution to database owner and service role
REVOKE EXECUTE
ON FUNCTION public.generate_user_code(TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.generate_user_code(TEXT)
TO postgres, service_role;

-- =============================================================================
-- 3. EXTEND PUBLIC.USERS (CANONICAL IDENTITY TABLE)
-- =============================================================================

-- Add user_code to public.users (NOT profiles)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_user_code ON public.users(user_code);

-- Add user status lifecycle column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED'));
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Synchronize status with is_active for existing users
UPDATE public.users 
SET status = CASE WHEN is_active = true THEN 'ACTIVE' ELSE 'DISABLED' END
WHERE status IS NULL;

-- Automatically assign user_code on INSERT if not explicitly provided
CREATE OR REPLACE FUNCTION public.trg_assign_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.user_code IS NULL OR TRIM(NEW.user_code) = '' THEN
    NEW.user_code := public.generate_user_code(NEW.role);
  END IF;

  -- Maintain synchronization between status and is_active (delta-aware)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active
       AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      NEW.status :=
        CASE
          WHEN NEW.is_active = true THEN 'ACTIVE'
          ELSE 'DISABLED'
        END;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
          AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
      NEW.is_active := (NEW.status = 'ACTIVE');
    END IF;
  ELSE
    -- INSERT synchronization
    IF NEW.status IS NOT NULL THEN
      NEW.is_active := (NEW.status = 'ACTIVE');
    ELSIF NEW.is_active IS NOT NULL THEN
      NEW.status :=
        CASE
          WHEN NEW.is_active = true THEN 'ACTIVE'
          ELSE 'DISABLED'
        END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_user_code_sync ON public.users;
CREATE TRIGGER trg_users_user_code_sync
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assign_user_code();

-- Backfill user_code for existing users who do not have one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role FROM public.users WHERE user_code IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.users 
    SET user_code = public.generate_user_code(r.role)
    WHERE id = r.id;
  END LOOP;
END $$;

-- =============================================================================
-- 4. EXTEND PUBLIC.BOOKINGS (CANONICAL DEMO CRM TABLE)
-- =============================================================================

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS student_experience VARCHAR(50);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS converted_student_profile_id UUID 
  REFERENCES public.student_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Add lead_stage column for granular CRM pipeline tracking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS lead_stage VARCHAR(30) DEFAULT 'NEW'
  CHECK (lead_stage IN ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CONVERTED', 'ARCHIVED'));

CREATE INDEX IF NOT EXISTS idx_bookings_converted_student ON public.bookings(converted_student_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_stage ON public.bookings(lead_stage);

-- Safe backward-compatible initialization of lead_stage based on existing status
UPDATE public.bookings
SET lead_stage = CASE 
  WHEN status = 'pending' THEN 'NEW'
  WHEN status = 'assigned' THEN 'SCHEDULED'
  WHEN status = 'completed' THEN 'COMPLETED'
  WHEN status = 'cancelled' THEN 'ARCHIVED'
  ELSE 'NEW'
END
WHERE lead_stage IS NULL OR lead_stage = 'NEW';

-- Synchronize status and lead_stage bidirectionally
CREATE OR REPLACE FUNCTION public.trg_sync_booking_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- When lead_stage is updated to CONVERTED or COMPLETED, ensure converted_at is recorded
  IF NEW.lead_stage IN ('CONVERTED', 'COMPLETED') AND OLD.lead_stage NOT IN ('CONVERTED', 'COMPLETED') THEN
    NEW.converted_at := COALESCE(NEW.converted_at, NOW());
  END IF;

  -- Keep legacy status in sync with lead_stage if status wasn't changed directly
  IF NEW.lead_stage <> OLD.lead_stage AND NEW.status = OLD.status THEN
    IF NEW.lead_stage IN ('NEW', 'CONTACTED') THEN
      NEW.status := 'pending';
    ELSIF NEW.lead_stage = 'SCHEDULED' THEN
      NEW.status := 'assigned';
    ELSIF NEW.lead_stage IN ('COMPLETED', 'CONVERTED') THEN
      NEW.status := 'completed';
    ELSIF NEW.lead_stage = 'ARCHIVED' THEN
      NEW.status := 'cancelled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_stage_sync ON public.bookings;
CREATE TRIGGER trg_bookings_stage_sync
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_booking_stage();


-- =============================================================================
-- 5. CAREERS SYSTEM ENUMS & TABLES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE job_status_type AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE career_app_status_type AS ENUM (
    'NEW', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5.1 Job Openings Table
CREATE TABLE IF NOT EXISTS public.job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL,
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  experience TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  location TEXT NOT NULL DEFAULT 'Remote, India',
  salary_range TEXT,
  application_deadline DATE,
  status job_status_type NOT NULL DEFAULT 'DRAFT',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_job_openings_updated_at ON public.job_openings;
CREATE TRIGGER trg_job_openings_updated_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_job_openings_status ON public.job_openings(status);

-- 5.2 Career Applications Table
CREATE TABLE IF NOT EXISTS public.career_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  position TEXT NOT NULL,
  experience TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  resume_storage_path TEXT NOT NULL,
  resume_file_name TEXT NOT NULL,
  resume_mime_type TEXT NOT NULL,
  resume_file_size BIGINT NOT NULL DEFAULT 0,
  portfolio_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  cover_letter TEXT,
  expected_salary TEXT,
  availability TEXT,
  status career_app_status_type NOT NULL DEFAULT 'NEW',
  assigned_recruiter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_career_applications_updated_at ON public.career_applications;
CREATE TRIGGER trg_career_applications_updated_at
  BEFORE UPDATE ON public.career_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_career_apps_job_id ON public.career_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_career_apps_status ON public.career_applications(status);
CREATE INDEX IF NOT EXISTS idx_career_apps_email ON public.career_applications(email);

-- 5.3 Career Application Private Notes Table
CREATE TABLE IF NOT EXISTS public.career_application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.career_applications(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_career_notes_updated_at ON public.career_application_notes;
CREATE TRIGGER trg_career_notes_updated_at
  BEFORE UPDATE ON public.career_application_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_career_notes_application_id ON public.career_application_notes(application_id);

-- =============================================================================
-- 6. PRIVATE RESUMES STORAGE BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- 7.1 Enable RLS on all managed tables
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 7.2 Job Openings Policies
DROP POLICY IF EXISTS "Public can view published jobs" ON public.job_openings;
CREATE POLICY "Public can view published jobs"
  ON public.job_openings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "Admin can view all jobs" ON public.job_openings;
CREATE POLICY "Admin can view all jobs"
  ON public.job_openings
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can insert jobs" ON public.job_openings;
CREATE POLICY "Admin can insert jobs"
  ON public.job_openings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can update jobs" ON public.job_openings;
CREATE POLICY "Admin can update jobs"
  ON public.job_openings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can delete jobs" ON public.job_openings;
CREATE POLICY "Admin can delete jobs"
  ON public.job_openings
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

-- 7.3 Career Applications Policies
DROP POLICY IF EXISTS "Public submit application to published job" ON public.career_applications;
CREATE POLICY "Public submit application to published job"
  ON public.career_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_openings
      WHERE job_openings.id = job_id
        AND job_openings.status = 'PUBLISHED'
    )
    AND status = 'NEW'
    AND assigned_recruiter_id IS NULL
  );

DROP POLICY IF EXISTS "Admin can view applications" ON public.career_applications;
CREATE POLICY "Admin can view applications"
  ON public.career_applications
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can update applications" ON public.career_applications;
CREATE POLICY "Admin can update applications"
  ON public.career_applications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can delete applications" ON public.career_applications;
CREATE POLICY "Admin can delete applications"
  ON public.career_applications
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

-- 7.4 Career Application Notes Policies (Strictly Admin Only)
DROP POLICY IF EXISTS "Admin can view application notes" ON public.career_application_notes;
CREATE POLICY "Admin can view application notes"
  ON public.career_application_notes
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can insert application notes" ON public.career_application_notes;
CREATE POLICY "Admin can insert application notes"
  ON public.career_application_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can update application notes" ON public.career_application_notes;
CREATE POLICY "Admin can update application notes"
  ON public.career_application_notes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can delete application notes" ON public.career_application_notes;
CREATE POLICY "Admin can delete application notes"
  ON public.career_application_notes
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

-- 7.5 Bookings (Demo CRM) Policies
DROP POLICY IF EXISTS "Public insert bookings" ON public.bookings;
CREATE POLICY "Public insert bookings"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin select bookings" ON public.bookings;
CREATE POLICY "Admin select bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admin update bookings" ON public.bookings;
CREATE POLICY "Admin update bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admin delete bookings" ON public.bookings;
CREATE POLICY "Admin delete bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Assigned coach can view their bookings" ON public.bookings;
CREATE POLICY "Assigned coach can view their bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = public.bookings.assigned_coach_id
        AND cp.user_id = auth.uid()
    )
  );

-- 7.6 Storage Bucket RLS Policies for Resumes
DROP POLICY IF EXISTS "Public upload resume file" ON storage.objects;
CREATE POLICY "Public upload resume file"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND
    (LOWER(SUBSTRING(name FROM '\.([^\.]+)$')) IN ('pdf', 'doc', 'docx'))
  );

DROP POLICY IF EXISTS "Admin read resume files" ON storage.objects;
CREATE POLICY "Admin read resume files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    public.is_admin_user()
  );

DROP POLICY IF EXISTS "Admin delete resume files" ON storage.objects;
CREATE POLICY "Admin delete resume files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    public.is_admin_user()
  );

-- =============================================================================
-- END OF MIGRATION: 20260926000000_admin_crm_careers_chesshub.sql
-- =============================================================================
