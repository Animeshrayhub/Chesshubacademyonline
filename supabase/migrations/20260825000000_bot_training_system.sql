-- ======================================================
-- CHESSHUB ACADEMY: BOT TRAINING & PERSONALIZED IMPROVEMENT
-- MIGRATION: 20260825000000_bot_training_system.sql
-- ======================================================

create extension if not exists "uuid-ossp";

-- 1. Student Bot Profiles & Progression
create table if not exists public.student_bot_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.users(id) on delete cascade,
  rating integer not null default 400,
  highest_rating integer not null default 400,
  current_level integer not null default 1,
  unlocked_levels integer[] not null default '{1}',
  coach_unlocked_levels integer[] not null default '{}',
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  win_streak integer not null default 0,
  highest_win_streak integer not null default 0,
  puzzles_solved integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 2. Bot Games Record
create table if not exists public.student_bot_games (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  bot_level integer not null check (bot_level between 1 and 10),
  bot_rating integer not null check (bot_rating between 400 and 2200),
  student_color varchar(10) not null check (student_color in ('white', 'black')),
  time_control varchar(20) not null check (time_control in ('unlimited', '10+0', '10+5', '15+10', '5+0')),
  status varchar(20) not null check (status in ('in_progress', 'completed', 'abandoned')),
  result varchar(20) not null check (result in ('win', 'loss', 'draw', 'in_progress')),
  termination varchar(30) not null default 'checkmate',
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  reconnect_deadline timestamp with time zone,
  initial_fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  final_fen text,
  pgn text,
  move_count integer default 0,
  student_rating_before integer not null,
  rating_change integer not null default 0,
  student_rating_after integer not null,
  analysis_status varchar(20) default 'pending' check (analysis_status in ('pending', 'analyzing', 'completed', 'failed')),
  analysis_summary jsonb,
  created_at timestamp with time zone not null default now()
);

-- 3. Student Rating History Log
create table if not exists public.student_bot_rating_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  game_id uuid references public.student_bot_games(id) on delete cascade,
  before_rating integer not null,
  result varchar(10) not null,
  rating_change integer not null,
  after_rating integer not null,
  bot_level integer not null,
  bot_rating integer not null,
  created_at timestamp with time zone not null default now()
);

-- 4. Analyzed Mistakes Log
create table if not exists public.student_bot_mistakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  game_id uuid not null references public.student_bot_games(id) on delete cascade,
  move_number integer not null,
  fen_before text not null,
  fen_after text not null,
  played_move text not null,
  best_move text not null,
  evaluation_before text not null,
  evaluation_after text not null,
  evaluation_drop numeric not null default 0,
  mistake_type varchar(30) not null check (mistake_type in ('blunder', 'mistake', 'inaccuracy', 'missed_opportunity')),
  severity varchar(10) not null check (severity in ('high', 'medium', 'low')),
  theme varchar(50) not null,
  explanation text not null,
  better_idea text,
  created_at timestamp with time zone not null default now()
);

-- 5. Student Weakness Profile Taxonomy
create table if not exists public.student_weaknesses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  weakness_type varchar(50) not null,
  occurrences integer not null default 1,
  recent_occurrences integer not null default 1,
  severity varchar(10) not null default 'medium',
  confidence numeric default 0.5,
  last_seen timestamp with time zone not null default now(),
  last_practiced timestamp with time zone,
  puzzles_generated integer not null default 0,
  puzzles_completed integer not null default 0,
  puzzles_correct integer not null default 0,
  status varchar(30) not null default 'NEEDS_PRACTICE' check (status in ('NEEDS_PRACTICE', 'IMPROVING', 'STRONG', 'MASTERED')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(student_id, weakness_type)
);

-- 6. Personalized Generated Puzzles
create table if not exists public.personalized_puzzles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  source_game_id uuid references public.student_bot_games(id) on delete set null,
  source_mistake_id uuid references public.student_bot_mistakes(id) on delete set null,
  weakness_type varchar(50) not null,
  fen text not null,
  side_to_move varchar(10) not null check (side_to_move in ('w', 'b', 'white', 'black')),
  solution text not null,
  explanation text not null,
  title text not null,
  difficulty integer not null default 800,
  status varchar(20) not null default 'active' check (status in ('active', 'solved', 'failed', 'archived')),
  attempts integer not null default 0,
  correct_attempts integer not null default 0,
  last_attempted timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- 7. Student Achievements / Badges
create table if not exists public.student_bot_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  badge_key varchar(50) not null,
  title text not null,
  description text not null,
  icon text not null,
  awarded_at timestamp with time zone not null default now(),
  unique(student_id, badge_key)
);

-- Enable RLS on all bot tables
alter table public.student_bot_profiles enable row level security;
alter table public.student_bot_games enable row level security;
alter table public.student_bot_rating_history enable row level security;
alter table public.student_bot_mistakes enable row level security;
alter table public.student_weaknesses enable row level security;
alter table public.personalized_puzzles enable row level security;
alter table public.student_bot_badges enable row level security;
