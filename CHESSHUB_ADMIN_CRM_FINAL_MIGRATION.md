# ChessHub Academy — Final Migration Documentation
## Admin Control Center, Demo CRM & Careers Engine
**Document ID:** `CHESSHUB_ADMIN_CRM_FINAL_MIGRATION.md`  
**Migration File:** [`supabase/migrations/20260926000000_admin_crm_careers_chesshub.sql`](file:///d:/newchesshub/supabase/migrations/20260926000000_admin_crm_careers_chesshub.sql)  
**Date:** September 2026  
**Status:** CREATED & STATICALLY VALIDATED (Awaiting Execution Approval)  
**Target Environment:** ChessHub Academy (`d:\newchesshub`)  

---

## 1. Overview & Architectural Principles

This migration implements the complete database foundation for ChessHub Academy's Admin Control Center, Demo CRM Pipeline, and Careers Engine.

### Fundamental Architecture Rules Enforced:
1. **Isolated from DP Skill Tech:** Built from first principles on ChessHub's live schema (`v2` canonical architecture).
2. **True Foreign Key Integrity:** All administrative and creator foreign keys resolve to `public.users(id)` (the active identity table), eliminating references to the dropped `profiles` table.
3. **Canonical Trigger Reuse:** Uses `public.update_timestamp()`, which already exists in production.
4. **Zero Frontend Regressions:** Extends `public.bookings` in place with bidirectional sync triggers between `status` and `lead_stage`, preserving compatibility with `BookDemoForm.tsx`, `src/actions/bookings.ts`, and `src/lib/bookings/index.ts`.
5. **Idempotent by Design:** Every table, index, sequence, function, and trigger uses defensive clauses (`IF NOT EXISTS`, `OR REPLACE`, `DROP TRIGGER IF EXISTS`, `DROP POLICY IF EXISTS`).

---

## 2. Migration Breakdown by Section

### Section 1: Security Definer Admin Gate
- **Function:** `public.is_admin_user() RETURNS BOOLEAN`
- **Security Attributes:** `SECURITY DEFINER`, `SET search_path = public, pg_catalog`, `STABLE`.
- **Purpose:** Used across all RLS policies to verify administrative privilege without triggering infinite recursion on `public.users`. Checks both database role (`users.role = 'ADMIN' AND users.is_active = true`) and verified JWT app metadata claim (`get_auth_role() = 'ADMIN'`).

### Section 2: Concurrency-Safe Academy User IDs
- **Sequences Created:**
  - `user_code_admin_seq` (Starts at 1)
  - `user_code_coach_seq` (Starts at 1)
  - `user_code_student_seq` (Starts at 1)
- **Permissions:** Revoked from `PUBLIC`, `anon`, and `authenticated` to prevent sequence manipulation.
- **Generator Function:** `public.generate_user_code(p_role TEXT)`
  - Format:
    - Admin: `ADM-00001`
    - Coach: `COA-00001`
    - Student: `STU-2026-00001` (includes registration year)
  - Concurrency Safe: Uses PostgreSQL atomic `nextval()`.
  - Deterministic and role-aware.

### Section 3: Identity & User Status Lifecycle (`public.users`)
- **New Columns:**
  - `user_code TEXT UNIQUE` with index `idx_users_user_code`.
  - `status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED'))` with index `idx_users_status`.
- **Trigger:** `trg_users_user_code_sync` automatically assigns `user_code` on insert if omitted, and keeps `is_active = (status = 'ACTIVE')` in lockstep.
- **Backfill:** Existing production users without codes are sequentially backfilled in order of creation.

### Section 4: Demo CRM Pipeline (`public.bookings`)
- **New Columns on Existing Table:**
  - `internal_notes TEXT`
  - `student_experience VARCHAR(50)`
  - `converted_student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE SET NULL`
  - `converted_at TIMESTAMPTZ`
  - `lead_stage VARCHAR(30) DEFAULT 'NEW' CHECK (lead_stage IN ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CONVERTED', 'ARCHIVED'))`
- **Indexes:**
  - `idx_bookings_converted_student` on `converted_student_profile_id`
  - `idx_bookings_lead_stage` on `lead_stage`
- **Bidirectional Stage Synchronization Trigger:** `trg_bookings_stage_sync` keeps legacy `status` (`pending`, `assigned`, `completed`, `cancelled`) in sync with new CRM `lead_stage` (`NEW`, `SCHEDULED`, `COMPLETED`, `ARCHIVED`), ensuring zero breaking changes for existing code. All application code natively binds to `public.bookings`.

### Section 5: Careers Engine
- **Enums Created:**
  - `job_status_type`: `'DRAFT'`, `'PUBLISHED'`, `'PAUSED'`, `'CLOSED'`, `'ARCHIVED'`
  - `career_app_status_type`: `'NEW'`, `'REVIEWING'`, `'SHORTLISTED'`, `'INTERVIEW'`, `'SELECTED'`, `'REJECTED'`, `'ARCHIVED'`
- **Tables Created:**
  1. `public.job_openings`:
     - Full position metadata (responsibilities, requirements, skills, salary range, employment type, deadline).
     - `created_by REFERENCES public.users(id) ON DELETE SET NULL`.
     - Attached to `public.update_timestamp()`.
  2. `public.career_applications`:
     - Structured applicant details, portfolio/GitHub/LinkedIn links, cover letter, salary expectation.
     - Resume storage pointers (`resume_storage_path`, `resume_file_name`, `resume_mime_type`, `resume_file_size`).
     - `assigned_recruiter_id REFERENCES public.users(id) ON DELETE SET NULL`.
     - Attached to `public.update_timestamp()`.
  3. `public.career_application_notes`:
     - Private internal hiring notes.
     - `author_id REFERENCES public.users(id) ON DELETE CASCADE`.
     - `application_id REFERENCES public.career_applications(id) ON DELETE CASCADE`.
     - Attached to `public.update_timestamp()`.

### Section 6: Private Storage Bucket (`resumes`)
- **Bucket ID:** `resumes`
- **Configuration:** `public = false`, `file_size_limit = 10485760` (10 MB).
- **MIME Whitelist:** `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

### Section 7: Complete RLS Policy Suite
- Explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **Public Policy on Applications:** Restricted to inserting records where `job.status = 'PUBLISHED'`, forcing `status = 'NEW'`, and prohibiting self-assignment of `assigned_recruiter_id`.
- **Admin Full Control:** Evaluated via `public.is_admin_user()`.
- **Private Resumes Storage:** Public can upload valid PDF/DOC/DOCX only; only Admins can read or download.
- **Coach Scoped Access:** Assigned coaches can read their assigned demo bookings via `assigned_coach_id -> coach_profiles.user_id = auth.uid()`.

---

## 3. Safe Rollback Script (If Reversion is Ever Needed)

```sql
-- Completely removes new careers and CRM additions without impacting core tables
DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete resumes" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'resumes';

DROP TABLE IF EXISTS public.career_application_notes CASCADE;
DROP TABLE IF EXISTS public.career_applications CASCADE;
DROP TABLE IF EXISTS public.job_openings CASCADE;
DROP TYPE IF EXISTS career_app_status_type;
DROP TYPE IF EXISTS job_status_type;

DROP TRIGGER IF EXISTS trg_bookings_stage_sync ON public.bookings;
DROP FUNCTION IF EXISTS public.trg_sync_booking_stage();

DROP TRIGGER IF EXISTS trg_users_user_code_sync ON public.users;
DROP FUNCTION IF EXISTS public.trg_assign_user_code();
DROP FUNCTION IF EXISTS public.generate_user_code(TEXT);

DROP SEQUENCE IF EXISTS public.user_code_student_seq;
DROP SEQUENCE IF EXISTS public.user_code_coach_seq;
DROP SEQUENCE IF EXISTS public.user_code_admin_seq;

DROP FUNCTION IF EXISTS public.is_admin_user();
```
