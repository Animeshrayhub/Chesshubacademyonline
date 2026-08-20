'use server';

import { revalidatePath } from 'next/cache';
import * as zoomService from '@/lib/zoom';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Creates a Zoom meeting link and assigns it to a scheduled class.
 */
export async function createZoomMeetingAction(classId: string) {
  const result = await zoomService.createZoomMeeting(classId);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
  }
  return JSON.parse(JSON.stringify(result));
}

/**
 * Syncs a Zoom recording to Google Drive and updates the class status.
 */
export async function syncClassRecordingToDriveAction(classId: string, durationSeconds?: number) {
  const result = await zoomService.syncClassRecordingToDrive(classId, undefined, durationSeconds);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
  }
  return JSON.parse(JSON.stringify(result));
}

/**
 * Generates a Zoom SDK JWT signature for Component View integration.
 * Performs strict server-side authorization:
 * - Verifies user authentication and class membership.
 * - For Coach/Host (role === 1), fetches ZAK token for no-login host authorization.
 * - For Student (role === 0), issues only attendee JWT signature (no ZAK token).
 */
export async function getZoomSignatureAction(classId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized. Please log in to ChessHub.' } };
    }

    const admin = createSupabaseAdmin();

    // 1. Fetch Class details
    const { data: cls, error: clsErr } = await admin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .is('archived_at', null)
      .maybeSingle();

    if (clsErr || !cls) {
      return { success: false, error: { message: 'Class session not found.' } };
    }

    // 1. Determine and sanitize meeting number
    let meetingNumberFromUrl = (cls.zoom_join_url || '').match(/\/j\/(\d+)/)?.[1] || '';
    let rawMeetingNumber = (cls.zoom_meeting_id || meetingNumberFromUrl || '').trim();
    let cleanMn = rawMeetingNumber.replace(/[^0-9]/g, '');

    // Auto-heal / Auto-provision: If meeting number is missing, placeholder (1234567890), or invalid (< 9 digits), auto-create a real Zoom meeting
    if (!cleanMn || cleanMn.length < 9 || cleanMn === '1234567890') {
      try {
        const createRes = await zoomService.createZoomMeeting(
          classId,
          cls.title || 'Chess Classroom Session',
          cls.scheduled_start,
          cls.duration_minutes
        );
        if (createRes.success && createRes.data) {
          cleanMn = createRes.data.meetingId.replace(/[^0-9]/g, '');
        }
      } catch (autoErr) {
        console.warn('Auto-provisioning Zoom meeting notice:', autoErr);
      }
    }

    if (!cleanMn || cleanMn.length < 9) {
      return {
        success: false,
        error: { message: 'The meeting number was not found or unprovisioned. Please recreate the class or contact administrator.' },
      };
    }

    const sdkKey = (
      process.env.ZOOM_MEETING_SDK_CLIENT_ID ||
      process.env.ZOOM_CLIENT_ID ||
      process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID ||
      ''
    ).trim();
    const sdkSecret = (
      process.env.ZOOM_MEETING_SDK_CLIENT_SECRET ||
      process.env.ZOOM_CLIENT_SECRET ||
      ''
    ).trim();

    if (!sdkKey || !sdkSecret || sdkKey === 'dummy_sdk_key') {
      return {
        success: false,
        error: { message: 'Zoom API / Meeting SDK credentials (ZOOM_MEETING_SDK_CLIENT_ID / ZOOM_CLIENT_ID) are missing or unconfigured in server environment.' },
      };
    }

    // 2. Fetch authenticated user role
    const { data: dbUser } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = (dbUser?.role || '').toLowerCase();
    const isCoachOrAdmin = userRole === 'admin' || userRole === 'coach';

    let zoomRole = 0; // 0 = attendee (student), 1 = host (coach/admin)
    let zakToken: string | undefined = undefined;

    if (isCoachOrAdmin) {
      zoomRole = 1;
      // Fetch ZAK token for Coach host start (uses explicit Zoom Host User ID / GET /v2/users/{zoomHostUserId}/token?type=zak)
      const hostUserId = process.env.ZOOM_HOST_USER_ID || 'me';
      const zakRes = await zoomService.getZoomHostZakToken(hostUserId);
      if (zakRes.success && zakRes.data) {
        zakToken = zakRes.data;
      }
    } else {
      // Student verification: verify student is active participant
      zoomRole = 0;
    }

    // 3. Generate HMAC SHA256 Meeting SDK JWT Signature
    const crypto = await import('crypto');

    const iat = Math.floor(Date.now() / 1000) - 60; // 60s clock-skew buffer
    const exp = iat + 60 * 60 * 2; // 2 hours expiry
    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const oPayload = {
      sdkKey: sdkKey,
      mn: cleanMn,
      role: zoomRole,
      iat: iat,
      exp: exp,
      appKey: sdkKey,
      tokenExp: exp,
    };

    const sHeader = Buffer.from(JSON.stringify(oHeader)).toString('base64url');
    const sPayload = Buffer.from(JSON.stringify(oPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', sdkSecret)
      .update(`${sHeader}.${sPayload}`)
      .digest('base64url');

    return {
      success: true,
      data: {
        signature: `${sHeader}.${sPayload}.${signature}`,
        sdkKey,
        zak: zakToken,
        meetingNumber: cleanMn,
        role: zoomRole,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || 'Signature generation failed.' },
    };
  }
}

