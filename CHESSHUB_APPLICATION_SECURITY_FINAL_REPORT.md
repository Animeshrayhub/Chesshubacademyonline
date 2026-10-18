# Application Security Final Report

**ChessHub Academy — Phase 4: Application Security Hardening**  
**Execution Date:** 2026-09-27  
**Scope:** Minimal application security hardening covering `assertAdmin()`, `middleware.ts`, caller services, IDOR boundaries, error sanitization, and security regressions.

---

## 1. Files Audited

1. `src/lib/permissions/index.ts` — Central permission assertion helpers (`assertAdmin`, `assertCoach`, `assertStudent`, `assertAdminOrCoach`).
2. `src/middleware.ts` — Edge middleware request interceptor and route-level protection.
3. `src/lib/supabase/auth.ts` — Authentication session resolution, profile extraction (`getCurrentUser`), and sign-in handling.
4. `src/lib/users/index.ts` — User provisioning, role assignment, status toggling, and administrative account management.
5. `src/lib/students/index.ts` — Student dashboard data resolution, profile updates, and coach assignment.
6. `src/lib/coaches/index.ts` — Coach cohort management, attendance logging, private notes, and class scheduling.
7. `src/lib/classes/index.ts` — Class creation, updates, and schedule management.
8. `src/lib/bookings/index.ts` — Demo bookings and conversion to enrolled students.
9. `src/lib/certificates/index.ts` — Student certificate management.
10. `src/lib/announcements/index.ts` — Academy announcements.
11. `src/lib/homework/index.ts` — Course syllabus, homework chapters, workbooks, and practice game assignments.
12. `src/lib/homework/puzzles.ts` — Puzzle assignments, hint requests, solution unlocks, and progress queries.
13. `src/app/api/admin/config/route.ts` — System configuration GET/POST route.
14. `src/app/api/admin/openings/create/route.ts` — Opening creation API endpoint.
15. `src/app/api/admin/openings/ingest/route.ts` — Opening batch ingestion endpoint.
16. `src/app/api/coach/openings/route.ts` — Coach opening management and student override route.
17. `src/app/api/homework/progress/route.ts` — Homework progress and attempt tracking API.
18. `src/app/api/homework/session/route.ts` — Student homework session loader.
19. `src/app/api/homework/hint/route.ts` — Hint request API.
20. `src/app/api/homework/unlock/route.ts` — Solution and chapter unlock API.
21. `src/app/api/games/route.ts` & `src/app/api/games/[id]/route.ts` — Student game library management.

---

## 2. Vulnerabilities Found

| Vulnerability ID | Description | Severity | Impact |
|---|---|---|---|
| **VULN-01** | Coach-to-Admin Privilege Escalation in `assertAdmin()` (`src/lib/permissions/index.ts:18`) | Critical | Any user with role `COACH` was granted administrative privileges across all admin service actions. |
| **VULN-02** | Email Substring Authorization Bypass (`src/lib/permissions/index.ts:20-22`) | Critical | Accounts containing "admin" or "coach" anywhere in their email address gained administrative privileges. |
| **VULN-03** | Hardcoded Email Backdoors (`src/lib/permissions/index.ts:23-26`, `src/middleware.ts:63-75`) | High | Hardcoded personal email addresses overrode canonical database roles and permissions. |
| **VULN-04** | Missing Active Status Check in `assertAdmin()` & `assertCoach()` | High | Deactivated or disabled accounts (`is_active = false`, `status = 'DISABLED'`) remained authorized if role matched. |
| **VULN-05** | Middleware Ignored `is_active` and `status` (`src/middleware.ts:49-98`) | High | Deactivated users with valid sessions were allowed access to dashboard and classroom paths. |
| **VULN-06** | Student Auth Logic Flaw (`src/lib/permissions/index.ts:73`) | Medium | Flawed boolean expression (`role !== 'STUDENT' && isActive === false`) allowed deactivated students to pass. |
| **VULN-07** | IDOR via Optional Client Parameter in `getCourseSyllabus()` (`src/lib/homework/index.ts:1230`) | High | Supplying `studentProfileId` skipped authentication, exposing homework and progress across students. |
| **VULN-08** | Unauthenticated Progress Exposure (`src/app/api/homework/progress/route.ts`) | Medium | Homework progress and puzzle attempts could be queried without session verification. |
| **VULN-09** | Unauthorized Coach Impersonation Fallback (`src/lib/coaches/index.ts:407, 534`) | High | Auth errors caught and fell back to querying a default coach from the database, leaking cohort and stats. |
| **VULN-10** | Cross-Coach Class Exposure & Hijacking (`src/lib/coaches/index.ts:690-701`) | High | All academy classes were visible to any coach, and unassigned classes were reassigned automatically. |
| **VULN-11** | Cross-Coach Student Note Tampering (`src/lib/coaches/index.ts:885`) | Medium | A coach could overwrite notes on any student profile regardless of cohort assignment. |
| **VULN-12** | Cross-Coach Attendance Manipulation (`src/lib/coaches/index.ts:1040`) | Medium | A coach could create class reports and submit attendance for classes assigned to other coaches. |

