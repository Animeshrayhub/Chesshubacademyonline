# ChessHub Academy — Admin Control Center, Demo CRM & Careers
## Comprehensive Architecture & Database Audit Report
**Document ID:** `CHESSHUB_ADMIN_CRM_AUDIT.md`  
**Date:** September 2026  
**Audited Against:** All 28 Production Migrations in `supabase/migrations/`, TypeScript Server Actions, Middleware, and Lib Services  
**Target Environment:** ChessHub Academy (`d:\newchesshub`) — **Strictly Isolated from DP Skill Tech**

---

## 1. Executive Summary

This audit establishes the **ground truth** of the ChessHub Academy platform across database tables, relationships, authorization mechanisms, API services, and frontend dependencies.

### Key Takeaway
A third-party migration script (`20260925000001_admin_crm_careers.sql`) titled *"DP SKILL TECH ACADEMY — ADMIN CONTROL CENTER, DEMO CRM & CAREERS SCHEMA"* was drafted under assumptions that **violate ChessHub Academy's actual architecture**. Applying that script directly would immediately crash database migrations and break existing application features.

| Metric | Count | Status |
|---|---|---|
| Active Production Tables in ChessHub | 68 | Fully mapped & verified |
| Dropped Legacy Tables | 4 | `profiles`, `students`, `coaches`, `lesson_recordings` (dropped in v2) |
| Identity & User Profile Anchor | `public.users` | Primary key `id` (UUID references `auth.users.id`) |
| Demo Booking Table in Production | `public.bookings` | Actively connected to `src/lib/bookings/index.ts` and `src/actions/bookings.ts` |
| Standalone `enrollments` Table | None | Uses `class_students` (live classes) & `lms_course_enrollments` (LMS courses) |
| Timestamp Trigger Function | `update_timestamp()` | `update_updated_at_column()` does NOT exist |
| Blockers in DP Skill Tech Migration | 9 🔴 BLOCKERS | Unqualified types, dropped table FKs, non-existent trigger functions |

---

## 2. Actual Current ChessHub Architecture (Phase 1)

### 2.1 Identity, Users & Roles

In ChessHub Academy, user authentication and roles underwent a major migration in `20260710000002_database_schema_v2.sql`:
- **Legacy Table Dropped:** `public.profiles` was explicitly dropped (`DROP TABLE IF EXISTS public.profiles CASCADE;`).
- **Canonical Identity Table:** `public.users`
  - `id` UUID PRIMARY KEY (references `auth.users(id)` on delete cascade)
  - `username` VARCHAR(150) NOT NULL UNIQUE
  - `email` VARCHAR(254) NOT NULL UNIQUE
  - `first_name` VARCHAR(150) NOT NULL
  - `last_name` VARCHAR(150) NOT NULL
  - `role` VARCHAR(20) NOT NULL CHECK (`role IN ('ADMIN', 'COACH', 'STUDENT')`)
  - `is_active` BOOLEAN NOT NULL DEFAULT true
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  - `archived_at` TIMESTAMPTZ
- **Important Finding:** There is **no separate `roles` or `permissions` table** in database migrations. Roles are represented as a string column with a CHECK constraint.
- **Parent Identity:** Parents currently do NOT have separate user logins or a `PARENT` role. Parent details are stored as attributes on the student: `parent_name`, `parent_whatsapp`, and `parent_email`.

### 2.2 Student Profiles & Coach Profiles

- **`public.student_profiles`**:
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` UUID NOT NULL UNIQUE REFERENCES `public.users(id)` ON DELETE CASCADE
  - `age` INTEGER NOT NULL
  - `level` VARCHAR(20) NOT NULL CHECK (`level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')`)
  - `parent_name` VARCHAR(255) NOT NULL
  - `parent_whatsapp` VARCHAR(30) NOT NULL
  - `joined_date` DATE NOT NULL DEFAULT CURRENT_DATE
  - `notes` TEXT
  - `created_at`, `updated_at`, `archived_at`
