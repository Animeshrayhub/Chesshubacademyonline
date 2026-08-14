-- ==============================================================================
-- Migration: 20260812000000_ai_opening_teacher.sql
-- Description: AI Opening Teacher — Full Data Model
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. OPENING CATALOGUE (Content / Curriculum Layer)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.openings (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  eco_code      TEXT    NOT NULL,                        -- e.g. 'C50', 'D06'
  name          TEXT    NOT NULL,                        -- e.g. 'Italian Game'
  name_hindi    TEXT,                                    -- Hindi translation
  color         TEXT    NOT NULL DEFAULT 'white'
                        CHECK (color IN ('white', 'black', 'both')),
  description   TEXT,
  description_hindi TEXT,
  starting_fen  TEXT    NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  opening_moves TEXT    NOT NULL DEFAULT '',             -- e.g. '1.e4 e5 2.Nf3'
  difficulty    TEXT    NOT NULL DEFAULT 'Beginner'
                        CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  style         TEXT    NOT NULL DEFAULT 'Tactical'
                        CHECK (style IN ('Tactical', 'Positional', 'Aggressive', 'Solid', 'Universal')),
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  order_num     INT     NOT NULL DEFAULT 1,
  tags          TEXT[]  DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.opening_variations (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  opening_id    UUID    REFERENCES public.openings(id) ON DELETE CASCADE NOT NULL,
  name          TEXT    NOT NULL,
  pgn           TEXT    NOT NULL DEFAULT '',
  move_sequence TEXT    NOT NULL DEFAULT '',             -- SAN move list
  final_fen     TEXT,
  difficulty    TEXT    NOT NULL DEFAULT 'Beginner'
                        CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  is_main_line  BOOLEAN NOT NULL DEFAULT FALSE,
  order_num     INT     NOT NULL DEFAULT 1,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 8-CHAPTER STRUCTURE (per opening)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.opening_chapters (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  opening_id        UUID    REFERENCES public.openings(id) ON DELETE CASCADE NOT NULL,
  chapter_num       INT     NOT NULL CHECK (chapter_num BETWEEN 1 AND 8),
  title             TEXT    NOT NULL,
  title_hindi       TEXT,
  -- Chapter type maps to the 8-chapter curriculum
  chapter_type      TEXT    NOT NULL
                    CHECK (chapter_type IN (
                      'basic_idea',      -- Ch1: What is this opening
                      'development',     -- Ch2: Piece development
                      'main_line',       -- Ch3: Main line moves
                      'responses',       -- Ch4: Responses (Black/White)
                      'tactics',         -- Ch5: Tactical ideas
                      'mistakes',        -- Ch6: Common mistakes
                      'practice',        -- Ch7: Student plays
                      'test'             -- Ch8: Final test
                    )),
  -- Structured content (JSON for flexibility)
  content_json      JSONB   NOT NULL DEFAULT '{}',
  -- Beginner / Intermediate / Advanced variants of same chapter
  beginner_content  TEXT,
  intermediate_content TEXT,
  advanced_content  TEXT,
  beginner_content_hindi  TEXT,
  intermediate_content_hindi TEXT,
  advanced_content_hindi  TEXT,
  estimated_minutes INT     NOT NULL DEFAULT 10,
  unlock_threshold  INT     NOT NULL DEFAULT 90,          -- % needed to unlock next chapter
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (opening_id, chapter_num)
);

CREATE TABLE IF NOT EXISTS public.opening_positions (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id          UUID    REFERENCES public.opening_chapters(id) ON DELETE CASCADE NOT NULL,
  opening_id          UUID    REFERENCES public.openings(id) ON DELETE CASCADE NOT NULL,
  title               TEXT    NOT NULL,
  fen                 TEXT    NOT NULL,
  board_orientation   TEXT    NOT NULL DEFAULT 'white'
                              CHECK (board_orientation IN ('white', 'black')),
  -- Teaching content
  explanation         TEXT,
  explanation_hindi   TEXT,
  -- Moves in this position
  recommended_moves   TEXT[]  DEFAULT '{}',               -- e.g. ['e4', 'Nf3']
  alternative_moves   TEXT[]  DEFAULT '{}',
  wrong_moves         TEXT[]  DEFAULT '{}',
  -- Socratic question to ask student
  question            TEXT,
  question_hindi      TEXT,
  -- Hints given one by one
  hints               TEXT[]  DEFAULT '{}',
  hints_hindi         TEXT[]  DEFAULT '{}',
  -- Tactical info
  tactical_theme      TEXT,                               -- e.g. 'fork', 'pin', 'sacrifice'
  common_mistake_move TEXT,
  common_mistake_explanation TEXT,
  -- Engine validation
  stockfish_eval      TEXT,                               -- stored eval string, e.g. '+0.5'
  -- Ordering
  order_num           INT     NOT NULL DEFAULT 1,
  difficulty          TEXT    NOT NULL DEFAULT 'Beginner'
                              CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  is_interactive      BOOLEAN NOT NULL DEFAULT TRUE,      -- student must play a move
  is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. STUDENT PROGRESS LAYER
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_opening_progress (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id        UUID    REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  opening_id        UUID    REFERENCES public.openings(id) ON DELETE CASCADE NOT NULL,
  -- Status
  status            TEXT    NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  -- Scores (0-100)
  overall_score     INT     NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  -- Student-chosen difficulty override (null = use account default)
  difficulty_override TEXT  CHECK (difficulty_override IN ('Beginner', 'Intermediate', 'Advanced')),
  -- Mastery level
  mastery_level     TEXT    NOT NULL DEFAULT 'not_started'
                    CHECK (mastery_level IN ('not_started', 'learning', 'familiar', 'strong', 'mastered')),
  -- Timestamps
  started_at        TIMESTAMP WITH TIME ZONE,
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  completed_at      TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (student_id, opening_id)
);

CREATE TABLE IF NOT EXISTS public.student_chapter_progress (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      UUID    REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id      UUID    REFERENCES public.opening_chapters(id) ON DELETE CASCADE NOT NULL,
  opening_id      UUID    REFERENCES public.openings(id) ON DELETE CASCADE NOT NULL,
  -- Lock state
  is_unlocked     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Progress
  status          TEXT    NOT NULL DEFAULT 'locked'
                  CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
  score           INT     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  -- Detailed scores per position
  positions_attempted INT NOT NULL DEFAULT 0,
  positions_correct   INT NOT NULL DEFAULT 0,
  hints_used          INT NOT NULL DEFAULT 0,
  -- Time
  time_spent_seconds  INT NOT NULL DEFAULT 0,
  started_at        TIMESTAMP WITH TIME ZONE,
  completed_at      TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (student_id, chapter_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. MISTAKE MEMORY (Persistent Weakness Tracking)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_opening_mistakes (
  id                      UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id              UUID    REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  opening_id              UUID    REFERENCES public.openings(id) ON DELETE CASCADE NOT NULL,
  chapter_id              UUID    REFERENCES public.opening_chapters(id) ON DELETE CASCADE,
  position_id             UUID    REFERENCES public.opening_positions(id) ON DELETE SET NULL,
  -- Position context
  position_fen            TEXT    NOT NULL,
  -- Move data
  student_move            TEXT    NOT NULL,               -- SAN or UCI
  expected_move           TEXT    NOT NULL,               -- Correct answer
  -- Evaluation (Stockfish)
  eval_before             TEXT,                           -- e.g. '+0.5'
  eval_after              TEXT,                           -- e.g. '-1.2' (after student's wrong move)
  eval_difference         NUMERIC(6,2),                   -- centipawn loss
  -- Classification
  mistake_type            TEXT    NOT NULL DEFAULT 'wrong_move'
                          CHECK (mistake_type IN (
                            'wrong_move',         -- Move not in opening theory
                            'illegal_move',       -- Illegal chess move
                            'missed_tactic',      -- Should have found tactic
                            'wrong_plan',         -- Wrong strategic idea
                            'premature_move'      -- Right idea but wrong timing
                          )),
  -- Repetition tracking
  attempt_count           INT     NOT NULL DEFAULT 1,
  successful_recovery_count INT   NOT NULL DEFAULT 0,
  -- Status
  is_resolved             BOOLEAN NOT NULL DEFAULT FALSE,
  last_attempted_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. OPENING SCORES (Per-Category, Per-Opening)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_opening_scores (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id            UUID    REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  opening_id            UUID    REFERENCES public.openings(id) ON DELETE CASCADE NOT NULL,
  -- Category scores (0-100)
  knowledge_score       INT     NOT NULL DEFAULT 0 CHECK (knowledge_score BETWEEN 0 AND 100),
  move_recognition_score INT    NOT NULL DEFAULT 0 CHECK (move_recognition_score BETWEEN 0 AND 100),
  plans_score           INT     NOT NULL DEFAULT 0 CHECK (plans_score BETWEEN 0 AND 100),
  tactical_score        INT     NOT NULL DEFAULT 0 CHECK (tactical_score BETWEEN 0 AND 100),
  responses_score       INT     NOT NULL DEFAULT 0 CHECK (responses_score BETWEEN 0 AND 100),
  practical_score       INT     NOT NULL DEFAULT 0 CHECK (practical_score BETWEEN 0 AND 100),
  -- Aggregate
  overall_score         INT     NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  mastery_level         TEXT    NOT NULL DEFAULT 'learning'
                        CHECK (mastery_level IN ('learning', 'familiar', 'strong', 'mastered')),
  -- History tracking
  test_score            INT,
  test_completed_at     TIMESTAMP WITH TIME ZONE,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (student_id, opening_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. AI CONVERSATION SESSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_opening_sessions (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    UUID    REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  opening_id    UUID    REFERENCES public.openings(id) ON DELETE CASCADE,
  chapter_id    UUID    REFERENCES public.opening_chapters(id) ON DELETE CASCADE,
  -- Session messages (last N messages only, not full history)
  messages_json JSONB   NOT NULL DEFAULT '[]',
  -- Context snapshot at session start
  context_json  JSONB   NOT NULL DEFAULT '{}',
  -- Session state
  current_fen   TEXT,
  last_position_id UUID REFERENCES public.opening_positions(id) ON DELETE SET NULL,
  -- Timing
  started_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at      TIMESTAMP WITH TIME ZONE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.openings                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_variations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_chapters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_positions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_opening_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_chapter_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_opening_mistakes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_opening_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_opening_sessions         ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Openings catalogue: read by authenticated users, write by admin
CREATE POLICY "Read openings: authenticated users"
  ON public.openings FOR SELECT TO authenticated
  USING (is_published = TRUE OR public.get_auth_role() = 'admin');

CREATE POLICY "Write openings: admin only"
  ON public.openings FOR ALL TO authenticated
  USING (public.get_auth_role() = 'admin');

-- Opening variations: read by authenticated
CREATE POLICY "Read opening_variations: authenticated"
  ON public.opening_variations FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Write opening_variations: admin only"
  ON public.opening_variations FOR ALL TO authenticated
  USING (public.get_auth_role() = 'admin');

-- Opening chapters: read by authenticated
CREATE POLICY "Read opening_chapters: authenticated"
  ON public.opening_chapters FOR SELECT TO authenticated
  USING (is_published = TRUE OR public.get_auth_role() = 'admin');

CREATE POLICY "Write opening_chapters: admin only"
  ON public.opening_chapters FOR ALL TO authenticated
  USING (public.get_auth_role() = 'admin');

-- Opening positions: read by authenticated
CREATE POLICY "Read opening_positions: authenticated"
  ON public.opening_positions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Write opening_positions: admin only"
  ON public.opening_positions FOR ALL TO authenticated
  USING (public.get_auth_role() = 'admin');

-- Student opening progress: own data + assigned coach + admin
CREATE POLICY "Read student_opening_progress: own or coach or admin"
  ON public.student_opening_progress FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin' OR
    public.get_auth_role() = 'coach'
  );

CREATE POLICY "Write student_opening_progress: own or admin"
  ON public.student_opening_progress FOR ALL TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin'
  );

-- Student chapter progress
CREATE POLICY "Read student_chapter_progress: own or coach or admin"
  ON public.student_chapter_progress FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin' OR
    public.get_auth_role() = 'coach'
  );

CREATE POLICY "Write student_chapter_progress: own or admin"
  ON public.student_chapter_progress FOR ALL TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin'
  );

-- Student mistakes: own data + coach + admin
CREATE POLICY "Read student_opening_mistakes: own or coach or admin"
  ON public.student_opening_mistakes FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin' OR
    public.get_auth_role() = 'coach'
  );

CREATE POLICY "Write student_opening_mistakes: own or admin"
  ON public.student_opening_mistakes FOR ALL TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin'
  );

-- Student opening scores: own data + coach + admin
CREATE POLICY "Read student_opening_scores: own or coach or admin"
  ON public.student_opening_scores FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin' OR
    public.get_auth_role() = 'coach'
  );

CREATE POLICY "Write student_opening_scores: own or admin"
  ON public.student_opening_scores FOR ALL TO authenticated
  USING (
    student_id = auth.uid() OR
    public.get_auth_role() = 'admin'
  );

-- AI sessions: strictly own data
CREATE POLICY "Read ai_opening_sessions: own only"
  ON public.ai_opening_sessions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.get_auth_role() = 'admin');

CREATE POLICY "Write ai_opening_sessions: own only"
  ON public.ai_opening_sessions FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.get_auth_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_openings_difficulty ON public.openings (difficulty);
CREATE INDEX IF NOT EXISTS idx_openings_published ON public.openings (is_published);
CREATE INDEX IF NOT EXISTS idx_opening_chapters_opening ON public.opening_chapters (opening_id, chapter_num);
CREATE INDEX IF NOT EXISTS idx_opening_positions_chapter ON public.opening_positions (chapter_id, order_num);
CREATE INDEX IF NOT EXISTS idx_sop_student ON public.student_opening_progress (student_id);
CREATE INDEX IF NOT EXISTS idx_scp_student ON public.student_chapter_progress (student_id);
CREATE INDEX IF NOT EXISTS idx_som_student ON public.student_opening_mistakes (student_id, opening_id);
CREATE INDEX IF NOT EXISTS idx_sos_student ON public.student_opening_scores (student_id);
CREATE INDEX IF NOT EXISTS idx_aos_student ON public.ai_opening_sessions (student_id, updated_at DESC);
