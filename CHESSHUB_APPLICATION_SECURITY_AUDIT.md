# ChessHub Academy — Application Security Audit
**Phase 4: Application Security Hardening**
**Target:** `src/lib/permissions/index.ts`, `src/middleware.ts`, caller modules, server actions, and API routes.

---

## 1. Executive Summary

This audit assesses the current state of authentication, role resolution, status enforcement (`is_active` / `status`), and authorization boundaries (IDOR prevention) across the ChessHub Academy platform.

Multiple critical vulnerabilities were identified in the existing authorization helpers (`assertAdmin`, `assertCoach`, `assertStudent`, `assertAdminOrCoach`), middleware routing controls, and resource access patterns:
1. **Coach Privilege Escalation to Admin:** `assertAdmin()` explicitly treats any user with `role === 'COACH'` as authorized for administrative operations.
2. **Email Substring / Hardcoded Bypass:** Authorization relies on email substring matching (e.g. `email.includes('admin')`, `email.includes('coach')`) and hardcoded personal email addresses (`royduguu786@gmail.com`, `animesh@gmail.com`, `admin@chesshub.com`, etc.).
3. **Deactivated/Disabled User Bypass:** 
   - `assertAdmin()` and `assertCoach()` do not inspect `currentUser.isActive` or `currentUser.status`. A disabled administrator or coach remains fully authorized.
   - `assertStudent()` contains faulty boolean logic: `if (role !== 'STUDENT' && currentUser.isActive === false)`, which fails to reject disabled students (`false && false === false`).
   - `src/middleware.ts` extracts `is_active` from `public.users` but never evaluates it in access control checks, allowing deactivated accounts with active sessions to navigate protected dashboard and classroom routes.
4. **IDOR & Cross-Tenant Data Access in Coach & Student Domains:**
   - `getCourseSyllabus()` in `src/lib/homework/index.ts` bypasses authentication completely if a client provides `studentProfileId`, allowing any caller to inspect any student's homework, modules, assignments, and submissions.
   - `getHomeworkProgress()` and `/api/homework/progress` perform no authentication or ownership verification.
   - `getCoachCohort()` and `getCoachStats()` in `src/lib/coaches/index.ts` catch authorization failures and fall back to querying a default coach from `public.users`, exposing coach data to unauthenticated callers.
   - `getCoachClasses()` in `src/lib/coaches/index.ts` returns all academy classes to any coach, and automatically reassigns unassigned classes to the requesting coach.
   - `markClassAttendance()` and `saveStudentNoteAction()` in `src/lib/coaches/index.ts` allow a coach to modify records of unassigned classes and students without verifying coach assignment.

---

## 2. Current Implementation Analysis

### 2.1 Current `assertAdmin()` Behavior (`src/lib/permissions/index.ts`)
```typescript
export async function assertAdmin(): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated. Please log in as an Administrator.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const email = (currentUser.email || '').toLowerCase();

  const isAuthorized =
    role === 'ADMIN' ||
    role === 'COACH' ||
    email.includes('admin') ||
    email.includes('coach') ||
    email.startsWith('admin') ||
    email === 'royduguu786@gmail.com' ||
    email === 'animesh@gmail.com' ||
    email === 'admin@chesshub.com' ||
    email === 'animeshray98@gmail.com';

  if (!isAuthorized) {
    throw new ForbiddenError('Action requires administrator privileges.');
  }
}
```
**Flaws:**
- Permissive role check allows `role === 'COACH'` to pass admin checks.
- Email substring matching (`email.includes('admin')`, `email.includes('coach')`) allows any student with "admin" or "coach" anywhere in their email (e.g. `badminton.fan@gmail.com` or `coachpotato@gmail.com`) to gain Admin privileges.
- Hardcoded email whitelist overrides database role.
- Never checks `currentUser.isActive` or `currentUser.status`.

