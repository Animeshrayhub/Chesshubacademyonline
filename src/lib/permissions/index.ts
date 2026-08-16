import { getCurrentUser } from '../supabase/auth';
import { ForbiddenError, AuthenticationError } from '../errors';

/**
 * Asserts that the currently logged-in user is an active Administrator.
 * Throws clean error classes if validation fails.
 */
export async function assertAdmin(): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated. Please log in as an Administrator.');
  }

  const role = (currentUser.role || '').toUpperCase();
  if (role !== 'ADMIN' || currentUser.isActive === false) {
    throw new ForbiddenError('Action requires administrator privileges.');
  }
}

/**
 * Asserts that the currently logged-in user is an active Coach.
 * Throws clean error classes if validation fails.
 */
export async function assertCoach(): Promise<any> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  if (role !== 'COACH' || currentUser.isActive === false) {
    throw new ForbiddenError('Action requires coach privileges.');
  }
  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Student.
 * Throws clean error classes if validation fails.
 */
export async function assertStudent(): Promise<any> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  if (role !== 'STUDENT' || currentUser.isActive === false) {
    throw new ForbiddenError('Action requires student privileges.');
  }
  return currentUser;
}

/**
 * Asserts that the currently logged-in user is an active Administrator or Coach.
 * Throws clean error classes if validation fails.
 */
export async function assertAdminOrCoach(): Promise<any> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AuthenticationError('User is not authenticated.');
  }

  const role = (currentUser.role || '').toUpperCase();
  if ((role !== 'ADMIN' && role !== 'COACH') || currentUser.isActive === false) {
    throw new ForbiddenError('Action requires administrator or coach privileges.');
  }
  return currentUser;
}