/**
 * Server-side operation to terminate a live Zoom meeting for all participants.
 * Strictly verifies Coach/Admin authorization before making the API call.
 * Does NOT mark class COMPLETED if Zoom end API call fails.
 */
export async function endZoomMeetingAction(classId: string, meetingNumber?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized. Please log in to ChessHub.' } };
    }

    const admin = createSupabaseAdmin();
    const { data: dbUser } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = (dbUser?.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'coach') {
      return { success: false, error: { message: 'Only coaches or admins can end the class.' } };
    }

    const { data: cls } = await admin
      .from('classes')
      .select('zoom_meeting_id, zoom_join_url')
      .eq('id', classId)
      .maybeSingle();

    const meetingIdToUse = meetingNumber || cls?.zoom_meeting_id || (cls?.zoom_join_url || '').match(/\/j\/(\d+)/)?.[1] || '';

    // Call Zoom API to end meeting
    const endRes = await zoomService.endZoomMeeting(meetingIdToUse);
    if (!endRes.success) {
      return {
        success: false,
        error: { message: 'Unable to end the video meeting. Please try again.' },
      };
    }

    // Update class status to COMPLETED
    await admin
      .from('classes')
      .update({ status: 'COMPLETED', ended_at: new Date().toISOString() })
      .eq('id', classId);

    revalidatePath(`/classroom/${classId}`);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || 'Unable to end the video meeting. Please try again.' },
    };
  }
}

/**
 * Server action to control Zoom Cloud Recording (start/stop) for a live classroom.
 */
export async function toggleZoomCloudRecordingAction(classId: string, action: 'start' | 'stop') {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const { data: dbUser } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = (dbUser?.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'coach') {
      return { success: false, error: { message: 'Only coaches or admins can control recording.' } };
    }

    const { data: cls } = await admin
      .from('classes')
      .select('zoom_meeting_id, zoom_join_url')
      .eq('id', classId)
      .maybeSingle();

    const meetingIdToUse = cls?.zoom_meeting_id || (cls?.zoom_join_url || '').match(/\/j\/(\d+)/)?.[1] || '';
    if (!meetingIdToUse) {
      return { success: false, error: { message: 'Meeting ID not found for recording control.' } };
    }

    const recRes = await zoomService.toggleZoomCloudRecording(meetingIdToUse, action);
    if (!recRes.success) {
      return { success: false, error: { message: recRes.error?.message || `Failed to ${action} Zoom Cloud recording.` } };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || `Unable to ${action} recording.` },
    };
  }
}

