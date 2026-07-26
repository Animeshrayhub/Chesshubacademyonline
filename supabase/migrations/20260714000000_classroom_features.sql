-- ==================================================
-- ADD CLASSROOM CHAT TABLE AND REALTIME SYSTEM
-- Migration: 20260714000000_classroom_features.sql
-- ==================================================

-- Create classroom_chat table
create table if not exists public.classroom_chat (
  id          uuid default gen_random_uuid() primary key,
  class_id    uuid references public.classes(id) on delete cascade not null,
  sender_id   uuid references public.users(id) on delete set null,
  sender_name text not null,
  sender_role text not null check (sender_role in ('admin', 'coach', 'student')),
  message     text not null,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.classroom_chat enable row level security;

-- Policies for classroom_chat
create policy "Users can read classroom chat" on public.classroom_chat
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (
        u.role = 'ADMIN'
        or u.role = 'COACH'
        or exists (
          select 1 from public.student_profiles sp
          join public.class_students cs on cs.student_id = sp.id
          where sp.user_id = u.id and cs.class_id = classroom_chat.class_id
        )
      )
    )
  );

create policy "Users can insert classroom chat" on public.classroom_chat
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (
        u.role = 'ADMIN'
        or u.role = 'COACH'
        or exists (
          select 1 from public.student_profiles sp
          join public.class_students cs on cs.student_id = sp.id
          where sp.user_id = u.id and cs.class_id = classroom_chat.class_id
        )
      )
    )
  );

-- Add classroom_chat to the Supabase Realtime publication
alter publication supabase_realtime add table public.classroom_chat;
