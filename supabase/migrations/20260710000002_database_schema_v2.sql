-- ======================================================
-- CHESSHUB ACADEMY SCHEMA VERSION 2 (HYBRID MIGRATION)
-- DATABASE MIGRATION: 20260710000002_database_schema_v2.sql
-- ======================================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- ======================================================
-- STEP 1: DROP CONSTRAINTS ON FEATURE TABLES TO PREVENT CONFLICTS
-- ======================================================
alter table if exists public.homework_assignments drop constraint if exists homework_assignments_student_id_fkey;
alter table if exists public.homework_assignments drop constraint if exists homework_assignments_coach_id_fkey;
alter table if exists public.blog_posts drop constraint if exists blog_posts_author_id_fkey;
alter table if exists public.bookings drop constraint if exists bookings_assigned_coach_id_fkey;
alter table if exists public.classes drop constraint if exists classes_coach_id_fkey;
drop trigger if exists on_auth_user_created on auth.users;

-- ======================================================
-- STEP 2: DROP CORE IDENTITY TABLES
-- ======================================================
drop table if exists public.class_enrollments cascade;
drop table if exists public.lesson_recordings cascade;
drop table if exists public.students cascade;
drop table if exists public.coaches cascade;
drop table if exists public.profiles cascade;
drop table if exists public.audit_logs cascade;

-- ======================================================
-- STEP 3: CREATE CORE IDENTITY TABLES
-- ======================================================

