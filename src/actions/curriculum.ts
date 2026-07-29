'use server';

import {
  getCurriculumHierarchy,
  createProgram,
  createCourse,
  createChapter,
  createLesson,
  saveTeachingPosition,
  duplicateLesson,
  reorderTeachingPositions,
} from '@/lib/curriculum/curriculumService';
import type { TeachingPosition } from '@/types/curriculum.types';

export async function fetchCurriculumHierarchyAction() {
  try {
    const programs = await getCurriculumHierarchy();
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

export async function createLessonAction(chapterId: string, title: string, description?: string) {
  try {
    const lesson = await createLesson(chapterId, { title, description });
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
