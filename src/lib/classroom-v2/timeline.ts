/**
 * Classroom V2 Timeline Event Logger
 */

import { createSupabaseAdmin } from '../supabase/admin';

export type TimelineEventType =
  | 'CLASS_STARTED'
  | 'GAME_LOADED'
  | 'PUZZLE_STARTED'
  | 'PUZZLE_SOLVED'
  | 'CURRICULUM_LOADED'
  | 'BOOKMARK_CREATED'
  | 'QUIZ_STARTED'
  | 'RESPONSE_CREATED'
  | 'CLASS_ENDED';

/**
 * Logs a meaningful milestone event to the classroom timeline for replay & post-class review.
 */
export async function logClassroomTimelineEvent(
  classId: string,
  sessionId: string,
  eventType: TimelineEventType,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    await admin.from('classroom_timeline_events').insert({
      class_id: classId,
      session_id: sessionId,
      event_type: eventType,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Timeline Event Logging Warning]', eventType, err);
  }
}
