import { SITE_URL } from '@/constants/SITE';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_MEET_SPACES_ENDPOINT = 'https://meet.googleapis.com/v1/spaces';

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

import crypto from 'node:crypto';

/**
 * Creates a cryptographically signed OAuth state containing user ID and timestamp.
 */
export function createSignedOAuthState(userId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'chesshub-default-oauth-secret';
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${hmac}`;
}

/**
 * Validates a signed OAuth state token and returns the userId if valid and not expired (15m).
 */
export function verifySignedOAuthState(state: string): { isValid: boolean; userId?: string } {
  try {
    const parts = state.split(':');
    if (parts.length !== 3) return { isValid: false };
    const [userId, timestampStr, signature] = parts;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'chesshub-default-oauth-secret';
    const expectedHmac = crypto.createHmac('sha256', secret).update(`${userId}:${timestampStr}`).digest('hex');
    if (signature !== expectedHmac) return { isValid: false };

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 15 * 60 * 1000) {
      return { isValid: false };
    }
    return { isValid: true, userId };
  } catch {
    return { isValid: false };
  }
}

/**
 * Resolves the Google OAuth redirect URI matching configured credentials.
 */
export function getGoogleRedirectUri(origin?: string): string {
  // If request origin is provided (e.g. from NextRequest), resolve matching callback URL
  if (origin) {
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) {
      return `${cleanOrigin}/api/auth/google/callback`;
    }
    return 'https://chesshubacademy.online/api/auth/google/callback';
  }
  // If explicitly configured in environment, prefer it
  if (process.env.GOOGLE_MEET_REDIRECT_URI) {
    return process.env.GOOGLE_MEET_REDIRECT_URI;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL || 'https://chesshubacademy.online';
  const cleanBase = base.replace(/\/+$/, '');
  return `${cleanBase}/api/auth/google/callback`;
}

/**
 * Generates the Google OAuth 2.0 Consent URL for Coach authentication.
 */
export function getGoogleOAuthConsentUrl(state: string, origin?: string): string {
  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_MEET_CLIENT_ID is not configured.');
  }

  const redirectUri = getGoogleRedirectUri(origin);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_MEET_SCOPES,
    access_type: 'offline', // Crucial to obtain refresh_token
    prompt: 'consent',     // Ensures refresh_token is returned on every re-connection
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

/**
 * Exchanges authorization code for Google access and refresh tokens.
 */
export async function exchangeGoogleAuthCode(code: string, origin?: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client credentials are missing from server environment.');
  }

  const redirectUri = getGoogleRedirectUri(origin);

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Refreshes an expired Google access token using the stored refresh token.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client credentials are missing from server environment.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google access token refresh failed (${res.status}): ${errText}`);
  }

  const data: { access_token: string } = await res.json();
  return data.access_token;
}

/**
 * Fetches the user's primary email from Google UserInfo.
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}

export interface GoogleMeetSpaceResult {
  spaceId: string;
  meetingUri: string;
  meetingCode?: string;
}

/**
 * Calls Google Meet REST API v2 to create a live meeting space.
 */
export async function createGoogleMeetSpace(accessToken: string): Promise<GoogleMeetSpaceResult> {
  const res = await fetch(GOOGLE_MEET_SPACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        accessType: 'OPEN', // Open access so academy students can join smoothly
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Google Meet space (${res.status}): ${errText}`);
  }

  const data = await res.json();

  if (!data.meetingUri) {
    throw new Error('Google Meet API response did not contain a meetingUri.');
  }

  return {
    spaceId: data.name, // e.g. "spaces/xyz-abc-def"
    meetingUri: data.meetingUri, // e.g. "https://meet.google.com/xyz-abc-def"
    meetingCode: data.meetingCode,
  };
}

/**
 * Calls Google Meet REST API v2 to end an active conference in a meeting space.
 */
export async function endGoogleMeetConference(spaceId: string, accessToken: string): Promise<boolean> {
  const spaceName = spaceId.startsWith('spaces/') ? spaceId : `spaces/${spaceId}`;
  const endpoint = `https://meet.googleapis.com/v2/${spaceName}:endActiveConference`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[endGoogleMeetConference] API returned ${res.status}: ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[endGoogleMeetConference] Network/Fetch error:', err);
    return false;
  }
}
