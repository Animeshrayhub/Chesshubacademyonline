'use server';

import {
  getCurriculumHierarchy,
  createProgram,
  updateProgram,
  createCourse,
  createChapter,
  createLesson,
  saveTeachingPosition,
  duplicateLesson,
  reorderTeachingPositions,
  bulkImportPositions,
  addLessonMedia,
  deleteLessonMedia,
  getTeachingTags,
  createTeachingTag,
  archiveEntity,
  clearAllFakeData,
  saveVersionSnapshot,
  getVersionHistory,
} from '@/lib/curriculum/curriculumService';
import type { TeachingPosition, CurriculumLesson } from '@/types/curriculum.types';

export async function fetchCurriculumHierarchyAction(includeArchived = false) {
  try {
    const programs = await getCurriculumHierarchy(includeArchived);
    return { success: true, data: programs };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch curriculum' };
  }
}

export async function createProgramAction(title: string, description?: string, targetLevel?: any) {
  try {
    const program = await createProgram({ title, description, targetLevel });
    return { success: true, data: program };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create program' };
  }
}

export async function updateProgramAction(programId: string, data: any) {
  try {
    const program = await updateProgram(programId, data);
    return { success: true, data: program };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update program' };
  }
}

export async function createCourseAction(programId: string, title: string, description?: string) {
  try {
    const course = await createCourse(programId, { title, description });
    return { success: true, data: course };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create course' };
  }
}

export async function createChapterAction(courseId: string, title: string, description?: string) {
  try {
    const chapter = await createChapter(courseId, { title, description });
    return { success: true, data: chapter };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create chapter' };
  }
}

export async function createLessonAction(chapterId: string, title: string, description?: string, options?: Partial<CurriculumLesson>) {
  try {
    const lesson = await createLesson(chapterId, { title, description, ...options });
    return { success: true, data: lesson };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create lesson' };
  }
}

export async function saveTeachingPositionAction(lessonId: string, positionData: Partial<TeachingPosition>) {
  try {
    const pos = await saveTeachingPosition(lessonId, positionData);
    return { success: true, data: pos };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save position' };
  }
}

export async function bulkImportPositionsAction(
  lessonId: string,
  importType: 'pgn' | 'fen' | 'csv',
  importText: string
) {
  try {
    const positions = await bulkImportPositions(lessonId, importType, importText);
    return { success: true, count: positions.length, data: positions };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to import positions' };
  }
}

export async function duplicateLessonAction(lessonId: string) {
  try {
    const dup = await duplicateLesson(lessonId);
    return { success: true, data: dup };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to duplicate lesson' };
  }
}

export async function reorderPositionsAction(lessonId: string, positionIds: string[]) {
  try {
    const ok = await reorderTeachingPositions(lessonId, positionIds);
    return { success: ok };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reorder positions' };
  }
}

export async function addLessonMediaAction(
  lessonId: string,
  mediaData: { type: 'pdf' | 'video' | 'image'; title: string; url: string; sizeBytes?: number }
) {
  try {
    const media = await addLessonMedia(lessonId, mediaData);
    return { success: true, data: media };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to add media' };
  }
}

export async function deleteLessonMediaAction(mediaId: string) {
  try {
    const ok = await deleteLessonMedia(mediaId);
    return { success: ok };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete media' };
  }
}

export async function fetchTeachingTagsAction() {
  try {
    const tags = await getTeachingTags();
    return { success: true, data: tags };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch tags' };
  }
}

export async function createTeachingTagAction(name: string, color?: string) {
  try {
    const tag = await createTeachingTag(name, color);
    return { success: true, data: tag };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create tag' };
  }
}

export async function archiveEntityAction(
  entityType: 'program' | 'course' | 'chapter' | 'lesson' | 'position',
  entityId: string
) {
  try {
    const ok = await archiveEntity(entityType, entityId);
    return { success: ok };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to archive entity' };
  }
}

export async function saveVersionSnapshotAction(
  entityType: 'program' | 'course' | 'chapter' | 'lesson' | 'position',
  entityId: string,
  snapshot: any
) {
  try {
    const ver = await saveVersionSnapshot(entityType, entityId, snapshot);
    return { success: true, data: ver };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save version snapshot' };
  }
}

export async function fetchVersionHistoryAction(entityId: string) {
  try {
    const history = await getVersionHistory(entityId);
    return { success: true, data: history };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch version history' };
  }
}

export async function clearAllFakeDataAction() {
  try {
    const ok = await clearAllFakeData();
    return { success: ok };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to clear fake data' };
  }
}
