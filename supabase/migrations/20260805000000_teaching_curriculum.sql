-- ==============================================================================
-- Migration: 20260805000000_teaching_curriculum.sql
-- Description: Live Teaching Curriculum & Classroom Engine Schema
-- ==============================================================================

-- 1. Programs Table
CREATE TABLE IF NOT EXISTS public.curriculum_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_level TEXT NOT NULL DEFAULT 'Beginner' CHECK (target_level IN ('Beginner', 'Intermediate', 'Advanced', 'Master')),
  order_number INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS public.curriculum_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.curriculum_programs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_number INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Chapters Table
CREATE TABLE IF NOT EXISTS public.curriculum_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.curriculum_courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_number INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Lessons Table
CREATE TABLE IF NOT EXISTS public.curriculum_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID REFERENCES public.curriculum_chapters(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  coach_notes TEXT,
  estimated_duration INT NOT NULL DEFAULT 30, -- in minutes
  difficulty TEXT NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Master')),
  tags TEXT[] DEFAULT '{}',
  order_number INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Lesson Media Table
CREATE TABLE IF NOT EXISTS public.lesson_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('pdf', 'video', 'image')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Teaching Positions Table
CREATE TABLE IF NOT EXISTS public.teaching_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE NOT NULL,
  position_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  solution TEXT,
  alternative_solution TEXT,
  hint TEXT,
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Master')),
  theme TEXT,
  tags TEXT[] DEFAULT '{}',
  board_orientation TEXT NOT NULL DEFAULT 'white' CHECK (board_orientation IN ('white', 'black')),
  default_board_lock BOOLEAN NOT NULL DEFAULT TRUE,
  stockfish_eval TEXT,
  coach_notes TEXT,
  order_number INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Teaching Tags Table
CREATE TABLE IF NOT EXISTS public.teaching_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Curriculum Version History Table
CREATE TABLE IF NOT EXISTS public.curriculum_version_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('program', 'course', 'chapter', 'lesson', 'position')),
  entity_id UUID NOT NULL,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Classroom Teaching Sessions Table
CREATE TABLE IF NOT EXISTS public.classroom_teaching_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.curriculum_lessons(id) ON DELETE SET NULL,
  current_position_index INT DEFAULT 0,
  board_control_mode TEXT DEFAULT 'COACH_ONLY' CHECK (board_control_mode IN ('COACH_ONLY', 'ONE_STUDENT', 'SELECTED_STUDENTS', 'EVERYONE')),
  practice_mode BOOLEAN DEFAULT FALSE,
  attempt_limit INT DEFAULT 3,
  timer_seconds INT DEFAULT 60,
  negative_marking JSONB DEFAULT '{"wrongMove": -5, "illegalMove": -2, "hintUsed": -10, "solutionViewed": 0}'::jsonb,
  saved_state JSONB DEFAULT '{}'::jsonb,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Student Classroom Attempts Table
CREATE TABLE IF NOT EXISTS public.student_classroom_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.classroom_teaching_sessions(id) ON DELETE CASCADE NOT NULL,
  position_id UUID REFERENCES public.teaching_positions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  moves TEXT[] DEFAULT '{}',
  current_fen TEXT,
  status TEXT DEFAULT 'thinking' CHECK (status IN ('thinking', 'solved', 'failed')),
  attempts_count INT DEFAULT 0,
  hints_used INT DEFAULT 0,
  solution_viewed BOOLEAN DEFAULT FALSE,
  time_taken_seconds INT DEFAULT 0,
  score INT DEFAULT 0,
  accuracy NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.curriculum_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_teaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_classroom_attempts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users read & write based on role
CREATE POLICY "Allow read access to authenticated users" ON public.curriculum_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin write access to curriculum_programs" ON public.curriculum_programs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.curriculum_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin write access to curriculum_courses" ON public.curriculum_courses FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.curriculum_chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin write access to curriculum_chapters" ON public.curriculum_chapters FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.curriculum_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin write access to curriculum_lessons" ON public.curriculum_lessons FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.lesson_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin write access to lesson_media" ON public.lesson_media FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.teaching_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin write access to teaching_positions" ON public.teaching_positions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.teaching_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin write access to teaching_tags" ON public.teaching_tags FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.curriculum_version_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access to curriculum_version_history" ON public.curriculum_version_history FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.classroom_teaching_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access to classroom_teaching_sessions" ON public.classroom_teaching_sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON public.student_classroom_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access to student_classroom_attempts" ON public.student_classroom_attempts FOR ALL TO authenticated USING (true);

-- Enable Realtime for live classroom tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_teaching_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_classroom_attempts;
