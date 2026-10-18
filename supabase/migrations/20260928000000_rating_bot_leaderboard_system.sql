-- ==============================================================================
-- CHESSHUB ACADEMY: CANONICAL RATING, LEADERBOARD & ADAPTIVE BOT SYSTEM
-- Migration: 20260928000000_rating_bot_leaderboard_system.sql
-- 
-- DESCRIPTION:
-- 1. Creates 5 strictly segregated rating categories (BLITZ, RAPID, CLASSICAL, BOT, PUZZLE)
--    with canonical starting rating of 400.
-- 2. Creates bot difficulty & strength profiles table (decoupling bot level from student Elo).
-- 3. Creates immutable rating audit history and human rated match tracking.
-- 4. Creates bot level progression tracking with multi-factor readiness scores.
-- 5. Creates immutable XP transaction ledger and canonical achievement tables.
-- 6. Creates rating abuse flags queue for admin/coach review.
-- 7. Additively enhances existing users, student_bot_games, student_bot_mistakes, and student_weaknesses.
-- 8. Hardens RLS by revoking insecure client-write policies from legacy bot migrations.
-- 9. Safely migrates existing Bot ratings, tactical ratings, and country using:
--    EXTRACT -> VALIDATE -> VERIFY -> PRESERVE (never clears or truncates historical notes).
-- 10. 100% Idempotent, Additive, and Production-Safe. Zero Classroom/Realtime disruption.
-- ==============================================================================

-- Ensure uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- SECTION 1: BOT DIFFICULTY PROFILES (DECOUPLING ENGINE LEVEL FROM STUDENT ELO)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bot_difficulty_profiles (
  bot_level                  INTEGER PRIMARY KEY CHECK (bot_level BETWEEN 1 AND 10),
  bot_name                   VARCHAR(100) NOT NULL,
  description                TEXT NOT NULL,
  engine_type                VARCHAR(30) NOT NULL CHECK (engine_type IN ('MINIMAX', 'STOCKFISH')),
  search_depth               INTEGER NOT NULL CHECK (search_depth BETWEEN 1 AND 24),
  skill_level                INTEGER NOT NULL CHECK (skill_level BETWEEN 0 AND 20),
  estimated_strength_rating  INTEGER NOT NULL CHECK (estimated_strength_rating >= 100),
  avatar_icon                VARCHAR(50) NOT NULL,
  opening_style              TEXT NOT NULL,
  tactical_awareness_percent NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (tactical_awareness_percent BETWEEN 0 AND 100),
  blunder_probability        NUMERIC(4,3) NOT NULL DEFAULT 0.000 CHECK (blunder_probability BETWEEN 0 AND 1),
  is_active                  BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.bot_difficulty_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Seed canonical 10-level engine profiles
INSERT INTO public.bot_difficulty_profiles 
  (bot_level, bot_name, description, engine_type, search_depth, skill_level, estimated_strength_rating, avatar_icon, opening_style, tactical_awareness_percent, blunder_probability)
VALUES
  (1,  'Level 1 — Pawn Novice',         'Beginner coach. Gentle moves, safe captures, forgiving play.',   'MINIMAX',   1,  0,  400,  '♟️', 'Gentle Basics & Easy Development',       20.00, 0.400),
  (2,  'Level 2 — Knight Scout',        'Casual fundamentals. Solid development, avoids 1-move blunders.',          'MINIMAX',   2,  2,  600,  '♞', 'Classical Opening Fundamentals',          40.00, 0.250),
  (3,  'Level 3 — Bishop Tactician',    'Intermediate tactician. Aggressive opening tests, Italian & Fried Liver.', 'MINIMAX',   4,  5,  800,  '♝', 'Italian Game & Fried Liver Attack',       60.00, 0.150),
  (4,  'Level 4 — Rook Guardian',       'Club player. Solid pawn structure and positional awareness.',             'STOCKFISH', 4,  3,  1000, '♜', 'Ruy Lopez & Queen''s Gambit',             75.00, 0.080),
  (5,  'Level 5 — Queen Striker',       'Advanced attacker. Sharp tactical counter-attacks and pins.',              'STOCKFISH', 6,  6,  1200, '♛', 'Sicilian & French Defenses',               85.00, 0.040),
  (6,  'Level 6 — Candidate Master',    'Expert CM. Exploits weaknesses and converts material advantages.',        'STOCKFISH', 8,  9,  1400, '🏅', 'Modern Tournament Systems',                90.00, 0.020),
  (7,  'Level 7 — FIDE Master',         'FIDE Master. Deep opening prep and relentless tactical punishment.',      'STOCKFISH', 10, 12, 1600, '🎖️', 'Deep Theory & Dynamic Play',             95.00, 0.010),
  (8,  'Level 8 — International Master','Master IM. Virtuoso calculation, dynamic sacrifices, master endgames.',   'STOCKFISH', 12, 15, 1800, '🥇', 'Grandmaster Repertoires',                   98.00, 0.005),
  (9,  'Level 9 — Grandmaster',         'FIDE GM. Flawless prophylaxis, iron defense, ruthless conversion.',        'STOCKFISH', 14, 18, 2000, '👑', 'Super GM Modern Repertoires',             99.00, 0.001),
  (10, 'Level 10 — Super Engine',       'Champion Bot. Maximum calculation speed and flawless precision.',         'STOCKFISH', 18, 20, 2200, '⚡', 'Deep Engine Preparation',                    100.00,0.000)
ON CONFLICT (bot_level) DO NOTHING;

-- ==============================================================================
-- SECTION 2: CANONICAL STUDENT RATINGS TABLE (5 SEPARATE CATEGORIES)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_ratings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating_category  VARCHAR(20) NOT NULL CHECK (rating_category IN ('BLITZ', 'RAPID', 'CLASSICAL', 'BOT', 'PUZZLE')),
  current_rating   INTEGER NOT NULL DEFAULT 400 CHECK (current_rating >= 100),
  highest_rating   INTEGER NOT NULL DEFAULT 400 CHECK (highest_rating >= 100),
  lowest_rating    INTEGER NOT NULL DEFAULT 400 CHECK (lowest_rating >= 100),
  games_played     INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  wins             INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses           INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  draws            INTEGER NOT NULL DEFAULT 0 CHECK (draws >= 0),
  is_provisional   BOOLEAN NOT NULL DEFAULT true,
  is_frozen        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_student_ratings_student_category UNIQUE(student_id, rating_category)
);

