'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { refreshGoogleAccessToken, createGoogleMeetSpace } from '@/lib/google/meet';
import { decryptToken } from '@/lib/security/tokenEncryption';

export interface CoachGoogleStatusResult {
  isConnected: boolean;
  email: string | null;
  updatedAt: string | null;
}

/**
 * Checks whether the currently logged-in coach has connected their Google Meet account.
 */
export async function getCoachGoogleMeetStatusAction(): Promise<{
  success: boolean;
  data?: CoachGoogleStatusResult;
  error?: { message: string };
}> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      return { success: false, error: { message: 'Unauthorized. Coach access required.' } };
    }

    const admin = createSupabaseAdmin();
    const { data: tokenRecord, error } = await admin
      .from('coach_google_tokens')
      .select('google_account_email, updated_at')
      .eq('coach_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[getCoachGoogleMeetStatusAction] query warning:', error.message);
      return { success: true, data: { isConnected: false, email: null, updatedAt: null } };
    }

    if (!tokenRecord) {
      return { success: true, data: { isConnected: false, email: null, updatedAt: null } };
    }

    return {
      success: true,
      data: {
        isConnected: true,
        email: tokenRecord.google_account_email || null,
        updatedAt: tokenRecord.updated_at || null,
      },
    };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to check Google status.' } };
  }
}

/**
 * Disconnects the coach's Google Meet account and deletes their stored encrypted refresh token.
 */
export async function disconnectCoachGoogleMeetAction(): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      return { success: false, error: { message: 'Unauthorized. Coach access required.' } };
    }

    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from('coach_google_tokens')
      .delete()
      .eq('coach_id', user.id);

    if (error) {
      throw new Error(`Failed to remove Google Meet connection: ${error.message}`);
    }

    revalidatePath('/dashboard/coach/classes');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to disconnect Google Meet.' } };
  }
}

/**
 * Creates a dedicated Google Meet space for a scheduled class.
 * Server-only flow: Decrypts coach's refresh token, fetches access token, creates space, and links to class.
 */
export async function createGoogleMeetForClassAction(classId: string): Promise<{
  success: boolean;
  data?: { spaceId: string; meetingUri: string };
  error?: { message: string };
}> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      return { success: false, error: { message: 'Unauthorized. Coach access required.' } };
    }

    const admin = createSupabaseAdmin();

    // 1. Fetch Class details
    const { data: cls, error: clsErr } = await admin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();

    if (clsErr || !cls) {
      return { success: false, error: { message: 'Class not found.' } };
    }

    // 2. Verify coach assignment (Admins can override)
    let isAssigned = user.role === 'ADMIN';
    let tokenOwnerUserId = user.id;

    if (!isAssigned) {
      if (cls.coach_id === user.id) {
        isAssigned = true;
      } else {
        const { data: cp } = await admin
          .from('coach_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cp && cls.coach_id === cp.id) {
          isAssigned = true;
        }
      }
    } else if (cls.coach_id && cls.coach_id !== user.id) {
      // If admin, check if cls.coach_id is coach_profiles.id or direct users.id
      const { data: cp } = await admin
        .from('coach_profiles')
        .select('user_id')
        .eq('id', cls.coach_id)
        .maybeSingle();
      tokenOwnerUserId = cp?.user_id || cls.coach_id;
    }

    if (!isAssigned) {
      return { success: false, error: { message: 'You are not assigned to coach this class.' } };
    }

    // 3. Retrieve coach's encrypted Google tokens
    const { data: tokenRecord, error: tokenErr } = await admin
      .from('coach_google_tokens')
      .select('encrypted_refresh_token, iv, auth_tag, google_account_email')
      .eq('coach_id', tokenOwnerUserId)
      .maybeSingle();

    if (tokenErr || !tokenRecord) {
      return {
        success: false,
        error: {
          message: 'Google Meet account is not connected. Please connect your Google account in Coach Classes first.',
        },
      };
    }

    // 4. Decrypt refresh token with AES-256-GCM
    const refreshToken = decryptToken(
      tokenRecord.encrypted_refresh_token,
      tokenRecord.iv,
      tokenRecord.auth_tag
    );

    // 5. Obtain fresh access token from Google
    const freshAccessToken = await refreshGoogleAccessToken(refreshToken);

    // 6. Call Google Meet REST API to create a live meeting space
    const meetSpace = await createGoogleMeetSpace(freshAccessToken);

    // 7. Update class record with Google Meet space details
    const updatePayload = {
      meeting_provider: 'GOOGLE_MEET',
      google_meet_space_id: meetSpace.spaceId,
      google_meet_uri: meetSpace.meetingUri,
      zoom_join_url: meetSpace.meetingUri, // Fallback compatibility mirror
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await admin
      .from('classes')
      .update(updatePayload)
      .eq('id', classId);

    if (updateErr) {
      throw new Error(`Failed to save Google Meet details to class: ${updateErr.message}`);
    }

    revalidatePath('/dashboard/coach/classes');
    revalidatePath('/dashboard/admin/classes');
    revalidatePath(`/classroom/${classId}`);

    return {
      success: true,
      data: {
        spaceId: meetSpace.spaceId,
        meetingUri: meetSpace.meetingUri,
      },
    };
  } catch (err: any) {
    console.error('[createGoogleMeetForClassAction Exception]:', err);
    return { success: false, error: { message: err?.message || 'Failed to generate Google Meet space.' } };
  }
}
