import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { exchangeGoogleAuthCode, getGoogleUserEmail, verifySignedOAuthState } from '@/lib/google/meet';
import { encryptToken } from '@/lib/security/tokenEncryption';
import { saveCoachGoogleTokens, getCoachGoogleTokens } from '@/lib/google/tokens';

export const dynamic = 'force-dynamic';

/**
 * Handles the Google OAuth 2.0 redirect callback.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const redirectTarget = new URL('/dashboard/coach/classes', request.url);

  // 1. Handle coach cancellation or Google OAuth error
  if (errorParam) {
    console.warn('[Google OAuth Callback] Received error from Google:', errorParam);
    redirectTarget.searchParams.set('google_error', errorParam);
    return NextResponse.redirect(redirectTarget);
  }

  // 2. Validate state token (Check cookie first, fallback to cryptographic signature)
  const savedState = request.cookies.get('chesshub_google_oauth_state')?.value;
  const verifiedSignedState = state ? verifySignedOAuthState(state) : { isValid: false };

  const isStateValid = Boolean(
    (state && savedState && state === savedState) || verifiedSignedState.isValid
  );

  if (!isStateValid || !state) {
    console.error('[Google OAuth Callback] CSRF state mismatch or invalid state token.');
    redirectTarget.searchParams.set('google_error', 'csrf_mismatch');
    return NextResponse.redirect(redirectTarget);
  }

  // 3. Ensure authorization code is present
  if (!code) {
    redirectTarget.searchParams.set('google_error', 'missing_code');
    return NextResponse.redirect(redirectTarget);
  }

  // 4. Authenticate current user (or resolve from validated signed state)
  const admin = createSupabaseAdmin();
  let user = await getCurrentUser();

  if (!user && verifiedSignedState.isValid && verifiedSignedState.userId) {
    const { data: dbUser } = await admin
      .from('users')
      .select('id, email, role')
      .eq('id', verifiedSignedState.userId)
      .maybeSingle();

    if (dbUser) {
      user = {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.email.split('@')[0],
        firstName: 'Coach',
        lastName: 'Instructor',
        role: dbUser.role as any,
        isActive: true,
      };
    }
  }

  const userRole = user?.role?.toUpperCase();
  if (!user || (userRole !== 'COACH' && userRole !== 'ADMIN')) {
    redirectTarget.searchParams.set('google_error', 'unauthorized');
    return NextResponse.redirect(redirectTarget);
  }

  try {
    // 5. Lookup coach_profile id corresponding to current user
    let coachProfileId = user.id;
    const { data: coachProfile } = await admin
      .from('coach_profiles')
      .select('id, user_id')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    if (coachProfile?.id) {
      coachProfileId = coachProfile.id;
    }

    // 6. Exchange code for tokens (server-to-server)
    const tokenData = await exchangeGoogleAuthCode(code, request.nextUrl.origin);

    if (!tokenData.refresh_token) {
      // If a refresh token wasn't returned, check if an existing refresh token is already stored
      const existingToken = await getCoachGoogleTokens(user.id);

      if (!existingToken) {
        throw new Error('Google did not return a refresh token. Please re-authorize with consent.');
      }
    }

    // 7. Fetch user email from Google
    const email = await getGoogleUserEmail(tokenData.access_token);

    // 8. Encrypt and persist credentials
    if (tokenData.refresh_token) {
      const encrypted = encryptToken(tokenData.refresh_token);

      await saveCoachGoogleTokens(user.id, {
        email,
        encrypted_refresh_token: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.tag,
        scope: tokenData.scope || null,
      });
    }

    // 9. Clean up state cookie & redirect coach with success status
    redirectTarget.searchParams.set('google_connected', 'success');
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.delete('chesshub_google_oauth_state');

    return response;
  } catch (err: any) {
    console.error('[Google OAuth Callback Exception]:', err);
    redirectTarget.searchParams.set('google_error', encodeURIComponent(err?.message || 'token_exchange_failed'));
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.delete('chesshub_google_oauth_state');
    return response;
  }
}
