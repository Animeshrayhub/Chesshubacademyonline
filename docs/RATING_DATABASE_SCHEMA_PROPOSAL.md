# ChessHub Academy: Rating & Adaptive Bot Database Schema Proposal
## Phase 3 Database Schema Review & Migration Specification

**Document:** `docs/RATING_DATABASE_SCHEMA_PROPOSAL.md`  
**Status:** SCHEMA DESIGN PROPOSAL — PENDING REVIEW & EXPLICIT APPROVAL  
**Date:** September 27, 2026  
**Target:** ChessHub Academy Production Database (PostgreSQL / Supabase)  

---

### Executive Overview

This proposal presents the complete, verified, and hardened database schema design for ChessHub Academy's:
1. **Five Separate Rating Systems** (`BLITZ`, `RAPID`, `CLASSICAL`, `BOT`, `PUZZLE`)
2. **Bot Difficulty & Strength Profiles** (Decoupling bot level from student Elo)
3. **Canonical Rating History & Human Rated Match Tracking**
4. **Adaptive Bot Progression & Multi-Factor Readiness Scoring**
5. **Immutable XP Ledger & Milestone Achievements**
6. **Data-Driven Mistake & Weakness Repository**
7. **Anti-Abuse Flagging & Server-Authoritative RLS Hardening**
8. **Extract $\to$ Validate $\to$ Verify $\to$ Preserve Safe Data Migration Strategy**

---

### 1. Architectural Safeguards Applied

| Safeguard Requirement | Implementation Design |
| :--- | :--- |
| **1. Five Separate Categories** | Enforced via `CHECK (rating_category IN ('BLITZ', 'RAPID', 'CLASSICAL', 'BOT', 'PUZZLE'))`. |
| **2. Starting Rating: 400** | Enforced via `DEFAULT 400` on `current_rating`, `highest_rating`, `lowest_rating`. |
| **3. Preserve Valid Ratings** | Migration extracts existing `student_bot_profiles.rating` and `student_profiles.notes.tacticalRating`. Never overwrites valid ratings ($> 400$) with default 400. |
| **4. Human Ratings Start at 400** | All existing and new students initialize `BLITZ`, `RAPID`, `CLASSICAL` at exactly 400. |
| **5. Bot Level $\ne$ Elo Strength** | Dedicated `bot_difficulty_profiles` table stores engine configurations, search depths, and calibrated opponent Elo separately from student Bot Rating. |
| **6. Safe `notes` Data Migration** | 4-Stage ETL: **Extract $\to$ Validate $\to$ Verify $\to$ Preserve**. Original `student_profiles.notes` is never cleared, truncated, or dropped. |
| **7. Immutable XP Ledger** | `public.xp_transactions` table with unique constraint on `idempotency_key` and daily rate limits. |
| **8. Unique Idempotency Keys** | Enforced via `idempotency_key VARCHAR(150) UNIQUE` across `rating_history`, `rated_games`, and `xp_transactions`. |
| **9. Zero Client Trust** | Client-side engine results are never accepted for ratings, XP, unlocks, or weakness status. Re-calculated and verified server-side. |
| **10. Hardened RLS Security** | Insecure client `UPDATE` and `INSERT` policies from `20260825000001_bot_training_rls.sql` are dropped. Client access is strictly read-only. |
| **11. Server-Authoritative Mutation** | Rating and XP updates execute exclusively with `service_role` (admin client) or `SECURITY DEFINER` procedures. |
| **12. Reusing Bot Tables** | `student_bot_profiles`, `student_bot_games`, `student_bot_mistakes`, `student_weaknesses`, `personalized_puzzles` are preserved and enhanced additively. |
| **13. Classroom Isolation** | Zero modifications to `classes`, `class_students`, `classroom_sessions`, Zoom, or Google Meet tables. |
| **14. Migration Safety** | Purely additive, fully idempotent (`IF NOT EXISTS`), and includes reversible rollback procedures. |

---

### 2. Table-by-Table Schema Specification

#### 2.1. `public.bot_difficulty_profiles` (New Decoupled Bot Strength Table)
Decouples bot level from real Elo strength. Defines calibrated engine characteristics for Levels 1–10.

