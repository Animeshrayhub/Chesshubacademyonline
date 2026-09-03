-- ==============================================================================
-- CHESSHUB ACADEMY: CLASSROOM V2 CANONICAL PRODUCTION SCHEMA MIGRATION
-- Run this script in your Supabase SQL Editor:
-- https://app.supabase.com/project/titqwyiiagdxmzkgimpe/sql/new
-- ==============================================================================

-- 1. Extend live_session_board_state with Canonical Classroom V2 Columns
ALTER TABLE public.live_session_board_state
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_board_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS board_controllers TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'NORMAL_GAME',
  ADD COLUMN IF NOT EXISTS orientation TEXT NOT NULL DEFAULT 'white',
  ADD COLUMN IF NOT EXISTS puzzle_state JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS game_state JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS curriculum_state JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quiz_state JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS arrows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlights JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Extend classes table
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Extend classroom_chat table for session-scoping and private messaging
ALTER TABLE public.classroom_chat
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_classroom_chat_session_id ON public.classroom_chat (session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_chat_recipient_id ON public.classroom_chat (recipient_id);

-- 4. Create Distributed Idempotency Keys Table
CREATE TABLE IF NOT EXISTS public.classroom_idempotency_keys (
  key TEXT PRIMARY KEY,
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classroom_idempotency_expires_at
  ON public.classroom_idempotency_keys (expires_at);

ALTER TABLE public.classroom_idempotency_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classroom_idempotency_keys' AND policyname = 'Allow system service access to idempotency keys') THEN
    CREATE POLICY "Allow system service access to idempotency keys"
      ON public.classroom_idempotency_keys FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 5. Create Security & Audit Log Table
CREATE TABLE IF NOT EXISTS public.classroom_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classroom_audit_class_id
  ON public.classroom_audit_logs (class_id, created_at DESC);

ALTER TABLE public.classroom_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classroom_audit_logs' AND policyname = 'Allow coach and admin read access to audit logs') THEN
    CREATE POLICY "Allow coach and admin read access to audit logs"
      ON public.classroom_audit_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classroom_audit_logs' AND policyname = 'Allow server to insert audit logs') THEN
    CREATE POLICY "Allow server to insert audit logs"
      ON public.classroom_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- 6. Add to Supabase Realtime Publication
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_board_state;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_chat;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
