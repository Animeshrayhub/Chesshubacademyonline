-- ==========================================
-- CHESSHUB ACADEMY SCHEMA INITIALIZATION
-- DATABASE MIGRATION: 20260710000000_init_schema.sql
-- ==========================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. BASE SYSTEM TABLES & AUDIT ENGINE
-- ==========================================

-- Profiles (Linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'coach', 'student')),
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Coaches Profile Metadata
create table public.coaches (
  id uuid references public.profiles on delete cascade primary key,
  fide_title text check (fide_title in ('GM', 'WGM', 'IM', 'WIM', 'FM', 'WFM', 'CM', 'WCM')),
  fide_rating integer,
  biography text,
  specialties text[] default '{}'::text[] not null,
  availability_limit integer default 20 not null,
  lichess_username text,
  is_active boolean default true not null
);

-- Students Profile Metadata
create table public.students (
  id uuid references public.profiles on delete cascade primary key,
  parent_name text not null,
  parent_phone text,
  fide_rating integer default 0 not null,
  lichess_username text,
  lichess_rating integer default 0,
  lichess_puzzle_rating integer default 0,
  current_track text default 'Beginner' check (current_track in ('Beginner', 'Intermediate', 'Advanced')),
  assigned_coach_id uuid references public.coaches(id) on delete set null
);