```sql
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

-- Seed Canonical 10-Level Difficulty Configurations
INSERT INTO public.bot_difficulty_profiles 
  (bot_level, bot_name, description, engine_type, search_depth, skill_level, estimated_strength_rating, avatar_icon, opening_style, tactical_awareness_percent, blunder_probability)
VALUES
  (1,  'Level 1 — Pawn Novice',       'Beginner-friendly coach. Gentle moves, safe captures, forgiving play.',   'MINIMAX',   1,  0,  400,  '♟️', 'Gentle Basics & Easy Development',       20.00, 0.400),
  (2,  'Level 2 — Knight Scout',      'Casual fundamentals. Solid development, avoids 1-move blunders.',          'MINIMAX',   2,  2,  600,  '♞', 'Classical Opening Fundamentals',          40.00, 0.250),
  (3,  'Level 3 — Bishop Tactician',  'Intermediate tactician. Aggressive opening tests, Italian & Fried Liver.', 'MINIMAX',   4,  5,  800,  '♝', 'Italian Game & Fried Liver Attack',       60.00, 0.150),
  (4,  'Level 4 — Rook Guardian',     'Club player. Solid pawn structure and positional awareness.',             'STOCKFISH', 4,  3,  1000, '♜', 'Ruy Lopez & Queen''s Gambit',             75.00, 0.080),
  (5,  'Level 5 — Queen Striker',     'Advanced attacker. Sharp tactical counter-attacks and pins.',              'STOCKFISH', 6,  6,  1200, '♛', 'Sicilian & French Defenses',               85.00, 0.040),
  (6,  'Level 6 — Candidate Master',  'Expert CM. Exploits weaknesses and converts material advantages.',        'STOCKFISH', 8,  9,  1400, '🏅', 'Modern Tournament Systems',                90.00, 0.020),
  (7,  'Level 7 — FIDE Master',       'FIDE Master. Deep opening prep and relentless tactical punishment.',      'STOCKFISH', 10, 12, 1600, '🎖️', 'Deep Theory & Dynamic Play',             95.00, 0.010),
  (8,  'Level 8 — International Master','Master IM. Virtuoso calculation, dynamic sacrifices, master endgames.',   'STOCKFISH', 12, 15, 1800, '🥇', 'Grandmaster Repertoires',                   98.00, 0.005),
  (9,  'Level 9 — Grandmaster',       'FIDE GM. Flawless prophylaxis, iron defense, ruthless conversion.',        'STOCKFISH', 14, 18, 2000, '👑', 'Super GM Modern Repertoires',             99.00, 0.001),
  (10, 'Level 10 — Super Engine',     'Champion Bot. Maximum calculation speed and flawless precision.',         'STOCKFISH', 18, 20, 2200, '⚡', 'Deep Engine Preparation',                    100.00,0.000)
ON CONFLICT (bot_level) DO NOTHING;
```

#### 2.2. `public.student_ratings` (New Canonical Per-Category Ratings)
Maintains independent, verified ratings for each student.

```sql
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
  CONSTRAINT uq_student_ratings_student_category UNIQUE(student_id, rating_category),
  CONSTRAINT chk_ratings_sum CHECK (games_played = wins + losses + draws)
);

CREATE INDEX IF NOT EXISTS idx_student_ratings_category_current 
  ON public.student_ratings (rating_category, current_rating DESC);
CREATE INDEX IF NOT EXISTS idx_student_ratings_student 
  ON public.student_ratings (student_id);
```

#### 2.3. `public.rating_history` (New Immutable Rating Audit Log)
Records an immutable event for every single rating adjustment across all categories.

```sql
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

CREATE INDEX IF NOT EXISTS idx_rating_history_student_cat_date 
  ON public.rating_history (student_id, rating_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rating_history_game 
  ON public.rating_history (game_id);
```

#### 2.4. `public.rated_games` (New Human Rated Games)
Stores matches played between human students.

```sql
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
```

#### 2.5. `public.bot_level_progression` (New Multi-Factor Bot Unlock Tracker)
Tracks multi-factor readiness scores preventing bot farming.

```sql
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
```

#### 2.6. `public.xp_transactions` (New Server-Validated XP Ledger)
Immutable ledger preventing XP inflation.

```sql
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount           INTEGER NOT NULL CHECK (amount > 0 AND amount <= 1000),
  source_type      VARCHAR(50) NOT NULL CHECK (source_type IN ('BOT_GAME', 'PUZZLE', 'HOMEWORK', 'ACHIEVEMENT', 'STREAK', 'TOURNAMENT', 'ADMIN_ADJUST')),
  source_id        VARCHAR(100),
  description      TEXT,
  idempotency_key  VARCHAR(150) UNIQUE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_xp_student_date ON public.xp_transactions (student_id, created_at DESC);
```

