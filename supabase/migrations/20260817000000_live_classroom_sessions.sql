-- ==================================================
-- MIGRATION: 20260817000000_live_classroom_sessions.sql
-- Authoritative Single Live Session Architecture per Class
-- ==================================================

-- 1. Live Sessions Table
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id    UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at    TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Guarantee MAXIMUM ONE ACTIVE SESSION PER CLASS via Partial Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_class 
  ON public.live_sessions (class_id) 
  WHERE (status = 'active');

-- 2. Live Session Participants Table
CREATE TABLE IF NOT EXISTS public.live_session_participants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
  is_online   BOOLEAN DEFAULT TRUE NOT NULL,
  last_seen   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  joined_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  left_at     TIMESTAMP WITH TIME ZONE,
  UNIQUE (session_id, user_id)
);

-- 3. Live Session Board State Table
CREATE TABLE IF NOT EXISTS public.live_session_board_state (
  session_id          UUID PRIMARY KEY REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  fen                 TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' NOT NULL,
  moves               JSONB DEFAULT '[]'::jsonb NOT NULL,
  current_move_index  INT DEFAULT -1 NOT NULL,
  board_controller_id TEXT,
  allow_illegal_moves BOOLEAN DEFAULT FALSE NOT NULL,
  updated_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS) & Add Permissive RLS Policies for Authenticated Users
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_board_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to live_sessions') THEN
    CREATE POLICY "Allow read access to live_sessions" ON public.live_sessions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write access to live_sessions') THEN
    CREATE POLICY "Allow write access to live_sessions" ON public.live_sessions FOR ALL TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to live_session_participants') THEN
    CREATE POLICY "Allow read access to live_session_participants" ON public.live_session_participants FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write access to live_session_participants') THEN
    CREATE POLICY "Allow write access to live_session_participants" ON public.live_session_participants FOR ALL TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to live_session_board_state') THEN
    CREATE POLICY "Allow read access to live_session_board_state" ON public.live_session_board_state FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write access to live_session_board_state') THEN
    CREATE POLICY "Allow write access to live_session_board_state" ON public.live_session_board_state FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 5. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_board_state;

-- 6. Stored Procedure for Atomic Live Session Retrieval/Creation
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
BEGIN
  -- Fetch class name for header display
  SELECT COALESCE(topic, title, name, 'Chess Classroom Session') INTO v_class_name
  FROM public.classes
  WHERE id = p_class_id;

  -- 1. Try to find existing active session for this class
  SELECT id, started_at INTO v_session_id, v_started_at
  FROM public.live_sessions
  WHERE class_id = p_class_id AND status = 'active'
  LIMIT 1;

  -- 2. If no active session exists, create exactly one atomically
  IF v_session_id IS NULL THEN
    INSERT INTO public.live_sessions (class_id, status, started_at)
    VALUES (p_class_id, 'active', timezone('utc'::text, now()))
    ON CONFLICT DO NOTHING
    RETURNING id, started_at INTO v_session_id, v_started_at;

    -- In case of concurrent conflict where another process inserted first
    IF v_session_id IS NULL THEN
      SELECT id, started_at INTO v_session_id, v_started_at
      FROM public.live_sessions
      WHERE class_id = p_class_id AND status = 'active'
      LIMIT 1;
    END IF;

    -- Initialize board state for newly created session
    IF v_session_id IS NOT NULL THEN
      INSERT INTO public.live_session_board_state (session_id)
      VALUES (v_session_id)
      ON CONFLICT (session_id) DO NOTHING;
    END IF;
  END IF;

  -- 3. Upsert participant presence record
  IF p_user_id IS NOT NULL AND v_session_id IS NOT NULL THEN
    INSERT INTO public.live_session_participants (session_id, user_id, role, is_online, last_seen, joined_at)
    VALUES (v_session_id, p_user_id, LOWER(p_role), TRUE, timezone('utc'::text, now()), timezone('utc'::text, now()))
    ON CONFLICT (session_id, user_id) DO UPDATE
      SET is_online = TRUE,
          last_seen = timezone('utc'::text, now()),
          role = LOWER(p_role);
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'class_id', p_class_id,
    'class_name', COALESCE(v_class_name, 'Chess Classroom Session'),
    'status', 'active',
    'started_at', v_started_at
  );
END;
$$;
