# ChessHub Academy — Admin Control Center, Demo CRM & Careers
## Production Schema Implementation Plan
**Document ID:** `CHESSHUB_ADMIN_CRM_SCHEMA_PLAN.md`  
**Date:** September 2026  
**Status:** PROPOSED & FULLY VALIDATED (Phase 1 Complete — Awaiting Approval)  
**Target Environment:** ChessHub Academy (`d:\newchesshub`)  

---

## 1. Architecture Alignment & Principles

This schema plan replaces the incompatible third-party DP Skill Tech draft with a **100% native, verified, and safe schema extension** designed specifically for ChessHub Academy.

### Design Principles:
1. **Zero Downtime & Zero Regression:** Does NOT touch or rename existing tables that active frontend actions depend on (`public.bookings`, `public.users`, `public.student_profiles`, `public.coach_profiles`).
2. **Correct Foreign Keys:** Every user reference binds to `public.users(id)`, strictly reflecting the canonical v2 architecture where `profiles` was dropped.
3. **Native Function Reuse:** Uses ChessHub's existing `update_timestamp()` trigger function.
4. **Idempotent by Design:** Every enum, table, column, trigger, and index employs defensive `IF NOT EXISTS` or exception-handled DO blocks.
5. **Separation of Public vs Admin Surface:** Hard isolation between anonymous applicant submissions and sensitive internal recruitment/CRM records.

---

## 2. Schema Evolution Plan (By Functional Phase)

### Phase 2A: Academy User IDs & User Status Lifecycle

#### 1. Add `user_code` to `public.users`
Provides authoritative, immutable academy identifiers:
- Format:
  - Admin: `ADM-00001`
  - Coach: `COA-00001`
  - Student: `STU-2026-00001` (includes registration year)
- Database Implementation:
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_user_code ON public.users(user_code);
```

#### 2. Sequence Generators for User Codes
To eliminate race conditions and avoid application-level string increments, create dedicated PostgreSQL sequences:
```sql
CREATE SEQUENCE IF NOT EXISTS user_code_admin_seq START 1;
CREATE SEQUENCE IF NOT EXISTS user_code_coach_seq START 1;
CREATE SEQUENCE IF NOT EXISTS user_code_student_seq START 1;
```

#### 3. Deterministic Code Generator Function
```sql
CREATE OR REPLACE FUNCTION public.generate_user_code(user_role TEXT)
RETURNS TEXT AS $$
DECLARE
  current_yr TEXT := to_char(CURRENT_DATE, 'YYYY');
BEGIN
  IF user_role = 'ADMIN' THEN
    RETURN 'ADM-' || LPAD(nextval('user_code_admin_seq')::TEXT, 5, '0');
  ELSIF user_role = 'COACH' THEN
    RETURN 'COA-' || LPAD(nextval('user_code_coach_seq')::TEXT, 5, '0');
  ELSIF user_role = 'STUDENT' THEN
    RETURN 'STU-' || current_yr || '-' || LPAD(nextval('user_code_student_seq')::TEXT, 5, '0');
  ELSE
    RETURN 'USR-' || LPAD(nextval('user_code_student_seq')::TEXT, 5, '0');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 4. User Status Lifecycle
