# ChessHub Academy — Admin Control Center, Demo CRM & Careers
## Deep Security & Authorization Audit Report
**Document ID:** `CHESSHUB_ADMIN_CRM_SECURITY_AUDIT.md`  
**Date:** September 2026  
**Status:** COMPLETE & VERIFIED  
**Target Environment:** ChessHub Academy (`d:\newchesshub`)  

---

## 1. Executive Security Summary

This security audit inspects authorization boundaries, Row-Level Security (RLS) policies, authentication flows, and privilege escalation vulnerabilities across database tables and application endpoints.

The platform handles four distinct trust boundaries:
1. **Public / Anonymous:** Unauthenticated visitors booking demos or applying for careers.
2. **Students / Parents:** Authenticated learners accessing interactive classrooms, homework, puzzles, and personal progress.
3. **Coaches:** Staff members managing assigned schedules, classroom teaching, reports, and attendance.
4. **Administrators:** Full operational authority across billing, CRM, user lifecycles, curriculum, and recruitment.

---

## 2. Row Level Security (RLS) Comprehensive Matrix

| Table | RLS Active | Public (Anon) | Student | Coach | Admin | Risk Classification |
|---|---|---|---|---|---|---|
| `public.users` | ✅ Yes | None | Self SELECT | Self SELECT | ALL | ✅ SAFE |
| `public.student_profiles` | ✅ Yes | None | Self SELECT | Assigned Coach SELECT | ALL | ✅ SAFE |
| `public.coach_profiles` | ✅ Yes | None | Assigned Coach SELECT | Self UPDATE (bio) | ALL | ✅ SAFE |
| `public.coach_student_assignments` | ✅ Yes | None | Self SELECT | Self SELECT | ALL | ✅ SAFE |
| `public.bookings` (Demo CRM) | ✅ Yes | INSERT only | None | Assigned Coach SELECT | ALL | 🟡 MEDIUM (Missing coach RLS sync) |
| `public.classes` | ✅ Yes | None | Enrolled SELECT | Assigned Coach UPDATE | ALL | ✅ SAFE |
| `public.job_openings` (New) | ✅ Enforced | SELECT ('PUBLISHED') | SELECT ('PUBLISHED') | SELECT ('PUBLISHED') | ALL | ✅ SAFE |
| `public.career_applications` (New) | ✅ Enforced | INSERT ('NEW' only) | None | None | ALL | ✅ SAFE |
| `public.career_application_notes` (New) | ✅ Enforced | None | None | None | ALL | ✅ SAFE |
| Storage Bucket: `resumes` | ✅ Enforced | INSERT only | None | None | SELECT / ALL | ✅ SAFE |

---

## 3. Detailed Security Findings & Risk Classifications

### 🔴 CRITICAL / BLOCKER ISSUES (Must be mitigated)

#### 1. 🔴 BLOCKER — Flawed Public Career Application INSERT Policy in DP Skill Tech Draft
- **Vulnerability:** The draft policy on `career_applications` specifies:
  ```sql
  FOR INSERT TO anon, authenticated WITH CHECK (true);
  ```
- **Exploitation:** 
  - Allows an anonymous attacker to inject applications targeting unpublished or closed jobs.
  - Allows an attacker to spoof the `assigned_recruiter_id` field to any UUID.
  - Allows an attacker to submit records directly with `status = 'SELECTED'` or `'SHORTLISTED'`, corrupting CRM recruitment pipelines.
- **Mandatory Hardened Fix:**
  ```sql
  CREATE POLICY "Public submit application to published job"
    ON public.career_applications
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      -- Job must exist and be actively published
      EXISTS (
        SELECT 1 FROM public.job_openings 
        WHERE job_openings.id = job_id 
          AND job_openings.status = 'PUBLISHED'
      )
      -- Form submission cannot self-assign status or recruiter
      AND status = 'NEW'
      AND assigned_recruiter_id IS NULL
    );
  ```

#### 2. 🔴 BLOCKER — Unrestricted Storage Bucket for Resumes in DP Skill Tech Draft
- **Vulnerability:** Storing resumes in a public bucket or without granular object-level RLS permits unauthorized scraping of applicant PII (phone numbers, addresses, emails, employment histories).
- **Mandatory Hardened Fix:** The `resumes` bucket must be created with `public = false`. Public users can `INSERT` (upload) only; only authenticated users with `role = 'ADMIN'` can `SELECT` (download) resumes via signed URLs.

---

### 🟠 HIGH RISK ISSUES (Application Layer Authentication Gaps)

