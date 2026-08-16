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

export async function updateClassAction(id: string, data: classesService.UpdateClassInput) {
  const result = await classesService.updateClass(id, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/admin/recordings');
    revalidatePath('/dashboard/student/recordings');
    revalidatePath('/dashboard/coach/recordings');
  }
  return serializeResult(result);
}

export async function deleteClassAction(id: string) {
  const result = await classesService.deleteClass(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
    revalidatePath('/dashboard/admin');
  }
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
      revalidatePath(`/classroom/${id}`);
      revalidatePath(`/classroom/${id}/review`);
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
    const result = await classesService.setClassStatus(id, 'LIVE');
    if (result && result.success) {
      revalidatePath(`/classroom/${id}`);
      revalidatePath('/dashboard/coach/classes');
      revalidatePath('/dashboard/student/classes');
      revalidatePath('/dashboard/admin/classes');
    }
    return serializeResult(result);
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
      revalidatePath(`/classroom/${classId}/review`);
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
    revalidatePath(`/classroom/${classId}/review`);
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
      const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
      const admin = createSupabaseAdmin();
      await admin.from('classroom_chat').delete().eq('class_id', data.classId);
    } catch (chatErr) {
      console.warn('Classroom chat cleanup note:', chatErr);
    }

    try {
      revalidatePath(`/classroom/${data.classId}`);
      revalidatePath(`/classroom/${data.classId}/review`);
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
      revalidatePath(`/classroom/${classId}`);
      revalidatePath(`/classroom/${classId}/review`);
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
      revalidatePath(`/classroom/${input.classId}`);
      revalidatePath(`/classroom/${input.classId}/review`);
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

