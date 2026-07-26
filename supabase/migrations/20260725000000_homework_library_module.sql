-- ==================================================
-- CHESSHUB ACADEMY — HOMEWORK LIBRARY MODULE
-- Migration: 20260725000000_homework_library_module.sql
-- Adds: categories, themes, library templates,
--       template sections, template tags, template versions,
--       hw_collections, hw_courses, template_assignments (RLS)
-- ==================================================

-- ── 1. Homework Categories ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.homework_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL UNIQUE,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  color       VARCHAR(30) DEFAULT '#3B82F6',
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.homework_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read categories"
  ON public.homework_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin full access on categories"
  ON public.homework_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- Seed default categories
INSERT INTO public.homework_categories (name, slug, color, sort_order) VALUES
  ('Tactics',           'tactics',           '#EF4444', 1),
  ('Endgame',           'endgame',           '#8B5CF6', 2),
  ('Opening Principles','opening-principles','#3B82F6', 3),
  ('Strategy',          'strategy',          '#10B981', 4),
  ('Checkmate Patterns','checkmate-patterns','#F59E0B', 5),
  ('Calculation',       'calculation',       '#6366F1', 6),
  ('Positional Play',   'positional-play',   '#14B8A6', 7),
  ('Pawn Structures',   'pawn-structures',   '#F97316', 8)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Homework Themes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.homework_themes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL UNIQUE,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  category_id UUID REFERENCES public.homework_categories(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.homework_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read themes"
  ON public.homework_themes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin full access on themes"
  ON public.homework_themes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- Seed default themes
INSERT INTO public.homework_themes (name, slug, sort_order) VALUES
  ('Fork',          'fork',          1),
  ('Pin',           'pin',           2),
  ('Skewer',        'skewer',        3),
  ('Discovered Attack','discovered-attack',4),
  ('Double Check',  'double-check',  5),
  ('Back Rank Mate','back-rank-mate',6),
  ('Smothered Mate','smothered-mate',7),
  ('Zugzwang',      'zugzwang',      8),
  ('Sacrifice',     'sacrifice',     9),
  ('Promotion',     'promotion',     10),
  ('King and Pawn Endgame','king-pawn-endgame',11),
  ('Rook Endgame',  'rook-endgame',  12)
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Homework Library Templates ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.homework_library_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  description     TEXT,
  category_id     UUID REFERENCES public.homework_categories(id) ON DELETE SET NULL,
  theme_id        UUID REFERENCES public.homework_themes(id) ON DELETE SET NULL,
  level           VARCHAR(20) NOT NULL DEFAULT 'BEGINNER'
                  CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  difficulty      VARCHAR(20) NOT NULL DEFAULT 'easy'
                  CHECK (difficulty IN ('easy','medium','hard','expert')),
  estimated_time  INTEGER DEFAULT 30 CHECK (estimated_time > 0),  -- minutes
  thumbnail_url   TEXT,
  cover_image_url TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','archived')),
  version         INTEGER NOT NULL DEFAULT 1,
  parent_id       UUID REFERENCES public.homework_library_templates(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hw_lib_status    ON public.homework_library_templates(status);
CREATE INDEX IF NOT EXISTS idx_hw_lib_level     ON public.homework_library_templates(level);
CREATE INDEX IF NOT EXISTS idx_hw_lib_category  ON public.homework_library_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_hw_lib_parent    ON public.homework_library_templates(parent_id);

ALTER TABLE public.homework_library_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin coach can read library templates"
  ON public.homework_library_templates FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

CREATE POLICY "Admin full access on library templates"
  ON public.homework_library_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 4. Template Sections ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.homework_template_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES public.homework_library_templates(id) ON DELETE CASCADE,
  section_type  VARCHAR(30) NOT NULL
                CHECK (section_type IN ('introduction','objectives','video','pdf','image','puzzle','fen','pgn','notes','solution','explanation','summary','coach_instructions','hint')),
  title         VARCHAR(255),
  content       TEXT,
  media_url     TEXT,
  media_path    TEXT,
  fen_position  TEXT,
  pgn_data      TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hw_sections_template ON public.homework_template_sections(template_id);

ALTER TABLE public.homework_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin coach can read sections"
  ON public.homework_template_sections FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

CREATE POLICY "Admin full access on sections"
  ON public.homework_template_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 5. Template Tags ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.homework_template_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.homework_library_templates(id) ON DELETE CASCADE,
  tag         VARCHAR(80) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_hw_tags_template ON public.homework_template_tags(template_id);

ALTER TABLE public.homework_template_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin coach can read tags"
  ON public.homework_template_tags FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

CREATE POLICY "Admin full access on tags"
  ON public.homework_template_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 6. Template Version History ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.homework_template_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.homework_library_templates(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  snapshot    JSONB NOT NULL,             -- full template snapshot at time of version
  changed_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hw_versions_template ON public.homework_template_versions(template_id);

ALTER TABLE public.homework_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read versions"
  ON public.homework_template_versions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

CREATE POLICY "Admin full access on versions"
  ON public.homework_template_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 7. Collections ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hw_collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  cover_url   TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','published','archived')),
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hw_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin coach can read collections"
  ON public.hw_collections FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

CREATE POLICY "Admin full access on collections"
  ON public.hw_collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 8. Collection Items (Collection ↔ Template) ───────────────
CREATE TABLE IF NOT EXISTS public.hw_collection_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.hw_collections(id) ON DELETE CASCADE,
  template_id   UUID NOT NULL REFERENCES public.homework_library_templates(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_hw_col_items_col  ON public.hw_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_hw_col_items_tmpl ON public.hw_collection_items(template_id);

ALTER TABLE public.hw_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin coach can read collection items"
  ON public.hw_collection_items FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

CREATE POLICY "Admin full access on collection items"
  ON public.hw_collection_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 9. Courses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hw_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  cover_url   TEXT,
  level       VARCHAR(20) NOT NULL DEFAULT 'BEGINNER'
              CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  status      VARCHAR(20) NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','published','archived')),
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hw_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin coach can read courses"
  ON public.hw_courses FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

CREATE POLICY "Admin full access on courses"
  ON public.hw_courses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 10. Course Collections (Course ↔ Collection) ──────────────
CREATE TABLE IF NOT EXISTS public.hw_course_collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES public.hw_courses(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.hw_collections(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_hw_cc_course ON public.hw_course_collections(course_id);
CREATE INDEX IF NOT EXISTS idx_hw_cc_col   ON public.hw_course_collections(collection_id);

ALTER TABLE public.hw_course_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin coach can read course collections"
  ON public.hw_course_collections FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

CREATE POLICY "Admin full access on course collections"
  ON public.hw_course_collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

-- ── 11. Template Assignments ──────────────────────────────────
-- Separate from chapter-based assignments; coaches assign library templates directly
CREATE TABLE IF NOT EXISTS public.hw_template_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.homework_library_templates(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  coach_id          UUID REFERENCES public.coach_profiles(id) ON DELETE SET NULL,
  collection_id     UUID REFERENCES public.hw_collections(id) ON DELETE SET NULL,
  course_id         UUID REFERENCES public.hw_courses(id) ON DELETE SET NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('assigned','in_progress','submitted','reviewed','approved','reassigned','archived')),
  coach_notes       TEXT,
  available_at      TIMESTAMPTZ,
  due_at            TIMESTAMPTZ,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hw_ta_student    ON public.hw_template_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_hw_ta_template   ON public.hw_template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_hw_ta_status     ON public.hw_template_assignments(status);
CREATE INDEX IF NOT EXISTS idx_hw_ta_collection ON public.hw_template_assignments(collection_id);
CREATE INDEX IF NOT EXISTS idx_hw_ta_course     ON public.hw_template_assignments(course_id);

ALTER TABLE public.hw_template_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own template assignments"
  ON public.hw_template_assignments FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = hw_template_assignments.student_id AND sp.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH')
    )
  );

CREATE POLICY "Admin full access on template assignments"
  ON public.hw_template_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN'));

CREATE POLICY "Coach can insert template assignments"
  ON public.hw_template_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH')));

CREATE POLICY "Coach can update their own template assignments"
  ON public.hw_template_assignments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH'))
  );

-- ── 12. Template Submissions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hw_template_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES public.hw_template_assignments(id) ON DELETE CASCADE,
  answers         TEXT,
  file_path       TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grade_score     NUMERIC(5,2),
  coach_feedback  TEXT,
  reviewed_at     TIMESTAMPTZ,
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  UNIQUE(assignment_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_hw_ts_assignment ON public.hw_template_submissions(assignment_id);

ALTER TABLE public.hw_template_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own template submissions"
  ON public.hw_template_submissions FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.hw_template_assignments ta
      JOIN public.student_profiles sp ON sp.id = ta.student_id
      WHERE ta.id = hw_template_submissions.assignment_id AND sp.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH')
    )
  );

CREATE POLICY "Students can submit their own homework"
  ON public.hw_template_submissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hw_template_assignments ta
      JOIN public.student_profiles sp ON sp.id = ta.student_id
      WHERE ta.id = hw_template_submissions.assignment_id AND sp.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH')
    )
  );

CREATE POLICY "Coach can review template submissions"
  ON public.hw_template_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN','COACH')));

-- ── 13. Timestamp triggers ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hw_lib_templates_updated ON public.homework_library_templates;
CREATE TRIGGER trg_hw_lib_templates_updated
  BEFORE UPDATE ON public.homework_library_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_hw_collections_updated ON public.hw_collections;
CREATE TRIGGER trg_hw_collections_updated
  BEFORE UPDATE ON public.hw_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_hw_courses_updated ON public.hw_courses;
CREATE TRIGGER trg_hw_courses_updated
  BEFORE UPDATE ON public.hw_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_hw_ta_updated ON public.hw_template_assignments;
CREATE TRIGGER trg_hw_ta_updated
  BEFORE UPDATE ON public.hw_template_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
