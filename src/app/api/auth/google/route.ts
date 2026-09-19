import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getGoogleOAuthConsentUrl } from '@/lib/google/meet';

export const dynamic = 'force-dynamic';

/**
 * Initiates the Google Meet OAuth connection flow for coaches.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Strict Role-Based Boundary: only Coaches and Admins can connect Google Meet
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', '/dashboard/coach/classes');
      return NextResponse.redirect(loginUrl);
    }

    // 1. Generate cryptographically secure CSRF state
    const stateToken = crypto.randomBytes(32).toString('hex');

    // 2. Build Google OAuth consent URL
    const googleConsentUrl = getGoogleOAuthConsentUrl(stateToken);

    // 3. Set secure, httpOnly state cookie with 10-minute expiry
    const response = NextResponse.redirect(googleConsentUrl);
    response.cookies.set('chesshub_google_oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (err: any) {
    console.error('[Google OAuth Init Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initiate Google OAuth flow.' },
      { status: 500 }
    );
  }
}
