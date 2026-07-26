-- ======================================================
-- CHESSHUB ACADEMY STORAGE BUCKETS & POLICIES
-- DATABASE MIGRATION: 20260710000003_storage_buckets.sql
-- ======================================================

-- 1. Create Buckets
insert into storage.buckets (id, name, public)
values 
  ('media', 'media', true),
  ('workbooks', 'workbooks', false),
  ('submissions', 'submissions', false),
  ('certificates', 'certificates', false)
on conflict (id) do update set public = excluded.public;

-- Create Buckets


-- Drop existing storage policies on these buckets to prevent conflicts
drop policy if exists "media select policy" on storage.objects;
drop policy if exists "media write policy" on storage.objects;
drop policy if exists "workbooks select policy" on storage.objects;
drop policy if exists "workbooks write policy" on storage.objects;
drop policy if exists "submissions select policy" on storage.objects;
drop policy if exists "submissions insert policy" on storage.objects;
drop policy if exists "certificates select policy" on storage.objects;
drop policy if exists "certificates write policy" on storage.objects;

-- 2. Define Storage Policies

-- 2.1. media policies (Public read, Admin master control)
create policy "media select policy" on storage.objects
  for select using (bucket_id = 'media');

create policy "media write policy" on storage.objects
  for all to authenticated using (
    bucket_id = 'media' and public.is_admin()
  );

-- 2.2. workbooks policies (Authenticated read, Admin master control)
create policy "workbooks select policy" on storage.objects
  for select to authenticated using (bucket_id = 'workbooks');

create policy "workbooks write policy" on storage.objects
  for all to authenticated using (
    bucket_id = 'workbooks' and public.is_admin()
  );

-- 2.3. submissions policies (Student write own, Coach/Admin read/write)
create policy "submissions select policy" on storage.objects
  for select to authenticated using (
    bucket_id = 'submissions' and (
      public.is_admin() or 
      public.is_coach() or 
      owner = auth.uid()
    )
  );

create policy "submissions insert policy" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'submissions' and (
      public.is_admin() or 
      (public.is_student() and owner = auth.uid())
    )
  );

-- 2.4. certificates policies (Student read own, Admin master control)
create policy "certificates select policy" on storage.objects
  for select to authenticated using (
    bucket_id = 'certificates' and (
      public.is_admin() or 
      owner = auth.uid()
    )
  );

create policy "certificates write policy" on storage.objects
  for all to authenticated using (
    bucket_id = 'certificates' and public.is_admin()
  );
