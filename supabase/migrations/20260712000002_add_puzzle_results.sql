-- ==========================================
-- PUZZLE RESULTS TABLE
-- Migration: 20260712000002_add_puzzle_results.sql
-- Stores only student solve results — puzzle content stays at Lichess.
-- ==========================================

create table if not exists public.puzzle_results (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.student_profiles(id) on delete cascade,
  puzzle_source   text not null default 'lichess'
                  check (puzzle_source in ('lichess', 'chesshub')),
  puzzle_id       text not null,
  puzzle_rating   integer,
  puzzle_themes   text[] default '{}',
  solved_at       timestamp with time zone default timezone('utc'::text, now()) not null,
  attempts        integer not null default 1 check (attempts >= 1),
  solved          boolean not null default false,
  time_seconds    integer check (time_seconds >= 0),
  accuracy        numeric(5, 2) check (accuracy >= 0 and accuracy <= 100),
  is_favourite    boolean not null default false,
  coach_assigned  boolean not null default false,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast student lookups
create index if not exists puzzle_results_student_id_idx
  on public.puzzle_results (student_id, solved_at desc);

-- Unique per (student, puzzle) per calendar day so they can't spam results
create unique index if not exists puzzle_results_student_puzzle_day_idx
  on public.puzzle_results (
    student_id,
    puzzle_id,
    date_trunc('day', solved_at)
  );

comment on table public.puzzle_results is
  'Records of student puzzle attempts. Puzzle content is NOT duplicated — only outcome data is stored.';

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

alter table public.puzzle_results enable row level security;

-- Student: full access to own rows
create policy "Students can manage own puzzle results"
  on public.puzzle_results
  for all
  to authenticated
  using (
    student_id in (
      select id from public.student_profiles where user_id = auth.uid()
    )
  )
  with check (
    student_id in (
      select id from public.student_profiles where user_id = auth.uid()
    )
  );

-- Coach: read their assigned students' results
create policy "Coaches can read assigned students' puzzle results"
  on public.puzzle_results
  for select
  to authenticated
  using (
    public.get_auth_role() = 'coach' and
    student_id in (
      select student_id from public.coach_student_assignments
      where coach_id in (
        select id from public.coach_profiles where user_id = auth.uid()
      )
    )
  );

-- Admin: full control
create policy "Admin full control on puzzle results"
  on public.puzzle_results
  for all
  to authenticated
  using (public.get_auth_role() = 'admin');
