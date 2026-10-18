# Migration Audit Report
## `20260925000001_admin_crm_careers.sql`
**Audited:** 2026-09-26 | **Against:** All 28 existing migrations in `supabase/migrations/`
**Verdict Summary:** **9 BLOCKERS — migration will NOT apply cleanly as written.**

---

## Evidence Base (Schema State After All Prior Migrations)

| Item | Status in Live Schema |
|------|----------------------|
| `public.profiles` | ❌ **DROPPED** in `20260710000002_database_schema_v2.sql` line 26 |
| `public.users` | ✅ Exists (v2 canonical identity table) |
| `public.student_profiles` | ✅ Exists |
| `public.coach_profiles` | ✅ Exists |
| `public.demo_bookings` | ❌ **DOES NOT EXIST** — only `public.bookings` (init schema) was created but never canonically preserved as `demo_bookings` |
| `public.enrollments` | ❌ **DOES NOT EXIST** — only `class_enrollments` and `lms_course_enrollments` exist |
| `public.roles` | ❌ **DOES NOT EXIST** — no RBAC tables in any migration |
| `public.permissions` | ❌ **DOES NOT EXIST** |
| `public.user_roles` | ❌ **DOES NOT EXIST** |
| `public.role_permissions` | ❌ **DOES NOT EXIST** |
| `user_status_type` enum | ❌ **DOES NOT EXIST** — schema uses TEXT+CHECK constraints |
| `update_updated_at_column()` | ❌ **DOES NOT EXIST** — existing function is `update_timestamp()` (v2 line 277) |

---

## 🔴 BLOCKERS — Migration Will Fail

### BLOCKER 1 — `user_status_type` enum does not exist

**Section:** Lines 7–14
```sql
DO $$ BEGIN
  ALTER TYPE user_status_type ADD VALUE IF NOT EXISTS 'INVITED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```
**Problem:** `user_status_type` is never defined in any prior migration. `ALTER TYPE` on a non-existent type throws `undefined_object`, which is **NOT** caught by `WHEN duplicate_object`. The DO block will propagate the error and abort the migration.

**Fix:**
```sql
DO $$ BEGIN
  CREATE TYPE user_status_type AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN
  -- Already exists; add missing values safely
  BEGIN ALTER TYPE user_status_type ADD VALUE IF NOT EXISTS 'INVITED'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_status_type ADD VALUE IF NOT EXISTS 'DISABLED'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
```
Or — since the existing schema uses `TEXT CHECK` for status, replace enum usage entirely with a `TEXT` column + `CHECK` constraint in the new tables.

---

### BLOCKER 2 — `profiles` table does not exist

**Section:** Lines 17–18
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_user_code ON profiles(user_code);
```
**Problem:** `public.profiles` was explicitly dropped (`DROP TABLE IF EXISTS public.profiles CASCADE`) in `20260710000002_database_schema_v2.sql` line 26. The canonical identity table is `public.users`. This ALTER will fail immediately.

**Fix:** Target the correct table:
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_user_code ON public.users(user_code);
```

---

### BLOCKER 3 — `demo_bookings` table does not exist

**Section:** Lines 21–25
```sql
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS converted_student_profile_id UUID REFERENCES student_profiles(id)...;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_demo_bookings_converted_student ON demo_bookings(...);
```
**Problem:** No table named `demo_bookings` exists. The original `public.bookings` table (init schema) was not renamed. There is no migration that creates or renames it to `demo_bookings`.

**Fix:** Either rename the target to the actual table name, or add a prerequisite step:
```sql
-- Option A: Use existing table name
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS internal_notes TEXT;
-- etc.

-- Option B: Create demo_bookings as a new dedicated table
-- (requires schema design decision — not applied here)
```

---

### BLOCKER 4 — `enrollments` table does not exist

**Section:** Line 28
```sql
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS demo_lead_id UUID REFERENCES demo_bookings(id) ON DELETE SET NULL;
```
**Problem:** No table named `enrollments` exists in any migration. Existing enrollment tables are `public.class_enrollments` and `public.lms_course_enrollments`. Additionally this FK references `demo_bookings` which itself doesn't exist (Blocker 3).

**Fix:** Identify the correct enrollment table and resolve Blocker 3 first:
```sql
ALTER TABLE public.class_enrollments ADD COLUMN IF NOT EXISTS demo_lead_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_demo_lead ON public.class_enrollments(demo_lead_id);
```

---

### BLOCKER 5 — `update_updated_at_column()` function does not exist

