'use server';

/**
 * src/lib/events/index.ts
 *
 * Server-side CRUD library for the ChessHub events table.
 * Follows the same Result<T> pattern as announcements, users, coaches etc.
 */

import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin } from '../permissions';
import {
  BaseError,
  DatabaseError,
  NotFoundError,
  ValidationError,
  InternalServerError,
  type Result,
} from '../errors';
import type {
  DbEvent,
  CreateEventPayload,
  UpdateEventPayload,
  PublicEventCard,
} from '@/types/events';

// ─── Admin: List all events ───────────────────────────────────────────────────

export async function listAllEvents(): Promise<Result<DbEvent[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: new DatabaseError('Failed to list events', error) };
    return { success: true, data: data ?? [] };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Admin: Get single event ──────────────────────────────────────────────────

export async function getEventById(id: string): Promise<Result<DbEvent>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return { success: false, error: new DatabaseError('Failed to fetch event', error) };
    if (!data) return { success: false, error: new NotFoundError('Event not found') };
    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Duplicate Lichess Check Helper ───────────────────────────────────────────

export async function checkDuplicateEvent(
  externalProvider: string,
  externalId: string
): Promise<{ exists: boolean; existingTitle?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('events')
      .select('id, title')
      .eq('external_provider', externalProvider)
      .eq('external_id', externalId)
      .is('archived_at', null)
      .maybeSingle();

    if (data) {
      return { exists: true, existingTitle: data.title };
    }
    return { exists: false };
  } catch (err) {
    console.error('[checkDuplicateEvent] check error:', err);
    return { exists: false };
  }
}

// ─── Public: Get published events (anon-safe) ─────────────────────────────────

export async function getPublishedEvents(): Promise<PublicEventCard[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('events')
      .select(
        'id, event_type, title, description, status, visibility, external_url, start_at, end_at, timezone, time_control, variant, format, is_rated, show_on_homepage, raw_import_data'
      )
      .eq('status', 'PUBLISHED')
      .eq('visibility', 'PUBLIC')
      .is('archived_at', null)
      .order('start_at', { ascending: true });

    if (error) {
      console.error('[getPublishedEvents] error:', error);
      return [];
    }
    return (data ?? []) as PublicEventCard[];
  } catch (err) {
    console.error('[getPublishedEvents] unexpected:', err);
    return [];
  }
}

// ─── Student/Coach dashboard: Get published events for authenticated users ───

export async function getDashboardEvents(options: {
  forStudent?: boolean;
  forCoach?: boolean;
}): Promise<PublicEventCard[]> {
  try {
    const admin = createSupabaseAdmin();
    let query = admin
      .from('events')
      .select(
        'id, event_type, title, description, status, visibility, external_url, start_at, end_at, timezone, time_control, variant, format, is_rated, show_on_homepage, raw_import_data'
      )
      .eq('status', 'PUBLISHED')
      .in('visibility', ['PUBLIC', 'STUDENTS_ONLY'])
      .is('archived_at', null)
      .order('start_at', { ascending: true })
      .limit(10);

    if (options.forStudent) {
      query = query.eq('show_on_student_dashboard', true);
    }
    if (options.forCoach) {
      query = query.eq('show_on_coach_dashboard', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[getDashboardEvents] error:', error);
      return [];
    }
    return (data ?? []) as PublicEventCard[];
  } catch (err) {
    console.error('[getDashboardEvents] unexpected:', err);
    return [];
  }
}

// ─── Admin: Create event ──────────────────────────────────────────────────────

export async function createEvent(
  payload: CreateEventPayload
): Promise<Result<DbEvent>> {
  try {
    const currentUser = await assertAdmin();
    const admin = createSupabaseAdmin();

    // Duplicate Lichess tournament guard
    if (payload.external_provider && payload.external_id) {
      const dup = await checkDuplicateEvent(payload.external_provider, payload.external_id);
      if (dup.exists) {
        return {
          success: false,
          error: new ValidationError(
            'This Lichess tournament is already connected to a ChessHub event.'
          ),
        };
      }
    }

    const { data, error } = await admin
      .from('events')
      .insert({
        ...payload,
        status: payload.status ?? 'DRAFT',
        visibility: payload.visibility ?? 'PUBLIC',
        timezone: payload.timezone ?? 'Asia/Kolkata',
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error || !data) {
      return {
        success: false,
        error: new DatabaseError('Failed to create event', error),
      };
    }

    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Admin: Update event ──────────────────────────────────────────────────────

export async function updateEvent(
  id: string,
  payload: UpdateEventPayload
): Promise<Result<DbEvent>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('events')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('archived_at', null)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to update event', error) };
    }
    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Admin: Publish event ─────────────────────────────────────────────────────

export async function publishEvent(id: string): Promise<Result<DbEvent>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('events')
      .update({
        status: 'PUBLISHED',
        published_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .is('archived_at', null)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to publish event', error) };
    }

    // Create fan-out notifications for active users (fire-and-forget, non-blocking)
    fanOutEventNotification(data).catch((e) =>
      console.error('[publishEvent] notification fan-out error:', e)
    );

    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Admin: Cancel event ──────────────────────────────────────────────────────

export async function cancelEvent(id: string): Promise<Result<DbEvent>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('events')
      .update({ status: 'CANCELLED', updated_at: now })
      .eq('id', id)
      .is('archived_at', null)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to cancel event', error) };
    }
    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Admin: Archive event ─────────────────────────────────────────────────────

export async function archiveEvent(id: string): Promise<Result<DbEvent>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('events')
      .update({ status: 'ARCHIVED', archived_at: now, updated_at: now })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: new DatabaseError('Failed to archive event', error) };
    }
    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Internal: Fan-out notifications when event is published ─────────────────

/**
 * Creates individual in-app notification records for active STUDENT and COACH users
 * when an event is published. Idempotent: uses upsert with ignoreDuplicates.
 */
async function fanOutEventNotification(event: DbEvent): Promise<void> {
  const admin = createSupabaseAdmin();

  // Determine target roles based on visibility and dashboard toggles
  const roleFilter: string[] = ['STUDENT'];
  if (event.show_on_coach_dashboard || event.visibility === 'PUBLIC') {
    roleFilter.push('COACH');
  }

  // Fetch active users only (never deleted or archived)
  const { data: users, error } = await admin
    .from('users')
    .select('id')
    .in('role', roleFilter)
    .eq('is_active', true)
    .is('archived_at', null);

  if (error || !users || users.length === 0) return;

  const startFormatted = event.start_at
    ? new Date(event.start_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: event.timezone || 'Asia/Kolkata',
      })
    : 'Soon';

  const notifications = (users as Array<{ id: string }>).map((u) => ({
    user_id: u.id,
    type: 'event_published',
    title: `New Event: ${event.title}`,
    message: `A new ChessHub event has been published: "${event.title}" — starts ${startFormatted}.`,
    event_id: event.id,
    is_read: false,
    metadata: {
      event_type: event.event_type,
      external_url: event.external_url,
      channels: ['IN_APP'],
    },
  }));

  // Batch upsert with ignoreDuplicates on the unique constraint (user_id, event_id, type)
  const BATCH = 100;
  for (let i = 0; i < notifications.length; i += BATCH) {
    const chunk = notifications.slice(i, i + BATCH);
    await admin.from('notifications').upsert(chunk, {
      onConflict: 'user_id,event_id,type',
      ignoreDuplicates: true,
    });
  }
}
