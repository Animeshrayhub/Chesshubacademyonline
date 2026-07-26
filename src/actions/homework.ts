'use server';

import { revalidatePath } from 'next/cache';
import * as homeworkService from '@/lib/homework';

function serializeResult<T>(result: { success: true; data: T } | { success: false; error: any }) {
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return {
    success: false as const,
    error: {
      message: result.error?.message || 'An error occurred',
      code: result.error?.code || 'UNKNOWN_ERROR',
      status: result.error?.status || 500,
    },
  };
}

export async function listChaptersAction(workbookId: string) {
  const result = await homeworkService.listChapters(workbookId);
  return serializeResult(result);
}

export async function listHomeworkAction() {
  const result = await homeworkService.listHomework();
  return serializeResult(result);
}

export async function createHomeworkAction(data: homeworkService.CreateHomeworkInput) {
  const result = await homeworkService.createHomework(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/student/homework/workbooks');
    revalidatePath('/dashboard/coach/homework');
  }
  return serializeResult(result);
}

export async function updateHomeworkAction(id: string, data: Partial<homeworkService.CreateHomeworkInput>) {
  const result = await homeworkService.updateHomework(id, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/student/homework/workbooks');
    revalidatePath('/dashboard/coach/homework');
  }
  return serializeResult(result);
}

export async function deleteHomeworkAction(id: string) {
  const result = await homeworkService.deleteHomework(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/student/homework/workbooks');
    revalidatePath('/dashboard/coach/homework');
  }
  return serializeResult(result);
}

export async function gradeHomeworkSubmissionAction(assignmentId: string, gradeScore: number, feedback: string, approveAndUnlock?: boolean) {
  const result = await homeworkService.gradeHomeworkSubmission(assignmentId, gradeScore, feedback, approveAndUnlock);
  if (result.success) {
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/admin/homework');
  }
  return serializeResult(result);
}

export async function submitHomeworkAction(assignmentId: string, answers: string, pdfPath?: string) {
  const result = await homeworkService.submitHomeworkSubmission(assignmentId, answers, pdfPath);
  if (result.success) {
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/student/homework/workbooks');
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/coach/homework');
  }
  return serializeResult(result);
}

export async function createChapterAction(data: homeworkService.CreateChapterInput) {
  try {
    const result = await homeworkService.createChapter(data);
    if (result.success) {
      revalidatePath('/dashboard/admin/homework');
    }
    return serializeResult(result);
  } catch (err: any) {
    return serializeResult({
      success: false,
      error: { message: err?.message || 'Failed to create chapter.', code: 'CREATE_CHAPTER_ERROR', status: 500 },
    });
  }
}

export async function updateChapterAction(id: string, data: Partial<Omit<homeworkService.CreateChapterInput, 'workbookId'>>) {
  try {
    const result = await homeworkService.updateChapter(id, data);
    if (result.success) {
      revalidatePath('/dashboard/admin/homework');
      revalidatePath('/dashboard/student/homework');
      revalidatePath('/dashboard/student/homework/workbooks');
    }
    return serializeResult(result);
  } catch (err: any) {
    return serializeResult({
      success: false,
      error: { message: err?.message || 'Failed to update chapter.', code: 'UPDATE_CHAPTER_ERROR', status: 500 },
    });
  }
}

export async function importPgnToChapterAction(chapterId: string, pgnData: string) {
  try {
    const { importPgnToChapter } = await import('@/lib/homework/puzzles');
    const result = await importPgnToChapter(chapterId, pgnData);
    if (result.success) {
      revalidatePath('/dashboard/admin/homework');
      revalidatePath('/dashboard/student/homework');
    }
    return serializeResult(result);
  } catch (err: any) {
    return serializeResult({
      success: false,
      error: { message: err?.message || 'Failed to import PGN puzzles.', code: 'IMPORT_PGN_ERROR', status: 500 },
    });
  }
}