### 2.2 Current Middleware Authentication & Role Resolution (`src/middleware.ts`)
```typescript
// Fetches session via updateSession
const { response, user, error, supabase } = await updateSession(request);
...
// Parallel fetch:
const [maintRes, profileRes] = await Promise.all([
  supabase.from('system_config').select('value').eq('key', 'MAINTENANCE_MODE').maybeSingle(),
  supabase.from('users').select('role, is_active').eq('id', user.id).single(),
]);

const profile = profileRes.data;
const userEmail = (user.email || '').toLowerCase();
let role = (profile?.role || user.app_metadata?.role || user.user_metadata?.role || '').toString().toUpperCase();

// Hardcoded email overrides
if (
  userEmail === 'royduguu786@gmail.com' ||
  userEmail === 'admin@chesshub.com' ||
  userEmail.startsWith('admin@')
) {
  role = 'ADMIN';
} else if (
  userEmail === 'animesh@gmail.com' ||
  userEmail === 'coach.alex@chesshub.com' ||
  userEmail.startsWith('coach@')
) {
  role = 'COACH';
}

if (!['ADMIN', 'COACH', 'STUDENT'].includes(role)) {
  return redirectWithCookies(new URL('/unauthorized', request.url));
}
...
// Maintenance mode & route prefix checks follow, but profile.is_active is NEVER checked!
```
**Flaws:**
- `profile.is_active` is retrieved from `public.users` on line 50, but **never inspected** on lines 56–99. Deactivated or suspended accounts with valid JWTs can access all matching dashboard routes.
- Hardcoded email overrides grant `ADMIN` or `COACH` status regardless of database role or active status.
- Does not check `status === 'ACTIVE'`.
- Trust chain falls back to client-controlled `user.user_metadata?.role` if the database record is not present.

### 2.3 Current `assertCoach()`, `assertStudent()`, and `assertAdminOrCoach()` Behavior
- **`assertCoach()`**: Allows `role === 'COACH' || role === 'ADMIN'` as well as substring matches (`email.includes('coach') || email.includes('admin')`) and hardcoded emails. Does not verify `isActive` or `status === 'ACTIVE'`.
- **`assertStudent()`**: Contains buggy logic:
  ```typescript
  if (role !== 'STUDENT' && currentUser.isActive === false) {
    throw new ForbiddenError('Action requires student privileges.');
  }
  ```
  If `currentUser` has `role === 'STUDENT'` and `isActive === false`, the condition evaluates to `false && true === false`, so it **does not throw**, permitting disabled students to execute student actions.
- **`assertAdminOrCoach()`**: Contains identical email substring and hardcoded email bypasses as `assertAdmin()`.

---

## 3. Inventory of Callers

### 3.1 Callers of `assertAdmin()`
- **`src/lib/users/index.ts`**:
  - `createCoach()` (line 30)
  - `createStudent()` (line 160)
  - `createAdmin()` (line 330)
  - `updateUserProfile()` (line 401)
  - `updateUserRole()` (line 473)
  - `toggleUserActive()` (line 517)
  - `archiveUser()` (line 628)
  - `restoreUser()` (line 668)
  - `hardDeleteUser()` (line 707)
  - `resetUserPassword()` (line 829)
  - `listUsers()` (line 937)
- **`src/lib/students/index.ts`**:
  - `listStudents()` (line 111)
  - `getStudentDetails()` (line 226)
  - `updateStudentProfile()` (line 311)
  - `assignCoach()` (line 421)
- **`src/lib/coaches/index.ts`**:
  - `listCoaches()` (line 18)
  - `getCoachDetails()` (line 90)
  - `updateCoachProfile()` (line 144)
- **`src/lib/classes/index.ts`**:
  - `listClasses()` (line 116)
  - `archiveClass()` (line 829)
- **`src/lib/bookings/index.ts`**:
  - `listBookings()` (line 19)
  - `updateBookingStatus()` (line 54)
  - `assignCoachToBooking()` (line 94)
  - `convertBookingToStudent()` (line 159)
  - `rescheduleBooking()` (line 310)
- **`src/lib/certificates/index.ts`**:
  - `listCertificates()` (line 17)
  - `createCertificate()` (line 63)
  - `revokeCertificate()` (line 108)
- **`src/lib/announcements/index.ts`**:
  - `listAnnouncements()` (line 18)
  - `createAnnouncement()` (line 52)
  - `updateAnnouncement()` (line 88)
  - `deleteAnnouncement()` (line 125)