**Section:** Lines 60–63 and Lines 93–97
```sql
CREATE TRIGGER trg_job_openings_updated_at
  BEFORE UPDATE ON job_openings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_career_applications_updated_at
  BEFORE UPDATE ON career_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
**Problem:** The function `update_updated_at_column()` is never defined in any migration. The existing equivalent is `public.update_timestamp()` (defined in `20260710000002_database_schema_v2.sql` line 277).

**Fix:** Reference the correct existing function:
```sql
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
```
Or add a prerequisite `CREATE OR REPLACE FUNCTION update_updated_at_column()` at the top of the migration.

---

### BLOCKER 6 — FK to `profiles(id)` on three new tables

**Sections:** Lines 56, 91, 113
```sql
created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,        -- job_openings
assigned_recruiter_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- career_applications
author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- career_application_notes
```
**Problem:** `profiles` was dropped in v2. `CREATE TABLE` with a FK to a non-existent table fails immediately. All three table creations will fail.

**Fix:** Reference the live identity table:
```sql
created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
assigned_recruiter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
```

---

### BLOCKER 7 — `permissions`, `roles`, `role_permissions` tables do not exist

**Section:** Lines 116–154 (INSERT permissions + DO block role assignment)
```sql
INSERT INTO permissions (code, description, module) VALUES (...);
SELECT id INTO super_admin_id FROM roles WHERE name = 'SUPER_ADMIN';
INSERT INTO role_permissions (role_id, permission_id) SELECT ...;
```
**Problem:** None of these RBAC tables (`permissions`, `roles`, `role_permissions`) are defined in any prior migration. The existing schema uses a single `role TEXT CHECK` column on `public.users` — not a relational RBAC system. All three statements will throw `relation does not exist`.

**Fix:** These tables must be created before use. Add to the migration (before the INSERT block):
```sql
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT
);
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
-- Seed baseline roles
INSERT INTO public.roles (name) VALUES ('SUPER_ADMIN'), ('ADMIN')
ON CONFLICT (name) DO NOTHING;
```

---

### BLOCKER 8 — `user_roles` and `roles` referenced in RLS USING clauses do not exist

**Section:** Lines 167–225 (all 6 RLS policies)
```sql
CREATE POLICY "Admins can view all jobs" ON job_openings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
  )
);
-- (repeated in all 5 remaining admin policies)
```
**Problem:** PostgreSQL **validates subquery references at policy creation time**. Since `user_roles` and `roles` don't exist, all 5 admin `CREATE POLICY` statements will fail with `relation "user_roles" does not exist`.

**Fix:** Resolve Blocker 7 first (create the RBAC tables). Then these policies are syntactically correct. Alternatively, use the existing `public.users.role` column pattern:
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')
  )
)
```

---

### BLOCKER 9 — Triggers are not idempotent (no `IF NOT EXISTS`)

**Section:** Lines 59–63 and Lines 93–97
```sql
CREATE TRIGGER trg_job_openings_updated_at ...
CREATE TRIGGER trg_career_applications_updated_at ...
```
**Problem:** `CREATE TRIGGER` has no `IF NOT EXISTS` syntax in PostgreSQL ≤ 15. If the migration is re-run (e.g. after a partial failure + retry), it will fail with `trigger already exists`. This makes recovery from Blockers 5–8 after a partial apply dangerous.

**Fix:** Drop before creating:
```sql
DROP TRIGGER IF EXISTS trg_job_openings_updated_at ON public.job_openings;
CREATE TRIGGER trg_job_openings_updated_at ...

DROP TRIGGER IF EXISTS trg_career_applications_updated_at ON public.career_applications;
CREATE TRIGGER trg_career_applications_updated_at ...
```

---

## 🟠 HIGH RISK

### HIGH 1 — Public INSERT on `career_applications` accepts any `job_id`

**Section:** Lines 203–206
```sql
CREATE POLICY "Public can submit applications" ON career_applications
  FOR INSERT WITH CHECK (true);
```
**Problem:** `WITH CHECK (true)` means an unauthenticated user can insert an application referencing any `job_id` — including DRAFT, PAUSED, or CLOSED jobs — and can spam applications with zero validation server-side. No rate-limiting or status gate at the DB layer.

**Fix:** Add a status guard:
```sql
CREATE POLICY "Public can submit applications" ON career_applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_openings
      WHERE id = job_id AND status = 'PUBLISHED'
    )
  );
```

---

### HIGH 2 — `FOR ALL` admin policy on `career_applications` missing `WITH CHECK`

**Section:** Lines 208–215
```sql
CREATE POLICY "Admins can manage applications" ON career_applications
  FOR ALL USING ( EXISTS (...) );
```
**Problem:** In PostgreSQL, `FOR ALL` without an explicit `WITH CHECK` re-uses the `USING` expression as the write check. This is technically correct, but combined with the public INSERT policy above, if an admin accidentally triggers an insert through this policy path, the check is the admin subquery — meaning the insert would silently succeed with no application-level validation. Make the intent explicit.