export async function getChapterPuzzlesAdminAction(chapterId: string) {
  try {
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const admin = createSupabaseAdmin();

    // Step 1: Query homework_chapter_puzzles junction for this chapter
    const { data: chapPuzzles, error: chapErr } = await admin
      .from('homework_chapter_puzzles')
      .select('puzzle_id, puzzle_order')
      .eq('chapter_id', chapterId)
      .order('puzzle_order', { ascending: true });

    if (!chapErr && chapPuzzles && chapPuzzles.length > 0) {
      const puzzleIds = chapPuzzles.map((cp: any) => cp.puzzle_id).filter(Boolean);
      
      const { data: puzzlesData, error: puzzlesErr } = await admin
        .from('homework_puzzles')
        .select('id, title, fen, solution, theme, difficulty, hint_1, hint_2, hint_3, created_at')
        .in('id', puzzleIds);

      if (!puzzlesErr && puzzlesData && puzzlesData.length > 0) {
        const puzzleMap = new Map(puzzlesData.map((p: any) => [p.id, p]));
        const combined = chapPuzzles
          .map((cp: any) => {
            const p = puzzleMap.get(cp.puzzle_id);
            if (!p) return null;
            return {
              puzzle_order: cp.puzzle_order,
              ...p,
            };
          })
          .filter(Boolean);

        return serializeResult({ success: true, data: combined });
      }
    }

    // Step 2: Direct query on homework_puzzles for source_id = chapterId
    const { data: directPuzzles, error: directErr } = await admin
      .from('homework_puzzles')
      .select('id, title, fen, solution, theme, difficulty, hint_1, hint_2, hint_3, created_at')
      .eq('source_id', chapterId)
      .order('created_at', { ascending: true });

    if (!directErr && directPuzzles && directPuzzles.length > 0) {
      return serializeResult({ success: true, data: directPuzzles });
    }

    // Step 3: Query homework_chapters pgn_data fallback
    const { data: chapData } = await admin
      .from('homework_chapters')
      .select('pgn_data')
      .eq('id', chapterId)
      .single();

    if (chapData?.pgn_data) {
      const { parsePgnToPuzzles } = await import('@/lib/homework/puzzles');
      const parsed = parsePgnToPuzzles(chapData.pgn_data);
      if (parsed.length > 0) {
        const formatted = parsed.map((p, idx) => ({
          id: `pgn_${idx}`,
          puzzle_order: idx + 1,
          title: p.title || `Puzzle ${idx + 1}`,
          fen: p.fen,
          solution: p.solution || [],
          theme: p.theme || 'tactics',
          difficulty: p.difficulty || 'intermediate',
        }));
        return serializeResult({ success: true, data: formatted });
      }
    }

    return serializeResult({ success: true, data: [] });
  } catch (err: any) {
    return serializeResult({
      success: false,
      error: { message: err?.message || 'Error loading chapter puzzles', code: 'FETCH_ERROR', status: 500 },
    });
  }
}

export async function deleteChapterPuzzleAction(chapterId: string, puzzleId: string) {
  try {
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
    const admin = createSupabaseAdmin();
    await admin.from('homework_chapter_puzzles').delete().eq('chapter_id', chapterId).eq('puzzle_id', puzzleId);
    await admin.from('homework_puzzles').delete().eq('id', puzzleId);
    revalidatePath('/dashboard/admin/homework');
    return serializeResult({ success: true, data: true });
  } catch (err: any) {
    return serializeResult({ success: false, error: { message: err?.message || 'Error deleting puzzle', code: 'DELETE_ERROR', status: 500 } });
  }
}

export async function deleteChapterAction(id: string) {
  const result = await homeworkService.deleteChapter(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
  }
  return serializeResult(result);
}

export async function assignChapterToStudentAction(data: {
  chapterId: string;
  studentProfileId: string;
  coachProfileId: string;
  dueAt?: string;
  assignedClassId?: string;
}) {
  const result = await homeworkService.assignChapterToStudent(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/coach/homework');
  }
  return serializeResult(result);
}

export async function assignChapterToClassAction(data: {
  chapterId: string;
  classId: string;
  coachProfileId: string;
  dueAt?: string;
}) {
  const result = await homeworkService.assignChapterToClass(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/coach/homework');
  }
  return serializeResult(result);
}

export async function listModulesAction(courseId: string) {
  const result = await homeworkService.listModules(courseId);
  return serializeResult(result);
}

export async function createModuleAction(data: homeworkService.CreateModuleInput) {
  const result = await homeworkService.createModule(data);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
  }
  return serializeResult(result);
}

export async function updateModuleAction(id: string, data: Partial<Omit<homeworkService.CreateModuleInput, 'courseId'>>) {
  const result = await homeworkService.updateModule(id, data);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
  }
  return serializeResult(result);
}

export async function deleteModuleAction(id: string) {
  const result = await homeworkService.deleteModule(id);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
  }
  return serializeResult(result);
}

export async function enrollStudentAction(studentProfileId: string, courseId: string) {
  const result = await homeworkService.enrollStudentInCourse(studentProfileId, courseId);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/student/homework/workbooks');
    revalidatePath('/dashboard/student');
    // Also revalidate the specific student details pages
    revalidatePath('/dashboard/admin/students');
  }
  return serializeResult(result);
}