- **`public.coach_profiles`**:
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` UUID NOT NULL UNIQUE REFERENCES `public.users(id)` ON DELETE CASCADE
  - `title` VARCHAR(100) NOT NULL (e.g. "FIDE Master", "Senior Coach")
  - `photo_url` VARCHAR(512)
  - `whatsapp` VARCHAR(30) NOT NULL
  - `languages` JSONB NOT NULL DEFAULT '[]'
  - `experience_years` INTEGER NOT NULL DEFAULT 1
  - `bio` TEXT NOT NULL
  - `created_at`, `updated_at`, `archived_at`
- **Coach-Student Assignments:**
  - Managed via `public.coach_student_assignments`
  - `coach_id` UUID NOT NULL REFERENCES `public.coach_profiles(id)` ON DELETE CASCADE
  - `student_id` UUID NOT NULL REFERENCES `public.student_profiles(id)` ON DELETE CASCADE
  - Unique pair assignment tracking active coaching relationships.

### 2.3 Classes, Scheduling & Enrollments

- **Live Classes & Class Students:**
  - `weekly_schedules` (recurring timetable per coach)
  - `weekly_schedule_students` (students attached to weekly timetable)
  - `classes` (concrete scheduled/live/completed session instances):
    - `coach_id` REFERENCES `coach_profiles(id)`
    - `status` (`SCHEDULED`, `LIVE`, `COMPLETED`, `RECORDING_AVAILABLE`, `CANCELLED`)
    - `zoom_meeting_id`, `zoom_start_url`, `zoom_join_url`
    - Google Meet integration added via `coach_google_tokens` (`20260917000000_add_google_meet_integration.sql`)
  - `class_students` (joins `classes(id)` and `student_profiles(id)`)
  - `class_reports`, `class_attendance`, `class_recordings`
- **Enrollment Concept in ChessHub:**
  - Live academy classes use `class_students` and `weekly_schedule_students`.
  - Self-paced courses use `lms_course_enrollments` (references `users(id)` and `hw_courses(id)`).
  - **There is NO generic `enrollments` table.** Any foreign key referencing `enrollments` will immediately fail.

### 2.4 Demo Booking System (Current Ground Truth)

The production demo booking system is centered on **`public.bookings`** (created in `20260710000000_init_schema.sql` and updated with foreign keys in `20260710000002_database_schema_v2.sql`):
- **Table Name:** `public.bookings` (NOT `demo_bookings`)
- **Schema:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `parent_name` TEXT NOT NULL
  - `parent_email` TEXT NOT NULL
  - `parent_phone` TEXT NOT NULL
  - `student_name` TEXT NOT NULL
  - `student_age` INTEGER NOT NULL
  - `preferred_time` TEXT NOT NULL
  - `assigned_coach_id` UUID REFERENCES `public.coach_profiles(id)` ON DELETE SET NULL
  - `zoom_meeting_url` TEXT
  - `status` TEXT DEFAULT 'pending' CHECK (`status IN ('pending', 'assigned', 'completed', 'cancelled')`)
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
- **Live Code Bindings:**
  - Client Form: `src/features/book-demo/BookDemoForm.tsx`
  - Server Action: `src/actions/bookings.ts` (`createBookingAction`, `updateBookingStatusAction`, `assignCoachToBookingAction`, `convertBookingToStudentAction`)
  - Service Layer: `src/lib/bookings/index.ts` (queries `admin.from('bookings')`)
  - Admin UI: `src/features/admin/BookingsRegistry.tsx` and `src/components/dashboard/ui/AdminDemoLeadCrm.tsx`
- **Conversion Flow Currently in Code:**
  1. Admin clicks "Convert to Student" in Admin UI.
  2. `convertBookingToStudent(bookingId, password)` in `src/lib/bookings/index.ts` executes:
     - Fetches booking record by ID.
     - Calls `admin.auth.admin.createUser` to create Supabase Auth credentials.
     - Upserts into `public.users` with role `STUDENT`.
     - Upserts into `public.student_profiles` with `parent_name`, `parent_phone`, `student_age`.
     - Updates `bookings.status` to `'completed'`.
     - Credits referral XP in `public.referrals` if a referral code was linked.

### 2.5 Curriculum, LMS & Homework Modules

- **Curriculum:** `curriculum_programs`, `curriculum_courses`, `curriculum_chapters`, `curriculum_lessons`, `teaching_positions`, `lesson_media`.
- **Homework Library:** `homework_library_templates`, `homework_template_versions`, `homework_categories`, `hw_courses`, `hw_collections`, `hw_template_assignments`, `hw_template_submissions`.
- **Puzzles & Bot Training:** `homework_puzzles`, `puzzle_results`, `student_bot_profiles`, `student_bot_games`, `student_bot_mistakes`, `personalized_puzzles`.
- **Classroom V2 Canonical Engine:** `classroom_chat`, `classroom_bookmarks`, `classroom_responses`, `classroom_timeline_events`, `classroom_audit_logs`.
- **Integrations:** Lichess PGN/Puzzle API, Google Meet OAuth (`coach_google_tokens`), Zoom Cloud recordings.

### 2.6 Storage Buckets

Defined in `20260710000003_storage_buckets.sql` and verified:
- `avatars` (public)
- `homework` (private)
- `certificates` (public)
- `recordings` (private)
- `blog-media` (public)
- `curriculum-media` (public)
- **Missing for Careers:** No `resumes` bucket currently exists.

### 2.7 Existing Database Functions & Triggers

- **Timestamp Update:** `public.update_timestamp()` (defined in `20260710000002_database_schema_v2.sql` line 277). **There is NO function named `update_updated_at_column()`**.
- **Auth Role Extraction:** `public.get_auth_role()` returns `current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role'`.
- **Audit Logging:** `public.log_audit_action()` attaches to `users`, `student_profiles`, and `coach_profiles`.

