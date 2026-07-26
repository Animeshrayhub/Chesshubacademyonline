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
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function updateClassAction(id: string, data: classesService.UpdateClassInput) {
  const result = await classesService.updateClass(id, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/classes');
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

