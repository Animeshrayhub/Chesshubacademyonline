import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { exchangeGoogleAuthCode, getGoogleUserEmail } from '@/lib/google/meet';
import { encryptToken } from '@/lib/security/tokenEncryption';

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

  // 2. Validate state token against httpOnly cookie (CSRF defense)
  const savedState = request.cookies.get('chesshub_google_oauth_state')?.value;
  if (!state || !savedState || state !== savedState) {
    console.error('[Google OAuth Callback] CSRF state mismatch or missing state token.');
    redirectTarget.searchParams.set('google_error', 'csrf_mismatch');
    return NextResponse.redirect(redirectTarget);
  }

  // 3. Ensure authorization code is present
  if (!code) {
    redirectTarget.searchParams.set('google_error', 'missing_code');
    return NextResponse.redirect(redirectTarget);
  }

  // 4. Authenticate current user and enforce Coach or Admin authorization
  const user = await getCurrentUser();
  if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
    redirectTarget.searchParams.set('google_error', 'unauthorized');
    return NextResponse.redirect(redirectTarget);
  }

  try {
    const admin = createSupabaseAdmin();

    // 5. Lookup coach_profile id corresponding to current user
    let coachProfileId = user.id;
    const { data: coachProfile } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (coachProfile?.id) {
      coachProfileId = coachProfile.id;
    }

    // 6. Exchange code for tokens (server-to-server)
    const tokenData = await exchangeGoogleAuthCode(code);

    if (!tokenData.refresh_token) {
      // If a refresh token wasn't returned, check if an existing refresh token is already stored
      const { data: existingToken } = await admin
        .from('coach_google_tokens')
        .select('id')
        .eq('coach_id', coachProfileId)
        .maybeSingle();

      if (!existingToken) {
        throw new Error('Google did not return a refresh token. Please re-authorize with consent.');
      }
    }

    // 7. Encrypt refresh token with AES-256-GCM
    const email = await getGoogleUserEmail(tokenData.access_token);

    if (tokenData.refresh_token) {
      const encrypted = encryptToken(tokenData.refresh_token);

      // 8. Upsert encrypted credentials into coach_google_tokens
      const { error: upsertErr } = await admin
        .from('coach_google_tokens')
        .upsert(
          {
            coach_id: coachProfileId,
            google_account_email: email,
            encrypted_refresh_token: encrypted.ciphertext,
            iv: encrypted.iv,
            auth_tag: encrypted.tag,
            scope: tokenData.scope || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'coach_id' }
        );

      if (upsertErr) {
        throw new Error(`Failed to store Google token in database: ${upsertErr.message}`);
      }
    } else if (email) {
      // Update email if only access token was refreshed
      await admin
        .from('coach_google_tokens')
        .update({
          google_account_email: email,
          updated_at: new Date().toISOString(),
        })
        .eq('coach_id', coachProfileId);
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