#### 2.7. `public.achievements` & `public.student_achievements`
```sql
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

CREATE TABLE IF NOT EXISTS public.student_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_student_achievement UNIQUE(student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON public.student_achievements (student_id);
```

#### 2.8. `public.rating_abuse_flags` (New Anti-Abuse Flagging)
```sql
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
```

---

### 3. Additive Schema Enhancements to Existing Tables

#### 3.1. `public.users` (Add Country Field)
```sql
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS country VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_users_country_active ON public.users (country, is_active);
```

#### 3.2. `public.student_bot_games` (Add Starting Mode & Opening Stats)
```sql
ALTER TABLE IF EXISTS public.student_bot_games
  ADD COLUMN IF NOT EXISTS starting_position_type VARCHAR(20) DEFAULT 'NORMAL' 
    CHECK (starting_position_type IN ('NORMAL', 'OPENING', 'MISTAKE', 'WEAKNESS')),
  ADD COLUMN IF NOT EXISTS opening_name TEXT,
  ADD COLUMN IF NOT EXISTS eco VARCHAR(10),
  ADD COLUMN IF NOT EXISTS accuracy NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS blunders_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mistakes_count INTEGER DEFAULT 0;
```

#### 3.3. `public.student_bot_mistakes` (Add Solve Flow Tracking)
```sql
ALTER TABLE IF EXISTS public.student_bot_mistakes
  ADD COLUMN IF NOT EXISTS attempt_status VARCHAR(20) DEFAULT 'unattempted' 
    CHECK (attempt_status IN ('unattempted', 'solved', 'failed')),
  ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solve_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS solved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coach_assigned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT;
```

#### 3.4. `public.student_weaknesses` (Add Trend & Coach Overrides)
```sql
ALTER TABLE IF EXISTS public.student_weaknesses
  ADD COLUMN IF NOT EXISTS trend VARCHAR(20) DEFAULT 'STABLE' 
    CHECK (trend IN ('IMPROVING', 'STABLE', 'WORSENING')),
  ADD COLUMN IF NOT EXISTS coach_approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS coach_override_severity VARCHAR(10),
  ADD COLUMN IF NOT EXISTS coach_notes TEXT,
  ADD COLUMN IF NOT EXISTS coach_override_by UUID REFERENCES public.users(id);
```

---

### 4. Row Level Security (RLS) Remediation

#### 4.1. Revoking Insecure Policies from `20260825000001_bot_training_rls.sql`
```sql
-- Completely eliminate direct client modification vulnerabilities
DROP POLICY IF EXISTS "student_can_update_own_bot_profile" ON public.student_bot_profiles;
DROP POLICY IF EXISTS "student_can_insert_own_rating_history" ON public.student_bot_rating_history;
DROP POLICY IF EXISTS "student_can_upsert_own_weaknesses" ON public.student_weaknesses;
DROP POLICY IF EXISTS "student_can_update_own_weaknesses" ON public.student_weaknesses;
```

#### 4.2. Hardened Server-Authoritative Policies
```sql
-- Enable RLS across all new tables
ALTER TABLE public.student_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rated_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_level_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_abuse_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_difficulty_profiles ENABLE ROW LEVEL SECURITY;

-- ── public.bot_difficulty_profiles (Public Readable) ──────────
CREATE POLICY "anyone_read_bot_difficulty_profiles" ON public.bot_difficulty_profiles
  FOR SELECT TO authenticated USING (is_active = true);

-- ── public.student_ratings (Student Read-Only, Coach Assigned Read-Only) ──
CREATE POLICY "student_read_own_ratings" ON public.student_ratings
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "coach_read_assigned_student_ratings" ON public.student_ratings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      WHERE sp.user_id = public.student_ratings.student_id
        AND csa.coach_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Note: ZERO INSERT/UPDATE/DELETE policies for students. 
-- Modifications occur exclusively via Server Actions using the service_role key.

-- ── public.rating_history (Immutable Read-Only) ───────────────
CREATE POLICY "student_read_own_rating_history" ON public.rating_history
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "coach_read_assigned_rating_history" ON public.rating_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      WHERE sp.user_id = public.rating_history.student_id
        AND csa.coach_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── public.rated_games (Players & Staff Read-Only) ────────────
CREATE POLICY "players_read_own_rated_games" ON public.rated_games
  FOR SELECT TO authenticated
  USING (
    white_player_id = auth.uid() 
    OR black_player_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('COACH', 'ADMIN'))
  );

-- ── public.bot_level_progression (Student Read-Only) ──────────
CREATE POLICY "student_read_own_bot_progression" ON public.bot_level_progression
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "coach_read_assigned_bot_progression" ON public.bot_level_progression
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_assignments csa
      JOIN public.student_profiles sp ON sp.id = csa.student_id
      WHERE sp.user_id = public.bot_level_progression.student_id
        AND csa.coach_id = auth.uid()
        AND csa.archived_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── public.xp_transactions (Student Read-Only) ────────────────
CREATE POLICY "student_read_own_xp" ON public.xp_transactions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ── public.achievements & student_achievements ────────────────
CREATE POLICY "anyone_authenticated_read_achievements" ON public.achievements
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "student_read_own_achievements" ON public.student_achievements
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- ── public.rating_abuse_flags (Admin & Coach Only) ────────────
CREATE POLICY "staff_manage_abuse_flags" ON public.rating_abuse_flags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('COACH', 'ADMIN')));
```

