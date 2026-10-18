// ─── ChessHub Events — Phase 1 Types ──────────────────────────────────────────

export type EventType =
  | 'LICHESS_TOURNAMENT'
  | 'INTERNAL_TOURNAMENT'
  | 'WORKSHOP'
  | 'MASTERCLASS'
  | 'PUZZLE_CHALLENGE'
  | 'ANNOUNCEMENT';

// Persisted status in DB
export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'CANCELLED';

// Runtime display status
export type EventDisplayStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'LIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type EventVisibility = 'PUBLIC' | 'STUDENTS_ONLY' | 'PRIVATE';

export type EventProvider = 'LICHESS' | null;

// ─── Database Row Shape ───────────────────────────────────────────────────────

export interface DbEvent {
  id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  external_provider: string | null;
  external_id: string | null;
  external_url: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string;
  time_control: string | null;
  variant: string | null;
  format: string | null;
  is_rated: boolean;
  raw_import_data: Record<string, unknown> | null;
  show_on_homepage: boolean;
  show_on_student_dashboard: boolean;
  show_on_coach_dashboard: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
}

// ─── Lichess API Response Shape (from GET /api/tournament/:id) ────────────────

export interface LichessTournamentApiResponse {
  id: string;
  fullName: string;
  system: string;           // 'arena' | 'swiss'
  minutes: number;
  startsAt: string;         // ISO 8601 UTC
  createdBy: string;
  description?: string;
  perf: {
    key: string;            // 'rapid', 'blitz', 'classical', etc.
    name: string;
    icon: string;
  };
  clock: {
    limit: number;          // seconds per player
    increment: number;      // increment in seconds
  };
  variant: string;          // 'standard', 'crazyhouse', etc.
  rated: boolean;
  nbPlayers: number;
  secondsToStart?: number;
  secondsToFinish?: number;
  quote?: { text: string; author: string };
  verdicts?: { accepted: boolean; list: unknown[] };
}

// ─── Lichess Import Preview (returned to admin before saving) ─────────────────

export interface LichessImportPreview {
  tournamentId: string;
  externalUrl: string;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  timeControl: string;
  variant: string;
  format: string;
  isRated: boolean;
  nbPlayers: number;
  rawData: LichessTournamentApiResponse;
}

// ─── Create / Update Payloads ─────────────────────────────────────────────────

export interface CreateEventPayload {
  event_type: EventType;
  title: string;
  description?: string | null;
  status?: EventStatus;
  visibility?: EventVisibility;
  external_provider?: string | null;
  external_id?: string | null;
  external_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  timezone?: string;
  time_control?: string | null;
  variant?: string | null;
  format?: string | null;
  is_rated?: boolean;
  raw_import_data?: Record<string, unknown> | null;
  show_on_homepage?: boolean;
  show_on_student_dashboard?: boolean;
  show_on_coach_dashboard?: boolean;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

// ─── Extended Notification Type ───────────────────────────────────────────────

export type NotificationType =
  | 'event_published'
  | 'event_live'
  | 'event_cancelled'
  | 'homework'
  | 'class_scheduled'
  | 'class_cancelled'
  | 'assignment_due'
  | 'achievement_unlocked'
  | 'announcement'
  | 'workshop'
  | 'tournament'
  | 'system'
  | 'general';

export interface DbNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  event_id: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// ─── Public Event Card (for listing pages) ────────────────────────────────────

export interface PublicEventCard {
  id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  external_url: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string;
  time_control: string | null;
  variant: string | null;
  format: string | null;
  is_rated: boolean;
  show_on_homepage: boolean;
  raw_import_data?: Record<string, unknown> | null;
}

// ─── Compute derived event status from timestamps ─────────────────────────────

export function computeEventDisplayStatus(
  dbStatus: EventStatus,
  startAt: string | null,
  endAt: string | null,
  rawImportData?: { minutes?: number } | Record<string, unknown> | null
): EventDisplayStatus {
  if (dbStatus === 'CANCELLED') return 'CANCELLED';
  if (dbStatus === 'ARCHIVED') return 'ARCHIVED';
  if (dbStatus === 'DRAFT') return 'DRAFT';

  const now = Date.now();
  if (!startAt) return 'UPCOMING';

  const start = new Date(startAt).getTime();
  if (now < start) return 'UPCOMING';

  // Determine end time with safe fallbacks
  let end: number;
  if (endAt) {
    end = new Date(endAt).getTime();
  } else if (rawImportData && typeof (rawImportData as { minutes?: number }).minutes === 'number') {
    end = start + (rawImportData as { minutes: number }).minutes * 60 * 1000;
  } else {
    // Safe default fallback: 120 minutes (2 hours)
    end = start + 120 * 60 * 1000;
  }

  if (now >= start && now <= end) return 'LIVE';
  return 'COMPLETED';
}

// ─── Format Lichess clock for display ────────────────────────────────────────

export function formatLichessClock(limit: number, increment: number, perfName: string): string {
  const minutes = Math.floor(limit / 60);
  const inc = increment;
  return `${minutes}+${inc} ${perfName}`;
}
