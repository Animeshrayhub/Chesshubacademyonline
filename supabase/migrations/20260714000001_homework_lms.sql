-- ==================================================
-- CHESS HOMEWORK LMS UPGRADES
-- Migration: 20260714000001_homework_lms.sql
-- ==================================================

-- 1. Create public.lms_modules table
create table if not exists public.lms_modules (
  id            uuid default gen_random_uuid() primary key,
  course_id     uuid references public.homework_workbooks(id) on delete cascade not null,
  module_number integer not null,
  title         varchar(255) not null,
  description   text,
  created_at    timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at    timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(course_id, module_number)
);

-- Enable RLS for modules
alter table public.lms_modules enable row level security;

create policy "Anyone authenticated can read lms_modules" on public.lms_modules
  for select to authenticated using (true);

create policy "Admin master write on lms_modules" on public.lms_modules
  for all to authenticated using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'ADMIN')
  );

-- 2. Alter homework_chapters to add module and lesson fields
alter table public.homework_chapters add column if not exists module_id uuid references public.lms_modules(id) on delete cascade;
alter table public.homework_chapters add column if not exists video_url text;
alter table public.homework_chapters add column if not exists pdf_page_range varchar(50);
alter table public.homework_chapters add column if not exists notes text;
alter table public.homework_chapters add column if not exists unlock_type varchar(20) not null check (unlock_type in ('coach_approval', 'auto_score')) default 'coach_approval';
alter table public.homework_chapters add column if not exists unlock_score integer not null default 80;
alter table public.homework_chapters add column if not exists puzzle_images jsonb default '[]'::jsonb;
alter table public.homework_chapters add column if not exists questions jsonb default '[]'::jsonb;

-- 3. Create lms_course_enrollments table
create table if not exists public.lms_course_enrollments (
  id                 uuid default gen_random_uuid() primary key,
  student_id         uuid references public.student_profiles(id) on delete cascade not null,
  course_id          uuid references public.homework_workbooks(id) on delete cascade not null,
  current_chapter_id uuid references public.homework_chapters(id) on delete set null,
  enrolled_at        timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at       timestamp with time zone,
  unique(student_id, course_id)
);

-- Enable RLS for course enrollments
alter table public.lms_course_enrollments enable row level security;

create policy "Students can read own enrollments" on public.lms_course_enrollments
  for select to authenticated using (
    exists (
      select 1 from public.student_profiles sp
      where sp.id = lms_course_enrollments.student_id and sp.user_id = auth.uid()
    ) or exists (
      select 1 from public.users u where u.id = auth.uid() and u.role in ('ADMIN', 'COACH')
    )
  );

create policy "Admin master write on enrollments" on public.lms_course_enrollments
  for all to authenticated using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'ADMIN')
  );

-- Add triggers to update timestamps
create or replace function public.update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_lms_modules_timestamp on public.lms_modules;
create trigger update_lms_modules_timestamp before update on public.lms_modules
  for each row execute function public.update_timestamp();

-- Add new tables to Realtime publication
alter publication supabase_realtime add table public.lms_modules;
alter publication supabase_realtime add table public.lms_course_enrollments;
alter publication supabase_realtime add table public.homework_chapters;