---

## 3. Fixes Applied

1. **Hardened `assertAdmin()` (`src/lib/permissions/index.ts`):**
   - Strictly enforces server-side resolution via `public.users`.
   - Requires `role === 'ADMIN' && is_active === true && status === 'ACTIVE'`.
   - Completely removed all email substring matching, hardcoded email lists, and coach role bypass.
2. **Hardened `assertCoach()`, `assertStudent()`, and `assertAdminOrCoach()` (`src/lib/permissions/index.ts`):**
   - Enforce `is_active === true && status === 'ACTIVE'`.
   - Removed all email substring and hardcoded email overrides.
   - Corrected student boolean check logic.
3. **Hardened Edge Middleware (`src/middleware.ts`):**
   - Queries `role, is_active, status` directly from `public.users`.
   - Rejects unauthenticated requests with redirect to `/login?redirectTo=...`.
   - Rejects deactivated or disabled users with redirect to `/unauthorized?reason=account_disabled`.
   - Rejects non-admin users attempting to access `/dashboard/admin/*` routes.
   - Preserves compatibility with Supabase session refresh, CSP, Zoom, Google Meet, and Realtime.
4. **Hardened Session Extraction (`src/lib/supabase/auth.ts`):**
   - Updated `getCurrentUser()` and `signIn()` to query `status` alongside `is_active`.
   - Refuses session resolution for users whose `status !== 'ACTIVE'`.
   - Removed email substring heuristics from new account healing.
5. **Eliminated Coach Impersonation Fallbacks (`src/lib/coaches/index.ts`):**
   - Removed insecure `catch` blocks that fell back to querying a default coach.
   - Scoped `getCoachClasses()` strictly to classes where `coach_id` matches the authenticated coach.
   - Enforced assignment verification in `saveStudentNoteAction()` and `markClassAttendance()`.
6. **Hardened Homework and Puzzle IDOR Boundaries (`src/lib/homework/`):**
   - `getCourseSyllabus()` now validates authentication and restricts students to their own profile.
   - `getChapterPuzzlesForStudent()`, `requestHint()`, and `unlockSolution()` now verify assignment ownership.
   - `getHomeworkProgress()` and `getAssignmentAttempts()` authenticate the caller and enforce student assignment boundaries.
   - `coachUnlockNextChapter()` and `assignPracticeGameToStudent()` verify that the student is assigned to the coach.
7. **Hardened API Routes:**
   - `/api/admin/config`: Enforced active Admin verification.
   - `/api/admin/openings/create`: Updated to require `assertAdmin()`.
   - `/api/coach/openings`: Enforced that coaches can only manage students in their assigned cohort.
   - `/api/homework/progress`: Added authentication and student assignment ownership checks.

---

## 4. Admin Authorization

Every administrative action now strictly adheres to:

```
AUTHENTICATED USER (Server-side Session)
        ↓
CANONICAL RECORD FROM public.users
        ↓
role === 'ADMIN'
AND
is_active === true
AND
status === 'ACTIVE'
        ↓
AUTHORIZED
```

- **No reliance on client-supplied data:** Client headers, query parameters, local storage, request body role fields, or JWT user metadata are never trusted as the authorization authority.
- **Backward compatibility:** Preserved existing service function interfaces across all administrative callers (`src/lib/users/`, `src/lib/students/`, `src/lib/bookings/`, `src/lib/certificates/`, `src/lib/announcements/`, etc.).

---

## 5. Middleware Authorization