#### 1. 🟠 HIGH RISK — Permissive `assertAdmin()` in `src/lib/permissions/index.ts`
- **Vulnerability:**
  ```typescript
  export async function assertAdmin(): Promise<void> {
    const currentUser = await getCurrentUser();
    // ...
    const isAuthorized =
      role === 'ADMIN' ||
      role === 'COACH' || // <-- VULNERABILITY: Coach passes assertAdmin!
      email.includes('admin') ||
      email.includes('coach');
    // ...
  }
  ```
- **Exploitation:** Any coach, or any user whose email contains the substring `"coach"` or `"admin"` (e.g., `coachingfan@gmail.com` or `admin_helper@test.com`), passes administrative checks and could trigger `convertBookingToStudentAction` or administrative endpoints!
- **Mandatory Fix:** Remove role-broadening and string matching. Enforce exact role check against verified database user record:
  ```typescript
  export async function assertAdmin(): Promise<void> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN' || !currentUser.isActive) {
      throw new ForbiddenError('Action requires administrator privileges.');
    }
  }
  ```

#### 2. 🟠 HIGH RISK — Middleware Skipping `is_active` Enforcement
- **Vulnerability:** In `src/middleware.ts` (lines 49–57), `is_active` is queried from `public.users`:
  ```typescript
  supabase.from('users').select('role, is_active').eq('id', user.id).single()
  ```
  However, lines 77–98 evaluate only `role` and **never check `if (!profile.is_active)`**.
- **Exploitation:** A deactivated student, disabled coach, or blocked admin whose Supabase Auth JWT is still valid can continue browsing all protected `/dashboard` and `/classroom` routes until the JWT expires.
- **Mandatory Fix:** Add active status gate immediately following role check:
  ```typescript
  if (profile && profile.is_active === false) {
    return redirectWithCookies(new URL('/unauthorized?reason=disabled', request.url));
  }
  ```

---

### 🟡 MEDIUM RISK ISSUES (Data Integrity & Client Spoofing Prevention)

#### 1. 🟡 MEDIUM RISK — Never Trust Client-Supplied Identifiers
- **Risk:** Client components must never pass `user_id`, `coach_id`, or `role` as trusted parameters in server actions.
- **Requirement:**
  - When a coach updates a class or attendance record, `coach_id` must be resolved server-side from `auth.uid() -> users.id -> coach_profiles.id`.
  - When an admin converts a booking, the admin credentials must be verified via `assertAdmin()` before invoking Supabase Auth Admin API.

#### 2. 🟡 MEDIUM RISK — Rate Limiting on Public Endpoints
- Both `/api/book-demo` (public booking) and the new career submission endpoint `/api/careers/apply` allow unauthenticated write operations to the database.
- **Requirement:** Enforce Upstash / in-memory IP rate limiting (maximum 5 submissions per IP per hour) and CAPTCHA / Honeypot fields to prevent automated lead or spam injection.

---

### 🟢 LOW RISK & ✅ SAFE ARCHITECTURAL GUARANTEES

- ✅ **SAFE — Separation of Live Classroom & WebRTC:** Realtime chessboard state, moves, engine analysis, and WebRTC classroom interactions rely on `classroom_v2` channel architectures and do not query recruitment or CRM tables.
- ✅ **SAFE — Third-Party Integrations:** Zoom Cloud and Google Meet integrations are isolated to `classes.zoom_meeting_url` and `coach_google_tokens`. Careers and Demo CRM additions introduce zero schema side-effects to these tables.
- ✅ **SAFE — Student Progress & Homework:** Homework progress, bot training profiles, opening repertoires, and puzzle attempts reference only `student_profiles(id)` and `users(id)`, ensuring total isolation from CRM pipelines.
- 🟢 **LOW RISK — Public Job Listing Cache:** Because public visitors frequently view career listings, public queries for `status = 'PUBLISHED'` can be aggressively cached (e.g. Next.js `revalidate: 3600`) without leaking unpublished drafts.

---

## 4. Security Verification Checklist for Implementation

Before applying the migration in Phase 2:
- [ ] Confirm RLS is enabled on `job_openings`, `career_applications`, and `career_application_notes`.
- [ ] Verify `career_applications` INSERT policy has restrictive `WITH CHECK` conditions.
- [ ] Verify `career_application_notes` SELECT/INSERT/UPDATE is restricted to `users.role = 'ADMIN'`.
- [ ] Confirm `resumes` storage bucket is set to `public = false`.
- [ ] Audit `src/lib/permissions/index.ts` to eliminate `role === 'COACH'` from `assertAdmin()`.
- [ ] Audit `src/middleware.ts` to ensure `is_active === false` redirects to `/unauthorized`.
- [ ] Verify zero regressions across active student/coach logins.
