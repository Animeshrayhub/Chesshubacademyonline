/**
 * Shared booking helpers and validators safe for both Client and Server components.
 * Contains ZERO server-only imports (e.g. no next/headers, no pg/supabase admin).
 */

/**
 * Validates student age: must be an integer between 3 and 100 inclusive.
 */
export function validateStudentAge(rawAge: any): { valid: boolean; age?: number; error?: string } {
  if (rawAge === undefined || rawAge === null || rawAge === '') {
    return { valid: false, error: "Student's age is required." };
  }
  const num = typeof rawAge === 'number' ? rawAge : Number(rawAge);
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'Student age must be an integer (no decimals or non-numeric values).' };
  }
  if (num < 3 || num > 100) {
    return { valid: false, error: 'Student age must be between 3 and 100 years inclusive.' };
  }
  return { valid: true, age: num };
}

/**
 * Validates Google Meet URL format.
 */
export function isValidGoogleMeetUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const meetPattern = /^https:\/\/meet\.google\.com\/[a-z0-9\-]+(\?.*)?$/i;
  return meetPattern.test(trimmed);
}

/**
 * Generates a customer-facing safe booking reference.
 */
export function getBookingReference(id: string): string {
  if (!id) return 'CHA-DEMO';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  return `CHA-${clean.slice(0, 8).toUpperCase()}`;
}
