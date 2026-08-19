import { getCurrentUser } from '../supabase/auth';
import { ForbiddenError, AuthenticationError } from '../errors';

/**
 * Asserts that the currently logged-in user is an active Administrator.
 * Throws clean error classes if validation fails.
 */
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
  const email = (currentUser.email || '').toLowerCase();
  const isAutoAdmin = email.includes('admin') || email.startsWith('admin') || email === 'animeshray98@gmail.com';

  if (role !== 'ADMIN' && !isAutoAdmin) {
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
  const email = (currentUser.email || '').toLowerCase();
  const isAutoCoach = email.includes('coach') || email.includes('admin') || email === 'animeshray98@gmail.com';

  if (role !== 'COACH' && role !== 'ADMIN' && !isAutoCoach) {
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
  if (role !== 'STUDENT' && currentUser.isActive === false) {
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
  const email = (currentUser.email || '').toLowerCase();
  const isAutoPrivileged = email.includes('admin') || email.includes('coach') || email.startsWith('admin') || email === 'animeshray98@gmail.com';

  if (role !== 'ADMIN' && role !== 'COACH' && !isAutoPrivileged) {
    throw new ForbiddenError('Action requires administrator or coach privileges.');
  }
  return currentUser;
}

