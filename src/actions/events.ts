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

export async function createEventAction(payload: CreateEventPayload) {
  const result = await createEvent(payload);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath('/chess-events');
  }
  return result;
}

export async function updateEventAction(id: string, payload: UpdateEventPayload) {
  const result = await updateEvent(id, payload);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath(`/dashboard/admin/events/${id}`);
    revalidatePath('/chess-events');
    revalidatePath(`/chess-events/${id}`);
  }
  return result;
}

export async function publishEventAction(id: string) {
  const result = await publishEvent(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath(`/dashboard/admin/events/${id}`);
    revalidatePath('/chess-events');
    revalidatePath(`/chess-events/${id}`);
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/coach');
  }
  return result;
}

export async function cancelEventAction(id: string) {
  const result = await cancelEvent(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath('/chess-events');
  }
  return result;
}

export async function archiveEventAction(id: string) {
  const result = await archiveEvent(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/events');
    revalidatePath('/chess-events');
  }
  return result;
}
