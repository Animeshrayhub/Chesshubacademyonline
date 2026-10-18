-- ==============================================================================
-- CHESSHUB ACADEMY: EVENTS SYSTEM PHASE 1
-- Migration: 20261003000000_chesshub_events_phase1.sql
--
-- CREATES:
--   1. public.events — Dedicated events table supporting LICHESS_TOURNAMENT,
--      INTERNAL_TOURNAMENT, WORKSHOP, MASTERCLASS, PUZZLE_CHALLENGE, ANNOUNCEMENT
--   2. Extends public.notifications with type, event_id, read_at, metadata columns
--      and an idempotency index uq_notifications_user_event_type
--   3. Applies strict least-privilege grants and RLS policies
--
-- SAFE: Additive only. Zero destructive changes.
-- PRESERVES: All existing notifications records.
-- COMPATIBLE: Follows existing naming conventions.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: EVENTS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type                VARCHAR(30) NOT NULL DEFAULT 'LICHESS_TOURNAMENT'
    CHECK (event_type IN (
      'LICHESS_TOURNAMENT',
      'INTERNAL_TOURNAMENT',
      'WORKSHOP',
      'MASTERCLASS',
      'PUZZLE_CHALLENGE',
      'ANNOUNCEMENT'
    )),

  -- Core content
  title                     TEXT NOT NULL,
  description               TEXT,

  -- Persisted publication lifecycle status
  -- (Runtime display status UPCOMING, LIVE, COMPLETED is derived from timestamps)
  status                    VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED')),

  -- Audience visibility tier
  visibility                VARCHAR(20) NOT NULL DEFAULT 'PUBLIC'
    CHECK (visibility IN ('PUBLIC', 'STUDENTS_ONLY', 'PRIVATE')),

  -- External provider integration (Lichess, Chess.com, etc.)
  external_provider         VARCHAR(50),     -- e.g. 'LICHESS'
  external_id               TEXT,            -- e.g. 'RjKXaR5C'
  external_url              TEXT,            -- e.g. 'https://lichess.org/tournament/RjKXaR5C'

  -- Scheduling (stored in UTC timestamptz; timezone only for display purposes)
  start_at                  TIMESTAMPTZ,
  end_at                    TIMESTAMPTZ,
  timezone                  VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',

  -- Tournament-specific metadata (populated from Lichess API import)
  time_control              VARCHAR(100),    -- e.g. '8+0 Rapid'
  variant                   VARCHAR(50),     -- e.g. 'standard', 'crazyhouse'
  format                    VARCHAR(50),     -- e.g. 'arena', 'swiss'
  is_rated                  BOOLEAN NOT NULL DEFAULT false,

  -- Full raw Lichess API snapshot for audit and recovery
  raw_import_data           JSONB,

  -- Dashboard display toggles
  show_on_homepage          BOOLEAN NOT NULL DEFAULT false,
  show_on_student_dashboard BOOLEAN NOT NULL DEFAULT true,
  show_on_coach_dashboard   BOOLEAN NOT NULL DEFAULT true,

  -- Authorship (FK to users table, consistent with announcements pattern)
  created_by                UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at              TIMESTAMPTZ,
  archived_at               TIMESTAMPTZ,

  -- Duplicate guard: same external provider + same external ID can only exist ONCE
  CONSTRAINT uq_events_external_provider_id UNIQUE (external_provider, external_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_status
  ON public.events (status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_start_at
  ON public.events (start_at)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_visibility_status
  ON public.events (visibility, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_event_type
  ON public.events (event_type)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON public.events (created_by);

-- Auto-update updated_at timestamp (ensures update_timestamp function exists idempotently)
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- ==============================================================================
-- SECTION 2: EXTEND EXISTING NOTIFICATIONS TABLE
-- Additive only — existing records and RLS policy are preserved
-- ==============================================================================

-- Ensures base notifications table exists idempotently
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Add notification type for categorization
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'general';

-- Add CHECK constraint
DO $$ BEGIN
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (
      type IN (
        'event_published',
        'event_live',
        'event_cancelled',
        'homework',
        'class_scheduled',
        'class_cancelled',
        'assignment_due',
        'achievement_unlocked',
        'announcement',
        'workshop',
        'tournament',
        'system',
        'general'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Link notification to specific event (nullable — not all notifications are event-related)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- Track when user read the notification (for read receipts)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Extensible metadata for future channels (email subject, WhatsApp template, etc.)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Idempotency index: prevents duplicate notifications for the same event and type per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_event_type
  ON public.notifications (user_id, event_id, type)
  WHERE event_id IS NOT NULL;

-- Performance indexes on notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = false AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_event_id
  ON public.notifications (event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications (type)
  WHERE archived_at IS NULL;

-- ==============================================================================
-- SECTION 3: ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- 3.1 EVENTS RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated): read PUBLISHED + PUBLIC events only
-- Covers UPCOMING, LIVE, and COMPLETED states because status stays 'PUBLISHED'
DROP POLICY IF EXISTS "events: public read published" ON public.events;
DROP POLICY IF EXISTS "events: public read published public" ON public.events;
CREATE POLICY "events: public read published"
  ON public.events
  FOR SELECT
  USING (
    status = 'PUBLISHED'
    AND visibility = 'PUBLIC'
    AND archived_at IS NULL
  );

-- Authenticated students & coaches: read PUBLISHED events per visibility tier
DROP POLICY IF EXISTS "events: students read published" ON public.events;
DROP POLICY IF EXISTS "events: authenticated read permitted" ON public.events;
CREATE POLICY "events: authenticated read permitted"
  ON public.events
  FOR SELECT TO authenticated
  USING (
    status = 'PUBLISHED'
    AND archived_at IS NULL
    AND (
      visibility IN ('PUBLIC', 'STUDENTS_ONLY')
      OR public.is_admin()
    )
  );

-- Admin: full control over all events (draft, published, archived, cancelled)
DROP POLICY IF EXISTS "events: admin full control" ON public.events;
DROP POLICY IF EXISTS "events: admin manage all" ON public.events;
CREATE POLICY "events: admin manage all"
  ON public.events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3.2 NOTIFICATIONS RLS (Enforce ownership security model)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Read own notifications only
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update own notifications only (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- SECTION 4: LEAST-PRIVILEGE GRANTS
-- ==============================================================================

-- 4.1 events table grants (Read-only for clients; all writes via server-side/service_role):
REVOKE ALL ON public.events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO postgres, service_role;

-- 4.2 notifications table grants:
-- Anonymous users: NO ACCESS
REVOKE ALL ON public.notifications FROM PUBLIC, anon;

-- Authenticated users: SELECT and UPDATE only (NO direct client INSERT or DELETE)
REVOKE INSERT, DELETE ON public.notifications FROM authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Service role & Postgres: Full privileges (used by server-side fan-out admin client)
GRANT ALL ON public.notifications TO postgres, service_role;

NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
