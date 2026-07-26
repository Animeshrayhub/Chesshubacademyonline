import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import { getCurrentUser } from '../supabase/auth';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  InternalServerError,
  type Result,
} from '../errors';
import type { DbAnnouncement } from '@/types/dashboard';

/**
 * Lists all announcements.
 */
export async function listAnnouncements(): Promise<Result<DbAnnouncement[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: new DatabaseError('Failed to list announcements', error) };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Creates a new announcement.
 */
export async function createAnnouncement(data: {
  title: string;
  body: string;
  target_roles: string[];
  is_published?: boolean;
}): Promise<Result<DbAnnouncement>> {
  try {
    await assertAdmin();
    const currentUser = await getCurrentUser();
    const admin = createSupabaseAdmin();

    const newAnnouncement = {
      title: data.title,
      body: data.body,
      target_roles: data.target_roles,
      is_published: data.is_published ?? false,
      published_at: data.is_published ? new Date().toISOString() : null,
      created_by: currentUser?.id ?? null,
    };

    const { data: inserted, error } = await admin
      .from('announcements')
      .insert(newAnnouncement)
      .select()
      .single();

    if (error || !inserted) {
      return { success: false, error: new DatabaseError('Failed to create announcement', error) };
    }

    return { success: true, data: inserted };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Updates an announcement.
 */
export async function updateAnnouncement(
  id: string,
  data: Partial<Pick<DbAnnouncement, 'title' | 'body' | 'target_roles' | 'is_published'>>
): Promise<Result<DbAnnouncement>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const updates: any = { ...data, updated_at: new Date().toISOString() };
    if (data.is_published !== undefined) {
      updates.published_at = data.is_published ? new Date().toISOString() : null;
    }

    const { data: updated, error } = await admin
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      return { success: false, error: new DatabaseError('Failed to update announcement', error) };
    }

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Deletes an announcement.
 */
export async function deleteAnnouncement(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { error } = await admin.from('announcements').delete().eq('id', id);

    if (error) {
      return { success: false, error: new DatabaseError('Failed to delete announcement', error) };
    }

    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Fetches the latest published announcement for students/coaches.
 */
export async function getLatestPublishedAnnouncement(): Promise<DbAnnouncement | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) return data;
    return null;
  } catch {
    return null;
  }
}
