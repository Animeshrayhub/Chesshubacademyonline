'use server';

import { revalidatePath } from 'next/cache';
import {
  addGalleryPhoto,
  getPublicGallery,
  getAdminGallery,
  toggleGalleryPhotoPublished,
  deleteGalleryPhoto,
} from '@/lib/gallery';

export async function addGalleryPhotoAction(data: {
  title: string;
  imageUrl: string;
  category?: 'Tournaments' | 'Classes' | 'Events' | 'Certificates';
}) {
  const result = await addGalleryPhoto(data);
  if (result.success) {
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/dashboard/admin/gallery');
  }
  return result;
}

export async function toggleGalleryPhotoAction(id: string, isPublished: boolean) {
  const success = await toggleGalleryPhotoPublished(id, isPublished);
  if (success) {
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/dashboard/admin/gallery');
  }
  return { success };
}

export async function deleteGalleryPhotoAction(id: string) {
  const success = await deleteGalleryPhoto(id);
  if (success) {
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/dashboard/admin/gallery');
  }
  return { success };
}

export async function fetchPublicGalleryAction() {
  const gallery = await getPublicGallery();
  return { success: true, gallery };
}

export async function fetchAdminGalleryAction() {
  const gallery = await getAdminGallery();
  return { success: true, gallery };
}