CREATE INDEX IF NOT EXISTS idx_student_ratings_cat_current 
  ON public.student_ratings (rating_category, current_rating DESC);

CREATE INDEX IF NOT EXISTS idx_student_ratings_student 
  ON public.student_ratings (student_id);

-- ==============================================================================
-- SECTION 3: CANONICAL RATING HISTORY (IMMUTABLE AUDIT LOG)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rating_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating_category  VARCHAR(20) NOT NULL CHECK (rating_category IN ('BLITZ', 'RAPID', 'CLASSICAL', 'BOT', 'PUZZLE')),
  game_id          UUID,
  rating_before    INTEGER NOT NULL CHECK (rating_before >= 100),
  rating_change    INTEGER NOT NULL,
  rating_after     INTEGER NOT NULL CHECK (rating_after >= 100),
  opponent_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  opponent_rating  INTEGER CHECK (opponent_rating >= 100),
  opponent_name    VARCHAR(150),
  result           VARCHAR(10) NOT NULL CHECK (result IN ('WIN', 'LOSS', 'DRAW')),
  reason           VARCHAR(50) NOT NULL DEFAULT 'GAME_COMPLETE',
  idempotency_key  VARCHAR(150) UNIQUE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rating_history_student_cat_created 
  ON public.rating_history (student_id, rating_category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rating_history_game 
  ON public.rating_history (game_id);

-- ==============================================================================
-- SECTION 4: HUMAN RATED GAMES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rated_games (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_player_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  black_player_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  time_control_category VARCHAR(20) NOT NULL CHECK (time_control_category IN ('BLITZ', 'RAPID', 'CLASSICAL')),
  time_control          VARCHAR(30) NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'VOIDED')),
  result                VARCHAR(20) NOT NULL CHECK (result IN ('WHITE_WIN', 'BLACK_WIN', 'DRAW', 'IN_PROGRESS', 'VOID')),
  termination           VARCHAR(30) NOT NULL DEFAULT 'CHECKMATE',
  pgn                   TEXT,
  initial_fen           TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  final_fen             TEXT,
  move_count            INTEGER DEFAULT 0,
  white_rating_before   INTEGER NOT NULL,
  white_rating_change   INTEGER NOT NULL DEFAULT 0,
  white_rating_after    INTEGER NOT NULL,
  black_rating_before   INTEGER NOT NULL,
  black_rating_change   INTEGER NOT NULL DEFAULT 0,
  black_rating_after    INTEGER NOT NULL,
  is_processed          BOOLEAN NOT NULL DEFAULT true,
  idempotency_key       VARCHAR(150) UNIQUE NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at              TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_different_players CHECK (white_player_id <> black_player_id)
);

