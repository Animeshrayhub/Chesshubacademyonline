'use server';

import { revalidatePath } from 'next/cache';
import * as zoomService from '@/lib/zoom';

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
 */
export async function getZoomSignatureAction(meetingNumber: string, role: number) {
  try {
    const crypto = await import('crypto');
    const sdkKey = process.env.ZOOM_CLIENT_ID;
    const sdkSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!sdkKey || !sdkSecret) {
      throw new Error('Zoom credentials are not configured in environment variables.');
    }

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours expiry
    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const oPayload = {
      sdkKey: sdkKey,
      mn: meetingNumber,
      role: role,
      iat: iat,
      exp: exp,
      appKey: sdkKey,
      tokenExp: exp
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
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || 'Signature generation failed' }
    };
  }
}

