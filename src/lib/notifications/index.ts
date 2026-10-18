'use server';

/**
 * src/lib/notifications/index.ts
 *
 * Server-side notification operations.
 * Provides: unread count, list, mark read, mark all read.
 *
 * RLS: the existing "Access own notifications" policy (user_id = auth.uid())
 *      covers all operations. Admin client used to bypass RLS only for
 *      fan-out writes (handled in events lib).
 */

import { createSupabaseAdmin } from '../supabase/admin';
import { getCurrentUser } from '../supabase/auth';
import { DatabaseError, InternalServerError, AuthenticationError, type Result } from '../errors';
import type { DbNotification } from '@/types/events';

// ─── Get unread count for the current user ────────────────────────────────────

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const user = await getCurrentUser();
    if (!user) return 0;

    const admin = createSupabaseAdmin();
    const { count, error } = await admin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .is('archived_at', null);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ─── List notifications for current user ─────────────────────────────────────

export async function listNotifications(limit = 20): Promise<Result<DbNotification[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: new AuthenticationError('Not authenticated') };
    }

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: new DatabaseError('Failed to fetch notifications', error) };
    }

    return { success: true, data: (data ?? []) as DbNotification[] };
  } catch (err) {
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Mark a single notification as read ──────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<Result<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: new AuthenticationError('Not authenticated') };
    }

    const admin = createSupabaseAdmin();
    const now = new Date().toISOString();

    const { error } = await admin
      .from('notifications')
      .update({ is_read: true, read_at: now, updated_at: now })
      .eq('id', notificationId)
      .eq('user_id', user.id); // Security: only own notifications

    if (error) {
      return { success: false, error: new DatabaseError('Failed to mark notification as read', error) };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Mark all notifications as read ──────────────────────────────────────────

export async function markAllNotificationsRead(): Promise<Result<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: new AuthenticationError('Not authenticated') };
    }

    const admin = createSupabaseAdmin();
    const now = new Date().toISOString();

    const { error } = await admin
      .from('notifications')
      .update({ is_read: true, read_at: now, updated_at: now })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .is('archived_at', null);

    if (error) {
      return { success: false, error: new DatabaseError('Failed to mark all notifications as read', error) };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}
