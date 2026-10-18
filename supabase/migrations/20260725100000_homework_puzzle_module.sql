-- ============================================================
-- ChessHub Academy — Homework Puzzle Module Migration
-- Run this on your Supabase database (SQL Editor or CLI)
-- ============================================================

-- ── 1. Puzzle Library ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homework_puzzles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  fen             TEXT NOT NULL,
  solution        TEXT[] NOT NULL,
  theme           TEXT NOT NULL DEFAULT 'tactics',
  difficulty      TEXT NOT NULL DEFAULT 'intermediate'
                  CHECK (difficulty IN ('beginner','intermediate','advanced','expert','master')),
  rating          INTEGER DEFAULT 1500,
  hint_1          TEXT,
  hint_2          TEXT,
  hint_3          TEXT,
  explanation     TEXT,
  source          TEXT DEFAULT 'custom',
  source_id       TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  is_active       BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_homework_puzzles_theme      ON homework_puzzles(theme);
CREATE INDEX IF NOT EXISTS idx_homework_puzzles_difficulty ON homework_puzzles(difficulty);
CREATE INDEX IF NOT EXISTS idx_homework_puzzles_active     ON homework_puzzles(is_active);

-- ── 2. Chapter ↔ Puzzle Junction ────────────────────────────
CREATE TABLE IF NOT EXISTS homework_chapter_puzzles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   UUID NOT NULL REFERENCES homework_chapters(id) ON DELETE CASCADE,
  puzzle_id    UUID NOT NULL REFERENCES homework_puzzles(id)  ON DELETE CASCADE,
  puzzle_order INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chapter_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_hcp_chapter ON homework_chapter_puzzles(chapter_id);
CREATE INDEX IF NOT EXISTS idx_hcp_puzzle  ON homework_chapter_puzzles(puzzle_id);

-- ── 3. Student Puzzle Attempt Sessions ──────────────────────
CREATE TABLE IF NOT EXISTS student_puzzle_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  puzzle_id           UUID NOT NULL REFERENCES homework_puzzles(id)     ON DELETE CASCADE,
  student_profile_id  UUID NOT NULL REFERENCES student_profiles(id)     ON DELETE CASCADE,
  puzzle_order        INTEGER NOT NULL,
  attempts_used       INTEGER NOT NULL DEFAULT 0,
  hints_used          INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'unsolved'
                      CHECK (status IN ('unsolved','solved','failed','skipped')),
  score               INTEGER NOT NULL DEFAULT 0,
  time_seconds        INTEGER DEFAULT 0,
  solution_unlocked   BOOLEAN DEFAULT false,
  started_at          TIMESTAMPTZ DEFAULT now(),
  solved_at           TIMESTAMPTZ,
  last_move           TEXT,
  correct_on_attempt  INTEGER,
  UNIQUE(assignment_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_spa_assignment ON student_puzzle_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_spa_student    ON student_puzzle_attempts(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_spa_puzzle     ON student_puzzle_attempts(puzzle_id);

-- ── 4. Hint Usage Tracking ──────────────────────────────────
CREATE TABLE IF NOT EXISTS homework_hint_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      UUID NOT NULL REFERENCES student_puzzle_attempts(id) ON DELETE CASCADE,
  hint_level      INTEGER NOT NULL CHECK (hint_level IN (1,2,3)),
  points_deducted INTEGER NOT NULL,
  requested_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attempt_id, hint_level)
);

CREATE INDEX IF NOT EXISTS idx_hhu_attempt ON homework_hint_usage(attempt_id);

-- ── 5. Homework-level Aggregate Progress ─────────────────────
CREATE TABLE IF NOT EXISTS homework_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_profile_id  UUID NOT NULL REFERENCES student_profiles(id)     ON DELETE CASCADE,
  total_puzzles       INTEGER NOT NULL DEFAULT 0,
  solved_puzzles      INTEGER NOT NULL DEFAULT 0,
  failed_puzzles      INTEGER NOT NULL DEFAULT 0,
  total_score         INTEGER NOT NULL DEFAULT 0,
  max_possible_score  INTEGER NOT NULL DEFAULT 0,
  accuracy            NUMERIC(5,2) DEFAULT 0,
  avg_time_seconds    NUMERIC(7,2) DEFAULT 0,
  total_hints_used    INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'not_started'
                      CHECK (status IN ('not_started','in_progress','completed','passed','failed')),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, student_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_hp_assignment ON homework_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_hp_student    ON homework_progress(student_profile_id);

