'use server';

import { revalidatePath } from 'next/cache';
import {
  getPuzzleBank,
  createPuzzleBankEntry,
  bulkImportPuzzleBankEntries,
  deletePuzzleBankEntry,
  type PuzzleBankFilter,
  type CreatePuzzleBankInput,
} from '@/lib/puzzles/puzzleBankService';

export async function getPuzzleBankAction(filters?: PuzzleBankFilter) {
  const result = await getPuzzleBank(filters);
  if (!result.success) {
    return { success: false, error: result.error?.message || 'Failed to fetch puzzle bank' };
  }
  return {
    success: true,
    puzzles: result.data?.puzzles || [],
    total: result.data?.total || 0,
  };
}

export async function createPuzzleAction(input: CreatePuzzleBankInput) {
  const result = await createPuzzleBankEntry(input);
  if (result.success) {
    revalidatePath('/dashboard/admin/puzzles');
    revalidatePath('/dashboard/coach/puzzles');
    revalidatePath('/dashboard/student/puzzles');
  }
  return {
    success: result.success,
    puzzle: result.data || null,
    error: result.error?.message,
  };
}

export async function bulkImportPuzzlesAction(puzzles: CreatePuzzleBankInput[]) {
  const result = await bulkImportPuzzleBankEntries(puzzles);
  if (result.success) {
    revalidatePath('/dashboard/admin/puzzles');
    revalidatePath('/dashboard/coach/puzzles');
    revalidatePath('/dashboard/student/puzzles');
  }
  return {
    success: result.success,
    insertedCount: result.data?.insertedCount || 0,
    error: result.error?.message,
  };
}

export async function deletePuzzleAction(id: string) {
  const result = await deletePuzzleBankEntry(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/puzzles');
    revalidatePath('/dashboard/coach/puzzles');
    revalidatePath('/dashboard/student/puzzles');
  }
  return {
    success: result.success,
    error: result.error?.message,
  };
}
