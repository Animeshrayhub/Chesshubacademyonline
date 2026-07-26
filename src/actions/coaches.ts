'use server';

import { revalidatePath } from 'next/cache';
import * as coachesService from '@/lib/coaches';
import * as studentsService from '@/lib/students';

export async function updateCoachProfileAction(coachId: string, data: any) {
  const result = await coachesService.updateCoachProfile(coachId, data);
  if (result.success) {
    revalidatePath(`/dashboard/admin/coaches/${coachId}`);
    revalidatePath('/dashboard/admin/coaches');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function assignCoachAction(studentId: string, coachId: string) {
  const result = await studentsService.assignCoach(studentId, coachId);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath(`/dashboard/admin/students/${studentId}`);
    revalidatePath(`/dashboard/admin/coaches/${coachId}`);
  }
  return JSON.parse(JSON.stringify(result));
}

export async function removeCoachAssignmentAction(studentId: string, coachId?: string) {
  const result = await studentsService.removeCoachAssignment(studentId);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath(`/dashboard/admin/students/${studentId}`);
    if (coachId) {
      revalidatePath(`/dashboard/admin/coaches/${coachId}`);
    }
  }
  return JSON.parse(JSON.stringify(result));
}

export async function saveStudentNoteServerAction(studentProfileId: string, notes: string) {
  const result = await coachesService.saveStudentNoteAction(studentProfileId, notes);
  if (result.success) {
    revalidatePath('/dashboard/coach/notes');
    revalidatePath('/dashboard/coach/students');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function markClassAttendanceAction(
  classId: string,
  studentAttendance: Array<{ studentProfileId: string; status: 'PRESENT' | 'ABSENT'; feedback?: string }>,
  notes: string
) {
  const result = await coachesService.markClassAttendance(classId, studentAttendance, notes);
  if (result.success) {
    revalidatePath('/dashboard/coach/attendance');
  }
  return JSON.parse(JSON.stringify(result));
}

/**
 * Lets the authenticated coach update their own editable profile fields.
 * Coach-editable: bio, languages, whatsapp, experience_years, photo_url.
 */
export async function updateMyCoachProfileAction(data: {
  bio?: string;
  languages?: string[];
  whatsapp?: string;
  experienceYears?: number;
  photoUrl?: string | null;
}) {
  const result = await coachesService.updateMyCoachProfile(data);
  if (result.success) {
    revalidatePath('/dashboard/coach/profile');
    revalidatePath('/dashboard/coach/settings');
    revalidatePath('/dashboard/coach/settings/profile');
  }
  return JSON.parse(JSON.stringify(result));
}
