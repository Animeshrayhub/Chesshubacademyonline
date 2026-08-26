'use server';

import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/auth';

export interface QuizQuestionDB {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  difficulty: string;
  topic: string;
  timer_sec: number | null;
}

export interface QuizAnswerPayload {
  quizSessionId: string;
  questionId: string;
  studentId: string;
  studentName: string;
  answerIndex: number;
  correct: boolean;
  timeTakenMs?: number;
}

export interface QuizResultPayload {
  quizSessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPct: number;
  weakTopics: string[];
}

/**
 * Fetches active quiz questions from the database.
 * Returns the count alongside the data so the UI can report shortages.
 */
export async function fetchQuizQuestionsAction(limit = 50): Promise<{
  success: boolean;
  data?: QuizQuestionDB[];
  totalAvailable?: number;
  error?: { message: string };
}> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error, count } = await admin
      .from('quiz_questions')
      .select('id, question, options, correct_index, explanation, difficulty, topic, timer_sec', { count: 'exact' })
      .eq('active', true)
      .order('topic', { ascending: true })
      .order('difficulty', { ascending: true })
      .limit(limit);

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    const mapped: QuizQuestionDB[] = (data || []).map((row: any) => ({
      id: row.id,
      question: row.question,
      options: Array.isArray(row.options)
        ? row.options
        : typeof row.options === 'string'
        ? JSON.parse(row.options)
        : [],
      correct_index: row.correct_index,
      explanation: row.explanation || null,
      difficulty: row.difficulty || 'Beginner',
      topic: row.topic || 'General',
      timer_sec: row.timer_sec ?? 30,
    }));

    return { success: true, data: mapped, totalAvailable: count ?? mapped.length };
  } catch (err: any) {
    return { success: false, error: { message: err.message || 'Failed to fetch quiz questions.' } };
  }
}

/**
 * Creates a new quiz session for a class and returns the session ID.
 */
export async function createQuizSessionAction(classId: string, totalQuestions: number): Promise<{
  success: boolean;
  data?: { sessionId: string };
  error?: { message: string };
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: { message: 'Unauthorized.' } };

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('quiz_sessions')
      .insert({
        class_id: classId,
        coach_id: user.id,
        status: 'active',
        total_questions: totalQuestions,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: { message: error.message } };
    return { success: true, data: { sessionId: data.id } };
  } catch (err: any) {
    return { success: false, error: { message: err.message || 'Failed to create quiz session.' } };
  }
}

/**
 * Records a single student answer for a quiz question.
 */
export async function saveQuizAnswerAction(payload: QuizAnswerPayload): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('quiz_answers').insert({
      quiz_session_id: payload.quizSessionId,
      question_id: payload.questionId,
      student_id: payload.studentId,
      student_name: payload.studentName,
      answer_index: payload.answerIndex,
      correct: payload.correct,
      time_taken_ms: payload.timeTakenMs ?? null,
    });

    if (error) return { success: false, error: { message: error.message } };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: { message: err.message || 'Failed to save answer.' } };
  }
}

/**
 * Ends a quiz session and marks it completed.
 */
export async function endQuizSessionAction(quizSessionId: string): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from('quiz_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', quizSessionId);

    if (error) return { success: false, error: { message: error.message } };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: { message: err.message || 'Failed to end quiz session.' } };
  }
}

/**
 * Saves final quiz results for a student.
 * Also records weak topics into student_weaknesses (3-occurrence rule).
 */
export async function saveQuizResultsAction(payload: QuizResultPayload): Promise<{
  success: boolean;
  error?: { message: string };
}> {
  try {
    const admin = createSupabaseAdmin();

    // 1. Upsert quiz_results (idempotent by session+student)
    const { error: resErr } = await admin.from('quiz_results').insert({
      quiz_session_id: payload.quizSessionId,
      class_id: payload.classId,
      student_id: payload.studentId,
      student_name: payload.studentName,
      total_questions: payload.totalQuestions,
      correct_count: payload.correctCount,
      incorrect_count: payload.incorrectCount,
      accuracy_pct: payload.accuracyPct,
      weak_topics: payload.weakTopics,
    });

    if (resErr) {
      console.warn('[quiz] quiz_results insert warning:', resErr.message);
    }

    // 2. Record weak topics into student_weaknesses (3-occurrence rule)
    if (payload.weakTopics.length > 0 && payload.studentId) {
      for (const topic of payload.weakTopics) {
        try {
          // Check if weakness already exists (unique on student_id + weakness_type)
          const { data: existing } = await admin
            .from('student_weaknesses')
            .select('id, occurrences')
            .eq('student_id', payload.studentId)
            .eq('weakness_type', topic)
            .maybeSingle();

          if (existing) {
            const newCount = (existing.occurrences || 1) + 1;
            await admin
              .from('student_weaknesses')
              .update({
                occurrences: newCount,
                recent_occurrences: Math.min(newCount, 10),
                severity: newCount >= 5 ? 'high' : newCount >= 3 ? 'medium' : 'low',
                last_seen: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            // First time seeing this weakness
            await admin.from('student_weaknesses').insert({
              student_id: payload.studentId,
              weakness_type: topic,
              occurrences: 1,
              recent_occurrences: 1,
              severity: 'low',
              status: 'NEEDS_PRACTICE',
            });
          }
        } catch {
          // Non-fatal: weakness recording failure doesn't break quiz flow
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: { message: err.message || 'Failed to save quiz results.' } };
  }
}
