import { getCurrentUser, type UserSessionProfile } from '../supabase/auth';
import { ForbiddenError, AuthenticationError } from '../errors';

/**
 * Asserts that the currently logged-in user is an active Administrator.
 * Throws clean error classes if validation fails.
 *
 * Requirements:
 * 1. Resolve the authenticated user server-side.
 * 2. Resolve the canonical user record from public.users.
 * 3. Require:
 *    role === 'ADMIN'
 *    AND
 *    is_active === true
 *    AND
 *    status === 'ACTIVE'
 *
 * Zero email substring matching, zero hardcoded emails, zero coach privilege escalation.
 */
export async function assertAdmin(): Promise<UserSessionProfile> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated. Please log in as an Administrator.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const status = (currentUser.status || (currentUser.isActive ? 'ACTIVE' : 'DISABLED')).toUpperCase();

  if (role !== 'ADMIN' || !currentUser.isActive || status !== 'ACTIVE') {
    throw new ForbiddenError('Action requires active administrator privileges.');
  }

  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Coach or Administrator.
 * Throws clean error classes if validation fails.
 */
export async function assertCoach(): Promise<UserSessionProfile> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const status = (currentUser.status || (currentUser.isActive ? 'ACTIVE' : 'DISABLED')).toUpperCase();

  if ((role !== 'COACH' && role !== 'ADMIN') || !currentUser.isActive || status !== 'ACTIVE') {
    throw new ForbiddenError('Action requires active coach privileges.');
  }

  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Student.
 * Throws clean error classes if validation fails.
 */
export async function assertStudent(): Promise<UserSessionProfile> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const status = (currentUser.status || (currentUser.isActive ? 'ACTIVE' : 'DISABLED')).toUpperCase();

  if (role !== 'STUDENT' || !currentUser.isActive || status !== 'ACTIVE') {
    throw new ForbiddenError('Action requires active student privileges.');
  }

  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Administrator or Coach.
 * Throws clean error classes if validation fails.
 */
export async function assertAdminOrCoach(): Promise<UserSessionProfile> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  const status = (currentUser.status || (currentUser.isActive ? 'ACTIVE' : 'DISABLED')).toUpperCase();

  if ((role !== 'ADMIN' && role !== 'COACH') || !currentUser.isActive || status !== 'ACTIVE') {
    throw new ForbiddenError('Action requires active administrator or coach privileges.');
  }

  return currentUser;
}
