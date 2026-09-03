-- ============================================================================
-- MIGRATION: 20260902000001_classroom_v2_hardening_and_idempotency.sql
-- Classroom V2: Distributed DB-Backed Idempotency, Security Audit Logs & Strict RLS
-- ============================================================================

-- 1. Create classroom_idempotency_keys table for distributed deduplication
CREATE TABLE IF NOT EXISTS public.classroom_idempotency_keys (
  key          TEXT PRIMARY KEY,
  session_id   UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  action_name  TEXT NOT NULL,
  result       JSONB,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) + interval '5 minutes' NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classroom_idempotency_expires ON public.classroom_idempotency_keys (expires_at);
CREATE INDEX IF NOT EXISTS idx_classroom_idempotency_session ON public.classroom_idempotency_keys (session_id);

ALTER TABLE public.classroom_idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classroom_idempotency_access" ON public.classroom_idempotency_keys;
CREATE POLICY "classroom_idempotency_access" ON public.classroom_idempotency_keys
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Create classroom_audit_logs table for security-sensitive classroom actions
CREATE TABLE IF NOT EXISTS public.classroom_audit_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id        UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  session_id      UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role      TEXT NOT NULL,
  action          TEXT NOT NULL,
  target_user_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata        JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classroom_audit_class_id ON public.classroom_audit_logs (class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_audit_session_id ON public.classroom_audit_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_audit_created_at ON public.classroom_audit_logs (created_at);

ALTER TABLE public.classroom_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classroom_audit_select" ON public.classroom_audit_logs;
CREATE POLICY "classroom_audit_select" ON public.classroom_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (
        u.role = 'ADMIN' OR
        EXISTS (
          SELECT 1 FROM public.classes c
          WHERE c.id = classroom_audit_logs.class_id AND (
            c.coach_id = u.id OR
            EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.user_id = u.id AND cp.id = c.coach_id)
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "classroom_audit_insert" ON public.classroom_audit_logs;
CREATE POLICY "classroom_audit_insert" ON public.classroom_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'COACH')
    )
  );

-- 3. Harden RLS on classroom_bookmarks (Remove broad USING (true))
DROP POLICY IF EXISTS "Allow read classroom_bookmarks" ON public.classroom_bookmarks;
DROP POLICY IF EXISTS "Allow write classroom_bookmarks" ON public.classroom_bookmarks;
DROP POLICY IF EXISTS "classroom_bookmarks_select" ON public.classroom_bookmarks;
DROP POLICY IF EXISTS "classroom_bookmarks_modify" ON public.classroom_bookmarks;

CREATE POLICY "classroom_bookmarks_select" ON public.classroom_bookmarks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (
        u.role = 'ADMIN' OR
        EXISTS (
          SELECT 1 FROM public.classes c
          WHERE c.id = classroom_bookmarks.class_id AND (
            c.coach_id = u.id OR
            EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.user_id = u.id AND cp.id = c.coach_id)
          )
        ) OR
        EXISTS (
          SELECT 1 FROM public.student_profiles sp
          JOIN public.class_students cs ON cs.student_id = sp.id
          WHERE sp.user_id = u.id AND cs.class_id = classroom_bookmarks.class_id
        )
      )
    )
  );

CREATE POLICY "classroom_bookmarks_modify" ON public.classroom_bookmarks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (
        u.role = 'ADMIN' OR
        EXISTS (
          SELECT 1 FROM public.classes c
          WHERE c.id = classroom_bookmarks.class_id AND (
            c.coach_id = u.id OR
            EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.user_id = u.id AND cp.id = c.coach_id)
          )
        )
      )
    )
  );

-- 4. Harden RLS on classroom_timeline_events (Remove broad USING (true))
DROP POLICY IF EXISTS "Allow read classroom_timeline_events" ON public.classroom_timeline_events;
DROP POLICY IF EXISTS "Allow write classroom_timeline_events" ON public.classroom_timeline_events;
DROP POLICY IF EXISTS "classroom_timeline_select" ON public.classroom_timeline_events;
DROP POLICY IF EXISTS "classroom_timeline_modify" ON public.classroom_timeline_events;

CREATE POLICY "classroom_timeline_select" ON public.classroom_timeline_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (
        u.role = 'ADMIN' OR
        EXISTS (
          SELECT 1 FROM public.classes c
          WHERE c.id = classroom_timeline_events.class_id AND (
            c.coach_id = u.id OR
            EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.user_id = u.id AND cp.id = c.coach_id)
          )
        ) OR
        EXISTS (
          SELECT 1 FROM public.student_profiles sp
          JOIN public.class_students cs ON cs.student_id = sp.id
          WHERE sp.user_id = u.id AND cs.class_id = classroom_timeline_events.class_id
        )
      )
    )
  );

CREATE POLICY "classroom_timeline_modify" ON public.classroom_timeline_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (
        u.role = 'ADMIN' OR
        EXISTS (
          SELECT 1 FROM public.classes c
          WHERE c.id = classroom_timeline_events.class_id AND (
            c.coach_id = u.id OR
            EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.user_id = u.id AND cp.id = c.coach_id)
          )
        )
      )
    )
  );

-- 5. Harden RLS on live_session_board_state
DROP POLICY IF EXISTS "live_session_board_state_select" ON public.live_session_board_state;
CREATE POLICY "live_session_board_state_select" ON public.live_session_board_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (
        u.role = 'ADMIN' OR
        class_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.classes c
          WHERE c.id = live_session_board_state.class_id AND (
            c.coach_id = u.id OR
            EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.user_id = u.id AND cp.id = c.coach_id)
          )
        ) OR
        EXISTS (
          SELECT 1 FROM public.student_profiles sp
          JOIN public.class_students cs ON cs.student_id = sp.id
          WHERE sp.user_id = u.id AND cs.class_id = live_session_board_state.class_id
        )
      )
    )
  );
