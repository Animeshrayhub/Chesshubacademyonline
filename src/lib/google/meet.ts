import { SITE_URL } from '@/constants/SITE';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_MEET_SPACES_ENDPOINT = 'https://meet.googleapis.com/v1/spaces';

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/**
 * Resolves the Google OAuth redirect URI matching configured credentials.
 */
export function getGoogleRedirectUri(): string {
  // If explicitly configured in environment, prefer it
  if (process.env.GOOGLE_MEET_REDIRECT_URI) {
    return process.env.GOOGLE_MEET_REDIRECT_URI;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL || 'http://localhost:3000';
  const cleanBase = base.replace(/\/+$/, '');
  return `${cleanBase}/api/auth/google/callback`;
}

/**
 * Generates the Google OAuth 2.0 Consent URL for Coach authentication.
 */
export function getGoogleOAuthConsentUrl(state: string): string {
  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_MEET_CLIENT_ID is not configured.');
  }

  const redirectUri = getGoogleRedirectUri();

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
export async function exchangeGoogleAuthCode(code: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client credentials are missing from server environment.');
  }

  const redirectUri = getGoogleRedirectUri();

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
