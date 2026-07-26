import { createSupabaseAdmin } from '../supabase/admin';
import { BaseError, DatabaseError, type Result } from '../errors';

export interface ZoomMeetingDetails {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
}

export interface DriveRecordingDetails {
  fileId: string;
  url: string;
  durationSeconds: number;
}

/**
 * Creates a Zoom meeting via the Zoom API using Server-to-Server OAuth.
 * If classId is provided, the Zoom credentials will also be saved to the database.
 */
export async function createZoomMeeting(
  classId?: string,
  topic = 'Chess Classroom Session',
  startTime?: string,
  durationMinutes?: number
): Promise<Result<ZoomMeetingDetails>> {
  try {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const accountId = process.env.ZOOM_ACCOUNT_ID;

    if (!clientId || !clientSecret || !accountId) {
      throw new Error('Zoom API credentials are not configured in environment variables.');
    }

    const admin = createSupabaseAdmin();
    let finalStartTime = startTime;
    let finalDuration = durationMinutes;

    // If classId is provided but time details are not, fetch them from the database
    if (classId && (!finalStartTime || !finalDuration)) {
      const { data: cls, error: clsErr } = await admin
        .from('classes')
        .select('scheduled_start, duration_minutes, class_type')
        .eq('id', classId)
        .single();
      if (clsErr || !cls) {
        throw new Error(clsErr?.message || 'Class not found.');
      }
      finalStartTime = cls.scheduled_start;
      finalDuration = cls.duration_minutes;
      topic = `${cls.class_type} Chess Class`;
    }

    // 1. Fetch Server-to-Server OAuth Access Token
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Failed to retrieve Zoom access token: ${tokenRes.statusText} - ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Call Zoom API to Create Meeting
    const meetingUrl = 'https://api.zoom.us/v2/users/me/meetings';
    const meetingBody = {
      topic,
      type: 2, // Scheduled meeting
      start_time: finalStartTime || new Date().toISOString(),
      duration: finalDuration || 60,
      timezone: 'UTC',
      password: 'chesshub',
      settings: {
        join_before_host: true,
        jbh_time: 0,
        waiting_room: false,
      },
    };

    const meetingRes = await fetch(meetingUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingBody),
    });

    if (!meetingRes.ok) {
      const errText = await meetingRes.text();
      throw new Error(`Failed to create Zoom meeting: ${meetingRes.statusText} - ${errText}`);
    }

    const meetingData = await meetingRes.json();
    const meetingId = String(meetingData.id);
    const joinUrl = meetingData.join_url;
    const startUrl = meetingData.start_url;

    // 3. Update database if classId is provided
    if (classId) {
      const { error } = await admin
        .from('classes')
        .update({
          zoom_meeting_id: meetingId,
          zoom_join_url: joinUrl,
          zoom_start_url: startUrl,
          status: 'SCHEDULED',
        })
        .eq('id', classId);

      if (error) {
        throw new Error(`Failed to save Zoom details to database: ${error.message}`);
      }
    }

    return {
      success: true,
      data: { meetingId, joinUrl, startUrl },
    };
  } catch (error) {
    return {
      success: false,
      error: new DatabaseError(error instanceof Error ? error.message : 'Zoom API connection failed'),
    };
  }
}

/**
 * Simulates syncing Zoom recordings to Google Drive and registers it in `class_recordings`.
 */
export async function syncClassRecordingToDrive(
  classId: string,
  durationSeconds = 3600
): Promise<Result<DriveRecordingDetails>> {
  try {
    const fileId = `drive_file_${Math.random().toString(36).substring(2, 12)}`;
    const url = `https://drive.google.com/file/d/${fileId}/view`;

    const admin = createSupabaseAdmin();
    
    // Check if class exists
    const { data: cls, error: clsErr } = await admin
      .from('classes')
      .select('id')
      .eq('id', classId)
      .single();

    if (clsErr || !cls) {
      return { success: false, error: new DatabaseError('Class not found') };
    }

    // Insert class recording record
    const { data, error } = await admin
      .from('class_recordings')
      .upsert({
        class_id: classId,
        recording_url: url,
        recording_source: 'GOOGLE_DRIVE',
        recorded_date: new Date().toISOString().split('T')[0],
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'class_id' })
      .select()
      .single();

    if (error) {
      return { success: false, error: new DatabaseError(`Failed to register class recording: ${error.message}`, error) };
    }

    // Update class status to COMPLETED/RECORDING_AVAILABLE
    await admin
      .from('classes')
      .update({ status: 'RECORDING_AVAILABLE' })
      .eq('id', classId);

    return {
      success: true,
      data: {
        fileId,
        url,
        durationSeconds,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: new DatabaseError(error instanceof Error ? error.message : 'Google Drive sync failed'),
    };
  }
}
