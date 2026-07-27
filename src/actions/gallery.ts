'use server';

import { revalidatePath } from 'next/cache';
import { getPublicGalleryPhotos, addGalleryPhoto, deleteGalleryPhoto } from '@/lib/gallery';

export async function fetchGalleryPhotosAction() {
  const photos = await getPublicGalleryPhotos();
  return { success: true, photos };
}

export async function addGalleryPhotoAction(title: string, imageUrl: string) {
  const success = await addGalleryPhoto(title, imageUrl);
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