export async function unenrollStudentAction(studentProfileId: string, courseId: string) {
  const result = await homeworkService.unenrollStudentFromCourse(studentProfileId, courseId);
  if (result.success) {
    revalidatePath('/dashboard/admin/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/student/homework/workbooks');
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/admin/students');
  }
  return serializeResult(result);
}

export async function getStudentEnrollmentsByIdAction(studentProfileId: string) {
  const result = await homeworkService.getStudentEnrollmentsById(studentProfileId);
  return serializeResult(result);
}

export async function getCourseSyllabusAction(courseId: string, studentProfileId?: string) {
  const result = await homeworkService.getCourseSyllabus(courseId, studentProfileId);
  return serializeResult(result);
}

export async function assignCustomPositionHomeworkAction(data: {
  title: string;
  fen: string;
  classId?: string;
  studentProfileId?: string;
  coachProfileId?: string;
}) {
  const result = await homeworkService.assignCustomPositionHomework(data);
  if (result.success) {
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/coach/homework');
  }
  return serializeResult(result);
}

export async function createPuzzleAction(data: any) {
  try {
    const { createPuzzle } = await import('@/lib/homework/puzzles');
    const result = await createPuzzle(data);
    if (result.success) {
      revalidatePath('/dashboard/admin/homework');
    }
    return serializeResult(result);
  } catch (err: any) {
    return serializeResult({
      success: false,
      error: { message: err?.message || 'Failed to create puzzle.', code: 'CREATE_PUZZLE_ERROR', status: 500 },
    });
  }
}

export async function saveScannerApiKeyAction(apiKey: string, provider: string = 'gemini') {
  try {
    const { saveSystemConfig } = await import('@/utils/systemConfig');
    const updateData: Record<string, string> = {
      PREFERRED_SCANNER_PROVIDER: provider,
    };
    if (provider === 'gemini') {
      updateData.AI_GEMINI_KEY = apiKey;
      updateData.AI_API_KEY = apiKey;
    } else if (provider === 'openai') {
      updateData.AI_OPENAI_KEY = apiKey;
    } else if (provider === 'groq') {
      updateData.AI_GROQ_KEY = apiKey;
    }
    await saveSystemConfig(updateData);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save configuration.' };
  }
}

export async function scanChessboardImageAction(
  base64Image: string,
  options?: {
    provider?: string;
    apiKey?: string;
    localUrl?: string;
    modelName?: string;
  }
) {
  try {
    const { getSystemConfig } = await import('@/utils/systemConfig');
    const configMap = await getSystemConfig();

    const selectedProvider = options?.provider || configMap['PREFERRED_SCANNER_PROVIDER'] || 'gemini';

    const cleanFen = (rawText: string) => {
      let text = rawText.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      const fenMatch = text.match(/([rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}\s+[wb]\s+[-kqaKQA]{1,4}\s+[-a-h1-8]{1,2}\s+\d+\s+\d+/);
      if (fenMatch) return fenMatch[0];
      const shortMatch = text.match(/([rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(\s+[wb])?/);
      if (shortMatch) {
        const partial = shortMatch[0];
        return partial.includes(' ') ? `${partial} - - 0 1` : `${partial} w - - 0 1`;
      }
      return text;
    };

    // --- Provider 1: Local Ollama Model (Free) ---
    if (selectedProvider === 'ollama') {
      const baseUrl = options?.localUrl || configMap['LOCAL_AI_URL'] || 'http://localhost:11434';
      const model = options?.modelName || configMap['LOCAL_AI_MODEL'] || 'llava';
      const prompt = "Analyze this chessboard diagram image. Identify piece positions and output ONLY the standard FEN string. Example: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'. Do not add comments or markdown.";

      try {
        const ollamaRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            images: [base64Image],
            stream: false,
          }),
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text();
          throw new Error(`Local Ollama error (${ollamaRes.status}): ${errText}`);
        }

        const ollamaData = await ollamaRes.json();
        const rawFen = ollamaData?.response || '';
        const fen = cleanFen(rawFen);

        if (!fen) throw new Error('Local Ollama vision model returned an empty position.');

        return { success: true, data: fen, provider: 'ollama' };
      } catch (err: any) {
        return {
          success: false,
          error: {
            message: `Local AI (Ollama) failed to connect at ${baseUrl}. Ensure Ollama is running ('ollama run ${model}') or switch to Gemini Cloud. Original error: ${err?.message}`,
          },
          isLocalError: true,
        };
      }
    }

    // --- Provider 2: Gemini Cloud AI ---
    const apiKey = options?.apiKey || configMap['AI_GEMINI_KEY'] || configMap['AI_API_KEY'] || process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      return {
        success: false,
        error: {
          message: 'Gemini API key is not configured. Click "Settings" to enter your key or switch to Local Ollama model (free).',
        },
        isKeyMissing: true,
      };
    }

    const prompt = "Analyze this chessboard diagram image. Identify the positions of all pieces on the board. Output ONLY the standard FEN string representing this position (e.g. '1k6/6Q1/1K6/8/8/8/8/8 w - - 0 1'). Do not include markdown code block formatting, explanation, or any other text. Output exactly the FEN string.";

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError = '';
    let rawFen = '';

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          rawFen = resData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (rawFen) break;
        } else {
          lastError = await res.text();
        }
      } catch (e: any) {
        lastError = e?.message || 'Network error';
      }
    }

    const fen = cleanFen(rawFen);

    if (!fen) {
      throw new Error(lastError ? `Gemini API Error: ${lastError}` : 'Gemini did not return any valid FEN text.');
    }

    return { success: true, data: fen, provider: 'gemini' };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err?.message || 'Failed to scan chess diagram.' },
    };
  }
}

