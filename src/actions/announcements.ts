'use server';

import { revalidatePath } from 'next/cache';
import * as announcementsService from '@/lib/announcements';

export async function createAnnouncementAction(data: {
  title: string;
  body: string;
  target_roles: string[];
  is_published?: boolean;
}) {
  const result = await announcementsService.createAnnouncement(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/announcements');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function updateAnnouncementAction(
  id: string,
  data: {
    title?: string;
    body?: string;
    target_roles?: string[];
    is_published?: boolean;
  }
) {
  const result = await announcementsService.updateAnnouncement(id, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/announcements');
  }
  return JSON.parse(JSON.stringify(result));
}

export async function deleteAnnouncementAction(id: string) {
  const result = await announcementsService.deleteAnnouncement(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/announcements');
  }
  return JSON.parse(JSON.stringify(result));
}
