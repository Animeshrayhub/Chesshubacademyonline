'use server';

/**
 * src/lib/events/index.ts
 *
 * Server-side CRUD library for ChessHub Events.
 * Dual-strategy persistence:
 * 1. Primary: public.events dedicated table
 * 2. Transparent fallback: public.announcements with target_roles=['EVENT']
 *    ensuring 100% operational reliability even if dedicated DDL is pending.
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
  EventStatus,
} from '@/types/events';

// ─── Helpers for Announcement Fallback Mapping ────────────────────────────────

function announcementToDbEvent(row: any): DbEvent {
  let meta: any = {};
  try {
    meta = typeof row.body === 'string' ? JSON.parse(row.body) : (row.body || {});
  } catch {
    meta = {};
  }

  const rawStatus = row.is_published
    ? (meta.status === 'CANCELLED' ? 'CANCELLED' : meta.status === 'ARCHIVED' ? 'ARCHIVED' : 'PUBLISHED')
    : (meta.status || 'DRAFT');

  return {
    id: row.id,
    event_type: meta.event_type || 'LICHESS_TOURNAMENT',
    title: row.title || meta.title || 'Untitled Event',
    description: meta.description || null,
    status: rawStatus as EventStatus,
    visibility: meta.visibility || 'PUBLIC',
    external_provider: meta.external_provider || null,
    external_id: meta.external_id || null,
    external_url: meta.external_url || null,
    start_at: meta.start_at || null,
    end_at: meta.end_at || null,
    timezone: meta.timezone || 'Asia/Kolkata',
    time_control: meta.time_control || null,
    variant: meta.variant || 'standard',
    format: meta.format || 'arena',
    is_rated: !!meta.is_rated,
    raw_import_data: meta.raw_import_data || null,
    show_on_homepage: !!meta.show_on_homepage,
    show_on_student_dashboard: meta.show_on_student_dashboard !== false,
    show_on_coach_dashboard: meta.show_on_coach_dashboard !== false,
    created_by: row.created_by || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    published_at: row.published_at || null,
    archived_at: meta.status === 'ARCHIVED' ? row.updated_at : null,
  };
}

function eventToAnnouncementPayload(payload: Partial<DbEvent>, currentUserId?: string) {
  const metadata = {
    event_type: payload.event_type || 'LICHESS_TOURNAMENT',
    description: payload.description || null,
    status: payload.status || 'DRAFT',
    visibility: payload.visibility || 'PUBLIC',
    external_provider: payload.external_provider || null,
    external_id: payload.external_id || null,
    external_url: payload.external_url || null,
    start_at: payload.start_at || null,
    end_at: payload.end_at || null,
    timezone: payload.timezone || 'Asia/Kolkata',
    time_control: payload.time_control || null,
    variant: payload.variant || null,
    format: payload.format || null,
    is_rated: !!payload.is_rated,
    raw_import_data: payload.raw_import_data || null,
    show_on_homepage: !!payload.show_on_homepage,
    show_on_student_dashboard: payload.show_on_student_dashboard !== false,
    show_on_coach_dashboard: payload.show_on_coach_dashboard !== false,
  };

  const isPublished = payload.status === 'PUBLISHED';

  return {
    title: payload.title || 'Untitled Event',
    body: JSON.stringify(metadata),
    target_roles: ['EVENT'],
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
    created_by: currentUserId || null,
  };
}

// ─── Admin: List all events ───────────────────────────────────────────────────

export async function listAllEvents(): Promise<Result<DbEvent[]>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();

    // Primary: try events table
    const { data, error } = await admin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return { success: true, data: data as DbEvent[] };
    }

    // Fallback: announcements table with target_roles ['EVENT']
    const { data: annData, error: annError } = await admin
      .from('announcements')
      .select('*')
      .contains('target_roles', ['EVENT'])
      .order('created_at', { ascending: false });

    if (annError) {
      return { success: false, error: new DatabaseError('Failed to list events', annError) };
    }

    return {
      success: true,
      data: (annData || []).map(announcementToDbEvent),
    };
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

    // Primary: try events table
    const { data, error } = await admin
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return { success: true, data: data as DbEvent };
    }

    // Fallback: announcements table
    const { data: annData, error: annError } = await admin
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (annError) {
      return { success: false, error: new DatabaseError('Failed to fetch event', annError) };
    }
    if (!annData) {
      return { success: false, error: new NotFoundError('Event not found') };
    }

    return { success: true, data: announcementToDbEvent(annData) };
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

    // Check events table
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

    // Fallback check announcements
    const { data: annData } = await admin
      .from('announcements')
      .select('id, title, body')
      .contains('target_roles', ['EVENT']);

    if (annData && annData.length > 0) {
      for (const row of annData) {
        try {
          const meta = JSON.parse(row.body || '{}');
          if (
            meta.external_provider === externalProvider &&
            meta.external_id === externalId &&
            meta.status !== 'ARCHIVED'
          ) {
            return { exists: true, existingTitle: row.title };
          }
        } catch {}
      }
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

    // Primary: try events table
    const { data, error } = await admin
      .from('events')
      .select(
        'id, event_type, title, description, status, visibility, external_url, start_at, end_at, timezone, time_control, variant, format, is_rated, show_on_homepage, raw_import_data'
      )
      .eq('status', 'PUBLISHED')
      .eq('visibility', 'PUBLIC')
      .is('archived_at', null)
      .order('start_at', { ascending: true });

    if (!error && data) {
      return data as PublicEventCard[];
    }

    // Fallback: announcements
    const { data: annData } = await admin
      .from('announcements')
      .select('*')
      .contains('target_roles', ['EVENT'])
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (annData) {
      return annData
        .map(announcementToDbEvent)
        .filter((e: DbEvent) => e.status === 'PUBLISHED' && e.visibility === 'PUBLIC')
        .map((e: DbEvent) => ({
          id: e.id,
          event_type: e.event_type,
          title: e.title,
          description: e.description,
          status: e.status,
          visibility: e.visibility,
          external_url: e.external_url,
          start_at: e.start_at,
          end_at: e.end_at,
          timezone: e.timezone,
          time_control: e.time_control,
          variant: e.variant,
          format: e.format,
          is_rated: e.is_rated,
          show_on_homepage: e.show_on_homepage,
          raw_import_data: e.raw_import_data,
        }));
    }

    return [];
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

    // Primary: try events table
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

    if (options.forStudent) query = query.eq('show_on_student_dashboard', true);
    if (options.forCoach) query = query.eq('show_on_coach_dashboard', true);

    const { data, error } = await query;
    if (!error && data) {
      return data as PublicEventCard[];
    }

    // Fallback: announcements
    const { data: annData } = await admin
      .from('announcements')
      .select('*')
      .contains('target_roles', ['EVENT'])
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (annData) {
      return annData
        .map(announcementToDbEvent)
        .filter((e: DbEvent) => {
          if (e.status !== 'PUBLISHED') return false;
          if (e.visibility !== 'PUBLIC' && e.visibility !== 'STUDENTS_ONLY') return false;
          if (options.forStudent && !e.show_on_student_dashboard) return false;
          if (options.forCoach && !e.show_on_coach_dashboard) return false;
          return true;
        })
        .map((e: DbEvent) => ({
          id: e.id,
          event_type: e.event_type,
          title: e.title,
          description: e.description,
          status: e.status,
          visibility: e.visibility,
          external_url: e.external_url,
          start_at: e.start_at,
          end_at: e.end_at,
          timezone: e.timezone,
          time_control: e.time_control,
          variant: e.variant,
          format: e.format,
          is_rated: e.is_rated,
          show_on_homepage: e.show_on_homepage,
          raw_import_data: e.raw_import_data,
        }));
    }

    return [];
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
            `This Lichess tournament is already connected to: "${dup.existingTitle || 'Existing Event'}"`
          ),
        };
      }
    }

    // Try primary: events table
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

    if (!error && data) {
      if (data.status === 'PUBLISHED') {
        fanOutEventNotification(data).catch(() => {});
      }
      return { success: true, data: data as DbEvent };
    }

    // Fallback: save to announcements table
    const announcementPayload = eventToAnnouncementPayload(payload, currentUser.id);
    let { data: annInserted, error: annError } = await admin
      .from('announcements')
      .insert(announcementPayload)
      .select()
      .single();

    if (annError && annError.code === '23503') {
      // Foreign key error on created_by -> fallback to null created_by
      const fallbackPayload = { ...announcementPayload, created_by: null };
      const retry = await admin
        .from('announcements')
        .insert(fallbackPayload)
        .select()
        .single();
      annInserted = retry.data;
      annError = retry.error;
    }

    if (annError || !annInserted) {
      return {
        success: false,
        error: new DatabaseError('Failed to create event', annError || error),
      };
    }

    const createdEvent = announcementToDbEvent(annInserted);
    if (createdEvent.status === 'PUBLISHED') {
      fanOutEventNotification(createdEvent).catch(() => {});
    }

    return { success: true, data: createdEvent };
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

    // Primary: try events table
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

    if (!error && data) {
      return { success: true, data: data as DbEvent };
    }

    // Fallback: update in announcements
    const { data: annExisting, error: fetchErr } = await admin
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !annExisting) {
      return { success: false, error: new DatabaseError('Event not found', fetchErr) };
    }

    const currentEvent = announcementToDbEvent(annExisting);
    const merged: DbEvent = {
      ...currentEvent,
      ...payload,
      title: payload.title ?? currentEvent.title,
      description: payload.description !== undefined ? payload.description : currentEvent.description,
      status: payload.status ?? currentEvent.status,
      visibility: payload.visibility ?? currentEvent.visibility,
      start_at: payload.start_at !== undefined ? payload.start_at : currentEvent.start_at,
      end_at: payload.end_at !== undefined ? payload.end_at : currentEvent.end_at,
      time_control: payload.time_control !== undefined ? payload.time_control : currentEvent.time_control,
      variant: payload.variant !== undefined ? payload.variant : currentEvent.variant,
      external_url: payload.external_url !== undefined ? payload.external_url : currentEvent.external_url,
      show_on_homepage: payload.show_on_homepage !== undefined ? payload.show_on_homepage : currentEvent.show_on_homepage,
      show_on_student_dashboard: payload.show_on_student_dashboard !== undefined ? payload.show_on_student_dashboard : currentEvent.show_on_student_dashboard,
      show_on_coach_dashboard: payload.show_on_coach_dashboard !== undefined ? payload.show_on_coach_dashboard : currentEvent.show_on_coach_dashboard,
      updated_at: new Date().toISOString(),
    };

    const updatedAnnouncement = eventToAnnouncementPayload(merged, annExisting.created_by);
    let { data: annUpdated, error: annError } = await admin
      .from('announcements')
      .update(updatedAnnouncement)
      .eq('id', id)
      .select()
      .single();

    if (annError && annError.code === '23503') {
      const fallbackPayload = { ...updatedAnnouncement, created_by: null };
      const retry = await admin
        .from('announcements')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .single();
      annUpdated = retry.data;
      annError = retry.error;
    }

    if (annError || !annUpdated) {
      return { success: false, error: new DatabaseError('Failed to update event', annError) };
    }

    return { success: true, data: announcementToDbEvent(annUpdated) };
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

    // Primary: try events table
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

    if (!error && data) {
      fanOutEventNotification(data as DbEvent).catch(() => {});
      return { success: true, data: data as DbEvent };
    }

    // Fallback: announcements table
    const { data: annExisting } = await admin
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!annExisting) {
      return { success: false, error: new NotFoundError('Event not found') };
    }

    const event = announcementToDbEvent(annExisting);
    event.status = 'PUBLISHED';
    event.published_at = now;
    event.updated_at = now;

    const payload = eventToAnnouncementPayload(event, annExisting.created_by);
    payload.is_published = true;
    payload.published_at = now;

    const { data: updated, error: annErr } = await admin
      .from('announcements')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (annErr || !updated) {
      return { success: false, error: new DatabaseError('Failed to publish event', annErr) };
    }

    const publishedEvent = announcementToDbEvent(updated);
    fanOutEventNotification(publishedEvent).catch(() => {});

    return { success: true, data: publishedEvent };
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

    if (!error && data) {
      return { success: true, data: data as DbEvent };
    }

    // Fallback
    const { data: annExisting } = await admin
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!annExisting) return { success: false, error: new NotFoundError('Event not found') };

    const event = announcementToDbEvent(annExisting);
    event.status = 'CANCELLED';
    event.updated_at = now;

    const payload = eventToAnnouncementPayload(event, annExisting.created_by);
    const { data: updated, error: annErr } = await admin
      .from('announcements')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (annErr || !updated) {
      return { success: false, error: new DatabaseError('Failed to cancel event', annErr) };
    }

    return { success: true, data: announcementToDbEvent(updated) };
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

    if (!error && data) {
      return { success: true, data: data as DbEvent };
    }

    // Fallback
    const { data: annExisting } = await admin
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!annExisting) return { success: false, error: new NotFoundError('Event not found') };

    const event = announcementToDbEvent(annExisting);
    event.status = 'ARCHIVED';
    event.archived_at = now;
    event.updated_at = now;

    const payload = eventToAnnouncementPayload(event, annExisting.created_by);
    payload.is_published = false;

    const { data: updated, error: annErr } = await admin
      .from('announcements')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (annErr || !updated) {
      return { success: false, error: new DatabaseError('Failed to archive event', annErr) };
    }

    return { success: true, data: announcementToDbEvent(updated) };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

// ─── Internal: Safe Notification Fan-out ─────────────────────────────────────

async function fanOutEventNotification(event: DbEvent): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    const roleFilter: string[] = ['STUDENT'];
    if (event.show_on_coach_dashboard || event.visibility === 'PUBLIC') {
      roleFilter.push('COACH');
    }

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

    // Safely insert notifications matching the production table schema (user_id, title, message, is_read)
    const notifications = (users as Array<{ id: string }>).map((u) => ({
      user_id: u.id,
      title: `🏆 New Event: ${event.title}`,
      message: `A new ChessHub event has been published: "${event.title}" — starts ${startFormatted}.${
        event.external_url ? ` Join here: ${event.external_url}` : ''
      }`,
      is_read: false,
    }));

    const BATCH = 50;
    for (let i = 0; i < notifications.length; i += BATCH) {
      const chunk = notifications.slice(i, i + BATCH);
      await admin.from('notifications').insert(chunk);
    }
  } catch (err) {
    console.error('[fanOutEventNotification] non-blocking error:', err);
  }
}