---

## 3. Findings & Detailed Classification

Every component examined has been evaluated against safety, backward compatibility, and system integrity.

### 🔴 BLOCKERS (Must be corrected before any migration)

1. **🔴 BLOCKER — Foreign Key Reference to `profiles(id)`**
   - *Issue:* DP Skill Tech migration defines `REFERENCES profiles(id)` on 4 separate columns (`job_openings.created_by`, `career_applications.assigned_recruiter_id`, `career_application_notes.author_id`, and `ALTER TABLE profiles ADD COLUMN user_code`).
   - *Fact:* `profiles` table was dropped in `v2`. ChessHub's canonical table is `public.users`.
   - *Impact:* SQL syntax failure immediately halts migration execution.

2. **🔴 BLOCKER — Target Table for Demo CRM is `demo_bookings` Instead of `bookings`**
   - *Issue:* DP Skill Tech migration runs `ALTER TABLE demo_bookings ADD COLUMN...`.
   - *Fact:* ChessHub's active table is `public.bookings`. No table named `demo_bookings` exists.
   - *Impact:* Relation does not exist error.

3. **🔴 BLOCKER — Target Table for Course Linkage is `enrollments`**
   - *Issue:* DP Skill Tech migration runs `ALTER TABLE enrollments ADD COLUMN demo_lead_id...`.
   - *Fact:* No `enrollments` table exists in ChessHub. Class attendance is stored in `class_students`, and LMS enrollment is in `lms_course_enrollments`.
   - *Impact:* Relation does not exist error.

4. **🔴 BLOCKER — Missing Trigger Function `update_updated_at_column()`**
   - *Issue:* DP Skill Tech migration calls `EXECUTE FUNCTION update_updated_at_column()` on `job_openings` and `career_applications`.
   - *Fact:* The existing function in ChessHub is `update_timestamp()`.
   - *Impact:* Function does not exist error.

5. **🔴 BLOCKER — Non-Idempotent `CREATE TRIGGER` Statements**
   - *Issue:* `CREATE TRIGGER trg_job_openings_updated_at` lacks `DROP TRIGGER IF EXISTS`.
   - *Impact:* Migration cannot be re-run safely if interrupted.

6. **🔴 BLOCKER — Unhandled `undefined_object` in `ALTER TYPE user_status_type`**
   - *Issue:* `ALTER TYPE user_status_type ADD VALUE IF NOT EXISTS 'INVITED'` wrapped in `EXCEPTION WHEN duplicate_object`.
   - *Fact:* `user_status_type` does not exist. Calling `ALTER TYPE` on a non-existent type throws `undefined_object`, which crashes the DO block.
   - *Impact:* Migration aborts on line 8.

