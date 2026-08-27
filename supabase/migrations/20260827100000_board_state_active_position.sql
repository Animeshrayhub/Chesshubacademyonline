-- =========================================================
-- Migration: Add active_position JSONB to live_session_board_state
-- Enables full puzzle/game metadata persistence (title, description, solution, etc.)
-- =========================================================

ALTER TABLE public.live_session_board_state
ADD COLUMN IF NOT EXISTS active_position JSONB DEFAULT NULL;
