'use server';

import { revalidatePath } from 'next/cache';
import * as classesService from '@/lib/classes';

function serializeResult<T>(result: any) {
  if (result && !result.success && result.error) {
    let message = result.error.message || 'An unexpected error occurred';
    if (result.error.originalError) {
      const orig = result.error.originalError;
      const detailMsg = orig.message || orig.details || (typeof orig === 'object' ? JSON.stringify(orig) : String(orig));
      message = `${message} Details: ${detailMsg}`;
    }
    return {
      success: false,
      error: {
        message: message
      }
    };
  }
  return JSON.parse(JSON.stringify(result));
}

export async function createClassAction(data: classesService.CreateClassInput) {
  const result = await classesService.createClass(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/coach/classes');
    revalidatePath('/dashboard/student/classes');
    revalidatePath('/dashboard/coach');
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/admin/recordings');
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function createBatchClassesAction(data: classesService.CreateBatchClassesInput) {
  const result = await classesService.createBatchClasses(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/coach/classes');
    revalidatePath('/dashboard/student/classes');
    revalidatePath('/dashboard/coach');
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/admin/recordings');
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function updateClassAction(id: string, data: classesService.UpdateClassInput) {
  const result = await classesService.updateClass(id, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/coach/classes');
    revalidatePath('/dashboard/student/classes');
    revalidatePath('/dashboard/coach');
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/admin/recordings');
    revalidatePath('/dashboard/student/recordings');
    revalidatePath('/dashboard/coach/recordings');
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function deleteClassAction(id: string) {
  const result = await classesService.deleteClass(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/coach/classes');
    revalidatePath('/dashboard/student/classes');
    revalidatePath('/dashboard/coach');
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function getCoachClassesAction() {
  const { getCoachClasses } = await import('@/lib/coaches');
  const result = await getCoachClasses();
  return serializeResult(result);
}

export async function getClassStudentsAction(classId: string) {
  const result = await classesService.getClassStudents(classId);
  return serializeResult(result);
}

export async function endClassAction(id: string) {
  try {
    const result = await classesService.setClassStatus(id, 'COMPLETED');
    if (result && result.success) {
      revalidatePath('/dashboard/coach/classes');
      revalidatePath('/dashboard/student/classes');
      revalidatePath('/dashboard/admin/classes');
    }
    return serializeResult(result);
  } catch (err: any) {
    return {
      success: false,
      error: { message: err?.message || 'Failed to end class.' },
    };
  }
}

export async function startClassAction(id: string) {
  try {
    const { getCurrentUser } = await import('@/lib/supabase/auth');
    const user = await getCurrentUser();
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      return {
        success: false,
        error: { message: 'Unauthorized: Only an assigned coach or administrator can start this class.' },
      };
    }

    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const admin = createSupabaseAdmin();

    const { data: cls, error: clsErr } = await admin
      .from('classes')
      .select('id, coach_id, status, scheduled_start, duration_minutes, class_type, zoom_meeting_id, zoom_join_url, zoom_start_url')
      .eq('id', id)
      .maybeSingle();

    if (clsErr || !cls) {
      console.error('[startClassAction] Class lookup failed:', { id, error: clsErr });
      return { success: false, error: { message: 'Class session not found.' } };
    }

    if (user.role === 'COACH') {
      let isAssigned = cls.coach_id === user.id;
      if (!isAssigned) {
        const { data: cp } = await admin
          .from('coach_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cp && cls.coach_id === cp.id) isAssigned = true;
      }
      if (!isAssigned) {
        return { success: false, error: { message: 'You are not assigned to coach this class.' } };
      }
    }

    if (cls.status === 'COMPLETED') {
      return { success: false, error: { message: 'This class has already concluded.' } };
    }
    if (cls.status === 'CANCELLED') {
      return { success: false, error: { message: 'This class has been cancelled.' } };
    }

    // Check early start policy
    if (user.role === 'COACH' && cls.scheduled_start) {
      try {
        const { getSystemConfig } = await import('@/utils/systemConfig');
        const sysConfig = await getSystemConfig();
        const earlyStartAllowed = sysConfig.CLASSROOM_EARLY_START_ALLOWED !== 'false';
        const earlyStartMins = parseInt(sysConfig.CLASSROOM_EARLY_START_MINUTES || '30', 10);
        const scheduledTime = new Date(cls.scheduled_start).getTime();
        const earliestAllowedTime = scheduledTime - earlyStartMins * 60 * 1000;
        if (!earlyStartAllowed && Date.now() < scheduledTime) {
          return {
            success: false,
            error: { message: 'Early start is restricted by academy policy. Please wait until scheduled start time.' },
          };
        }
        if (Date.now() < earliestAllowedTime) {
          return {
            success: false,
            error: { message: `Class cannot be started earlier than ${earlyStartMins} minutes before scheduled start.` },
          };
        }
      } catch (e) {
        console.warn('[startClassAction] Early start check note:', e);
      }
    }

    const isGoogleMeet =
      Boolean(cls.zoom_join_url && cls.zoom_join_url.includes('meet.google.com')) ||
      (cls as any).meeting_provider === 'GOOGLE_MEET' ||
      Boolean((cls as any).google_meet_uri && (cls as any).google_meet_uri.includes('meet.google.com'));

    const provider: 'GOOGLE_MEET' | 'ZOOM' = isGoogleMeet ? 'GOOGLE_MEET' : 'ZOOM';
    let activeZoomUrl = isGoogleMeet ? null : cls.zoom_join_url;
    let activeMeetUri = isGoogleMeet ? (cls.zoom_join_url || (cls as any).google_meet_uri || null) : null;

    // Auto-provision Google Meet if needed
    if (provider === 'GOOGLE_MEET' && !activeMeetUri) {
      try {
        const { createGoogleMeetForClassAction } = await import('@/actions/googleMeet');
        const meetRes = await createGoogleMeetForClassAction(id);
        if (meetRes.success && meetRes.data?.meetingUri) {
          activeMeetUri = meetRes.data.meetingUri;
        }
      } catch (meetErr) {
        console.warn('[startClassAction] Google Meet auto-provision note:', meetErr);
      }
    } else if (provider === 'ZOOM' && !activeZoomUrl) {
      try {
        const { createClassMeeting } = await import('@/lib/video');
        const videoRes = await createClassMeeting(
          id,
          cls.class_type,
          cls.scheduled_start,
          cls.duration_minutes,
          'ZOOM'
        );
        if (videoRes.success && videoRes.data) {
          activeZoomUrl = videoRes.data.joinUrl;
          await admin.from('classes').update({
            zoom_meeting_id: videoRes.data.meetingId,
            zoom_join_url: videoRes.data.joinUrl,
            zoom_start_url: videoRes.data.startUrl,
          }).eq('id', id);
        }
      } catch (zoomErr) {
        console.warn('[startClassAction] Zoom auto-provision note:', zoomErr);
      }
    }

    // Activate/create authoritative live_session
    const sessionRes = await classesService.getOrCreateActiveLiveSession(id, user.id, user.role.toLowerCase());
    const sessionId = sessionRes.success && sessionRes.data?.sessionId ? sessionRes.data.sessionId : id;

    // Atomically transition class status to LIVE
    await admin
      .from('classes')
      .update({ status: 'LIVE', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Development diagnostic log
    console.log('[CLASS JOIN DEBUG]', {
      authenticatedUserId: user.id,
      requestedId: id,
      requestedIdType: 'class.id',
      classFound: Boolean(cls),
      sessionFound: Boolean(sessionId),
      classId: id,
      sessionId,
      coachId: cls.coach_id,
      meetingProvider: provider,
      meetingId: cls.zoom_meeting_id || null,
      meetingUrl: provider === 'GOOGLE_MEET' ? activeMeetUri : activeZoomUrl,
      authorization: 'AUTHORIZED',
      finalResult: 'LIVE',
    });

    // Broadcast CLASS_STARTED in real time across channels
    try {
      await admin.channel(`waiting-room:${id}`).send({
        type: 'broadcast',
        event: 'CLASS_STARTED',
        payload: {
          classId: id,
          sessionId,
          status: 'LIVE',
          meetingProvider: provider,
          zoomJoinUrl: provider === 'ZOOM' ? activeZoomUrl : null,
          googleMeetUri: provider === 'GOOGLE_MEET' ? activeMeetUri : null,
        },
      });

      await admin.channel('student-classes-realtime').send({
        type: 'broadcast',
        event: 'CLASS_STARTED',
        payload: { classId: id, status: 'LIVE' },
      });
    } catch (bErr) {
      console.warn('[startClassAction broadcast notice]:', bErr);
    }

    revalidatePath('/dashboard/coach/classes');
    revalidatePath('/dashboard/student/classes');
    revalidatePath('/dashboard/admin/classes');
    revalidatePath(`/classroom/${id}`);

    return {
      success: true,
      data: {
        classId: id,
        sessionId,
        status: 'LIVE',
        meetingProvider: provider,
        zoomJoinUrl: provider === 'ZOOM' ? activeZoomUrl : null,
        googleMeetUri: provider === 'GOOGLE_MEET' ? activeMeetUri : null,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err?.message || 'Failed to start class.' },
    };
  }
}


export async function saveSessionNotesAction(classId: string, notes: string) {
  try {
    const result = await classesService.saveSessionNotes(classId, notes);
    if (result.success) {
      revalidatePath('/dashboard/coach/classes');
    }
    return serializeResult(result);
  } catch (err: any) {
    return {
      success: false,
      error: { message: err?.message || 'Failed to save notes.' },
    };
  }
}


export async function getClassSummaryAction(classId: string) {
  const result = await classesService.getClassSummary(classId);
  return serializeResult(result);
}

export async function recordStudentClassJoinAction(classId: string, studentUserId: string) {
  const result = await classesService.recordStudentClassJoin(classId, studentUserId);
  return serializeResult(result);
}

export async function updateStudentAttendanceAction(classId: string, studentProfileId: string, attended: boolean) {
  const result = await classesService.updateStudentAttendance(classId, studentProfileId, attended);
  if (result.success) {
    revalidatePath('/dashboard/coach/classes');
    revalidatePath('/dashboard/coach');
  }
  return serializeResult(result);
}

export async function submitClassEndReportAction(data: {
  classId: string;
  sessionNotes: string;
  attendance: { studentProfileId?: string; studentEmail?: string; attended: boolean }[];
}) {
  try {
    if (data.sessionNotes) {
      try {
        await classesService.saveSessionNotes(data.classId, data.sessionNotes);
      } catch (e) {
        console.warn('saveSessionNotes error:', e);
      }
    }

    if (data.attendance && data.attendance.length > 0) {
      for (const item of data.attendance) {
        if (item.studentProfileId) {
          try {
            await classesService.updateStudentAttendance(data.classId, item.studentProfileId, item.attended);
          } catch (e) {
            console.warn('updateStudentAttendance error:', e);
          }
        }
      }
    }

    const result = await classesService.setClassStatus(data.classId, 'COMPLETED');

    try {
      revalidatePath('/dashboard/coach/classes');
      revalidatePath('/dashboard/student/classes');
      revalidatePath('/dashboard/admin/classes');
      revalidatePath('/dashboard/coach');
    } catch (e) {}
    return serializeResult(result);
  } catch (err: any) {
    return {
      success: true,
      data: { id: data.classId },
    };
  }
}

export async function saveLiveClassRecordingAction(
  classId: string,
  recordingUrl?: string,
  durationSeconds?: number
) {
  try {
    const result = await classesService.saveLiveClassRecording(classId, recordingUrl, durationSeconds);
    if (result && result.success) {
      revalidatePath('/dashboard/admin/classes');
      revalidatePath('/dashboard/admin/reports');
      revalidatePath('/dashboard/coach/recordings');
      revalidatePath('/dashboard/student/recordings');
    }
    return serializeResult(result);
  } catch (err: any) {
    return {
      success: false,
      error: { message: err?.message || 'Failed to save live class recording.' },
    };
  }
}

export async function completeClassSessionAction(input: classesService.CompleteClassSessionInput) {
  try {
    const result = await classesService.completeClassSession(input);
    if (result && result.success) {
      revalidatePath('/dashboard/coach/classes');
      revalidatePath('/dashboard/student/classes');
      revalidatePath('/dashboard/admin/classes');
      revalidatePath('/dashboard/coach/recordings');
      revalidatePath('/dashboard/admin/recordings');
      revalidatePath('/dashboard/student/recordings');
    }
    return serializeResult(result);
  } catch (err: any) {
    return {
      success: false,
      error: { message: err?.message || 'Failed to complete class session.' },
    };
  }
}

export async function getOrCreateActiveLiveSessionAction(classId: string, userId: string, role: string) {
  const result = await classesService.getOrCreateActiveLiveSession(classId, userId, role);
  return serializeResult(result);
}

export async function updateParticipantHeartbeatAction(sessionId: string, userId: string, role: string, isOnline: boolean = true) {
  const result = await classesService.updateParticipantHeartbeat(sessionId, userId, role, isOnline);
  return serializeResult(result);
}