7. **🔴 BLOCKER — Public Career Application RLS Policy Vulnerability**
   - *Issue:* DP Skill Tech policy `"Public can submit applications" ON career_applications FOR INSERT TO anon, authenticated WITH CHECK (true)`.
   - *Risk:* Allows arbitrary submission to non-existent or closed jobs, and allows spoofing `assigned_recruiter_id` or forcing status to `'SELECTED'`.
   - *Impact:* Security bypass and data corruption.

8. **🔴 BLOCKER — Forward Reference in Career Notes RLS Policy**
   - *Issue:* `career_application_notes` policy references `career_applications.assigned_recruiter_id` before indexes and grants are established.
   - *Impact:* Potential runtime RLS evaluation deadlock.

9. **🔴 BLOCKER — Non-Existent Permission Function `has_permission()`**
   - *Issue:* DP Skill Tech migration relies on an RBAC schema with `roles`, `permissions`, and `has_permission()` function.
   - *Fact:* ChessHub uses direct role checks (`role = 'ADMIN'` or `get_auth_role() = 'ADMIN'`).
   - *Impact:* RLS policies using `has_permission()` fail.

---

### 🟠 HIGH RISK (High priority architectural conflicts)

1. **🟠 HIGH RISK — Breaking Live Demo Booking Actions**
   - Renaming `bookings` to `demo_bookings` or creating a duplicate table without updating `src/actions/bookings.ts`, `src/lib/bookings/index.ts`, and `BookDemoForm.tsx` will take down public demo booking on `chesshub.com/book-demo`.
   - *Remediation:* Keep `public.bookings` as canonical, alter it in place, and optionally provide a backward-compatible view `public.demo_bookings` if needed.

2. **🟠 HIGH RISK — Hardcoded Auth Bypass in Application Layer**
   - `src/lib/permissions/index.ts` has hardcoded email strings (`royduguu786@gmail.com`, `animesh@gmail.com`, `admin@chesshub.com`) and allows coaches into `assertAdmin()`.
   - `src/middleware.ts` has corresponding email overrides and skips `is_active` checks.
   - *Remediation:* Centralize role and status checks in database RLS and canonical helper functions.

---

### 🟡 MEDIUM RISK (Maintainability & Design Gaps)

1. **🟡 MEDIUM RISK — Status Discrepancy on Bookings**
   - Existing `bookings.status` uses lowercase: `'pending'`, `'assigned'`, `'completed'`, `'cancelled'`.
   - DP Skill Tech uses uppercase: `'NEW'`, `'CONTACTED'`, `'SCHEDULED'`, `'COMPLETED'`, `'CONVERTED'`, `'ARCHIVED'`.
   - *Remediation:* Normalize status mapping cleanly without breaking existing records.

2. **🟡 MEDIUM RISK — User Code Uniqueness & Generation Sequence**
   - Generating user codes (`ADM-00001`, `COA-00001`, `STU-2026-00001`) requires concurrency-safe PostgreSQL sequences or deterministic trigger logic, not uncoordinated application-level string increments.

3. **🟡 MEDIUM RISK — Missing Resume Storage Bucket**
   - Career applications require storing resumes. Supabase Storage must have a private bucket with signed URL downloads restricted to Admins.

---

### 🟢 LOW RISK & ✅ SAFE (Reusable Components)

- 🟢 **LOW RISK — Redundant Index on Unique Slug:** `slug TEXT UNIQUE` automatically creates a unique index in PostgreSQL; an additional `CREATE INDEX idx_slug` is harmless but redundant.
- ✅ **SAFE — `public.users` Identity Design:** Solid v2 canonical design with cascade deletes to `student_profiles` and `coach_profiles`.
- ✅ **SAFE — Existing Trigger Infrastructure:** `update_timestamp()` is proven across all v2 classroom and curriculum tables.
- ✅ **SAFE — Classroom V2 & Realtime Board Engine:** Fully isolated from Admin CRM changes; zero interference with chess engine, WebRTC, Zoom, or Google Meet.
