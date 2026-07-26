# Live Chess Classroom - Memory Documentation

This document records the architectural details, configurations, and implementation specifics of the Live Chess Classroom for ChessHub Academy.

---

## 1. Project Scope & Routes

### Main Route
- `/classroom/[classId]`: Accessible by the **Assigned Coach**, **Enrolled Students**, and **Admins**. Unauthorized entries directly return a `403 Forbidden` response without redirection.

### Key Components
- [ClassroomWorkspace.tsx](file:///d:/newchesshub/src/components/dashboard/ui/ClassroomWorkspace.tsx): Main split layout container. Supports HTML5 drag-and-drop panel slots, persistent vertical/horizontal resizing, Zoom SDK Component View, cohort attendance tracking, real-time notes syncing, and homework catalogs.
- [ChessWorkspace.tsx](file:///d:/newchesshub/src/components/dashboard/ui/ChessWorkspace.tsx): Interactive wooden board panel. Supports board editor setups, Stockfish calculations, move variation reviews, and arrow/highlight drawing.

---

## 2. Database Schema (Supabase)

The live chat requires the `classroom_chat` table. To set it up, execute the following SQL migration in your Supabase SQL Editor:

```sql
create table if not exists public.classroom_chat (
  id          uuid default gen_random_uuid() primary key,
  class_id    uuid references public.classes(id) on delete cascade not null,
  sender_id   uuid references public.users(id) on delete set null,
  sender_name text not null,
  sender_role text not null check (sender_role in ('admin', 'coach', 'student')),
  message     text not null,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS & add policies
alter table public.classroom_chat enable row level security;

create policy "Users can read classroom chat" on public.classroom_chat
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (
        u.role = 'ADMIN' or u.role = 'COACH' or
        exists (
          select 1 from public.student_profiles sp
          join public.class_students cs on cs.student_id = sp.id
          where sp.user_id = u.id and cs.class_id = classroom_chat.class_id
        )
      )
    )
  );

create policy "Users can insert classroom chat" on public.classroom_chat
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (
        u.role = 'ADMIN' or u.role = 'COACH' or
        exists (
          select 1 from public.student_profiles sp
          join public.class_students cs on cs.student_id = sp.id
          where sp.user_id = u.id and cs.class_id = classroom_chat.class_id
        )
      )
    )
  );

-- Enable realtime changes
alter publication supabase_realtime add table public.classroom_chat;
```

---

## 3. Real-Time Fallbacks & Consolidation

### Consolidated Realtime Channel
To reduce socket connection overhead and avoid events duplication, all listeners are consolidated into a single socket connection:
- Channel: `classroom_main:${classId}`
- Handled events: `'chat-message'`, `'homework-assigned'`, `'notes-update'`, and `'presence'` sync.

### Optimistic Chat Fallback
To guarantee chat functionality even if the `classroom_chat` database table has not been created yet:
1. Messages are appended to local state instantly.
2. The message is broadcast immediately on the channel via `chat-message` event to online users.
3. A background database `insert` executes. If it fails, the error is caught and logged, while current users still converse in real-time.

### Crash-Free Chess Validation
The `chess.js` engine throws validation exceptions when a FEN does not contain both kings. To support empty board configurations and stamp placements:
1. `handleClearBoard` clears the board layout via `gameRef.current.clear()` and sets an empty FEN state visually (`8/...`).
2. Move syncs and response handlers are wrapped in `try/catch` blocks. If an invalid FEN is parsed (e.g. missing kings during layout setup), the visual board updates correctly, while the engine state is safely cleared to avoid crashing the user's browser.

---

## 4. Zoom Integration

- **SDK Component View**: Integrates the Zoom Meeting embedded Component SDK (`https://source.zoom.us/zoom-meeting-embedded-3.8.5.min.js`) directly in the workspace layout.
- **HS256 Signature Service Action**: `getZoomSignatureAction` in [src/actions/zoom.ts](file:///d:/newchesshub/src/actions/zoom.ts) generates JWT signatures.
- **Iframe Fallback**: In the event of a client error or if meeting credentials fail, the workspace falls back to a secure Zoom web app launcher.