-- 3.1. users
create table public.users (
  id uuid primary key default gen_random_uuid(),
  username varchar(150) not null unique,
  password varchar(128) not null,
  email varchar(254) not null unique,
  first_name varchar(150) not null,
  last_name varchar(150) not null,
  role varchar(20) not null check (role in ('ADMIN', 'COACH', 'STUDENT')),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 3.2. coach_profiles
create table public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  title varchar(100) not null,
  photo_url varchar(512),
  whatsapp varchar(30) not null,
  languages jsonb not null,
  experience_years integer not null,
  bio text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 3.3. student_profiles
create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  age integer not null,
  level varchar(20) not null check (level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  parent_name varchar(255) not null,
  parent_whatsapp varchar(30) not null,
  joined_date date not null default current_date,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- ======================================================
-- STEP 4: RE-LINK FEATURE TABLES FOREIGN KEYS
-- ======================================================
alter table public.homework_assignments 
  add constraint homework_assignments_student_id_fkey 
  foreign key (student_id) references public.student_profiles(id) on delete cascade;

alter table public.homework_assignments 
  add constraint homework_assignments_coach_id_fkey 
  foreign key (coach_id) references public.coach_profiles(id) on delete set null;

alter table public.blog_posts 
  add constraint blog_posts_author_id_fkey 
  foreign key (author_id) references public.users(id) on delete set null;

alter table public.bookings 
  add constraint bookings_assigned_coach_id_fkey 
  foreign key (assigned_coach_id) references public.coach_profiles(id) on delete set null;

-- ======================================================
-- STEP 5: MIGRATE CLASSES TABLE via ALTER STATEMENTS
-- ======================================================

-- 5.1. Add weekly_schedule_id
alter table public.classes add column if not exists weekly_schedule_id uuid;

-- 5.2. Rename schedule to scheduled_start
alter table public.classes rename column schedule to scheduled_start;

-- 5.3. Add class_type column
alter table public.classes add column if not exists class_type varchar(20) check (class_type in ('PRIVATE', 'GROUP'));
update public.classes set class_type = 'GROUP' where class_type is null;
alter table public.classes alter column class_type set not null;

-- 5.4. Drop old status check and enforce uppercase status values
alter table public.classes drop constraint if exists classes_status_check;
update public.classes set status = upper(status);
update public.classes set status = 'LIVE' where status = 'ONGOING';
update public.classes set status = 'RECORDING_AVAILABLE' where status = 'COMPLETED';
alter table public.classes add constraint classes_status_check check (status in ('SCHEDULED', 'LIVE', 'COMPLETED', 'RECORDING_AVAILABLE', 'CANCELLED'));

-- 5.5. Rename zoom_meeting_url to zoom_join_url and add zoom_start_url
alter table public.classes rename column zoom_meeting_url to zoom_join_url;
alter table public.classes add column if not exists zoom_start_url text;

-- 5.6. Add audit columns
alter table public.classes add column if not exists updated_at timestamp with time zone default now() not null;
alter table public.classes add column if not exists archived_at timestamp with time zone;

-- 5.7. Drop obsolete columns
alter table public.classes drop column if exists topic;
alter table public.classes drop column if exists description;
alter table public.classes drop column if exists lichess_study_url;

-- ======================================================
-- STEP 6: CREATE REMAINING TABLES FROM DATABASE_SCHEMA.MD
-- ======================================================

-- 6.1. coach_student_assignments
create table public.coach_student_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);
create unique index idx_unique_assignment on public.coach_student_assignments(coach_id, student_id) where archived_at is null;

-- 6.2. weekly_schedules
create table public.weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  duration_minutes integer not null,
  class_type varchar(20) not null check (class_type in ('PRIVATE', 'GROUP')),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 6.3. weekly_schedule_students
create table public.weekly_schedule_students (
  id uuid primary key default gen_random_uuid(),
  weekly_schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 6.4. class_students
create table public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 6.5. class_reports
create table public.class_reports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  notes text not null,
  submitted_at timestamp with time zone not null default now(),
  locked_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 6.6. class_attendance
create table public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  class_report_id uuid not null references public.class_reports(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  status varchar(20) not null check (status in ('PRESENT', 'ABSENT')),
  feedback text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 6.7. class_recordings
create table public.class_recordings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes(id) on delete cascade,
  recording_url varchar(512) not null,
  recording_source varchar(30) not null check (recording_source in ('ZOOM_CLOUD', 'GOOGLE_DRIVE')),
  recorded_date date not null,
  duration_seconds integer,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 6.8. notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title varchar(255) not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone
);

-- 6.9. audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action varchar(100) not null,
  ip_address varchar(45) not null,
  details jsonb,
  created_at timestamp with time zone not null default now()
);

-- ======================================================
-- STEP 7: CONNECT CLASSES TABLE TO NEW SCHEMAS
-- ======================================================
alter table public.classes 
  add constraint classes_weekly_schedule_id_fkey 
  foreign key (weekly_schedule_id) references public.weekly_schedules(id) on delete set null;

alter table public.classes 
  add constraint classes_coach_id_fkey 
  foreign key (coach_id) references public.coach_profiles(id) on delete cascade;

alter table public.classes alter column coach_id set not null;

-- ======================================================
-- STEP 8: HELPER FUNCTIONS & TRIGGERS
-- ======================================================

-- 8.1. Current User Role
create or replace function public.current_role()
returns text as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', ''), 'STUDENT')::text;
$$ language sql stable;

-- 8.2. Role Helpers
create or replace function public.is_admin() returns boolean as $$
  select public.current_role() = 'ADMIN';
$$ language sql stable;

create or replace function public.is_coach() returns boolean as $$
  select public.current_role() = 'COACH';
$$ language sql stable;

create or replace function public.is_student() returns boolean as $$
  select public.current_role() = 'STUDENT';
$$ language sql stable;

-- 8.3. Timestamp Trigger Function
create or replace function public.update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply timestamp triggers
create trigger update_users_timestamp before update on public.users for each row execute function public.update_timestamp();
create trigger update_student_profiles_timestamp before update on public.student_profiles for each row execute function public.update_timestamp();
create trigger update_coach_profiles_timestamp before update on public.coach_profiles for each row execute function public.update_timestamp();
create trigger update_coach_student_assignments_timestamp before update on public.coach_student_assignments for each row execute function public.update_timestamp();
create trigger update_weekly_schedules_timestamp before update on public.weekly_schedules for each row execute function public.update_timestamp();
create trigger update_weekly_schedule_students_timestamp before update on public.weekly_schedule_students for each row execute function public.update_timestamp();
create trigger update_classes_timestamp before update on public.classes for each row execute function public.update_timestamp();
create trigger update_class_students_timestamp before update on public.class_students for each row execute function public.update_timestamp();
create trigger update_class_reports_timestamp before update on public.class_reports for each row execute function public.update_timestamp();
create trigger update_class_attendance_timestamp before update on public.class_attendance for each row execute function public.update_timestamp();
create trigger update_class_recordings_timestamp before update on public.class_recordings for each row execute function public.update_timestamp();
create trigger update_notifications_timestamp before update on public.notifications for each row execute function public.update_timestamp();

-- 8.4. Auth Synchronizer Trigger Function
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  user_role text;
begin
  user_role := upper(coalesce(
    new.raw_app_meta_data->>'role',
    new.raw_user_meta_data->>'role',
    'STUDENT'
  ));

  insert into public.users (id, username, password, email, first_name, last_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    '__auth_managed__',
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Chess'),
    coalesce(new.raw_user_meta_data->>'last_name', 'Member'),
    user_role,
    true
  );

  -- Pre-populate role profile tables
  if user_role = 'COACH' then
    insert into public.coach_profiles (id, user_id, title, whatsapp, languages, experience_years, bio)
    values (
      new.id,
      new.id,
      coalesce(new.raw_user_meta_data->>'title', 'Grandmaster'),
      coalesce(new.raw_user_meta_data->>'whatsapp', ''),
      coalesce(new.raw_user_meta_data->'languages', '[]'::jsonb),
      coalesce((new.raw_user_meta_data->>'experience_years')::integer, 0),
      coalesce(new.raw_user_meta_data->>'bio', '')
    );
  elsif user_role = 'STUDENT' then
    insert into public.student_profiles (id, user_id, age, level, parent_name, parent_whatsapp, joined_date, notes)
    values (
      new.id,
      new.id,
      coalesce((new.raw_user_meta_data->>'age')::integer, 10),
      coalesce(new.raw_user_meta_data->>'level', 'BEGINNER'),
      coalesce(new.raw_user_meta_data->>'parent_name', 'Parent'),
      coalesce(new.raw_user_meta_data->>'parent_whatsapp', ''),
      coalesce((new.raw_user_meta_data->>'joined_date')::date, current_date),
      coalesce(new.raw_user_meta_data->>'notes', '')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 8.5. Audit Logging Trigger Function
create or replace function public.log_audit_entry()
returns trigger as $$
declare
  client_ip text;
begin
  begin
    client_ip := coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '127.0.0.1');
  exception when others then
    client_ip := '127.0.0.1';
  end;

  insert into public.audit_logs (user_id, action, ip_address, details)
  values (
    auth.uid(),
    TG_OP || ' ' || TG_TABLE_NAME,
    client_ip,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record_id', coalesce(new.id, old.id),
      'action', TG_OP
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Apply audit logs triggers
create trigger audit_users_trigger after insert or update or delete on public.users for each row execute function public.log_audit_entry();
create trigger audit_student_profiles_trigger after insert or update or delete on public.student_profiles for each row execute function public.log_audit_entry();
create trigger audit_coach_profiles_trigger after insert or update or delete on public.coach_profiles for each row execute function public.log_audit_entry();

-- ======================================================
-- STEP 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ======================================================

-- Enable RLS
alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.coach_student_assignments enable row level security;
alter table public.weekly_schedules enable row level security;
alter table public.weekly_schedule_students enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.class_reports enable row level security;
alter table public.class_attendance enable row level security;
alter table public.class_recordings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- 9.1. users policies
create policy "Read users list" on public.users
  for select to authenticated using (true);
create policy "Master admin write on users" on public.users
  for all to authenticated using (public.is_admin());

-- 9.2. student_profiles policies
create policy "Read student profiles" on public.student_profiles
  for select to authenticated using (
    public.is_admin() or 
    user_id = auth.uid() or
    exists (
      select 1 from public.coach_student_assignments
      where student_id = public.student_profiles.id and coach_id = auth.uid()
    )
  );
create policy "Self update student profiles" on public.student_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Master admin write on student_profiles" on public.student_profiles
  for all to authenticated using (public.is_admin());

-- 9.3. coach_profiles policies
create policy "Read coach profiles" on public.coach_profiles
  for select to authenticated using (true);
create policy "Self update coach profiles" on public.coach_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Master admin write on coach_profiles" on public.coach_profiles
  for all to authenticated using (public.is_admin());

-- 9.4. coach_student_assignments policies
create policy "Read assignments" on public.coach_student_assignments
  for select to authenticated using (true);
create policy "Master admin write on assignments" on public.coach_student_assignments
  for all to authenticated using (public.is_admin());

-- 9.5. weekly_schedules policies
create policy "Read weekly schedules" on public.weekly_schedules
  for select to authenticated using (true);
create policy "Master admin write on weekly_schedules" on public.weekly_schedules
  for all to authenticated using (public.is_admin());

-- 9.6. weekly_schedule_students policies
create policy "Read weekly schedule students" on public.weekly_schedule_students
  for select to authenticated using (true);
create policy "Master admin write on weekly_schedule_students" on public.weekly_schedule_students
  for all to authenticated using (public.is_admin());

-- 9.7. classes policies
create policy "Read classes" on public.classes
  for select to authenticated using (
    public.is_admin() or
    coach_id = auth.uid() or
    exists (
      select 1 from public.class_students
      where class_id = public.classes.id and student_id = auth.uid()
    )
  );
create policy "Master admin write on classes" on public.classes
  for all to authenticated using (public.is_admin());

-- 9.8. class_students policies
create policy "Read class students" on public.class_students
  for select to authenticated using (true);
create policy "Master admin write on class_students" on public.class_students
  for all to authenticated using (public.is_admin());

-- 9.9. class_reports policies
create policy "Access class reports" on public.class_reports
  for all to authenticated using (
    public.is_admin() or 
    coach_id = auth.uid()
  );

-- 9.10. class_attendance policies
create policy "Access class attendance" on public.class_attendance
  for select to authenticated using (
    public.is_admin() or
    student_id = auth.uid() or
    exists (
      select 1 from public.class_reports
      where id = class_report_id and coach_id = auth.uid()
    )
  );
create policy "Write class attendance" on public.class_attendance
  for all to authenticated using (
    public.is_admin() or
    exists (
      select 1 from public.class_reports
      where id = class_report_id and coach_id = auth.uid()
    )
  );

-- 9.11. class_recordings policies
create policy "Read class recordings" on public.class_recordings
  for select to authenticated using (
    public.is_admin() or
    exists (
      select 1 from public.class_students
      where class_id = public.class_recordings.class_id and student_id = auth.uid()
    ) or
    exists (
      select 1 from public.classes
      where id = class_id and coach_id = auth.uid()
    )
  );
create policy "Master admin write on class_recordings" on public.class_recordings
  for all to authenticated using (public.is_admin());

-- 9.12. notifications policies
create policy "Access own notifications" on public.notifications
  for all to authenticated using (user_id = auth.uid());

-- 9.13. audit_logs policies
create policy "Access audit logs" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ======================================================
-- STEP 10: PRIVILEGE GRANTS TO DEFAULT ROLES
-- ======================================================
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