- **`src/lib/homework/index.ts`**:
  - `createWorkbook()` (line 129)
  - `updateWorkbook()` (line 172)
  - `deleteWorkbook()` (line 214)
  - `updateChapter()` (line 695)
  - `deleteChapter()` (line 751)
  - `reorderChapters()` (line 786)
  - `createHomework()` (line 921)
  - `updateHomework()` (line 958)
  - `deleteHomework()` (line 981)
- **`src/lib/homework/puzzles.ts`**:
  - `createPuzzle()` (line 54)
  - `updatePuzzle()` (line 92)
  - `deletePuzzle()` (line 119)

### 3.2 Callers of `assertCoach()`
- **`src/lib/coaches/index.ts`**:
  - `getMyCoachProfile()` (line 240)
  - `updateMyCoachProfile()` (line 310)
  - `getCoachStats()` (line 408)
  - `getCoachCohort()` (line 535)
  - `getCoachClasses()` (line 672)
  - `saveStudentNoteAction()` (line 890)
  - `getCoachAttendanceLogs()` (line 953)
  - `markClassAttendance()` (line 1046)
  - `getCoachClassRecordings()` (line 1134)
- **`src/lib/homework/index.ts`**:
  - `assignPracticeGameToStudent()` (line 2760)
- **`src/lib/homework/puzzles.ts`**:
  - `coachUnlockNextChapter()` (line 670)
- **`src/app/dashboard/coach/homework/analytics/[homeworkId]/page.tsx`**:
  - Page loader check (line 21)

### 3.3 Callers of `assertStudent()`
- **`src/lib/students/index.ts`**:
  - `getStudentProfile()` (line 540)
  - `getStudentDashboardStats()` (line 856)
  - `getStudentClasses()` (line 1040)
  - `getStudentCompletedClasses()` (line 1152)
  - `getStudentHomework()` (line 1237)
  - `updateMyStudentProfile()` (line 1300)
  - `getStudentEnrollments()` (line 1393)
- **`src/lib/homework/puzzles.ts`**:
  - `requestHint()` (line 541)
  - `unlockSolution()` (line 597)
  - `getStudentPuzzleAnalytics()` (line 853)
- **`src/lib/homework/index.ts`**:
  - `getCourseSyllabus()` (line 1233)
- **`src/app/dashboard/student/homework/solve/[assignmentId]/page.tsx`**:
  - Page loader check (line 20)

### 3.4 Callers of `assertAdminOrCoach()`
- **`src/lib/classes/index.ts`**:
  - `createClass()` (line 229)
  - `updateClass()` (line 587)
- **`src/lib/homework/index.ts`**:
  - `listWorkbooks()` (line 56)
  - `createChapter()` (line 675)
  - `listChapterPuzzles()` (line 808)
  - `assignHomeworkToStudent()` (line 847)
  - `bulkAssignHomework()` (line 904)
  - `getHomeworkAnalytics()` (line 1030)
- **`src/lib/homework/puzzles.ts`**:
  - `listPuzzles()` (line 32)
  - `bulkCreatePuzzles()` (line 140)
  - `getPuzzleById()` (line 174)
  - `getChapterPuzzles()` (line 191)
  - `getAssignmentAttempts()` (line 739)
  - `resetStudentChapterAttempts()` (line 1005)
- **`src/app/api/admin/openings/create/route.ts`**:
  - Route handler authorization (line 10)

---

## 4. Exact Vulnerabilities Found

