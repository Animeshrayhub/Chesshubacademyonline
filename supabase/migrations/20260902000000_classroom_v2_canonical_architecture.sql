-- ============================================================================
-- MIGRATION: 20260902000000_classroom_v2_canonical_architecture.sql
-- Classroom V2: Canonical State, Role Authority, Private Chat, & RLS Security
-- ============================================================================

-- 1. Extend live_session_board_state for Canonical Single State Model
ALTER TABLE public.live_session_board_state
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'NORMAL_GAME',
  ADD COLUMN IF NOT EXISTS orientation TEXT NOT NULL DEFAULT 'white',
  ADD COLUMN IF NOT EXISTS is_board_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS active_puzzle JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_game JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_curriculum JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS board_controllers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS arrows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_state JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_live_session_board_state_class_id
  ON public.live_session_board_state (class_id);

-- 2. Extend classroom_chat for Private Coach <-> Student Communication
ALTER TABLE public.classroom_chat
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_classroom_chat_session_id
  ON public.classroom_chat (session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_chat_recipient_id
  ON public.classroom_chat (recipient_id);

-- 3. Create classroom_responses table for Realtime Response System
CREATE TABLE IF NOT EXISTS public.classroom_responses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id     UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  session_id   UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id   UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL,
  prompt       TEXT,
  response     TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classroom_responses_class_id ON public.classroom_responses (class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_responses_session_id ON public.classroom_responses (session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_responses_student_id ON public.classroom_responses (student_id);

-- 4. Enable RLS and Configure Strict Non-Leaking Policies
ALTER TABLE public.classroom_responses ENABLE ROW LEVEL SECURITY;

-- 4a. classroom_responses policies
DROP POLICY IF EXISTS "Users can read own or managed responses" ON public.classroom_responses;
CREATE POLICY "Users can read own or managed responses" ON public.classroom_responses
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'COACH')
    )
  );

DROP POLICY IF EXISTS "Students can insert responses" ON public.classroom_responses;
CREATE POLICY "Students can insert responses" ON public.classroom_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'COACH')
    )
  );

-- 4b. classroom_chat strict privacy policies
DROP POLICY IF EXISTS "Users can read classroom chat" ON public.classroom_chat;
CREATE POLICY "Users can read classroom chat" ON public.classroom_chat
  FOR SELECT TO authenticated
  USING (
    -- Shared public messages in class
    (
      is_private = FALSE AND
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND (
          u.role = 'ADMIN' OR
          u.role = 'COACH' OR
          EXISTS (
            SELECT 1 FROM public.student_profiles sp
            JOIN public.class_students cs ON cs.student_id = sp.id
            WHERE sp.user_id = u.id AND cs.class_id = classroom_chat.class_id
          )
        )
      )
    )
    OR
    -- Private messages: only visible to sender, recipient, or Coach/Admin
    (
      is_private = TRUE AND (
        sender_id = auth.uid() OR
        recipient_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'COACH')
        )
      )
    )
  );

-- 4c. quiz_answers privacy policy: Prevent Students from seeing other students' quiz answers
DROP POLICY IF EXISTS "quiz_answers_read" ON public.quiz_answers;
CREATE POLICY "quiz_answers_read" ON public.quiz_answers
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'COACH')
    )
  );

-- 5. Safe Realtime Publications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_board_state;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_chat;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_responses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Canonical get_or_create_active_live_session RPC (Enforcing Coach/Admin Authority)
CREATE OR REPLACE FUNCTION public.get_or_create_active_live_session(
  p_class_id UUID,
  p_user_id  UUID,
  p_role     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_started_at TIMESTAMP WITH TIME ZONE;
  v_class_name TEXT;
  v_role TEXT := LOWER(COALESCE(p_role, ''));
BEGIN
  -- Fetch class name
  SELECT COALESCE(title, name, 'Chess Classroom Session') INTO v_class_name
  FROM public.classes
  WHERE id = p_class_id;

  IF v_class_name IS NULL THEN
    v_class_name := 'Chess Classroom Session';
  END IF;

  -- 1. Check for existing active session
  SELECT id, started_at INTO v_session_id, v_started_at
  FROM public.live_sessions
  WHERE class_id = p_class_id AND status = 'active'
  LIMIT 1;

  -- 2. ONLY Coach or Admin can create an active live session!
  -- A Student must NEVER create a live session.
  IF v_session_id IS NULL AND (v_role = 'coach' OR v_role = 'admin') THEN
    INSERT INTO public.live_sessions (class_id, status, started_at)
    VALUES (p_class_id, 'active', timezone('utc'::text, now()))
    ON CONFLICT DO NOTHING
    RETURNING id, started_at INTO v_session_id, v_started_at;

    -- Concurrency fallback
    IF v_session_id IS NULL THEN
      SELECT id, started_at INTO v_session_id, v_started_at
      FROM public.live_sessions
      WHERE class_id = p_class_id AND status = 'active'
      LIMIT 1;
    END IF;

    -- Initialize canonical board state for the active session
    IF v_session_id IS NOT NULL THEN
      INSERT INTO public.live_session_board_state (
        session_id, class_id, fen, moves, current_move_index, version, mode, orientation, is_board_locked, updated_at
      )
      VALUES (
        v_session_id, p_class_id,
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        '[]'::jsonb, -1, 1, 'NORMAL_GAME', 'white', FALSE, timezone('utc'::text, now())
      )
      ON CONFLICT (session_id) DO NOTHING;
    END IF;
  END IF;

  -- 3. Upsert participant presence record if session exists
  IF p_user_id IS NOT NULL AND v_session_id IS NOT NULL THEN
    INSERT INTO public.live_session_participants (session_id, user_id, role, is_online, last_seen, joined_at)
    VALUES (v_session_id, p_user_id, v_role, TRUE, timezone('utc'::text, now()), timezone('utc'::text, now()))
    ON CONFLICT (session_id, user_id) DO UPDATE
      SET is_online = TRUE,
          last_seen = timezone('utc'::text, now()),
          role = v_role;
  END IF;

  -- If still no active session (e.g. Student entering before Coach has started)
  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object(
      'session_id', NULL,
      'class_id', p_class_id,
      'class_name', v_class_name,
      'status', 'scheduled',
      'started_at', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'class_id', p_class_id,
    'class_name', v_class_name,
    'status', 'active',
    'started_at', v_started_at
  );
END;
$$;

-- 7. Create classroom_bookmarks table
CREATE TABLE IF NOT EXISTS public.classroom_bookmarks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id     UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  session_id   UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  fen          TEXT NOT NULL,
  move_index   INT NOT NULL DEFAULT -1,
  note         TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classroom_bookmarks_session_id ON public.classroom_bookmarks (session_id);

-- 8. Create classroom_timeline_events table
CREATE TABLE IF NOT EXISTS public.classroom_timeline_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id     UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  session_id   UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type   TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classroom_timeline_session_id ON public.classroom_timeline_events (session_id);

ALTER TABLE public.classroom_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_timeline_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read classroom_bookmarks') THEN
    CREATE POLICY "Allow read classroom_bookmarks" ON public.classroom_bookmarks FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write classroom_bookmarks') THEN
    CREATE POLICY "Allow write classroom_bookmarks" ON public.classroom_bookmarks FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read classroom_timeline_events') THEN
    CREATE POLICY "Allow read classroom_timeline_events" ON public.classroom_timeline_events FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write classroom_timeline_events') THEN
    CREATE POLICY "Allow write classroom_timeline_events" ON public.classroom_timeline_events FOR ALL TO authenticated USING (true);
  END IF;
END $$;
