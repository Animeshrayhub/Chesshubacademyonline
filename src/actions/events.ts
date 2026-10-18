'use server';

import { revalidatePath } from 'next/cache';
import {
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  archiveEvent,
} from '@/lib/events';
import type { CreateEventPayload, UpdateEventPayload } from '@/types/events';

type SafeResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: { message: string; code?: string } };

function serializeResult<T>(result: any): SafeResult<T> {
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: {
      message: result.error?.message || 'Operation failed. Please try again.',
      code: result.error?.code || 'UNKNOWN_ERROR',
    },
  };
}

export async function createEventAction(payload: CreateEventPayload): Promise<SafeResult<any>> {
  const result = await createEvent(payload);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath('/chess-events');
  }
  return serializeResult(result);
}

export async function updateEventAction(id: string, payload: UpdateEventPayload): Promise<SafeResult<any>> {
  const result = await updateEvent(id, payload);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath(`/dashboard/admin/events/${id}`);
    revalidatePath('/chess-events');
    revalidatePath(`/chess-events/${id}`);
  }
  return serializeResult(result);
}

export async function publishEventAction(id: string): Promise<SafeResult<any>> {
  const result = await publishEvent(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath(`/dashboard/admin/events/${id}`);
    revalidatePath('/chess-events');
    revalidatePath(`/chess-events/${id}`);
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/coach');
  }
  return serializeResult(result);
}

export async function cancelEventAction(id: string): Promise<SafeResult<any>> {
  const result = await cancelEvent(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath('/chess-events');
  }
  return serializeResult(result);
}

export async function archiveEventAction(id: string): Promise<SafeResult<any>> {
  const result = await archiveEvent(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath('/chess-events');
  }
  return serializeResult(result);
}