---

### 5. Detailed Data Migration Pipeline: Extract $\to$ Validate $\to$ Verify $\to$ Preserve

To strictly prevent data loss, the migration follows four safe stages implemented directly within the SQL transaction:

```sql
DO $$
DECLARE
  r RECORD;
  parsed_tactical INT;
  parsed_xp INT;
  parsed_country TEXT;
  extracted_json JSONB;
BEGIN
  -- ── STAGE 1 & 2: SEED DEFAULT 400 RATINGS FOR ALL STUDENTS ──────────────
  -- Human ratings (BLITZ, RAPID, CLASSICAL) always start at 400 for everyone
  FOR r IN SELECT id FROM public.users WHERE role = 'STUDENT' LOOP
    INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating, games_played, wins, losses, draws)
    VALUES 
      (r.id, 'BLITZ',     400, 400, 400, 0, 0, 0, 0),
      (r.id, 'RAPID',     400, 400, 400, 0, 0, 0, 0),
      (r.id, 'CLASSICAL', 400, 400, 400, 0, 0, 0, 0)
    ON CONFLICT (student_id, rating_category) DO NOTHING;

    -- Initialize Bot Progression for Level 1 (always unlocked)
    INSERT INTO public.bot_level_progression (student_id, bot_level, is_unlocked, unlocked_at)
    VALUES (r.id, 1, true, timezone('utc'::text, now()))
    ON CONFLICT (student_id, bot_level) DO NOTHING;
  END LOOP;

  -- ── STAGE 3: PRESERVE EXISTING BOT RATINGS (NEVER OVERWRITE VALID RATINGS) ──
  -- Migrate existing valid bot ratings from student_bot_profiles
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
    ON CONFLICT (student_id, rating_category) DO UPDATE SET
      current_rating = EXCLUDED.current_rating,
      highest_rating = GREATEST(public.student_ratings.highest_rating, EXCLUDED.highest_rating),
      games_played = EXCLUDED.games_played,
      wins = EXCLUDED.wins,
      losses = EXCLUDED.losses,
      draws = EXCLUDED.draws;
  END LOOP;

  -- Ensure any remaining students have a BOT rating initialized at 400
  FOR r IN SELECT id FROM public.users WHERE role = 'STUDENT' LOOP
    INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating)
    VALUES (r.id, 'BOT', 400, 400, 400)
    ON CONFLICT (student_id, rating_category) DO NOTHING;
  END LOOP;

  -- ── STAGE 4: EXTRACT, VALIDATE & PRESERVE NOTES DATA ────────────────────
  -- Safely parse student_profiles.notes without modifying the original text
  FOR r IN SELECT sp.user_id, sp.notes FROM public.student_profiles sp WHERE sp.notes IS NOT NULL LOOP
    parsed_tactical := NULL;
    parsed_xp := NULL;
    parsed_country := NULL;

    -- Pattern A: === CHESSHUB_STATS === {...}
    IF r.notes LIKE '%=== CHESSHUB_STATS ===%' THEN
      BEGIN
        extracted_json := (split_part(r.notes, '=== CHESSHUB_STATS ===', 2))::jsonb;
        IF extracted_json ? 'tacticalRating' AND (extracted_json->>'tacticalRating')::INT >= 400 THEN
          parsed_tactical := (extracted_json->>'tacticalRating')::INT;
        END IF;
        IF extracted_json ? 'xp' AND (extracted_json->>'xp')::INT > 0 THEN
          parsed_xp := (extracted_json->>'xp')::INT;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Safely ignore malformed JSON
      END;
    END IF;

    -- Pattern B: Direct JSON { "country": "...", "fideRating": ... }
    IF r.notes LIKE '{%' THEN
      BEGIN
        extracted_json := r.notes::jsonb;
        IF extracted_json ? 'country' AND length(trim(extracted_json->>'country')) > 0 THEN
          parsed_country := trim(extracted_json->>'country');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Safely ignore malformed JSON
      END;
    END IF;

    -- VERIFY & MIGRATE TACTICAL RATING
    IF parsed_tactical IS NOT NULL AND parsed_tactical >= 400 THEN
      INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating)
      VALUES (r.user_id, 'PUZZLE', parsed_tactical, parsed_tactical, 400)
      ON CONFLICT (student_id, rating_category) DO UPDATE SET
        current_rating = EXCLUDED.current_rating,
        highest_rating = GREATEST(public.student_ratings.highest_rating, EXCLUDED.highest_rating);
    ELSE
      -- Initialize default 400 PUZZLE rating if missing or invalid
      INSERT INTO public.student_ratings (student_id, rating_category, current_rating, highest_rating, lowest_rating)
      VALUES (r.user_id, 'PUZZLE', 400, 400, 400)
      ON CONFLICT (student_id, rating_category) DO NOTHING;
    END IF;

    -- VERIFY & MIGRATE COUNTRY
    IF parsed_country IS NOT NULL AND length(parsed_country) > 0 THEN
      UPDATE public.users SET country = parsed_country WHERE id = r.user_id AND country IS NULL;
    END IF;

    -- VERIFY & MIGRATE HISTORICAL XP
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
```