- Admin-protected routes (`/dashboard/admin/:path*`) reject:
  - Unauthenticated users (redirect to `/login`)
  - STUDENT users (redirect to `/unauthorized`)
  - COACH users (redirect to `/unauthorized`)
  - Disabled users where `is_active === false` or `status !== 'ACTIVE'` (redirect to `/unauthorized?reason=account_disabled`)
- Middleware is scoped to `['/dashboard', '/dashboard/:path*', '/classroom', '/classroom/:path*']` to prevent redundant network requests on public pages (`/`, `/about`, `/book-demo`, `/careers`).
- Headers, cookies, and Content Security Policy (CSP) for Zoom, Google Meet, and Supabase Realtime remain fully intact.

---

## 6. IDOR Protection

All resource-access functions now follow the ownership verification principle:

```
AUTHENTICATED USER
        ↓
SERVER-SIDE ROLE RESOLUTION
        ↓
RESOURCE OWNERSHIP / MEMBERSHIP CHECK
        ↓
EXECUTE ACTION
```

- **`classId`:** Coaches can only update classes or mark attendance if `classes.coach_id` matches their verified coach profile ID.
- **`studentId` / `studentProfileId`:** Students cannot pass another student's ID to access profiles, syllabus, or progress. Coaches cannot modify notes or practice games for students outside their assigned cohort.
- **`assignmentId`:** Puzzles, hints, solution unlocks, and progress queries strictly verify `homework_assignments.student_id` against the authenticated student.

---

## 7. Coach Authorization

- Coach access is limited to students, classes, and homework assigned to that specific coach.
- Database relationships in `coach_student_assignments` and `classes.coach_id` serve as the single source of truth.
- A Coach cannot access, modify, or take over another Coach's classes, reports, or students.

---

## 8. Student Authorization

- Student operations are bound to the authenticated user ID (`auth.users.id` / `public.users.id`).
- Supplying `studentId=<another-user-id>` or `studentProfileId=<another-profile-id>` in function calls or API requests is rejected with `ForbiddenError (403)`.
- Students cannot view or unlock solutions for another student's homework assignment.

---

## 9. Public Endpoint Protection

- **Demo Booking (`/book-demo`, `createBookingAction`):** Public booking flow remains operational for anonymous prospective students and parents.
- **Careers Application (`public.career_applications`):** Protected by database RLS; anonymous submissions are restricted to `NEW` status on `PUBLISHED` job openings. Anonymous queries cannot select or inspect submitted applications.
- **Rate Limiting Review:** Rate limiting is not applied to low-latency classroom/realtime chess moves. As no external rate-limiting infrastructure (e.g., Redis/Upstash) exists in the repository, edge/gateway rate limiting (e.g. Vercel firewall / Cloudflare) is recommended for public endpoints rather than introducing heavy new dependencies.

---

## 10. Security Tests

A dedicated 14-scenario automated test suite (`scripts/test_security_hardening.mjs`) was created and executed against the live project:

| Test Scenario | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|
| **1. Anonymous → Admin route** | Denied (Redirect `/login`) | Redirected to `/login?redirectTo=/dashboard/admin/users` | 🟢 PASS |
| **2. Student → Admin route** | Denied (403 / `/unauthorized`) | Middleware redirected to `/unauthorized`, `assertAdmin` threw Forbidden | 🟢 PASS |
| **3. Coach → Admin route** | Denied (403 / `/unauthorized`) | Middleware redirected to `/unauthorized`, `assertAdmin` rejected Coach | 🟢 PASS |
| **4. Disabled Admin → Admin route** | Denied (`account_disabled`) | `is_active=false` and `status=DISABLED` both rejected | 🟢 PASS |
| **5. Coach → another Coach's class** | Denied (Forbidden) | Denied class modification for non-owning coach | 🟢 PASS |
| **6. Coach → unassigned Student** | Denied (Forbidden) | Denied note/practice update for unassigned student | 🟢 PASS |
| **7. Student → another Student's profile** | Denied | Profile updates strictly bound to session user ID | 🟢 PASS |
| **8. Student → another Student's homework** | Denied (Forbidden) | Homework access rejected for non-owner student | 🟢 PASS |
| **9. Student → another Student's results** | Denied (Forbidden) | Progress results rejected for non-owner student | 🟢 PASS |
| **10. Invalid resource IDs** | Safe Denial (404/null) | Handled safely without SQL or internal database leaks | 🟢 PASS |
| **11. Client-supplied role = ADMIN** | Ignored | Forged role ignored; evaluated against canonical database role | 🟢 PASS |
| **12. Client-supplied foreign studentId** | Denied (Forbidden) | Overriding target student ID rejected with 403 | 🟢 PASS |
| **13. Public career application** | Restricted | Anonymous SELECT blocked (count: 0); published jobs accessible | 🟢 PASS |
| **14. Public booking** | Operational | Demo booking table accessible and operational | 🟢 PASS |

