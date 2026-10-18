-- ==========================================
-- CHESSHUB ACADEMY SCHEMA (DATABASE_SCHEMA.MD REALIGNMENT)
-- DATABASE MIGRATION: 20260710000001_backend_foundation.sql
-- ==========================================

create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. BASE SYSTEM TABLES & AUDIT ENGINE
-- ==========================================

-- users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  username varchar(150) not null unique,
  email varchar(254) not null unique,
  first_name varchar(150) not null,
  last_name varchar(150) not null,
  role varchar(20) not null check (role in ('ADMIN', 'COACH', 'STUDENT')),
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- student_profiles table
create table public.student_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  age integer not null,
  level varchar(20) not null check (level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  parent_name varchar(255) not null,
  parent_whatsapp varchar(30) not null,
  joined_date date default current_date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- coach_profiles table
create table public.coach_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  title varchar(100) not null,
  photo_url varchar(512),
  whatsapp varchar(30) not null,
  languages jsonb not null, -- Array format: e.g., ["English", "Spanish"]
  experience_years integer not null,
  bio text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- coach_student_assignments table
create table public.coach_student_assignments (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.coach_profiles(id) on delete cascade not null,
  student_id uuid references public.student_profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- Unique index to prevent duplicate assignments for active mappings
create unique index coach_student_assignment_active_idx
  on public.coach_student_assignments (coach_id, student_id)
  where (archived_at is null);

-- audit_logs table
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete set null,
  action varchar(100) not null,
  ip_address varchar(45) not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger: Centralized Audit Logging
create or replace function public.log_audit_action()
returns trigger as $$
declare
  client_ip text;
  affected_details jsonb;
begin
  client_ip := coalesce(
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    '0.0.0.0'
  );
  
  affected_details := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'op', TG_OP,
    'id', coalesce(new.id, old.id)
  );

  insert into public.audit_logs (
    user_id,
    action,
    ip_address,
    details
  ) values (
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    client_ip,
    affected_details
  );
  return new;
end;
$$ language plpgsql security definer;

-- Apply triggers
create trigger audit_users_trigger
after insert or update or delete on public.users
for each row execute function public.log_audit_action();

create trigger audit_student_profiles_trigger
after insert or update or delete on public.student_profiles
for each row execute function public.log_audit_action();

create trigger audit_coach_profiles_trigger
after insert or update or delete on public.coach_profiles
for each row execute function public.log_audit_action();


-- ==========================================
-- 2. CLASSROOMS, SCHEDULES & RECORDINGS
-- ==========================================

-- weekly_schedules table
create table public.weekly_schedules (
  id uuid default gen_random_uuid() primary key,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  duration_minutes integer not null,
  class_type varchar(20) not null check (class_type in ('PRIVATE', 'GROUP')),
  coach_id uuid references public.coach_profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- weekly_schedule_students table
create table public.weekly_schedule_students (
  id uuid default gen_random_uuid() primary key,
  weekly_schedule_id uuid references public.weekly_schedules(id) on delete cascade not null,
  student_id uuid references public.student_profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- classes table
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  weekly_schedule_id uuid references public.weekly_schedules(id) on delete set null,
  scheduled_start timestamp with time zone not null,
  duration_minutes integer not null,
  class_type varchar(20) not null check (class_type in ('PRIVATE', 'GROUP')),
  coach_id uuid references public.coach_profiles(id) on delete cascade not null,
  status varchar(30) not null check (status in ('SCHEDULED', 'LIVE', 'COMPLETED', 'RECORDING_AVAILABLE', 'CANCELLED')),
  zoom_meeting_id varchar(100),
  zoom_start_url text,
  zoom_join_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- class_students table
create table public.class_students (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  student_id uuid references public.student_profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- class_reports table
create table public.class_reports (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade unique not null,
  coach_id uuid references public.coach_profiles(id) on delete cascade not null,
  notes text not null,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  locked_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- class_attendance table
create table public.class_attendance (
  id uuid default gen_random_uuid() primary key,
  class_report_id uuid references public.class_reports(id) on delete cascade not null,
  student_id uuid references public.student_profiles(id) on delete cascade not null,
  status varchar(20) not null check (status in ('PRESENT', 'ABSENT')),
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- class_recordings table
create table public.class_recordings (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade unique not null,
  recording_url varchar(512) not null,
  recording_source varchar(30) not null check (recording_source in ('ZOOM_CLOUD', 'GOOGLE_DRIVE')),
  recorded_date date not null,
  duration_seconds integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title varchar(255) not null,
  message text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);


-- ==========================================
-- 3. JWT CLAIMS & AUTH TRIGGERS
-- ==========================================

-- JWT custom claim checker
create or replace function public.get_auth_role()
returns text as $$
  select nullif(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', '')::text;
$$ language sql stable;

-- Sync auth.users to public.users and profiles
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  user_role text;
  username_val text;
begin
  user_role := coalesce(new.raw_app_meta_data->>'role', 'STUDENT');
  username_val := coalesce(
    new.raw_user_meta_data->>'username',
    'user_' || substr(new.id::text, 1, 8)
  );

  insert into public.users (
    id,
    username,
    email,
    first_name,
    last_name,
    role,
    is_active
  ) values (
    new.id,
    username_val,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Chess'),
    coalesce(new.raw_user_meta_data->>'last_name', 'Player'),
    user_role,
    true
  );

  -- Pre-populate extended profile metadata tables
  if user_role = 'COACH' then
    insert into public.coach_profiles (
      user_id,
      title,
      whatsapp,
      languages,
      experience_years,
      bio
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data->>'title', 'Coach'),
      coalesce(new.raw_user_meta_data->>'whatsapp', '0000000000'),
      coalesce(new.raw_user_meta_data->'languages', '["English"]'::jsonb),
      coalesce((new.raw_user_meta_data->>'experience_years')::integer, 0),
      coalesce(new.raw_user_meta_data->>'bio', '')
    );
  elsif user_role = 'STUDENT' then
    insert into public.student_profiles (
      user_id,
      age,
      level,
      parent_name,
      parent_whatsapp,
      notes
    ) values (
      new.id,
      coalesce((new.raw_user_meta_data->>'age')::integer, 10),
      coalesce(new.raw_user_meta_data->>'level', 'BEGINNER'),
      coalesce(new.raw_user_meta_data->>'parent_name', 'Parent Name'),
      coalesce(new.raw_user_meta_data->>'parent_whatsapp', '0000000000'),
      coalesce(new.raw_user_meta_data->>'notes', '')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

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

-- Soft delete constraint helper function (applies to all non-admin SELECT policies)
-- All select queries must filter archived_at is null

-- users
create policy "Read users list" on public.users
  for select to authenticated using (archived_at is null);
create policy "Update user details: self" on public.users
  for update to authenticated using (auth.uid() = id and archived_at is null) with check (auth.uid() = id);
create policy "Admin control on users" on public.users
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- student_profiles
create policy "Read student profiles" on public.student_profiles
  for select to authenticated using (
    archived_at is null and (
      user_id = auth.uid() or
      public.get_auth_role() = 'ADMIN' or
      exists (
        select 1 from public.coach_student_assignments a
        join public.coach_profiles c on a.coach_id = c.id
        where a.student_id = public.student_profiles.id and c.user_id = auth.uid() and a.archived_at is null
      )
    )
  );
create policy "Update student profiles" on public.student_profiles
  for update to authenticated using (
    archived_at is null and (
      user_id = auth.uid() or
      public.get_auth_role() = 'ADMIN'
    )
  );
create policy "Admin control student profiles" on public.student_profiles
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- coach_profiles
create policy "Read coach profiles" on public.coach_profiles
  for select to authenticated using (archived_at is null);
create policy "Update coach profiles" on public.coach_profiles
  for update to authenticated using (user_id = auth.uid() and archived_at is null) with check (user_id = auth.uid());
create policy "Admin control coach profiles" on public.coach_profiles
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- coach_student_assignments
create policy "Read assignments" on public.coach_student_assignments
  for select to authenticated using (
    archived_at is null and (
      public.get_auth_role() = 'ADMIN' or
      exists (select 1 from public.coach_profiles where id = coach_id and user_id = auth.uid()) or
      exists (select 1 from public.student_profiles where id = student_id and user_id = auth.uid())
    )
  );
create policy "Admin control assignments" on public.coach_student_assignments
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- classes
create policy "Read classes" on public.classes
  for select to authenticated using (
    archived_at is null and (
      public.get_auth_role() = 'ADMIN' or
      exists (select 1 from public.coach_profiles where id = coach_id and user_id = auth.uid()) or
      exists (
        select 1 from public.class_students cs
        join public.student_profiles s on cs.student_id = s.id
        where cs.class_id = public.classes.id and s.user_id = auth.uid() and cs.archived_at is null
      )
    )
  );
create policy "Admin control classes" on public.classes
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- class_students
create policy "Read class students" on public.class_students
  for select to authenticated using (
    archived_at is null and (
      public.get_auth_role() = 'ADMIN' or
      exists (select 1 from public.student_profiles where id = student_id and user_id = auth.uid()) or
      exists (
        select 1 from public.classes c
        join public.coach_profiles cp on c.coach_id = cp.id
        where c.id = class_id and cp.user_id = auth.uid() and c.archived_at is null
      )
    )
  );
create policy "Admin control class students" on public.class_students
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- class_reports
create policy "Read class reports" on public.class_reports
  for select to authenticated using (
    archived_at is null and (
      public.get_auth_role() = 'ADMIN' or
      exists (select 1 from public.coach_profiles where id = coach_id and user_id = auth.uid())
    )
  );
create policy "Write class reports" on public.class_reports
  for all to authenticated using (
    archived_at is null and (
      public.get_auth_role() = 'ADMIN' or
      (exists (select 1 from public.coach_profiles where id = coach_id and user_id = auth.uid()) and locked_at > now())
    )
  );

-- class_attendance
create policy "Read class attendance" on public.class_attendance
  for select to authenticated using (
    archived_at is null and (
      public.get_auth_role() = 'ADMIN' or
      exists (select 1 from public.student_profiles where id = student_id and user_id = auth.uid()) or
      exists (
        select 1 from public.class_reports r
        join public.coach_profiles c on r.coach_id = c.id
        where r.id = class_report_id and c.user_id = auth.uid() and r.archived_at is null
      )
    )
  );
create policy "Admin control attendance" on public.class_attendance
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- notifications
create policy "Read notifications: recipient" on public.notifications
  for select to authenticated using (user_id = auth.uid() and archived_at is null);
create policy "Update notifications: recipient mark read" on public.notifications
  for update to authenticated using (user_id = auth.uid() and archived_at is null) with check (user_id = auth.uid());
create policy "Admin control notifications" on public.notifications
  for all to authenticated using (public.get_auth_role() = 'ADMIN');

-- audit_logs
create policy "Read audit logs: admin only" on public.audit_logs
  for select to authenticated using (public.get_auth_role() = 'ADMIN');


-- ==========================================
-- 5. STORAGE BUCKETS CONFIG & POLICIES
-- ==========================================

-- Setup Buckets
insert into storage.buckets (id, name, public) 
values 
  ('media', 'media', true),
  ('workbooks', 'workbooks', false),
  ('submissions', 'submissions', false),
  ('certificates', 'certificates', false)
on conflict (id) do nothing;

-- Media Storage (Public)
create policy "Public read media objects" on storage.objects
  for select using (bucket_id = 'media');
create policy "Admin write media objects" on storage.objects
  for all to authenticated using (bucket_id = 'media' and public.get_auth_role() = 'ADMIN');

-- Workbooks Storage (Private, Admin write, Authenticated read)
create policy "Read workbook objects" on storage.objects
  for select to authenticated using (bucket_id = 'workbooks');
create policy "Admin write workbook objects" on storage.objects
  for all to authenticated using (bucket_id = 'workbooks' and public.get_auth_role() = 'ADMIN');

-- Submissions Storage (Private, Student upload, Coach/Admin read)
create policy "Insert submissions objects" on storage.objects
  for insert to authenticated with check (bucket_id = 'submissions' and public.get_auth_role() = 'STUDENT');
create policy "Read submissions objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'submissions' and (
      public.get_auth_role() = 'ADMIN' or
      public.get_auth_role() = 'COACH' or
      owner = auth.uid()
    )
  );

-- Certificates Storage (Private, Admin write, Student read own)
create policy "Read certificate objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'certificates' and (
      public.get_auth_role() = 'ADMIN' or
      owner = auth.uid()
    )
  );
create policy "Admin write certificate objects" on storage.objects
  for all to authenticated using (bucket_id = 'certificates' and public.get_auth_role() = 'ADMIN');
