# ChessHub Academy — Application Security Fix Plan
## Remediation Guide for Application Permissions & Edge Middleware
**Document ID:** `CHESSHUB_ADMIN_SECURITY_FIX_PLAN.md`  
**Date:** September 2026  
**Status:** PROPOSED & PREPARED (No code modified yet — awaiting execution approval)  
**Target Environment:** ChessHub Academy (`d:\newchesshub`)  

---

## 1. Overview & Security Objectives

During the architectural audit, two high-risk authorization vulnerabilities were discovered in the application layer:
1. **`src/lib/permissions/index.ts`:** Inadvertently permits users with `role === 'COACH'` or emails containing the substring `"admin"` or `"coach"` into `assertAdmin()`.
2. **`src/middleware.ts`:** Queries `is_active` from `public.users` during route verification but never evaluates it, allowing deactivated users to access `/dashboard` and `/classroom`.

This document outlines the **exact, minimal, non-breaking remediation plan** that preserves existing authentication while enforcing strict database-grounded security.

---

## 2. Fix 1: `src/lib/permissions/index.ts`

### File Path: [`src/lib/permissions/index.ts`](file:///d:/newchesshub/src/lib/permissions/index.ts)

### Current Vulnerable Code (Lines 10–30):
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
    role === 'COACH' || // <-- VULNERABILITY: Coaches pass Admin assertions
    email.includes('admin') || // <-- VULNERABILITY: Any email containing 'admin' passes
    email.includes('coach') || // <-- VULNERABILITY: Any email containing 'coach' passes
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

### Proposed Secure Remediation:
```typescript
import { getCurrentUser } from '../supabase/auth';
import { ForbiddenError, AuthenticationError } from '../errors';

/**
 * Asserts that the currently logged-in user is an active Administrator.
 * Strictly verifies role and active status against canonical database user record.
 */
export async function assertAdmin(): Promise<any> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated. Please log in as an Administrator.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const isActive = currentUser.isActive !== false;

  if (role !== 'ADMIN' || !isActive) {
    throw new ForbiddenError('Action requires administrator privileges.');
  }

  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Coach or Administrator.
 */
export async function assertCoach(): Promise<any> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const isActive = currentUser.isActive !== false;

  if ((role !== 'COACH' && role !== 'ADMIN') || !isActive) {
    throw new ForbiddenError('Action requires coach privileges.');
  }
  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Student.
 */
export async function assertStudent(): Promise<any> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const isActive = currentUser.isActive !== false;

  if (role !== 'STUDENT' || !isActive) {
    throw new ForbiddenError('Action requires student privileges.');
  }
  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Administrator or Coach.
 */
export async function assertAdminOrCoach(): Promise<any> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const isActive = currentUser.isActive !== false;

  if ((role !== 'ADMIN' && role !== 'COACH') || !isActive) {
    throw new ForbiddenError('Action requires administrator or coach privileges.');
  }
  return currentUser;
}
```

### Security Benefits:
- Eliminates coach privilege escalation into administrative functions (`convertBookingToStudentAction`, etc.).
- Eliminates substring injection via arbitrary email domains.
- Automatically gates deactivated accounts (`isActive === false`).

---

## 3. Fix 2: `src/middleware.ts`

### File Path: [`src/middleware.ts`](file:///d:/newchesshub/src/middleware.ts)

### Current Vulnerable Code (Lines 48–80):
```typescript
    const [maintRes, profileRes] = await Promise.all([
      supabase
        .from('system_config')
        .select('value')
        .eq('key', 'MAINTENANCE_MODE')
        .maybeSingle(),
      supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single(),
    ]);

    const isMaintenanceActive = maintRes.data?.value === 'true';
    const profile = profileRes.data;

    const userEmail = (user.email || '').toLowerCase();
    const userMetaRole = (user.user_metadata?.role || '').toString().toUpperCase();
    let role = (profile?.role || user.app_metadata?.role || user.user_metadata?.role || '').toString().toUpperCase();

    // Hardcoded overrides exist here...
    if (!['ADMIN', 'COACH', 'STUDENT'].includes(role)) {
      return redirectWithCookies(new URL('/unauthorized', request.url));
    }
    // Notice: profile.is_active is NEVER evaluated!
```

### Proposed Secure Remediation:
Insert active account enforcement immediately after fetching the profile:

```typescript
    // Enforce Active Account Status (Disabled users cannot enter dashboard/classroom)
    if (profile && profile.is_active === false) {
      return redirectWithCookies(new URL('/unauthorized?reason=account_disabled', request.url));
    }

    // Role resolution with strict fallback to database profile
    let role = (profile?.role || user.app_metadata?.role || '').toString().toUpperCase();

    if (!['ADMIN', 'COACH', 'STUDENT'].includes(role)) {
      return redirectWithCookies(new URL('/unauthorized', request.url));
    }
```

### Security Benefits:
- Disabled coaches, students, and admins are immediately halted at the edge middleware before any dashboard page or classroom route renders.
- Closes the session token window between user deactivation and Supabase Auth JWT expiration.

---

## 4. Verification & Testing Plan

Once approved, test the fixes with:
1. **Admin Login Test:** Log in as Administrator -> Verify access to `/dashboard/admin` and all admin actions.
2. **Coach Privilege Escalation Test:** Log in as Coach -> Verify access to `/dashboard/coach`, but attempt to invoke `convertBookingToStudentAction` or navigate to `/dashboard/admin` -> Confirm rejection with 403 Forbidden.
3. **Deactivated User Test:** Update a test user's status to `DISABLED` (`is_active = false`) -> Attempt navigation to `/dashboard` -> Confirm redirection to `/unauthorized`.
