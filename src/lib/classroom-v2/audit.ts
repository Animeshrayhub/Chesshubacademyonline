/**
 * Classroom V2 Security & Audit Logger
 * Records security-sensitive operations, permission changes, and unauthorized attempt alerts.
 * Resilient to database table presence.
 */

import { createSupabaseAdmin } from '../supabase/admin';

export type ClassroomAuditAction =
  | 'COACH_STARTED_CLASS'
  | 'STUDENT_JOINED_CLASS'
  | 'BOARD_CONTROL_GRANTED'
  | 'BOARD_CONTROL_REVOKED'
  | 'BOARD_LOCKED'
  | 'BOARD_UNLOCKED'
  | 'FREE_MOVE_ENABLED'
  | 'FREE_MOVE_DISABLED'
  | 'BOARD_RESET'
  | 'MOVE_UNDO'
  | 'PUZZLE_LOADED'
  | 'PUZZLE_SOLVED'
  | 'GAME_LOADED'
  | 'CURRICULUM_LOADED'
  | 'QUIZ_STARTED'
  | 'QUIZ_REVEALED'
  | 'COACH_ENDED_CLASS'
  | 'UNAUTHORIZED_ATTEMPT_BLOCKED'
  | 'CONCURRENT_CONFLICT_RESOLVED';

export interface LogAuditParams {
  classId: string;
  sessionId?: string;
  actorId?: string;
  actorRole: string;
  action: ClassroomAuditAction;
  targetUserId?: string;
  metadata?: Record<string, any>;
}

// In-memory fallback audit log for testing and when DB table is not yet provisioned
export const inMemoryAuditLogs: Array<LogAuditParams & { timestamp: string }> = [];

/**
 * Persists an immutable security audit event into public.classroom_audit_logs.
 */
export async function logClassroomAudit({
  classId,
  sessionId,
  actorId,
  actorRole,
  action,
  targetUserId,
  metadata = {},
}: LogAuditParams): Promise<void> {
  const timestamp = new Date().toISOString();
  // Always record in memory log
  inMemoryAuditLogs.push({
    classId,
    sessionId,
    actorId,
    actorRole,
    action,
    targetUserId,
    metadata,
    timestamp,
  });

  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('classroom_audit_logs').insert({
      class_id: classId,
      session_id: sessionId || null,
      actor_id: actorId || null,
      actor_role: actorRole,
      action,
      target_user_id: targetUserId || null,
      metadata,
      created_at: timestamp,
    });

    if (error) {
      console.warn(`[Classroom Audit] (${action}): ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`[Classroom Audit Exception] (${action}):`, err?.message || err);
  }
}