-- ── 6. Per-Theme Progress (Historical) ──────────────────────
CREATE TABLE IF NOT EXISTS theme_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id  UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  theme               TEXT NOT NULL,
  total_assigned      INTEGER DEFAULT 0,
  total_solved        INTEGER DEFAULT 0,
  total_wrong         INTEGER DEFAULT 0,
  accuracy            NUMERIC(5,2) DEFAULT 0,
  avg_time_seconds    NUMERIC(7,2) DEFAULT 0,
  hints_used          INTEGER DEFAULT 0,
  best_score          INTEGER DEFAULT 0,
  current_streak      INTEGER DEFAULT 0,
  best_streak         INTEGER DEFAULT 0,
  last_solved_at      TIMESTAMPTZ,
  weakness_level      TEXT DEFAULT 'normal'
                      CHECK (weakness_level IN ('strong','normal','weak','critical')),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_profile_id, theme)
);

CREATE INDEX IF NOT EXISTS idx_tp_student ON theme_progress(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_tp_theme   ON theme_progress(theme);

-- ── 7. Chapter-level Unlock Tracking ────────────────────────
CREATE TABLE IF NOT EXISTS chapter_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id  UUID NOT NULL REFERENCES student_profiles(id)    ON DELETE CASCADE,
  chapter_id          UUID NOT NULL REFERENCES homework_chapters(id)    ON DELETE CASCADE,
  is_unlocked         BOOLEAN DEFAULT false,
  unlock_threshold    NUMERIC(5,2) DEFAULT 90.0,
  achieved_accuracy   NUMERIC(5,2) DEFAULT 0,
  unlocked_at         TIMESTAMPTZ,
  unlocked_by         TEXT DEFAULT 'auto' CHECK (unlocked_by IN ('auto','coach','admin')),
  override_coach_id   UUID REFERENCES coach_profiles(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_profile_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_student ON chapter_progress(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_cp_chapter ON chapter_progress(chapter_id);

-- ── 8. Coach Reviews ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES coach_profiles(id)       ON DELETE CASCADE,
  feedback        TEXT,
  grade_override  NUMERIC(5,2),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','reviewed','approved','returned_for_retry')),
  override_unlock BOOLEAN DEFAULT false,
  reviewed_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, coach_id)
);

CREATE INDEX IF NOT EXISTS idx_cr_assignment ON coach_reviews(assignment_id);
CREATE INDEX IF NOT EXISTS idx_cr_coach      ON coach_reviews(coach_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin_or_coach()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('ADMIN','COACH') AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION get_my_student_profile_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM student_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Recalculate homework_progress after each puzzle attempt
CREATE OR REPLACE FUNCTION fn_update_homework_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total   INTEGER; v_solved  INTEGER; v_failed  INTEGER;
  v_score   INTEGER; v_avg     NUMERIC; v_hints   INTEGER;
  v_status  TEXT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'solved'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COALESCE(SUM(score), 0),
    COALESCE(AVG(time_seconds), 0),
    COALESCE(SUM(hints_used), 0)
  INTO v_total, v_solved, v_failed, v_score, v_avg, v_hints
  FROM student_puzzle_attempts
  WHERE assignment_id = NEW.assignment_id;

  v_status := CASE
    WHEN v_solved + v_failed = v_total AND v_total > 0 THEN
      CASE WHEN ROUND((v_solved::NUMERIC / v_total) * 100, 2) >= 90 THEN 'passed' ELSE 'failed' END
    WHEN v_solved > 0 OR v_failed > 0 THEN 'in_progress'
    ELSE 'not_started'
  END;

  INSERT INTO homework_progress (
    assignment_id, student_profile_id,
    total_puzzles, solved_puzzles, failed_puzzles,
    total_score, max_possible_score, accuracy,
    avg_time_seconds, total_hints_used, status,
    started_at, completed_at, last_activity_at
  ) VALUES (
    NEW.assignment_id, NEW.student_profile_id,
    v_total, v_solved, v_failed,
    v_score, v_total * 100,
    CASE WHEN v_total > 0 THEN ROUND((v_solved::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    v_avg, v_hints, v_status,
    now(),
    CASE WHEN v_status IN ('passed','failed') THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (assignment_id, student_profile_id) DO UPDATE SET
    total_puzzles      = EXCLUDED.total_puzzles,
    solved_puzzles     = EXCLUDED.solved_puzzles,
    failed_puzzles     = EXCLUDED.failed_puzzles,
    total_score        = EXCLUDED.total_score,
    max_possible_score = EXCLUDED.max_possible_score,
    accuracy           = EXCLUDED.accuracy,
    avg_time_seconds   = EXCLUDED.avg_time_seconds,
    total_hints_used   = EXCLUDED.total_hints_used,
    status             = EXCLUDED.status,
    completed_at       = EXCLUDED.completed_at,
    last_activity_at   = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_update_homework_progress
AFTER INSERT OR UPDATE ON student_puzzle_attempts
FOR EACH ROW EXECUTE FUNCTION fn_update_homework_progress();

-- Trigger: Auto-unlock next chapter when accuracy >= threshold
CREATE OR REPLACE FUNCTION fn_auto_unlock_chapter()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_chapter_id  UUID; v_workbook_id UUID; v_threshold NUMERIC; v_next UUID;
BEGIN
  IF NEW.status = 'passed' AND (OLD.status IS NULL OR OLD.status <> 'passed') THEN
    SELECT a.chapter_id INTO v_chapter_id FROM homework_assignments a WHERE a.id = NEW.assignment_id;
    SELECT unlock_score, workbook_id INTO v_threshold, v_workbook_id FROM homework_chapters WHERE id = v_chapter_id;
    IF NEW.accuracy >= COALESCE(v_threshold, 90) THEN
      INSERT INTO chapter_progress (student_profile_id, chapter_id, is_unlocked, achieved_accuracy, unlocked_at, unlock_threshold)
      VALUES (NEW.student_profile_id, v_chapter_id, true, NEW.accuracy, now(), COALESCE(v_threshold, 90))
      ON CONFLICT (student_profile_id, chapter_id) DO UPDATE
        SET is_unlocked = true, achieved_accuracy = NEW.accuracy, unlocked_at = now();

      SELECT id INTO v_next FROM homework_chapters
      WHERE workbook_id = v_workbook_id
        AND chapter_number > (SELECT chapter_number FROM homework_chapters WHERE id = v_chapter_id)
      ORDER BY chapter_number ASC LIMIT 1;

      IF v_next IS NOT NULL THEN
        INSERT INTO chapter_progress (student_profile_id, chapter_id, is_unlocked, unlock_threshold)
        VALUES (NEW.student_profile_id, v_next, true, COALESCE(v_threshold, 90))
        ON CONFLICT (student_profile_id, chapter_id) DO UPDATE SET is_unlocked = true, unlocked_at = now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auto_unlock_chapter
AFTER INSERT OR UPDATE ON homework_progress
FOR EACH ROW EXECUTE FUNCTION fn_auto_unlock_chapter();

-- Updated_at stamp for puzzle library
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER trg_homework_puzzles_updated_at
BEFORE UPDATE ON homework_puzzles
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE homework_puzzles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_chapter_puzzles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_puzzle_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_hint_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_progress            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_reviews             ENABLE ROW LEVEL SECURITY;

-- homework_puzzles
CREATE POLICY "puzzles_read"   ON homework_puzzles FOR SELECT USING (is_active = true OR is_admin_or_coach());
CREATE POLICY "puzzles_insert" ON homework_puzzles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "puzzles_update" ON homework_puzzles FOR UPDATE USING (is_admin());
CREATE POLICY "puzzles_delete" ON homework_puzzles FOR DELETE USING (is_admin());

-- homework_chapter_puzzles
CREATE POLICY "hcp_read"   ON homework_chapter_puzzles FOR SELECT USING (is_admin_or_coach());
CREATE POLICY "hcp_insert" ON homework_chapter_puzzles FOR INSERT WITH CHECK (is_admin_or_coach());
CREATE POLICY "hcp_delete" ON homework_chapter_puzzles FOR DELETE USING (is_admin_or_coach());

-- student_puzzle_attempts
CREATE POLICY "spa_read"   ON student_puzzle_attempts FOR SELECT USING (student_profile_id = get_my_student_profile_id() OR is_admin_or_coach());
CREATE POLICY "spa_insert" ON student_puzzle_attempts FOR INSERT WITH CHECK (student_profile_id = get_my_student_profile_id() OR is_admin());
CREATE POLICY "spa_update" ON student_puzzle_attempts FOR UPDATE USING (student_profile_id = get_my_student_profile_id() OR is_admin_or_coach());

-- homework_hint_usage
CREATE POLICY "hhu_read" ON homework_hint_usage FOR SELECT USING (
  EXISTS (SELECT 1 FROM student_puzzle_attempts spa WHERE spa.id = attempt_id
    AND (spa.student_profile_id = get_my_student_profile_id() OR is_admin_or_coach()))
);
CREATE POLICY "hhu_insert" ON homework_hint_usage FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM student_puzzle_attempts spa WHERE spa.id = attempt_id
    AND spa.student_profile_id = get_my_student_profile_id())
);

-- homework_progress
CREATE POLICY "hp_read" ON homework_progress FOR SELECT USING (student_profile_id = get_my_student_profile_id() OR is_admin_or_coach());

-- theme_progress
CREATE POLICY "tp_read"   ON theme_progress FOR SELECT USING (student_profile_id = get_my_student_profile_id() OR is_admin_or_coach());
CREATE POLICY "tp_write"  ON theme_progress FOR ALL    USING (is_admin_or_coach()) WITH CHECK (is_admin_or_coach());

-- chapter_progress
CREATE POLICY "cp_read"   ON chapter_progress FOR SELECT USING (student_profile_id = get_my_student_profile_id() OR is_admin_or_coach());
CREATE POLICY "cp_write"  ON chapter_progress FOR ALL    USING (is_admin_or_coach()) WITH CHECK (is_admin_or_coach());

-- coach_reviews
CREATE POLICY "cr_all"    ON coach_reviews FOR ALL USING (is_admin_or_coach()) WITH CHECK (is_admin_or_coach());

-- ============================================================
-- ANALYTICAL VIEWS (no RLS needed — views inherit table RLS)
-- ============================================================

CREATE OR REPLACE VIEW v_student_homework_dashboard AS
SELECT
  ha.id                                         AS assignment_id,
  ha.student_id                                 AS student_profile_id,
  ha.status                                     AS assignment_status,
  ha.due_at,
  hc.id                                         AS chapter_id,
  hc.title                                      AS chapter_title,
  hc.chapter_number,
  hw.id                                         AS workbook_id,
  hw.title                                      AS workbook_title,
  hw.track,
  COALESCE(hp.solved_puzzles, 0)               AS solved_puzzles,
  COALESCE(hp.total_puzzles, 0)                AS total_puzzles,
  COALESCE(hp.accuracy, 0)                     AS accuracy,
  COALESCE(hp.total_score, 0)                  AS total_score,
  COALESCE(hp.status, 'not_started')           AS progress_status,
  COALESCE(cp.is_unlocked, false)              AS chapter_unlocked,
  hp.completed_at,
  hp.last_activity_at
FROM homework_assignments ha
JOIN homework_chapters  hc ON hc.id = ha.chapter_id
JOIN homework_workbooks hw ON hw.id = hc.workbook_id
LEFT JOIN homework_progress hp ON hp.assignment_id = ha.id AND hp.student_profile_id = ha.student_id
LEFT JOIN chapter_progress  cp ON cp.chapter_id = hc.id   AND cp.student_profile_id = ha.student_id;

CREATE OR REPLACE VIEW v_coach_homework_analytics AS
SELECT
  ha.id                                         AS assignment_id,
  ha.coach_id,
  ha.student_id                                 AS student_profile_id,
  sp.user_id                                    AS student_user_id,
  hc.id                                         AS chapter_id,
  hc.title                                      AS chapter_title,
  hw.title                                      AS workbook_title,
  COALESCE(hp.total_puzzles, 0)                AS total_puzzles,
  COALESCE(hp.solved_puzzles, 0)               AS solved_puzzles,
  COALESCE(hp.accuracy, 0)                     AS accuracy,
  COALESCE(hp.total_score, 0)                  AS total_score,
  COALESCE(hp.total_hints_used, 0)             AS total_hints_used,
  COALESCE(hp.avg_time_seconds, 0)             AS avg_time_seconds,
  COALESCE(hp.status, 'not_started')           AS progress_status,
  ha.due_at,
  hp.completed_at
FROM homework_assignments ha
JOIN homework_chapters  hc ON hc.id = ha.chapter_id
JOIN homework_workbooks hw ON hw.id = hc.workbook_id
JOIN student_profiles   sp ON sp.id = ha.student_id
LEFT JOIN homework_progress hp ON hp.assignment_id = ha.id;
