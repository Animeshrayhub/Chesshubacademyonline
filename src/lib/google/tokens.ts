import { createSupabaseAdmin } from '@/lib/supabase/admin';

export interface StoredCoachGoogleTokens {
  email: string | null;
  encrypted_refresh_token: string;
  iv: string;
  auth_tag: string;
  scope?: string | null;
  updated_at: string | null;
}

/**
 * Retrieves stored Google OAuth tokens for a coach.
 * Checks the dedicated `coach_google_tokens` table first,
 * and automatically falls back to `coach_profiles.bio` JSON storage.
 */
export async function getCoachGoogleTokens(userId: string): Promise<StoredCoachGoogleTokens | null> {
  const admin = createSupabaseAdmin();

  // 1. Try dedicated coach_google_tokens table
  try {
    const { data: tokenRecord, error: tableErr } = await admin
      .from('coach_google_tokens')
      .select('google_account_email, encrypted_refresh_token, iv, auth_tag, scope, updated_at')
      .eq('coach_id', userId)
      .maybeSingle();

    if (!tableErr && tokenRecord && tokenRecord.encrypted_refresh_token) {
      return {
        email: tokenRecord.google_account_email || null,
        encrypted_refresh_token: tokenRecord.encrypted_refresh_token,
        iv: tokenRecord.iv,
        auth_tag: tokenRecord.auth_tag,
        scope: tokenRecord.scope || null,
        updated_at: tokenRecord.updated_at || null,
      };
    }
  } catch (err) {
    // Table may not exist in schema cache; continue to fallback
  }

  // 2. Fallback: Check coach_profiles.bio JSON for google_tokens
  try {
    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id, user_id, bio')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    if (profile?.bio) {
      try {
        const parsed = JSON.parse(profile.bio);
        if (parsed?.google_tokens?.encrypted_refresh_token) {
          return {
            email: parsed.google_tokens.email || null,
            encrypted_refresh_token: parsed.google_tokens.encrypted_refresh_token,
            iv: parsed.google_tokens.iv,
            auth_tag: parsed.google_tokens.auth_tag,
            scope: parsed.google_tokens.scope || null,
            updated_at: parsed.google_tokens.updated_at || null,
          };
        }
      } catch {
        // Not a JSON bio
      }
    }
  } catch (profileErr) {
    console.warn('[getCoachGoogleTokens] profile fallback error:', profileErr);
  }

  return null;
}

/**
 * Saves coach's Google OAuth credentials.
 * Tries `coach_google_tokens` table first; if the table is not present,
 * stores the encrypted tokens inside `coach_profiles.bio` JSON metadata.
 */
export async function saveCoachGoogleTokens(
  userId: string,
  data: {
    email: string | null;
    encrypted_refresh_token: string;
    iv: string;
    auth_tag: string;
    scope?: string | null;
  }
): Promise<void> {
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  // 1. Try upserting to coach_google_tokens
  let savedToTable = false;
  try {
    const { error: upsertErr } = await admin
      .from('coach_google_tokens')
      .upsert(
        {
          coach_id: userId,
          google_account_email: data.email,
          encrypted_refresh_token: data.encrypted_refresh_token,
          iv: data.iv,
          auth_tag: data.auth_tag,
          scope: data.scope || null,
          updated_at: now,
        },
        { onConflict: 'coach_id' }
      );

    if (!upsertErr) {
      savedToTable = true;
    }
  } catch {
    // Table missing or schema error
  }

  if (savedToTable) {
    return;
  }

  // 2. Fallback: store in coach_profiles.bio JSON
  const { data: profile, error: findErr } = await admin
    .from('coach_profiles')
    .select('id, user_id, bio')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  if (findErr || !profile) {
    throw new Error(`Coach profile not found for user ${userId}`);
  }

  let bioObj: Record<string, any> = {};
  if (profile.bio) {
    try {
      bioObj = JSON.parse(profile.bio);
      if (typeof bioObj !== 'object' || bioObj === null || Array.isArray(bioObj)) {
        bioObj = { text: String(profile.bio) };
      }
    } catch {
      bioObj = { text: String(profile.bio) };
    }
  }

  bioObj.google_tokens = {
    email: data.email,
    encrypted_refresh_token: data.encrypted_refresh_token,
    iv: data.iv,
    auth_tag: data.auth_tag,
    scope: data.scope || null,
    updated_at: now,
  };

  const { error: updateErr } = await admin
    .from('coach_profiles')
    .update({
      bio: JSON.stringify(bioObj),
      updated_at: now,
    })
    .eq('id', profile.id);

  if (updateErr) {
    throw new Error(`Failed to save Google Meet tokens to coach profile: ${updateErr.message}`);
  }
}

/**
 * Deletes coach's stored Google OAuth tokens from both the dedicated table and coach_profiles.bio.
 */
export async function deleteCoachGoogleTokens(userId: string): Promise<void> {
  const admin = createSupabaseAdmin();

  // 1. Try deleting from coach_google_tokens
  try {
    await admin.from('coach_google_tokens').delete().eq('coach_id', userId);
  } catch {}

  // 2. Clean from coach_profiles.bio
  try {
    const { data: profile } = await admin
      .from('coach_profiles')
      .select('id, user_id, bio')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    if (profile?.bio) {
      try {
        const bioObj = JSON.parse(profile.bio);
        if (typeof bioObj === 'object' && bioObj !== null && bioObj.google_tokens) {
          delete bioObj.google_tokens;
          await admin
            .from('coach_profiles')
            .update({
              bio: JSON.stringify(bioObj),
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[deleteCoachGoogleTokens] profile clean error:', err);
  }
}