export async function scanChessboardUrlAction(imageUrl: string) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch crop image from storage: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return await scanChessboardImageAction(base64);
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to download crop image.' } };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// HOMEWORK LIBRARY SERVER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

import * as hw from '@/lib/homework';
import { getCurrentUser } from '@/lib/supabase/auth';

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Not authenticated');
  return user.id;
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function listCategoriesAction() {
  return serializeResult(await hw.listCategories());
}

export async function createCategoryAction(data: { name: string; slug?: string; color?: string; description?: string }) {
  const res = await hw.createCategory(data);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function updateCategoryAction(id: string, data: { name?: string; color?: string; description?: string; sortOrder?: number }) {
  const res = await hw.updateCategory(id, data);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function deleteCategoryAction(id: string) {
  const res = await hw.deleteCategory(id);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

// ── Themes ────────────────────────────────────────────────────────────────────
export async function listThemesAction(categoryId?: string) {
  return serializeResult(await hw.listThemes(categoryId));
}

export async function createThemeAction(data: { name: string; slug?: string; categoryId?: string }) {
  const res = await hw.createTheme(data);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function deleteThemeAction(id: string) {
  const res = await hw.deleteTheme(id);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

// ── Templates ─────────────────────────────────────────────────────────────────
export async function listHomeworkLibraryAction(filters?: hw.ListLibraryFilters) {
  return serializeResult(await hw.listHomeworkLibrary(filters));
}

export async function getHomeworkTemplateAction(id: string) {
  return serializeResult(await hw.getHomeworkTemplate(id));
}

export async function createHomeworkTemplateAction(data: hw.CreateTemplateInput) {
  const userId = await requireUserId();
  const res = await hw.createHomeworkTemplate(data, userId);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function updateHomeworkTemplateAction(id: string, data: hw.UpdateTemplateInput) {
  const userId = await requireUserId();
  const res = await hw.updateHomeworkTemplate(id, data, userId);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function publishHomeworkTemplateAction(id: string) {
  const userId = await requireUserId();
  const res = await hw.publishHomeworkTemplate(id, userId);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function archiveHomeworkTemplateAction(id: string) {
  const userId = await requireUserId();
  const res = await hw.archiveHomeworkTemplate(id, userId);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function duplicateHomeworkTemplateAction(id: string) {
  const userId = await requireUserId();
  const res = await hw.duplicateHomeworkTemplate(id, userId);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function deleteHomeworkTemplateAction(id: string) {
  const res = await hw.deleteHomeworkTemplate(id);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

// ── Template Sections ─────────────────────────────────────────────────────────
export async function listTemplateSectionsAction(templateId: string) {
  return serializeResult(await hw.listTemplateSections(templateId));
}

export async function createTemplateSectionAction(data: hw.CreateSectionInput) {
  const res = await hw.createTemplateSection(data);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function updateTemplateSectionAction(id: string, data: Partial<Omit<hw.CreateSectionInput, 'templateId'>>) {
  const res = await hw.updateTemplateSection(id, data);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function deleteTemplateSectionAction(id: string) {
  const res = await hw.deleteTemplateSection(id);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

// ── Collections ───────────────────────────────────────────────────────────────
export async function listHwCollectionsAction() {
  return serializeResult(await hw.listHwCollections());
}

export async function createHwCollectionAction(data: hw.CreateCollectionInput) {
  const userId = await requireUserId();
  const res = await hw.createHwCollection(data, userId);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function updateHwCollectionAction(id: string, data: Partial<hw.CreateCollectionInput>) {
  const res = await hw.updateHwCollection(id, data);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function deleteHwCollectionAction(id: string) {
  const res = await hw.deleteHwCollection(id);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function addTemplateToCollectionAction(collectionId: string, templateId: string, sortOrder?: number) {
  const res = await hw.addTemplateToCollection(collectionId, templateId, sortOrder);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function removeTemplateFromCollectionAction(collectionId: string, templateId: string) {
  const res = await hw.removeTemplateFromCollection(collectionId, templateId);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function getCollectionWithTemplatesAction(collectionId: string) {
  return serializeResult(await hw.getCollectionWithTemplates(collectionId));
}

// ── Courses ───────────────────────────────────────────────────────────────────
export async function listHwCoursesAction() {
  return serializeResult(await hw.listHwCourses());
}

export async function createHwCourseAction(data: hw.CreateCourseInput) {
  const userId = await requireUserId();
  const res = await hw.createHwCourse(data, userId);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function updateHwCourseAction(id: string, data: Partial<hw.CreateCourseInput>) {
  const res = await hw.updateHwCourse(id, data);
  if (res.success) {
    revalidatePath('/dashboard/admin/homework/library');
    revalidatePath('/dashboard/coach/homework/library');
  }
  return serializeResult(res);
}

export async function deleteHwCourseAction(id: string) {
  const res = await hw.deleteHwCourse(id);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function addCollectionToCourseAction(courseId: string, collectionId: string, sortOrder?: number) {
  const res = await hw.addCollectionToCourse(courseId, collectionId, sortOrder);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

export async function removeCollectionFromCourseAction(courseId: string, collectionId: string) {
  const res = await hw.removeCollectionFromCourse(courseId, collectionId);
  if (res.success) revalidatePath('/dashboard/admin/homework/library');
  return serializeResult(res);
}

// ── Template Assignments ──────────────────────────────────────────────────────
export async function assignTemplateAction(data: hw.AssignTemplateInput) {
  const res = await hw.assignTemplate(data);
  if (res.success) {
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/coach/homework/library');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/admin/homework/library');
  }
  return serializeResult(res);
}

export async function assignCollectionToStudentAction(data: { collectionId: string; studentProfileId: string; coachProfileId?: string; dueAt?: string; coachNotes?: string }) {
  const res = await hw.assignCollectionToStudent(data);
  if (res.success) {
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/student/homework');
  }
  return serializeResult(res);
}

export async function assignCourseToStudentAction(data: { courseId: string; studentProfileId: string; coachProfileId?: string; coachNotes?: string }) {
  const res = await hw.assignCourseToStudent(data);
  if (res.success) {
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/student/homework');
  }
  return serializeResult(res);
}

export async function getStudentTemplateAssignmentsAction(studentProfileId: string) {
  return serializeResult(await hw.getStudentTemplateAssignments(studentProfileId));
}

export async function getCoachTemplateSubmissionsAction(coachProfileId: string) {
  return serializeResult(await hw.getCoachTemplateSubmissions(coachProfileId));
}

// ── Template Submissions ──────────────────────────────────────────────────────
export async function submitTemplateHomeworkAction(assignmentId: string, answers: string, filePath?: string) {
  const res = await hw.submitTemplateHomework(assignmentId, answers, filePath);
  if (res.success) {
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/admin/homework/library');
  }
  return serializeResult(res);
}

export async function reviewTemplateSubmissionAction(assignmentId: string, gradeScore: number, feedback: string, approve: boolean) {
  const res = await hw.reviewTemplateSubmission(assignmentId, gradeScore, feedback, approve);
  if (res.success) {
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/admin/homework/library');
  }
  return serializeResult(res);
}

export async function reassignTemplateHomeworkAction(assignmentId: string, coachNotes?: string) {
  const res = await hw.reassignTemplateHomework(assignmentId, coachNotes);
  if (res.success) {
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/student/homework');
  }
  return serializeResult(res);
}

export async function getTemplateVersionHistoryAction(templateId: string) {
  return serializeResult(await hw.getTemplateVersionHistory(templateId));
}

export async function assignPracticeGameToStudentAction(data: {
  gameTitle: string;
  fen?: string;
  studentProfileId: string;
  coachProfileId?: string;
  coachNotes?: string;
}) {
  const res = await hw.assignPracticeGameToStudent(data);
  if (res.success) {
    revalidatePath('/dashboard/coach/homework');
    revalidatePath('/dashboard/student/homework');
    revalidatePath('/dashboard/student/games');
  }
  return serializeResult(res);
}
