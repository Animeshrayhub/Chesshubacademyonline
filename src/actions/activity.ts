'use server';

import { getCurrentUser } from '@/lib/supabase/auth';
import {
  recordStudentActivity,
  getStudentActivities,
  getCoachStudentActivitySummary,
  CreateStudentActivityInput,
} from '@/lib/activity';

export async function recordStudentActivityAction(input: Omit<CreateStudentActivityInput, 'studentId'>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const res = await recordStudentActivity({
      ...input,
      studentId: user.id,
    });

    return { success: res.success, data: res.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record activity' };
  }
}

export async function getStudentActivitiesAction(studentUserId?: string, limit?: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const targetId = (user.role === 'COACH' || user.role === 'ADMIN') && studentUserId
      ? studentUserId
      : user.id;

    const res = await getStudentActivities(targetId, limit || 10);
    return { success: true, data: res.data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch activities' };
  }
}

export async function getCoachStudentActivitySummaryAction(studentUserId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      return { success: false, error: 'Unauthorized' };
    }

    const res = await getCoachStudentActivitySummary(studentUserId);
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch student activity summary' };
  }
}
