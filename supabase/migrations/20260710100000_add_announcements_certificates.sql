-- ==========================================
-- CHESSHUB ACADEMY: Add Announcements & Certificates
-- Migration: 20260710100000_add_announcements_certificates.sql
-- ==========================================

-- ─── Announcements ────────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id            uuid default gen_random_uuid() primary key,
  title         text not null,
  body          text not null,
  target_roles  text[] not null default '{}'::text[],
  is_published  boolean not null default false,
  published_at  timestamp with time zone,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at    timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.announcements enable row level security;

create policy "Announcements: admin full control" on public.announcements
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create policy "Announcements: published read for authenticated" on public.announcements
  for select to authenticated
  using (is_published = true);

-- ─── Certificates ─────────────────────────────────────────────────────────────
create table if not exists public.certificates (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references public.users(id) on delete cascade not null,
  title       text not null,
  file_url    text,
  issued_at   date not null default current_date,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.certificates enable row level security;

create policy "Certificates: admin full control" on public.certificates
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create policy "Certificates: student can view own" on public.certificates
  for select to authenticated
  using (student_id = auth.uid());