**Security Test Result:** 14/14 Passed (0 Failed).

---

## 11. Regression Tests

1. **TypeScript Type Check:**
   - Command: `npm run type-check` (`tsc --noEmit`)
   - Result: Exit code 0 (Zero errors).
2. **ESLint Validation:**
   - Command: `npm run lint`
   - Result: Exit code 0 (Zero errors; pre-existing image/hook warnings preserved without touching unrelated files).
3. **Production Build:**
   - Command: `npm run build`
   - Result: Exit code 0 (Compiled all 125 static and dynamic pages and edge middleware successfully).

---

## 12. Files Modified

1. `src/lib/permissions/index.ts` — Hardened `assertAdmin`, `assertCoach`, `assertStudent`, `assertAdminOrCoach`.
2. `src/middleware.ts` — Enforced active status check, removed hardcoded emails, secured `/dashboard/admin/*`.
3. `src/lib/supabase/auth.ts` — Updated `UserSessionProfile`, `getCurrentUser()`, and `signIn()` to query and enforce `status === 'ACTIVE'`.
4. `src/lib/coaches/index.ts` — Removed default coach fallback, scoped classes and attendance to assigned coach.
5. `src/lib/classes/index.ts` — Enforced coach ownership verification on `updateClass()`.
6. `src/lib/homework/index.ts` — Enforced authentication and ownership in `getCourseSyllabus()` and `assignPracticeGameToStudent()`.
7. `src/lib/homework/puzzles.ts` — Enforced assignment ownership on hint requests, solution unlocks, and progress queries.
8. `src/app/api/admin/config/route.ts` — Enforced active Admin status on GET and POST.
9. `src/app/api/admin/openings/create/route.ts` — Updated to require `assertAdmin()`.
10. `src/app/api/auth/google/callback/route.ts` — Added `status: 'ACTIVE'` to session profile.
11. `src/app/api/coach/openings/route.ts` — Enforced student assignment checks for coach actions.
12. `src/app/api/homework/progress/route.ts` — Enforced authentication and assignment ownership on progress and attempt queries.
13. `scripts/test_security_hardening.mjs` — Security test suite covering all 14 scenarios.
14. `CHESSHUB_APPLICATION_SECURITY_AUDIT.md` — Initial comprehensive security audit documentation.

---

## 13. Files NOT Modified

In strict adherence to instructions, the following subsystems were preserved without modification:
- Classroom architecture (`src/app/classroom/`, `src/features/classroom/`, `src/lib/classroom/`)
- Realtime Board (`src/features/realtime/`, realtime socket connections)
- Chessboard (`react-chessboard`, `chess.js`, piece movement logic)
- Zoom SDK integration (`src/lib/zoom/`, `src/actions/zoom.ts`)
- Google Meet integration (`src/lib/video/`, `src/actions/googleMeet.ts`)
- Puzzle UI components
- Homework UI components
- Student Dashboard UI
- Admin CRM UI
- Supabase schema & existing database migrations

---

## 14. Remaining Recommendations

1. **Edge-Level Rate Limiting:** Configure WAF or Cloudflare/Vercel edge rate limits on public write endpoints (`/api/bookings`, `/book-demo`, `/careers`) to prevent spam submissions without application latency.
2. **Session Invalidation on Deactivation:** While middleware and permission checks now immediately reject deactivated users, integrating Supabase Auth admin API to revoke refresh tokens (`admin.auth.admin.signOut(userId)`) upon admin deactivation will terminate client JWTs promptly.
3. **Automated CI Security Checks:** Incorporate `node scripts/test_security_hardening.mjs` into CI pipelines alongside `npm run type-check`.

---

## 15. Final Result

🟢 PASS
