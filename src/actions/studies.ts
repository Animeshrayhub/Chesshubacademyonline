'use server';

import { getChessStudies } from '@/lib/studies/studyLibraryService';

export async function listChessStudiesAction() {
  try {
    const studies = await getChessStudies();
    return { success: true, data: studies };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to load studies' };
  }
}
