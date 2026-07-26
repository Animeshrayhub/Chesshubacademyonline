'use server';

import { revalidatePath } from 'next/cache';
import * as studentsService from '@/lib/students';

export async function updateStudentProfileAction(studentId: string, data: any) {
  const result = await studentsService.updateStudentProfile(studentId, data);
  if (result.success) {
    revalidatePath(`/dashboard/admin/students/${studentId}`);
    revalidatePath('/dashboard/admin/students');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function transferStudentAction(studentId: string, newCoachId: string) {
  const result = await studentsService.assignCoach(studentId, newCoachId);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath(`/dashboard/admin/students/${studentId}`);
    revalidatePath(`/dashboard/admin/coaches/${newCoachId}`);
  }
  return JSON.parse(JSON.stringify(result));
}

export async function updateMyStudentProfileAction(data: {
  photoUrl?: string | null;
  timezone?: string;
  phone?: string;
}) {
  const result = await studentsService.updateMyStudentProfile(data);
  if (result.success) {
    revalidatePath('/dashboard/student/settings');
    revalidatePath('/dashboard/student/settings/profile');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function getStudentEnrollmentsAction() {
  const result = await studentsService.getStudentEnrollments();
  return JSON.parse(JSON.stringify(result));
}
