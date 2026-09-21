import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getGoogleOAuthConsentUrl, createSignedOAuthState } from '@/lib/google/meet';

export const dynamic = 'force-dynamic';

/**
 * Initiates the Google Meet OAuth connection flow for coaches.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userRole = user?.role?.toUpperCase();

    // Strict Role-Based Boundary: only Coaches and Admins can connect Google Meet
    if (!user || (userRole !== 'COACH' && userRole !== 'ADMIN')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', '/dashboard/coach/classes');
      return NextResponse.redirect(loginUrl);
    }

    // 1. Generate cryptographically secure and signed CSRF state with user ID binding
    const stateToken = createSignedOAuthState(user.id);

    // 2. Build Google OAuth consent URL with current origin
    const googleConsentUrl = getGoogleOAuthConsentUrl(stateToken, request.nextUrl.origin);

    // 3. Set secure, httpOnly state cookie with 15-minute expiry
    const response = NextResponse.redirect(googleConsentUrl);
    response.cookies.set('chesshub_google_oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, // 15 minutes
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