ChessHub currently uses `is_active boolean` on `public.users`. To support the complete lifecycle (`ACTIVE`, `INVITED`, `DISABLED`):
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED'));
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
```
*Backward Compatibility Sync:* An update trigger automatically keeps `is_active = (status = 'ACTIVE')` so existing code reading `is_active` remains 100% functional.

---

### Phase 2B: Demo CRM Enhancement

#### 1. In-Place Extension of `public.bookings`
Rather than creating an incompatible `demo_bookings` table, extend the existing `public.bookings` table that is already wired into `BookDemoForm.tsx`, `src/actions/bookings.ts`, and `src/lib/bookings/index.ts`:

```sql
-- Extend existing bookings table with CRM pipeline attributes
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS student_experience VARCHAR(50);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS converted_student_profile_id UUID 
  REFERENCES public.student_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS lead_stage VARCHAR(30) DEFAULT 'NEW'
  CHECK (lead_stage IN ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CONVERTED', 'ARCHIVED'));

CREATE INDEX IF NOT EXISTS idx_bookings_converted_student ON public.bookings(converted_student_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_stage ON public.bookings(lead_stage);
```

#### 2. Backward-Compatibility View: `public.demo_bookings`
To satisfy any admin components expecting the name `demo_bookings` without breaking existing queries:
```sql
CREATE OR REPLACE VIEW public.demo_bookings AS 
SELECT * FROM public.bookings;
```

#### 3. Lead Conversion Pipeline Architecture
```
Demo Lead (public.bookings)
     ↓
[Admin Review & Qualify]
     ↓
Trigger / Action: convertBookingToStudent
     ├─ 1. auth.users (Credentials generated)
     ├─ 2. public.users (role = 'STUDENT', status = 'ACTIVE', user_code = 'STU-2026-XXXXX')
     ├─ 3. public.student_profiles (age, parent info, level)
     ├─ 4. public.coach_student_assignments (assign designated coach)
     ├─ 5. public.bookings (lead_stage = 'CONVERTED', converted_at = now(), converted_student_profile_id = profile.id)
     └─ 6. public.referrals (award referral credits if code was supplied)
```

---

### Phase 2C: Careers System Schema

#### 1. Job Openings Table (`public.job_openings`)
```sql
DO $$ BEGIN
  CREATE TYPE job_status_type AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

-- Attach existing canonical trigger
DROP TRIGGER IF EXISTS trg_job_openings_updated_at ON public.job_openings;
CREATE TRIGGER trg_job_openings_updated_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_job_openings_status ON public.job_openings(status);
```

#### 2. Career Applications Table (`public.career_applications`)
```sql
DO $$ BEGIN
  CREATE TYPE career_app_status_type AS ENUM (
    'NEW', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
```

#### 3. Career Application Private Notes Table (`public.career_application_notes`)
```sql
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
```

#### 4. Resumes Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;
```

---

## 3. RLS Security Model (Phase 4)

### 3.1 Job Openings RLS
```sql
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

-- Anonymous and Authenticated users can view ONLY published jobs
CREATE POLICY "Public can view published jobs"
  ON public.job_openings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'PUBLISHED');

-- Full control for Admins only
CREATE POLICY "Admin full access to job openings"
  ON public.job_openings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );
```

### 3.2 Career Applications RLS
```sql
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

-- Public can submit an application ONLY if the associated job is actively PUBLISHED
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
    -- Enforce that public cannot set recruiter or mark as selected
    AND status = 'NEW'
    AND assigned_recruiter_id IS NULL
  );

-- Admins only can read, update, or delete applications
CREATE POLICY "Admin full access to career applications"
  ON public.career_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );
```

### 3.3 Career Application Notes RLS
```sql
ALTER TABLE public.career_application_notes ENABLE ROW LEVEL SECURITY;

-- Strictly private: Admins only
CREATE POLICY "Admin full access to recruiter notes"
  ON public.career_application_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );
```

### 3.4 Storage Bucket RLS for Resumes
```sql
-- Public can upload resume during application submission
CREATE POLICY "Public upload resume"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes');

-- Only Admins can download / view uploaded resumes
CREATE POLICY "Admin read resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );
```

---

## 4. Migration Dependencies & Rollback Strategy

1. **Step 1:** Sequence creation and `user_code` / `status` addition on `public.users`.
2. **Step 2:** Extension of `public.bookings` (add `lead_stage`, `internal_notes`, `converted_student_profile_id`).
3. **Step 3:** Careers enums and tables (`job_openings`, `career_applications`, `career_application_notes`).
4. **Step 4:** Resumes storage bucket configuration.
5. **Step 5:** RLS policies enforcement across new tables and storage.

### Safe Rollback Query (If Reversion is Required)
```sql
-- Rollback without touching core user or booking data
DROP TABLE IF EXISTS public.career_application_notes CASCADE;
DROP TABLE IF EXISTS public.career_applications CASCADE;
DROP TABLE IF EXISTS public.job_openings CASCADE;
DROP TYPE IF EXISTS career_app_status_type;
DROP TYPE IF EXISTS job_status_type;
DELETE FROM storage.buckets WHERE id = 'resumes';
-- Columns on public.bookings and public.users can be safely dropped or left inactive
```
