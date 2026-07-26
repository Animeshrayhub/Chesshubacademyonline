-- ======================================================
-- MIGRATION: 20260712000003_add_saved_games_and_system_config.sql
-- Create saved_games table and system_config table for custom configurations
-- ======================================================

-- 1. Create saved_games table
create table if not exists public.saved_games (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student_profiles(id) on delete cascade,
  title        text not null,
  pgn          text,
  lichess_url  text,
  created_at   timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for lookup optimization
create index if not exists saved_games_student_id_idx on public.saved_games(student_id);

-- Enable RLS
alter table public.saved_games enable row level security;

-- Policies for saved_games
create policy "Students can manage their own saved games"
  on public.saved_games
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

create policy "Coaches can read assigned students saved games"
  on public.saved_games
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

create policy "Admins have full access to saved games"
  on public.saved_games
  for all
  to authenticated
  using (public.get_auth_role() = 'admin');

-- 2. Create system_config table for admin settings (e.g. AI API keys)
create table if not exists public.system_config (
  key        text primary key,
  value      text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.system_config enable row level security;

-- Policies for system_config
create policy "Anyone authenticated can read system config"
  on public.system_config
  for select
  to authenticated
  using (true);

create policy "Admins can manage system config"
  on public.system_config
  for all
  to authenticated
  using (public.get_auth_role() = 'admin');

-- Insert default placeholder key if not exists (so it shows in dashboard configuration)
insert into public.system_config (key, value)
values ('AI_API_KEY', '')
on conflict (key) do nothing;