CREATE INDEX IF NOT EXISTS idx_rated_games_white ON public.rated_games (white_player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rated_games_black ON public.rated_games (black_player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rated_games_category ON public.rated_games (time_control_category, created_at DESC);

-- ==============================================================================
-- SECTION 5: BOT LEVEL PROGRESSION TABLE (MULTI-FACTOR READINESS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bot_level_progression (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bot_level          INTEGER NOT NULL CHECK (bot_level BETWEEN 1 AND 10),
  games_score        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (games_score BETWEEN 0 AND 100),
  performance_score  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (performance_score BETWEEN 0 AND 100),
  accuracy_score     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (accuracy_score BETWEEN 0 AND 100),
  improvement_score  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (improvement_score BETWEEN 0 AND 100),
  readiness_score    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
  is_unlocked        BOOLEAN NOT NULL DEFAULT false,
  coach_unlocked     BOOLEAN NOT NULL DEFAULT false,
  unlocked_at        TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_student_bot_level UNIQUE(student_id, bot_level)
);

CREATE INDEX IF NOT EXISTS idx_bot_progression_student ON public.bot_level_progression (student_id);

-- ==============================================================================
-- SECTION 6: IMMUTABLE XP TRANSACTIONS LEDGER
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount           INTEGER NOT NULL CHECK (amount > 0 AND amount <= 50000),
  source_type      VARCHAR(50) NOT NULL CHECK (source_type IN ('BOT_GAME', 'PUZZLE', 'HOMEWORK', 'ACHIEVEMENT', 'STREAK', 'TOURNAMENT', 'ADMIN_ADJUST')),
  source_id        VARCHAR(100),
  description      TEXT,
  idempotency_key  VARCHAR(150) UNIQUE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_xp_student_date ON public.xp_transactions (student_id, created_at DESC);

-- ==============================================================================
-- SECTION 7: CANONICAL ACHIEVEMENTS SYSTEM
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
  badge_icon  TEXT NOT NULL,
  xp_reward   INTEGER NOT NULL DEFAULT 100,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.achievements
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.student_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_student_achievement UNIQUE(student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON public.student_achievements (student_id);

-- Seed basic canonical achievements
INSERT INTO public.achievements (code, title, description, category, badge_icon, xp_reward)
VALUES
  ('FIRST_GAME',        'First Steps',             'Completed your very first rated game.',             'MILESTONE', '♟️',  50),
  ('FIRST_WIN',         'Taste of Victory',        'Won your first chess match.',                       'VICTORY',   '🏆',  75),
  ('GAMES_10',          'Active Contender',        'Played 10 chess games.',                           'MILESTONE', '🥉', 100),
  ('GAMES_50',          'Seasoned Fighter',        'Played 50 chess games.',                           'MILESTONE', '🥈', 250),
  ('GAMES_100',         'Grand Centurion',         'Completed 100 chess games.',                       'MILESTONE', '🥇', 500),
  ('FIRST_BOT_WIN',     'Machine Breaker',         'Defeated a training bot in battle.',               'BOT',       '🤖',  75),
  ('BEAT_BOT_LEVEL_3',  'Bishop Conqueror',        'Conquered Level 3 Bishop Tactician.',              'BOT',       '♝', 150),
  ('BEAT_BOT_LEVEL_5',  'Queen Slayer',            'Defeated Level 5 Queen Striker in combat.',        'BOT',       '👑', 300),
  ('BEAT_BOT_LEVEL_10', 'Grandmaster of Silicon',  'Conquered Level 10 Super Engine.',                 'BOT',       '⚡',1000),
  ('PUZZLE_10_SOLVED',  'Tactical Spark',          'Solved 10 tactical puzzles.',                      'TACTICS',   '🧩', 100),
  ('PUZZLE_50_SOLVED',  'Tactical Sharpness',      'Solved 50 tactical puzzles.',                      'TACTICS',   '🎯', 300),
  ('WINNING_STREAK_5',  'Unstoppable Force',       'Won 5 rated games in a row.',                      'STREAK',    '🔥', 200)
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- SECTION 8: RATING ABUSE FLAGS TABLE (WORKFLOW QUEUE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rating_abuse_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flag_reason  VARCHAR(100) NOT NULL,
  severity     VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED', 'PENALIZED')),
  reviewed_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  details      JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rating_abuse_status ON public.rating_abuse_flags (status, created_at DESC);

-- ==============================================================================
-- SECTION 9: ADDITIVE MODIFICATIONS TO EXISTING TABLES
-- ==============================================================================

-- 9.1. Add country and ensure is_active on public.users
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_country_active ON public.users (country, is_active);

-- 9.2. Add starting position source & opening stats to public.student_bot_games
ALTER TABLE IF EXISTS public.student_bot_games
  ADD COLUMN IF NOT EXISTS starting_position_type VARCHAR(20) DEFAULT 'NORMAL' 
    CHECK (starting_position_type IN ('NORMAL', 'OPENING', 'MISTAKE', 'WEAKNESS')),
  ADD COLUMN IF NOT EXISTS opening_name TEXT,
  ADD COLUMN IF NOT EXISTS eco VARCHAR(10),
  ADD COLUMN IF NOT EXISTS accuracy NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS blunders_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mistakes_count INTEGER DEFAULT 0;

-- 9.3. Add attempt & solve flow tracking to public.student_bot_mistakes
ALTER TABLE IF EXISTS public.student_bot_mistakes
  ADD COLUMN IF NOT EXISTS attempt_status VARCHAR(20) DEFAULT 'unattempted' 
    CHECK (attempt_status IN ('unattempted', 'solved', 'failed')),
  ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solve_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS solved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coach_assigned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- 9.4. Add trend and coach overrides to public.student_weaknesses
ALTER TABLE IF EXISTS public.student_weaknesses
  ADD COLUMN IF NOT EXISTS trend VARCHAR(20) DEFAULT 'STABLE' 
    CHECK (trend IN ('IMPROVING', 'STABLE', 'WORSENING')),
  ADD COLUMN IF NOT EXISTS coach_approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS coach_override_severity VARCHAR(10),
  ADD COLUMN IF NOT EXISTS coach_notes TEXT,
  ADD COLUMN IF NOT EXISTS coach_override_by UUID REFERENCES public.users(id);

-- ==============================================================================
-- SECTION 10: RLS REMEDIATION & HARDENED POLICIES
-- ==============================================================================

-- Drop vulnerable legacy policies from 20260825000001_bot_training_rls.sql
DROP POLICY IF EXISTS "student_can_insert_own_bot_profile" ON public.student_bot_profiles;
DROP POLICY IF EXISTS "student_can_update_own_bot_profile" ON public.student_bot_profiles;
DROP POLICY IF EXISTS "student_can_insert_own_rating_history" ON public.student_bot_rating_history;
DROP POLICY IF EXISTS "student_can_upsert_own_weaknesses" ON public.student_weaknesses;
DROP POLICY IF EXISTS "student_can_update_own_weaknesses" ON public.student_weaknesses;

-- Enable RLS across all new tables
ALTER TABLE public.bot_difficulty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rated_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_level_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_abuse_flags ENABLE ROW LEVEL SECURITY;

-- ── 10.1. bot_difficulty_profiles (Public Read-Only) ────────────
DROP POLICY IF EXISTS "anyone_read_bot_difficulty_profiles" ON public.bot_difficulty_profiles;
CREATE POLICY "anyone_read_bot_difficulty_profiles" ON public.bot_difficulty_profiles
  FOR SELECT TO authenticated USING (true);

-- ── 10.2. student_ratings (Student Read-Only, Coach Assigned Read-Only) ──
DROP POLICY IF EXISTS "student_read_own_ratings" ON public.student_ratings;
CREATE POLICY "student_read_own_ratings" ON public.student_ratings
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "coach_read_assigned_student_ratings" ON public.student_ratings;
CREATE POLICY "coach_read_assigned_student_ratings" ON public.student_ratings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      JOIN public.coach_profiles cp ON cp.id = csa.coach_id
      WHERE sp.user_id = public.student_ratings.student_id
        AND cp.user_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── 10.3. rating_history (Immutable Read-Only) ───────────────────
DROP POLICY IF EXISTS "student_read_own_rating_history" ON public.rating_history;
CREATE POLICY "student_read_own_rating_history" ON public.rating_history
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "coach_read_assigned_rating_history" ON public.rating_history;
CREATE POLICY "coach_read_assigned_rating_history" ON public.rating_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      JOIN public.coach_profiles cp ON cp.id = csa.coach_id
      WHERE sp.user_id = public.rating_history.student_id
        AND cp.user_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── 10.4. rated_games (Participants & Staff Read-Only) ───────────
DROP POLICY IF EXISTS "players_read_own_rated_games" ON public.rated_games;
CREATE POLICY "players_read_own_rated_games" ON public.rated_games
  FOR SELECT TO authenticated
  USING (
    white_player_id = auth.uid() 
    OR black_player_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('COACH', 'ADMIN'))
  );

-- ── 10.5. bot_level_progression (Student Read-Only) ──────────────
DROP POLICY IF EXISTS "student_read_own_bot_progression" ON public.bot_level_progression;
CREATE POLICY "student_read_own_bot_progression" ON public.bot_level_progression
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "coach_read_assigned_bot_progression" ON public.bot_level_progression;
CREATE POLICY "coach_read_assigned_bot_progression" ON public.bot_level_progression
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      JOIN public.coach_profiles cp ON cp.id = csa.coach_id
      WHERE sp.user_id = public.bot_level_progression.student_id
        AND cp.user_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── 10.6. xp_transactions (Student Read-Only) ────────────────────
DROP POLICY IF EXISTS "student_read_own_xp" ON public.xp_transactions;
CREATE POLICY "student_read_own_xp" ON public.xp_transactions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ── 10.7. achievements & student_achievements ────────────────────
DROP POLICY IF EXISTS "anyone_authenticated_read_achievements" ON public.achievements;
CREATE POLICY "anyone_authenticated_read_achievements" ON public.achievements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "student_read_own_achievements" ON public.student_achievements;
CREATE POLICY "student_read_own_achievements" ON public.student_achievements
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- ── 10.8. rating_abuse_flags (Admin & Coach Only) ────────────────
DROP POLICY IF EXISTS "staff_manage_abuse_flags" ON public.rating_abuse_flags;
CREATE POLICY "staff_manage_abuse_flags" ON public.rating_abuse_flags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('COACH', 'ADMIN')));

-- ==============================================================================
-- SECTION 11: SAFE DATA MIGRATION PIPELINE
-- (EXTRACT -> VALIDATE -> VERIFY -> PRESERVE)
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
  parsed_tactical INT;
  parsed_xp INT;
  parsed_country TEXT;
  raw_stats_str TEXT;
  extracted_json JSONB;
BEGIN
  -- ── STAGE 1: SEED DEFAULT 400 RATINGS FOR HUMAN CATEGORIES ─────────────────
  -- BLITZ, RAPID, and CLASSICAL always initialize at 400 with 0 games played
  FOR r IN SELECT id FROM public.users WHERE role = 'STUDENT' LOOP
    INSERT INTO public.student_ratings 
      (student_id, rating_category, current_rating, highest_rating, lowest_rating, games_played, wins, losses, draws)
    VALUES 
      (r.id, 'BLITZ',     400, 400, 400, 0, 0, 0, 0),
      (r.id, 'RAPID',     400, 400, 400, 0, 0, 0, 0),
      (r.id, 'CLASSICAL', 400, 400, 400, 0, 0, 0, 0)
    ON CONFLICT (student_id, rating_category) DO NOTHING;

    -- Ensure Bot Level 1 is always unlocked initially
    INSERT INTO public.bot_level_progression (student_id, bot_level, is_unlocked, unlocked_at)
    VALUES (r.id, 1, true, timezone('utc'::text, now()))
    ON CONFLICT (student_id, bot_level) DO NOTHING;
  END LOOP;

  -- ── STAGE 2: PRESERVE EXISTING BOT RATINGS (NEVER OVERWRITE VALID RATINGS) ──
  -- Migrate existing valid bot ratings from student_bot_profiles into BOT category
  FOR r IN 
    SELECT student_id, rating, highest_rating, games_played, wins, losses, draws 
    FROM public.student_bot_profiles 
    WHERE rating IS NOT NULL AND rating >= 400
  LOOP
    INSERT INTO public.student_ratings (
      student_id, rating_category, current_rating, highest_rating, lowest_rating, 
      games_played, wins, losses, draws, is_provisional
    ) VALUES (
      r.student_id, 'BOT', r.rating, GREATEST(r.rating, COALESCE(r.highest_rating, 400)), 400,
      COALESCE(r.games_played, 0), COALESCE(r.wins, 0), COALESCE(r.losses, 0), COALESCE(r.draws, 0),
      (COALESCE(r.games_played, 0) < 30)
    )
    ON CONFLICT (student_id, rating_category) DO NOTHING;
  END LOOP;

  -- Guarantee any remaining students without an existing bot profile receive a 400 BOT rating
  FOR r IN SELECT id FROM public.users WHERE role = 'STUDENT' LOOP
    INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating)
    VALUES (r.id, 'BOT', 400, 400, 400)
    ON CONFLICT (student_id, rating_category) DO NOTHING;
  END LOOP;

  -- ── STAGE 3: EXTRACT, VALIDATE & PRESERVE NOTES DATA ────────────────────────
  -- Safely parse student_profiles.notes without altering the original text content
  FOR r IN SELECT sp.user_id, sp.notes FROM public.student_profiles sp WHERE sp.notes IS NOT NULL LOOP
    parsed_tactical := NULL;
    parsed_xp := NULL;
    parsed_country := NULL;
    raw_stats_str := NULL;
    extracted_json := NULL;

    -- Pattern A: === CHESSHUB_STATS === {...}
    -- Safely isolate JSON object boundary {...} even if trailing notes exist
    IF r.notes LIKE '%=== CHESSHUB_STATS ===%' THEN
      BEGIN
        raw_stats_str := substring(split_part(r.notes, '=== CHESSHUB_STATS ===', 2) FROM '\{.*\}');
        IF raw_stats_str IS NOT NULL THEN
          extracted_json := raw_stats_str::jsonb;
          IF extracted_json ? 'tacticalRating' AND (extracted_json->>'tacticalRating')::INT >= 400 THEN
            parsed_tactical := (extracted_json->>'tacticalRating')::INT;
          END IF;
          IF extracted_json ? 'xp' AND (extracted_json->>'xp')::INT > 0 THEN
            parsed_xp := (extracted_json->>'xp')::INT;
          END IF;
          IF extracted_json ? 'country' AND length(trim(extracted_json->>'country')) > 0 THEN
            parsed_country := trim(extracted_json->>'country');
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Safely ignore malformed JSON; notes preserved intact
      END;
    END IF;

    -- Pattern B: Direct JSON { "country": "...", ... }
    IF parsed_country IS NULL AND r.notes LIKE '%{%}%' THEN
      BEGIN
        raw_stats_str := substring(r.notes FROM '\{.*\}');
        IF raw_stats_str IS NOT NULL THEN
          extracted_json := raw_stats_str::jsonb;
          IF extracted_json ? 'country' AND length(trim(extracted_json->>'country')) > 0 THEN
            parsed_country := trim(extracted_json->>'country');
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Safely ignore malformed JSON; notes preserved intact
      END;
    END IF;

    -- Migrate verified Tactical / Puzzle rating
    IF parsed_tactical IS NOT NULL AND parsed_tactical >= 400 THEN
      INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating)
      VALUES (r.user_id, 'PUZZLE', parsed_tactical, parsed_tactical, 400)
      ON CONFLICT (student_id, rating_category) DO NOTHING;
    ELSE
      -- Default 400 PUZZLE rating
      INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating)
      VALUES (r.user_id, 'PUZZLE', 400, 400, 400)
      ON CONFLICT (student_id, rating_category) DO NOTHING;
    END IF;

    -- Migrate verified Country to users.country
    IF parsed_country IS NOT NULL AND length(parsed_country) > 0 THEN
      UPDATE public.users SET country = parsed_country WHERE id = r.user_id AND country IS NULL;
    END IF;

    -- Migrate verified historical XP to immutable xp_transactions ledger
    IF parsed_xp IS NOT NULL AND parsed_xp > 0 THEN
      INSERT INTO public.xp_transactions (student_id, amount, source_type, description, idempotency_key)
      VALUES (r.user_id, parsed_xp, 'ADMIN_ADJUST', 'Migrated legacy stats XP balance', 'migration:legacy_xp:' || r.user_id)
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END LOOP;

  -- Guarantee all student accounts have a PUZZLE rating
  FOR r IN SELECT id FROM public.users WHERE role = 'STUDENT' LOOP
    INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating)
    VALUES (r.id, 'PUZZLE', 400, 400, 400)
    ON CONFLICT (student_id, rating_category) DO NOTHING;
  END LOOP;

END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
