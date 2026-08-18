import { createZoomMeeting } from '../zoom';
import type { Result } from '../errors';

export type VideoProvider = 'JITSI' | 'ZOOM' | 'GOOGLE_MEET' | 'CUSTOM';

export interface MeetingDetails {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  provider: VideoProvider;
}

/**
 * Canonical helper for deriving Jitsi room name from classId.
 * Guarantees every participant (Coach & Students) joins the exact same room.
 */
export function getJitsiRoomName(classId: string): string {
  const safeId = (classId || `room_${Math.random().toString(36).substring(2, 10)}`).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `chesshub-class-${safeId}`;
}

/**
 * Generates video meeting details based on selected provider,
 * with instant zero-error fallback to Jitsi Meet.
 */
export async function createClassMeeting(
  classId?: string,
  topic = 'Chess Classroom Session',
  startTime?: string,
  durationMinutes?: number,
  preferredProvider: VideoProvider = 'JITSI',
  customUrl?: string
): Promise<Result<MeetingDetails>> {
  // 1. Google Meet or Custom URL provided by Admin/Coach
  if ((preferredProvider === 'GOOGLE_MEET' || preferredProvider === 'CUSTOM') && customUrl?.trim()) {
    const meetingId = `custom_${Math.random().toString(36).substring(2, 10)}`;
    const cleanUrl = customUrl.trim().startsWith('http') ? customUrl.trim() : `https://${customUrl.trim()}`;
    return {
      success: true,
      data: {
        meetingId,
        joinUrl: cleanUrl,
        startUrl: cleanUrl,
        provider: preferredProvider,
      },
    };
  }

  // 2. Zoom API creation (if Zoom selected)
  if (preferredProvider === 'ZOOM') {
    const zoomRes = await createZoomMeeting(classId, topic, startTime, durationMinutes);
    if (zoomRes.success && zoomRes.data) {
      return {
        success: true,
        data: {
          meetingId: zoomRes.data.meetingId,
          joinUrl: zoomRes.data.joinUrl,
          startUrl: zoomRes.data.startUrl,
          provider: 'ZOOM',
        },
      };
    }
    // Explicit error for missing/unconfigured Zoom credentials instead of silent fake URL creation
    return {
      success: false,
      error: zoomRes.error || { message: 'Zoom API credentials are missing or invalid.', code: 'ZOOM_CONFIG_ERROR', status: 400 },
    };
  }

  // 3. Jitsi Meet (Default & Universal Fallback — Zero Login & Deterministic Room)
  const roomName = getJitsiRoomName(classId || '');
  const jitsiServer = process.env.NEXT_PUBLIC_JITSI_SERVER || 'https://meet.jit.si';
  const jitsiUrl = `${jitsiServer}/${roomName}`;

  return {
    success: true,
    data: {
      meetingId: roomName,
      joinUrl: jitsiUrl,
      startUrl: jitsiUrl,
      provider: 'JITSI',
    },
  };
}