-- Audit Logs Table
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Centralized Audit Logging Trigger Function
create or replace function public.log_audit_action()
returns trigger as $$
begin
  insert into public.audit_logs (
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) values (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Apply triggers to system base tables
create trigger audit_profiles_trigger
after insert or update or delete on public.profiles
for each row execute function public.log_audit_action();

create trigger audit_coaches_trigger
after insert or update or delete on public.coaches
for each row execute function public.log_audit_action();

create trigger audit_students_trigger
after insert or update or delete on public.students
for each row execute function public.log_audit_action();


-- ==========================================
-- 2. SCHEDULING, CLASSROOMS & ENROLLMENTS
-- ==========================================

-- Demo Bookings
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  student_name text not null,
  student_age integer not null,
  preferred_time text not null,
  assigned_coach_id uuid references public.coaches(id) on delete set null,
  zoom_meeting_url text,
  status text default 'pending' check (status in ('pending', 'assigned', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Classes
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.coaches(id) on delete set null,
  topic text not null,
  description text,
  schedule timestamp with time zone not null,
  duration_minutes integer default 60 not null,
  zoom_meeting_id text,
  zoom_meeting_url text,
  lichess_study_url text,
  status text default 'scheduled' check (status in ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Class Enrollments
create table public.class_enrollments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  attended boolean,
  attendance_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (class_id, student_id)
);


-- ==========================================
-- 3. HOMEWORK & CURRICULUM MANAGEMENT
-- ==========================================

-- Homework Workbooks (PDF collections)
create table public.homework_workbooks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  track text not null check (track in ('Beginner', 'Intermediate', 'Advanced')),
  pdf_storage_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workbook Chapters
create table public.homework_chapters (
  id uuid default gen_random_uuid() primary key,
  workbook_id uuid references public.homework_workbooks(id) on delete cascade not null,
  chapter_number integer not null,
  title text not null,
  description text,
  questions_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (workbook_id, chapter_number)
);

-- Homework Assignments
create table public.homework_assignments (
  id uuid default gen_random_uuid() primary key,
  chapter_id uuid references public.homework_chapters(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  coach_id uuid references public.coaches(id) on delete set null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  due_at timestamp with time zone,
  status text default 'assigned' check (status in ('assigned', 'submitted', 'reviewed')),
  unlocked boolean default false not null
);

-- Homework Submissions
create table public.homework_submissions (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.homework_assignments(id) on delete cascade unique not null,
  answers text not null, -- JSON string format
  pdf_submission_path text,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  grade_score integer,
  coach_feedback text,
  reviewed_at timestamp with time zone
);


-- ==========================================
-- 4. BLOGS & MEDIA CMS
-- ==========================================

-- Blog Categories
create table public.blog_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  slug text not null unique,
  description text
);

-- Blog Tags
create table public.blog_tags (
  id uuid default gen_random_uuid() primary key,
  name text not null unique
);

-- Blog Posts
create table public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  author_id uuid references public.profiles(id) on delete set null,
  category_id uuid references public.blog_categories(id) on delete set null,
  featured_image_url text,
  published_at timestamp with time zone,
  status text default 'draft' check (status in ('draft', 'published')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Blog Posts Tags Join
create table public.blog_posts_tags (
  post_id uuid references public.blog_posts(id) on delete cascade,
  tag_id uuid references public.blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);


-- ==========================================
-- 5. RECORDINGS & CERTIFICATES
-- ==========================================

-- Lesson & Library Video Recordings
create table public.lesson_recordings (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  drive_file_id text,
  drive_embed_url text,
  category text not null check (category in ('live-class', 'lesson', 'tournament', 'opening', 'endgame')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ==========================================
-- 6. JWT claims & security triggers
-- ==========================================

-- Fetch JWT role helper
create or replace function public.get_auth_role()
returns text as $$
  select nullif(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', '')::text;
$$ language sql stable;

-- Trigger: create profile when new auth.user is provisioned
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  user_role text;
  user_name text;
begin
  user_role := coalesce(new.raw_app_meta_data->>'role', 'student');
  user_name := coalesce(new.raw_user_meta_data->>'display_name', 'Chess Member');

  insert into public.profiles (id, display_name, email, role, avatar_url, timezone)
  values (
    new.id,
    user_name,
    new.email,
    user_role,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'timezone', 'UTC')
  );

  -- Pre-populate extended tables based on roles
  if user_role = 'coach' then
    insert into public.coaches (id, fide_title, fide_rating, biography, specialties, lichess_username, is_active)
    values (
      new.id,
      (new.raw_user_meta_data->>'fide_title')::text,
      (new.raw_user_meta_data->>'fide_rating')::integer,
      (new.raw_user_meta_data->>'biography')::text,
      coalesce(array_populate(array[]::text[], (new.raw_user_meta_data->'specialties')::json), '{}'::text[]),
      (new.raw_user_meta_data->>'lichess_username')::text,
      true
    );
  elsif user_role = 'student' then
    insert into public.students (id, parent_name, parent_phone, fide_rating, lichess_username, lichess_rating, lichess_puzzle_rating, current_track, assigned_coach_id)
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'parent_name')::text, 'Parent'),
      (new.raw_user_meta_data->>'parent_phone')::text,
      coalesce((new.raw_user_meta_data->>'fide_rating')::integer, 0),
      (new.raw_user_meta_data->>'lichess_username')::text,
      coalesce((new.raw_user_meta_data->>'lichess_rating')::integer, 0),
      coalesce((new.raw_user_meta_data->>'lichess_puzzle_rating')::integer, 0),
      coalesce((new.raw_user_meta_data->>'current_track')::text, 'Beginner'),
      (new.raw_user_meta_data->>'assigned_coach_id')::uuid
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();


-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.students enable row level security;
alter table public.bookings enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.homework_workbooks enable row level security;
alter table public.homework_chapters enable row level security;
alter table public.homework_assignments enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_posts_tags enable row level security;
alter table public.lesson_recordings enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy "Read profiles: authorized users" on public.profiles
  for select to authenticated using (true);
create policy "Update profiles: self update timezone or avatar" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admin master control on profiles" on public.profiles
  for all to authenticated using (public.get_auth_role() = 'admin');

-- coaches
create policy "Read coaches list: active only" on public.coaches
  for select to authenticated using (is_active = true or public.get_auth_role() = 'admin');
create policy "Update coach bio: self" on public.coaches
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admin master control on coaches" on public.coaches
  for all to authenticated using (public.get_auth_role() = 'admin');

-- students
create policy "Read student details" on public.students
  for select to authenticated using (
    auth.uid() = id or
    public.get_auth_role() = 'admin' or
    (public.get_auth_role() = 'coach' and assigned_coach_id = auth.uid())
  );
create policy "Update student details" on public.students
  for update to authenticated using (
    auth.uid() = id or
    public.get_auth_role() = 'admin' or
    (public.get_auth_role() = 'coach' and assigned_coach_id = auth.uid())
  );
create policy "Admin master control on students" on public.students
  for all to authenticated using (public.get_auth_role() = 'admin');

-- bookings
create policy "Demo bookings: read admin only" on public.bookings
  for select to authenticated using (public.get_auth_role() = 'admin');
create policy "Demo bookings: update admin only" on public.bookings
  for update to authenticated using (public.get_auth_role() = 'admin');
create policy "Demo bookings: full control admin" on public.bookings
  for all to authenticated using (public.get_auth_role() = 'admin');
create policy "Public insert bookings" on public.bookings
  for insert to anon, authenticated with check (true);

-- classes
create policy "Read classes" on public.classes
  for select to authenticated using (
    public.get_auth_role() = 'admin' or
    coach_id = auth.uid() or
    exists (
      select 1 from public.class_enrollments
      where class_id = public.classes.id and student_id = auth.uid()
    )
  );
create policy "Admin classes write" on public.classes
  for all to authenticated using (public.get_auth_role() = 'admin');

-- class enrollments
create policy "Read class enrollments" on public.class_enrollments
  for select to authenticated using (
    public.get_auth_role() = 'admin' or
    student_id = auth.uid() or
    exists (
      select 1 from public.classes
      where id = class_id and coach_id = auth.uid()
    )
  );
create policy "Admin enrollments write" on public.class_enrollments
  for all to authenticated using (public.get_auth_role() = 'admin');

-- homework workbooks
create policy "Read workbooks" on public.homework_workbooks
  for select to authenticated using (true);
create policy "Admin workbooks write" on public.homework_workbooks
  for all to authenticated using (public.get_auth_role() = 'admin');

-- homework chapters
create policy "Read chapters" on public.homework_chapters
  for select to authenticated using (true);
create policy "Admin chapters write" on public.homework_chapters
  for all to authenticated using (public.get_auth_role() = 'admin');

-- homework assignments
create policy "Read assignments" on public.homework_assignments
  for select to authenticated using (
    public.get_auth_role() = 'admin' or
    student_id = auth.uid() or
    coach_id = auth.uid()
  );
create policy "Write assignments" on public.homework_assignments
  for all to authenticated using (
    public.get_auth_role() = 'admin' or
    public.get_auth_role() = 'coach'
  );

-- homework submissions
create policy "Access submissions" on public.homework_submissions
  for all to authenticated using (
    public.get_auth_role() = 'admin' or
    exists (
      select 1 from public.homework_assignments
      where id = assignment_id and (student_id = auth.uid() or coach_id = auth.uid())
    )
  );

-- blog categories
create policy "Read blog categories" on public.blog_categories
  for select using (true);
create policy "Admin blog categories write" on public.blog_categories
  for all to authenticated using (public.get_auth_role() = 'admin');

-- blog tags
create policy "Read blog tags" on public.blog_tags
  for select using (true);
create policy "Admin blog tags write" on public.blog_tags
  for all to authenticated using (public.get_auth_role() = 'admin');

-- blog posts
create policy "Read blog posts" on public.blog_posts
  for select using (status = 'published' or public.get_auth_role() = 'admin');
create policy "Admin blog posts write" on public.blog_posts
  for all to authenticated using (public.get_auth_role() = 'admin');

-- blog posts tags
create policy "Read blog posts tags" on public.blog_posts_tags
  for select using (true);
create policy "Admin blog posts tags write" on public.blog_posts_tags
  for all to authenticated using (public.get_auth_role() = 'admin');

-- lesson recordings
create policy "Read lesson recordings" on public.lesson_recordings
  for select to authenticated using (
    public.get_auth_role() = 'admin' or
    exists (
      select 1 from public.classes
      where id = class_id and (
        coach_id = auth.uid() or
        exists (
          select 1 from public.class_enrollments
          where class_id = public.classes.id and student_id = auth.uid()
        )
      )
    )
  );
create policy "Admin lesson recordings write" on public.lesson_recordings
  for all to authenticated using (public.get_auth_role() = 'admin');

-- audit logs
create policy "Read audit logs" on public.audit_logs
  for select to authenticated using (public.get_auth_role() = 'admin');
