'use server';

import { revalidatePath } from 'next/cache';
import * as usersService from '@/lib/users';
import { type CreateCoachInput, type CreateStudentInput, type CreateAdminInput } from '@/lib/validators';

function serializeResult(result: any) {
  if (!result.success && result.error) {
    return {
      success: false,
      error: {
        message: result.error.message,
        code: result.error.code || 'UNKNOWN_ERROR',
        status: result.error.status || 500,
        errors: result.error.errors || null,
      }
    };
  }
  return JSON.parse(JSON.stringify(result));
}

export async function createCoachAction(data: CreateCoachInput) {
  const result = await usersService.createCoach(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function createStudentAction(data: CreateStudentInput) {
  const result = await usersService.createStudent(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function createAdminAction(data: CreateAdminInput) {
  const result = await usersService.createAdmin(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin/admins');
  }
  return serializeResult(result);
}

export async function updateUserAction(
  userId: string,
  data: any
) {
  const result = await usersService.updateUser(userId, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin/admins');
    revalidatePath(`/dashboard/admin/students/${userId}`);
    revalidatePath(`/dashboard/admin/coaches/${userId}`);
  }
  return serializeResult(result);
}

export async function disableUserAction(userId: string) {
  const result = await usersService.disableUser(userId, true);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin/admins');
  }
  return serializeResult(result);
}

export async function enableUserAction(userId: string) {
  const result = await usersService.disableUser(userId, false);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin/admins');
  }
  return serializeResult(result);
}

export async function archiveUserAction(userId: string) {
  const result = await usersService.archiveUser(userId);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin/admins');
    revalidatePath('/dashboard/admin');
  }
  return serializeResult(result);
}

export async function resetPasswordAction(userId: string, newPassword: string) {
  const result = await usersService.resetPassword(userId, newPassword);
  return serializeResult(result);
}

export async function changeRoleAction(userId: string, newRole: string) {
  const result = await usersService.changeRole(userId, newRole);
  if (result.success) {
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin/admins');
  }
  return serializeResult(result);
}