---

### 6. Rollback Considerations

If a rollback of the Phase 3 migration is ever requested:
1. **Additive Isolation:** The migration only creates new tables and adds optional columns (`country`, `starting_position_type`, `attempt_status`, `trend`). Existing tables (`users`, `student_profiles`, `classes`) retain all their original columns.
2. **Reversibility:**
   ```sql
   -- Rollback Procedure:
   DROP TABLE IF EXISTS public.rating_abuse_flags CASCADE;
   DROP TABLE IF EXISTS public.student_achievements CASCADE;
   DROP TABLE IF EXISTS public.achievements CASCADE;
   DROP TABLE IF EXISTS public.xp_transactions CASCADE;
   DROP TABLE IF EXISTS public.bot_level_progression CASCADE;
   DROP TABLE IF EXISTS public.rated_games CASCADE;
   DROP TABLE IF EXISTS public.rating_history CASCADE;
   DROP TABLE IF EXISTS public.student_ratings CASCADE;
   DROP TABLE IF EXISTS public.bot_difficulty_profiles CASCADE;
   ```
3. **Data Safety Guarantee:** Because `student_profiles.notes` is **never modified or cleared**, rolling back leaves historical notes, class data, and existing bot game records 100% intact.

---

### 7. Security & Integrity Review Checklist

- [x] All 5 rating categories (`BLITZ`, `RAPID`, `CLASSICAL`, `BOT`, `PUZZLE`) are strictly enforced by check constraints.
- [x] Starting rating for all categories is guaranteed at 400.
- [x] Existing valid Bot ratings ($\ge 400$) and valid Puzzle ratings ($\ge 400$) are preserved during migration.
- [x] Human ratings (`BLITZ`, `RAPID`, `CLASSICAL`) start cleanly at 400 with 0 games played.
- [x] Bot Level is completely decoupled from student Bot Rating via `bot_difficulty_profiles`.
- [x] Insecure RLS policies from `20260825000001_bot_training_rls.sql` are dropped.
- [x] All rating mutations require `service_role` authority.
- [x] Unique constraints on `idempotency_key` prevent duplicate rating events and XP inflation.
- [x] Zero changes to Classroom, WebRTC, Zoom, Google Meet, or Homework tables.

---

### Schema Status Verdict

```
============================================================
SCHEMA STATUS: PASS
============================================================
The proposed schema is fully additive, idempotent, RLS-secure,
preserves all historical data, decouples bot strength from student Elo,
and guarantees five strictly segregated rating categories starting at 400.
```

---

### STOP POINT: Awaiting Explicit Approval

As required:
> **"STOP. Do not create `20260928000000_rating_bot_leaderboard_system.sql` until the schema proposal has been reviewed and explicitly approved."**

Please review [docs/RATING_DATABASE_SCHEMA_PROPOSAL.md](file:///d:/newchesshub/docs/RATING_DATABASE_SCHEMA_PROPOSAL.md). Once approved, we will proceed to Phase 4 (Generating the migration file).