| # | Vulnerability | Location | Severity | Description |
|---|---|---|---|---|
| **V-01** | Coach Privilege Escalation | `src/lib/permissions/index.ts:18-19` | Critical | `assertAdmin()` allows `role === 'COACH'`, letting coaches access admin mutations (user management, database resets, etc.). |
| **V-02** | Email Substring Authorization Bypass | `src/lib/permissions/index.ts:20-22` | Critical | Anyone with "admin" or "coach" anywhere in their email passes admin/coach authorization checks. |
| **V-03** | Hardcoded Email Backdoors | `src/lib/permissions/index.ts:23-26`, `src/middleware.ts:63-75` | High | Specific personal emails are hardcoded to grant `ADMIN` or `COACH` roles, ignoring DB state. |
| **V-04** | Disabled / Deactivated Admin Access | `src/lib/permissions/index.ts:8-31` | High | `assertAdmin()` never checks `is_active` or `status === 'ACTIVE'`. Disabled admins can still execute actions. |
| **V-05** | Disabled Account Access in Middleware | `src/middleware.ts:49-98` | High | Middleware retrieves `is_active` from DB but never verifies it; deactivated accounts can access protected dashboards. |
| **V-06** | Student Auth Logic Flaw | `src/lib/permissions/index.ts:73` | Medium | `assertStudent()` check `role !== 'STUDENT' && currentUser.isActive === false` fails to reject deactivated students. |
| **V-07** | IDOR via Optional Client Parameter | `src/lib/homework/index.ts:1230-1241` | High | `getCourseSyllabus()` accepts `studentProfileId` without auth check; unauthenticated callers can view any student's syllabus/homework. |
| **V-08** | Unauthenticated Progress Exposure | `src/app/api/homework/progress/route.ts:10-36` | Medium | Endpoint takes `assignmentId` and returns full progress/attempts with zero auth or ownership verification. |
| **V-09** | Unauthorized Coach Impersonation Fallback | `src/lib/coaches/index.ts:407-417, 534-544` | High | `getCoachStats()` and `getCoachCohort()` catch auth errors and fall back to querying a default coach, exposing coach data. |
| **V-10** | Cross-Coach Class Exposure & Hijacking | `src/lib/coaches/index.ts:690-701` | High | `getCoachClasses()` selects all academy classes and automatically reassigns unassigned classes to the calling coach. |
| **V-11** | Cross-Coach Student Note Overwrite | `src/lib/coaches/index.ts:885-930` | Medium | `saveStudentNoteAction()` accepts arbitrary `studentProfileId` without verifying the student is assigned to this coach. |
| **V-12** | Cross-Coach Attendance Hijacking | `src/lib/coaches/index.ts:1040-1120` | Medium | `markClassAttendance()` accepts arbitrary `classId` without verifying the coach is assigned to that class. |

---

## 5. Remediation Plan

1. **Harden `src/lib/permissions/index.ts`:**
   - Resolve canonical user via `getCurrentUser()` querying `public.users`.
   - `assertAdmin()` must strictly require: `role === 'ADMIN' && isActive === true && status === 'ACTIVE'`.
   - `assertCoach()` must require: `(role === 'COACH' || role === 'ADMIN') && isActive === true && status === 'ACTIVE'`.
   - `assertStudent()` must require: `role === 'STUDENT' && isActive === true && status === 'ACTIVE'`.
   - `assertAdminOrCoach()` must require: `(role === 'ADMIN' || role === 'COACH') && isActive === true && status === 'ACTIVE'`.
   - Remove all email substring checks, hardcoded email lists, and client role trust.

2. **Harden `src/middleware.ts`:**
   - Check `profile.is_active` and `profile.status`: if `profile.is_active === false` or `profile.status !== 'ACTIVE'`, redirect to `/unauthorized?reason=account_disabled`.
   - Remove hardcoded email role overrides and email substring role assignments.
   - Enforce strict role-based dashboard route prefixes (`/dashboard/admin` only for `ADMIN`, `/dashboard/coach` only for `COACH`, `/dashboard/student` only for `STUDENT`).
   - Retain full compatibility with Zoom, Google Meet, Realtime, Supabase Auth session refresh, and security headers.

3. **Harden IDOR and Ownership Boundaries:**
   - Remove insecure default coach fallbacks in `src/lib/coaches/index.ts`.
   - Ensure coach functions filter by `coach_id` assigned to the authenticated coach.
   - In `src/lib/homework/index.ts`, require that `getCourseSyllabus()` validates that the caller owns the student profile or has Admin/assigned-Coach role.
   - In `src/app/api/homework/progress/route.ts`, verify user authentication and ownership of `assignmentId`.
   - In `src/lib/homework/puzzles.ts`, ensure `getChapterPuzzlesForStudent()`, `requestHint()`, and `unlockSolution()` verify that the assignment belongs to the authenticated student.

4. **Error Handling & Sanitization:**
   - Ensure no raw database errors, SQL errors, or stack traces are exposed in API responses.

5. **Security & Regression Testing:**
   - Test all 14 specified security scenarios.
   - Run TypeScript type checks (`tsc --noEmit`) to verify zero regressions.