**Fix:**
```sql
CREATE POLICY "Admins can manage applications" ON career_applications
  FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')) )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')) );
```

---

## 🟡 MEDIUM RISK

### MEDIUM 1 — No `WITH CHECK` on `FOR ALL` admin job policy

**Section:** Lines 192–200
```sql
CREATE POLICY "Admins can manage jobs" ON job_openings
  FOR ALL USING ( EXISTS (...) );
```
**Problem:** Same issue as HIGH 2 — `FOR ALL` without `WITH CHECK`. An admin could INSERT a job_opening row that bypasses any future write-side constraint. Intent should be explicit.

---

### MEDIUM 2 — `resume_file_size BIGINT NOT NULL DEFAULT 0`

**Section:** Line 85
```sql
resume_file_size BIGINT NOT NULL DEFAULT 0,
```
**Problem:** A default of `0` means a malformed insert (missing file metadata) won't be rejected. A zero-byte resume silently passes. Consider `CHECK (resume_file_size > 0)` or removing the default to make it required.

---

### MEDIUM 3 — No RLS policy guards `demo_bookings` conversions

Once Blocker 3 is resolved, the `converted_student_profile_id` and `converted_at` columns on `demo_bookings`/`bookings` have no explicit RLS policy preventing a non-admin from setting or reading conversion status. The existing `bookings` RLS policies (`admin-only read/write`) cover this, but should be verified after the target table name is resolved.

---

## 🟢 LOW RISK

### LOW 1 — Redundant index on `job_openings.slug`

**Section:** Line 68
```sql
CREATE INDEX IF NOT EXISTS idx_job_openings_slug ON job_openings(slug);
```
`slug TEXT UNIQUE NOT NULL` already creates a unique index. This explicit index is harmless but redundant.

---

### LOW 2 — Unqualified table names throughout

All `ALTER TABLE`, `CREATE TABLE`, and `CREATE INDEX` statements omit the `public.` schema prefix. Supabase defaults `search_path = public` so this works, but is non-portable and fragile if `search_path` is ever changed.

**Fix:** Prefix all table references with `public.` consistently.

---

### LOW 3 — `career_app_status_type` includes `ARCHIVED` alongside `REJECTED`

Minor design note: having both `REJECTED` and `ARCHIVED` as terminal states may create ambiguity in application code. Not a SQL error. Consider documentation.

---

## ✅ SAFE Patterns (No Action Needed)

| Pattern | Verdict |
|---------|---------|
| `CREATE TYPE ... EXCEPTION WHEN duplicate_object` | ✅ Correct idempotency guard |
| `ON CONFLICT (code) DO NOTHING` on permissions INSERT | ✅ Correct |
| `DROP POLICY IF EXISTS` before `CREATE POLICY` | ✅ Correct |
| `CREATE TABLE IF NOT EXISTS` on all 3 new tables | ✅ Correct |
| `CREATE INDEX IF NOT EXISTS` on all indexes | ✅ Correct |
| `ON DELETE RESTRICT` on `career_applications.job_id` | ✅ Correct — prevents orphaned applications |
| `ON DELETE CASCADE` on `career_application_notes.application_id` | ✅ Correct — notes follow their application |
| `ON DELETE SET NULL` on `converted_student_profile_id` | ✅ Correct — preserves lead history if student is deleted |

---

## Recommended Apply Order (After All Fixes)

1. Fix `user_status_type` (create or confirm it exists)
2. Fix `profiles` → `users` references throughout
3. Fix `demo_bookings` → `bookings` (or create the new table)
4. Fix `enrollments` → correct table
5. Create RBAC tables (`roles`, `permissions`, `user_roles`, `role_permissions`)
6. Add `update_updated_at_column()` or switch to `update_timestamp()`
7. Add `DROP TRIGGER IF EXISTS` guards
8. Fix all 6 RLS policies to use existing `public.users.role` or the new RBAC tables
9. Fix public INSERT policy to gate on `status = 'PUBLISHED'`

---

## Impact on Existing Functionality

| System | Risk if Applied As-Is |
|--------|-----------------------|
| Auth / User provisioning | 🔴 HIGH — `profiles` reference errors could abort mid-migration, leaving schema in broken partial state |
| Demo booking flow | 🔴 HIGH — `demo_bookings` ALTER fails; existing `bookings` table untouched but migration aborts before reaching it |
| Classroom / Enrollments | 🟡 MEDIUM — `enrollments` ALTER fails; class_enrollments unaffected but migration aborts |
| Existing RLS policies | 🟠 HIGH — Partial migration + failed DDL can leave RLS in intermediate state |
| Careers (new) | 🔴 BLOCKED — `profiles` FK + missing trigger function prevents table creation |
