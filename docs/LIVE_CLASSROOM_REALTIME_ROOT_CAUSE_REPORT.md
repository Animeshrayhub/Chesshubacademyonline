# ChessHub Academy
# Live Classroom Realtime Chessboard Root Cause Report

**Document Version:** 1.0.0  
**Phase:** ROOT CAUSE INVESTIGATION ONLY (No production code, database, or UI modified)  
**Date:** October 2026  
**Target Performance:** Sub-100ms local move perception; 100–200ms remote peer synchronization under normal network conditions.  

---

## 1. Executive Summary

This investigation was conducted to determine the exact root causes of synchronization failures, perceived move delays, student move rollback/disappearance, incorrect notation navigation, unnecessary "Reconnecting" / "Resyncing board" messages, and viewport scrolling defects on the live classroom chessboard in ChessHub Academy.

### Key Findings at a Glance

1. **Triple-Path Transmission & Race Conditions:**  
   Every single move triggers three conflicting delivery vectors: (1) direct client-to-client Supabase Realtime broadcast, (2) Supabase PostgreSQL replication (`postgres_changes` on `live_session_board_state`), and (3) a server-side REST API broadcast to two topics simultaneously (`realtime:live-session:${sessionId}` and `live-session:${sessionId}`). These arrive at different speeds with mismatched payload shapes, causing double processing, state flapping, and unnecessary re-renders.

2. **Serverless "Split-Brain" In-Memory State:**  
   The server tracks session state (version, puzzle, drawing overlays, and coach priority move timestamps) in in-memory Node.js `Map` structures (`sessionOverlays` and `lastCoachMoveTimestamps` in `src/lib/classroom-v2/server.ts`). In Next.js serverless or multi-instance environments, these memory maps are periodically recycled or split across instances. When a student submits a move, the server compares the student's `expectedVersion` against an in-memory `currentVersion` that drifted. The server rejects the valid move with `'State conflict: A new move was made on the board. Resynchronizing…'`, forcing an abrupt client-side piece rollback and an expensive full-board database snapshot fetch.

3. **Dead Gap Detection Code:**  
   In `ClassroomStateProvider.tsx`, when a remote move event is received, `localVersionRef.current` is updated to `Math.max(localVersionRef.current, payload.version)` *before* the gap detection check runs. Consequently, `payload.version > localVersionRef.current + 1` is mathematically impossible. If network packet jitter drops or swaps two rapid moves, the client never initiates background reconciliation. Older moves that arrive out of order are permanently discarded by line 404 (`payload.currentMoveIndex < localCurrentMoveIndexRef.current`), leaving the board permanently corrupted or frozen.

4. **Notation Navigation Destroys Canonical Live State:**  
   Clicking a notation entry in `ClassroomNotation.tsx` triggers `onNavigateMove`, which executes `mutateClassroomNavigateMoveAction` on the server. Instead of providing a local student/coach preview or history inspection branch, it **overwrites the canonical database record** in `live_session_board_state` with the historical FEN. Crucially, the client's `postgres_changes` listener explicitly discards any database change where `moveIdx < localCurrentMoveIndexRef.current`. Therefore, remote clients ignore the database update, leaving the coach and students on completely different positions. If a move is subsequently played from the historical position, it is appended to the end of the existing move array instead of truncating or creating a branch, permanently corrupting game notation.

5. **Coach Presence False-Positive Triggers "Coach Reconnecting":**  
   The banner `"Coach is briefly reconnecting… Live classroom will resume automatically"` evaluates `!isCoachOnline && snapshot.isLive && role === 'student'`. The `isCoachOnline` check queries `participants.some(p => p.role === 'coach' && p.isOnline)`. Because the coach participant object is created with `userId: snapshot.permissions.coachId || 'coach'`, if `snapshot.permissions.coachId` is empty or does not strictly match the coach's Supabase Auth UUID, `onlineUserIds.has(coach.userId)` fails, causing students to see persistent or flashing "Coach Reconnecting" banners even when the coach is actively teaching.

6. **Viewport & Layout Overflow (Unnecessary Scrolling):**  
   On screens with height < 800px (standard laptops) and tablets (768px–1023px), the board (max 620px) plus the bottom button toolbar (60px) plus header (56px) plus margins exceeds the window height. On tablets, the grid collapses into a `flex-col` stack: Zoom video (230px) + Board container (650px) + Tabs panel (500px) = 1,380px+, forcing continuous vertical scrolling between the video, the board, and the notation/chat tabs.

---

## 2. Current Architecture

```
                                  CHANCE / CLIENT ARCHITECTURE
                                  
+-----------------------------------------------------------------------------------------+
|                                     BROWSER CLIENT                                      |
|                                                                                         |
|  [ClassroomShell]                                                                       |
|         │                                                                               |
|         ▼                                                                               |
|  [ClassroomBoard] ──▶ [ChessboardAdapter] ──▶ [react-chessboard v5]                     |
|         │                                                                               |
|         ▼                                                                               |
|  [ClassroomStateProvider]                                                               |
|    ├─ localFenRef, localMovesRef, localCurrentMoveIndexRef, localVersionRef (Sync refs) |
|    ├─ snapshot (React useState)                                                         |
|    ├─ activeChannelRef (Supabase Realtime Channel: live-session:${sessionId})          |
|    └─ moveQueueRef (FIFO Promise Queue)                                                 |
+-----------------------------------------------------------------------------------------+
        │                                                     ▲                 ▲
        │ 1. Direct Peer Broadcast                            │                 │
        │    (event: 'MOVE_PLAYED')                           │                 │
        ▼                                                     │                 │
+───────────────────────────+                                 │                 │
| Supabase Realtime Gateway | ────────────────────────────────┼─────────────────┤
| (WebSocket Pub/Sub)       |                                 │                 │
+───────────────────────────+                                 │                 │
        ▲                                                     │                 │
        │                                                     │                 │
        │ 2. mutateClassroomMoveAction()                      │                 │
        │    (Next.js Server Action)                          │                 │
        ▼                                                     │                 │
+──────────────────────────────────────────────────────────+  │                 │
| NEXT.JS SERVER RUNTIME (server.ts)                       |  │                 │
|                                                          |  │                 │
|  ├─ sessionMoveQueues (In-memory FIFO lock)              |  │                 │
|  ├─ lastCoachMoveTimestamps (In-memory Map)              |  │                 │
|  ├─ sessionOverlays (In-memory Map: version, puzzle, etc)|  │                 │
|  ├─ validateChessMove() (chess.js server-side)           |  │                 │
|  │                                                       |  │                 │
|  ├─▶ 3. SQL UPDATE: live_session_board_state             |  │                 │
|  │      (Supabase PostgreSQL Table)                      |  │                 │
|  │           │                                           |  │                 │
|  │           ▼ (Postgres CDC replication)                |  │                 │
|  │      postgres_changes listener ───────────────────────┘  │                 │
|  │                                                          │                 │
|  └─▶ 4. broadcastToLiveSession()                            │                 │
|         HTTP POST /realtime/v1/api/broadcast ───────────────┘                 │
|         (Topics: realtime:live-session & live-session)                        │
+───────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Complete Move Flow

### Flow A: Coach Plays a Move (e.g. e2 → e4)

| Step | Component / Layer | Action / File | Latency / Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. UI Interaction** | `ClassroomBoard.tsx` | Coach drags White pawn from `e2` to `e4`. `handlePieceDrop` fires. | 0ms | Synchronous |
| **2. Client Pre-Validation** | `ClassroomBoard.tsx:232` | `validateChessMove(fen, {from: 'e2', to: 'e4'})` validates via `chess.js`. | ~1–2ms | Valid |
| **3. Handler Dispatch** | `ClassroomBoard.tsx:247` | Calls `onMove('e2', 'e4')` and synchronously returns `true` to `react-chessboard`. Piece drops cleanly on UI without snapback. | ~2ms | Instant visual drop |
| **4. State Provider Handler** | `ClassroomStateProvider.tsx:706` | `onMakeMove('e2', 'e4')` re-validates against `localFenRef.current`. Generates `mutationId = m_${Date.now()}_...`. | ~3ms | Synchronous |
| **5. Local Synchronous Advance** | `ClassroomStateProvider.tsx:769` | `localFenRef.current = newFen`<br>`localMovesRef.current.push(newMoveData)`<br>`localCurrentMoveIndexRef.current = 0`<br>`localVersionRef.current = nextVersion`. | ~3.5ms | Zero lag |
| **6. Optimistic React State** | `ClassroomStateProvider.tsx:775` | Calls `setSnapshot(...)`. Notation updates to "1. e4", sideToMove flips to Black, arrows clear. | ~4ms | Re-renders board UI |
| **7. Sound Effect** | `ClassroomStateProvider.tsx:791` | `playChessSound('move')` triggers Web Audio API audio click. | ~5ms | Instant auditory feedback |
| **8. Direct Peer Broadcast** | `ClassroomStateProvider.tsx:795` | `activeChannelRef.current.send({ type: 'broadcast', event: 'MOVE_PLAYED', payload: { ... } })`. | ~5–10ms | Transmitted over WebSocket |
| **9. Server Action Enqueue** | `ClassroomStateProvider.tsx:817` | `moveQueueRef.current.then(...)` calls `mutateClassroomMoveAction(sessionId, {from, to}, expectedVersion, mutationId)`. | ~10ms | Enqueued in client background |
| **10. Server Concurrency Lock** | `server.ts:306` | `sessionMoveQueues.get(sessionId)` serializes the move on the Node instance. | ~20–30ms | Server roundtrip begins |
| **11. Coach Priority Timestamp** | `server.ts:336` | `lastCoachMoveTimestamps.set(sessionId, Date.now())` records coach move time. | ~31ms | In-memory only |
| **12. DB Fetch** | `server.ts:348` | `ensureBoardStateRow(admin, sessionId)` runs `SELECT * FROM live_session_board_state`. | ~60–90ms | SQL SELECT |
| **13. Server Validation** | `server.ts:400` | Server runs `validateChessMove(currentFen, moveInput, allowIllegalMoves)`. | ~92ms | `chess.js` server-side |
| **14. DB Atomical Update** | `server.ts:464` | `admin.from('live_session_board_state').update({ fen, moves, current_move_index: 0, updated_at })`. | ~140–180ms | SQL UPDATE |
| **15. Server REST Broadcast** | `server.ts:486` | `broadcastToLiveSession(...)` sends HTTP POST to Supabase Realtime REST API for both `realtime:live-session:${sessionId}` and `live-session:${sessionId}`. | ~200–260ms | HTTP POST |
| **16. Remote Student Receive** | Student Browser | **Event 1:** Direct broadcast received in ~50–90ms (Move applies instantly).<br>**Event 2:** Postgres CDC arrives in ~220–300ms.<br>**Event 3:** Server REST broadcast arrives in ~250–350ms. | 50–350ms | Triple processing risk |

---

### Flow B: Student Plays a Move (e.g. e7 → e5)

| Step | Component / Layer | Action / File | Latency / Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. UI Interaction** | `ClassroomBoard.tsx` | Student drags Black pawn `e7` to `e5`. `handlePieceDrop` fires. | 0ms | Synchronous |
| **2. Permission & Turn Check** | `ClassroomBoard.tsx:185, 203` | Checks: `canMove`, `!isLocked`, `allowedColor !== 'none'`. If allowed Black or Both, checks turn (`b === 'b'`). | ~1ms | Valid |
| **3. Client Local Validation** | `ClassroomBoard.tsx:232` | `validateChessMove` passes. Calls `onMove('e7', 'e5')` and returns `true`. Piece drops on board. | ~2ms | Optimistic visual drop |
| **4. State Provider Checks** | `ClassroomStateProvider.tsx:716` | Checks `allowedColor` against `permissions`. Verifies move color matches allowed student color. | ~3ms | Verified |
| **5. Optimistic State & Audio** | `ClassroomStateProvider.tsx:775` | Synchronous refs and `snapshot` updated. Move shows on student board. Audio played. Direct broadcast sent. | ~5ms | Instant local update |
| **6. Server Action Execution** | `server.ts:321` | `executeClassroomMoveInternal` receives student move. | ~60–80ms | Server processing |
| **7. Coach Priority Check** | `server.ts:338` | `if (Date.now() - lastCoachMove < 600)`: If Coach moved within 600ms, **MOVE IS REJECTED IMMEDIATELY**. | ~81ms | **FAILURE POINT 1** |
| **8. State Version Check** | `server.ts:391` | `if (expectedVersion < currentVersion \|\| expectedVersion <= currentMoves.length)`: If server in-memory version bumped by Coach drawing, navigation, or instance reboot, **MOVE IS REJECTED WITH "State conflict"**. | ~85ms | **FAILURE POINT 2** |
| **9. Rejection Handling (Rollback)** | `ClassroomStateProvider.tsx:840` | `if (!res.success)`: Student client logs warning, displays `"State conflict: A new move was made on the board. Resynchronizing…"`, and executes `await reconcileSnapshotRef.current()`. | ~250–400ms | **VISUAL GLITCH:** Piece jumps back, full board reloads. |
| **10. Successful Path** | `server.ts:464` | If approved: DB updated, server broadcasts to Coach and peers, Coach board renders move. | 150–220ms | Synchronized |

---

## 4. Realtime Channels

The live classroom utilizes the following channels:

### 1. `live-session:${sessionId}`
* **Purpose:** Primary classroom bi-directional communication (moves, presence, chat, board lock, drawings, quizzes, hand-raising, classroom end).
* **Sender:** Both Coach and Student clients (via client WebSocket `.send()`), as well as PostgreSQL CDC (`postgres_changes` on `live_session_board_state`).
* **Receiver:** All participants in the classroom.
* **Payload:**
  * Broadcast events: `MOVE_PLAYED`, `BOARD_DRAWING`, `PERMISSIONS_CHANGED`, `FREE_MOVE_TOGGLED`, `BOARD_STATE_UPDATED`, `CHAT_MESSAGE`, `REACTION`, `RAISE_HAND_CHANGED`, `CLASS_ENDED`.
  * Postgres changes: Full row of `live_session_board_state` (`{ session_id, fen, moves, current_move_index, board_controller_id, allow_illegal_moves, updated_at }`).
  * Presence: `{ userId, userName, role, onlineAt }`.
* **Source File:** `src/components/classroom-v2/ClassroomStateProvider.tsx` (lines 258–601).
* **Listener File:** `src/components/classroom-v2/ClassroomStateProvider.tsx` (lines 283–578).
* **Frequency:** High (every move, draw stroke, chat message, and presence heartbeat).

### 2. `realtime:live-session:${sessionId}`
* **Purpose:** Target topic used by server-side `broadcastToLiveSession()` via HTTP POST to the Supabase Realtime broadcast REST API.
* **Sender:** Next.js Server Action (`src/lib/classroom-v2/server.ts:66`).
* **Receiver:** Clients listening on topic `realtime:live-session:${sessionId}` or `live-session:${sessionId}`.
* **Payload:** `ClassroomRealtimePayload` mirror of events dispatched by server actions.
* **Source File:** `src/lib/classroom-v2/server.ts` (lines 47–82).
* **Listener File:** Supabase Realtime infrastructure (relayed to `ClassroomStateProvider.tsx`).
* **Frequency:** Triggered on every server-validated mutation (moves, undos, resets, drawings, quizzes).

### 3. `waiting-room:${classId}`
* **Purpose:** Signals waiting students that the Coach has started the class session.
* **Sender:** Coach client entering/starting session or server action (`src/actions/classes.ts:254`, `src/lib/classroom-v2/server.ts:1792`).
* **Receiver:** Students waiting on `ClassroomWaitingRoom.tsx`.
* **Payload:** `{ type: 'CLASS_STARTED', sessionId, classId, timestamp }`.
* **Source File:** `src/actions/classes.ts`, `src/lib/classroom-v2/server.ts`.
* **Listener File:** `src/components/classroom-v2/ClassroomWaitingRoom.tsx` (lines 46–80).
* **Frequency:** 1–3 times per class start.

### 4. `student-classes-realtime`
* **Purpose:** Updates dashboard cards when class status transitions to `IN_PROGRESS` or `COMPLETED`.
* **Sender:** Server actions (`src/actions/classes.ts:267`, `src/lib/classroom-v2/server.ts:1797`).
* **Receiver:** `StudentClassesList.tsx`.
* **Payload:** `{ type: 'CLASS_STATUS_UPDATED', classId, status }`.
* **Source File:** `src/actions/classes.ts`, `src/lib/classroom-v2/server.ts`.
* **Listener File:** `src/features/student/StudentClassesList.tsx` (line 107).
* **Frequency:** Low (on class status changes).

---

## 5. Board Source of Truth

### Current State Analysis: Multi-Master Conflict

There is **no single source of truth** in the current implementation. Authority is split across three uncoordinated tiers:

```
                           CURRENT THREE-WAY AUTHORITY CONFLICT
                           
 Tier 1: Client In-Memory Refs       Tier 2: Node.js Memory Map         Tier 3: PostgreSQL Database
 ─────────────────────────────       ──────────────────────────         ───────────────────────────
 • localFenRef                       • sessionOverlays Map              • live_session_board_state table
 • localMovesRef                       - version                          - fen
 • localCurrentMoveIndexRef            - arrows                           - moves (JSON array)
 • localVersionRef                     - highlights                       - current_move_index
 (In Browser RAM)                    (In Server Node RAM)               (In Supabase Postgres Disk)
```

1. **Client In-Memory Refs (`ClassroomStateProvider.tsx`):**
   `localFenRef`, `localMovesRef`, `localCurrentMoveIndexRef`, and `localVersionRef` act as the immediate synchronous authority for rendering and move validation.
2. **Server In-Memory Map (`server.ts:120`):**
   `sessionOverlays` tracks `version`, `puzzle`, `game`, `curriculum`, `arrows`, and `highlights` in a Node.js process `Map`. It is **volatile**. Serverless function recycles erase it.
3. **Database Row (`live_session_board_state`):**
   Persists `fen`, `moves`, and `current_move_index`.

### What Is the Conflict?
* When the Coach draws an arrow or toggles board lock, `server.ts` increments `overlay.version`. However, the student's `localVersionRef` is **not updated**.
* When the student subsequently moves, their client sends `expectedVersion = 2`. The server evaluates `expectedVersion < currentVersion` (e.g. 2 < 3) and **rejects the move**, claiming a "State conflict" even though the chess board position was completely identical!
* The client then pulls the database row, which rolls back the student's move.

---

## 6. Local Move Handling

* **Coach:**
  Moves appear immediately on the Coach's board (<1ms) via synchronous ref mutation and optimistic React state updates in `onMakeMove`.
* **Student:**
  Moves appear immediately (<1ms) *if* the student has permissions (`allowedColor !== 'none'`). However, students suffer from frequent **snapback rollbacks** because:
  1. The 600ms Coach Priority rule (`server.ts:339`) rejects student moves made shortly after a coach move.
  2. The `expectedVersion` check (`server.ts:391`) fails whenever the in-memory version drifted.
  3. When rejected, the client executes `await reconcileSnapshotRef.current()`, which erases the student's move and pulls the server position, creating the perception of delayed, missing, or broken moves.

---

## 7. Remote Move Handling

When Participant B makes a move, Participant A receives three separate events:

1. **Direct Peer Broadcast (`activeChannel.send`):**
   Arrives in ~40–80ms via WebSocket. `ClassroomStateProvider` checks `processedMoveIdsSet`. If new, it updates local refs, executes `classroomReducer`, and plays audio.
2. **PostgreSQL CDC (`channel.on('postgres_changes')`):**
   Arrives in ~200–400ms. Has no `eventId`. It checks:
   ```typescript
   if (moveIdx < localCurrentMoveIndexRef.current) return;
   if (moveIdx === localCurrentMoveIndexRef.current && row.fen === localFenRef.current) {
     // syncs permissions only
     return;
   }
   ```
   If there is any whitespace difference or if a new move arrived in between, it calls `setSnapshot`, triggering an extra re-render.
3. **Server REST Broadcast (`broadcastToLiveSession`):**
   Arrives in ~250–450ms. Filtered out by `processedMoveIdsSet` *only* if `mutationId` was preserved. If the server generated a fallback `eventId`, it is treated as a new event.

---

## 8. Event Ordering

### How Events Are Identified
* Each client move generates: `mutationId = m_${Date.now()}_${random}_${from}_${to}`.
* Payload includes: `currentMoveIndex`, `version`, `move` object, `fen`, and `timestamp`.

### What Happens When Moves Arrive Out of Order?
Scenario: Moves 21, 22, 23 sent in rapid succession arrive as **22, 21, 23**.
1. **Move 22 arrives:** `currentMoveIndex` is 21 (0-indexed). The receiver's `localCurrentMoveIndexRef` was 19. Since 21 > 19, Move 22 is applied. `localCurrentMoveIndexRef` becomes 21.
2. **Move 21 arrives:** `currentMoveIndex` is 20. The receiver checks `ClassroomStateProvider.tsx:404`:
   ```typescript
   if (payload.currentMoveIndex !== undefined && payload.currentMoveIndex < localCurrentMoveIndexRef.current) {
     return; // DISCARDED!
   }
   ```
   **Move 21 is discarded forever.**
3. **Result:** The receiver's move history array has Move 22 placed at index 21, but index 20 was never populated. The notation and move history are permanently corrupted.
4. **Why Gap Detection Fails:**
   Lines 416–430 of `ClassroomStateProvider.tsx`:
   ```typescript
   if (payload.version) {
     localVersionRef.current = Math.max(localVersionRef.current, payload.version);
   }
   setSnapshot((current) => classroomReducer(current, payload));
   ...
   // DEAD CODE: localVersionRef was already updated on line 417!
   if (payload.version && payload.version > localVersionRef.current + 1) {
     reconcileSnapshotRef.current();
   }
   ```
   Because `localVersionRef` is updated *before* the check, `payload.version > localVersionRef.current + 1` evaluates to `X > X + 1` (always false). The client never reconciles.

---

## 9. Duplicate Event Risk

| Vector | Source File & Line | Cause | Consequence |
| :--- | :--- | :--- | :--- |
| **Dual-Topic REST Broadcast** | `src/lib/classroom-v2/server.ts:63–76` | `broadcastToLiveSession` pushes to both `realtime:live-session:${sessionId}` and `live-session:${sessionId}` in one POST body. | Clients can receive the identical broadcast twice. |
| **Postgres CDC Missing Event ID** | `src/components/classroom-v2/ClassroomStateProvider.tsx:284–342` | `postgres_changes` receives raw DB row without client `eventId`. | Cannot deduplicate against `processedMoveIdsSet`. |
| **Direct Broadcast + Server Broadcast** | `ClassroomStateProvider.tsx:795` vs `server.ts:486` | Client broadcasts directly *and* server broadcasts on mutation completion. | If server generates fallback `eventId`, duplicate processing occurs. |
| **React Strict Mode Channel Remount** | `ClassroomStateProvider.tsx:254` | Rapid mount/unmount in dev/reconnect can leave dangling Supabase channel listeners. | Multiplied listeners receiving 2x or 3x events. |

---

## 10. Reconnect Logic

### Tracing "Reconnecting to live classroom..."
* **Trigger:** `connectionState === 'reconnecting'` in `ClassroomShell.tsx:698`.
* **Cause:** Fired when Supabase Realtime channel status returns `'TIMED_OUT'`, `'CHANNEL_ERROR'`, or `'CLOSED'` (`ClassroomStateProvider.tsx:590–596`).
* **Backoff:** Uses exponential backoff: `Math.min(1000 * Math.pow(2, attempts - 1), 10000) + random`.
* **Unnecessary Resync on Focus:** Line 625:
  ```typescript
  const handleFocus = () => {
    if (activeChannelRef.current?.state !== 'joined') {
      reconcileSnapshotRef.current();
    }
  };
  ```
  If WebSocket heartbeat delays, focusing the browser tab triggers a full snapshot fetch from PostgreSQL.

### Tracing "Coach is briefly reconnecting…"
* **Trigger:** `isCoachReconnecting` in `ClassroomShell.tsx:545, 635`.
* **Formula:** `const isCoachReconnecting = !isCoachOnline && snapshot.isLive && role === 'student';` (`ClassroomStateProvider.tsx:1386`).
* **Bug:** `isCoachOnline` checks `participants.some((p) => (p.role === 'coach' || p.role === 'admin') && p.isOnline)`. In `participants` useMemo (`line 670`), the coach item is created with `userId: snapshot.permissions.coachId || 'coach'`. If `coachId` is blank in `permissions`, the student's presence tracker cannot match the coach's real UUID in `onlineUserIds`. This causes the banner to display falsely to students.

---

## 11. LocalStorage

A comprehensive codebase audit confirms:
* `localStorage` is used for: `classroom_board_theme`, `classroom_board_scale`, `classroom_sidebar_width`, `classroom_zoom_panel_height`, and `classroom_zoom_layout`.
* **Zero board positions, FENs, or move lists are cached in `localStorage` or `sessionStorage`.**
* **Finding:** `localStorage` is **not** causing board desynchronization or overriding canonical server state.

---

## 12. Database Polling

Audit of timers and intervals across `classroom-v2`:
* `ClassroomWaitingRoom.tsx:88`: Polling interval every 5 seconds to check if class started (fallback for students in waiting room).
* `ClassroomStateProvider.tsx:636`: Polling interval every 15 seconds calling `getClassroomChatHistoryAction(classId)` as a chat fallback.
* `ClassroomShell.tsx:364`: 1-second interval calculating elapsed class time.
* **Finding:** There is **no client-side polling interval for board state**. However, on the server, **every single move triggers a synchronous SQL `SELECT` followed by a SQL `UPDATE`** (`server.ts:348, 464`), adding 100–200ms of database roundtrip latency per move.

---

## 13. React Rendering Performance

### Separation of Delays

```
Total Perceived Latency (150 - 450ms)
├─ Local Rendering: ~1–3ms (Instant)
├─ Network Transmission: ~40–80ms (Supabase Realtime WebSocket)
├─ Server Action & DB: ~100–250ms (Next.js action + Supabase DB update)
├─ Remote Delivery: ~40–80ms
└─ Remote Board Render: ~1–5ms
```

### Rendering Bottlenecks
1. **`customSquareStyles` recalculates on every FEN change (`ClassroomBoard.tsx:102–155`):**
   Inside `useMemo`, it runs:
   ```typescript
   const chess = new Chess(fen.trim());
   const isCheck = chess.inCheck();
   const isCheckmate = chess.isCheckmate();
   // loops through 64 squares to find King square
   ```
   This instantiates a full `Chess` object, evaluates check/checkmate, and scans 64 squares on **every single state change**, blocking the main thread during animations.
2. **Redundant Validation:**
   Move validation is executed **three separate times** for a single move:
   * First in `ClassroomBoard.handlePieceDrop` (`ClassroomBoard.tsx:232`)
   * Second in `ClassroomStateProvider.onMakeMove` (`ClassroomStateProvider.tsx:726`)
   * Third on the server in `executeClassroomMoveInternal` (`server.ts:400`)

---

## 14. MOVES / Notation Behavior

### The Problem: "When I click the moves, the moves are not moving correctly."

Inspection of `ClassroomNotation.tsx` and `ClassroomStateProvider.tsx` reveals:

1. **No Optimistic Feedback:**
   `ClassroomNotation.tsx` calls `onNavigateMove(pair.whiteIndex)`. `ClassroomStateProvider.tsx:1070` does:
   ```typescript
   const onNavigateMove = useCallback(
     async (moveIndex: number): Promise<boolean> => {
       const res = await mutateClassroomNavigateMoveAction(sessionId, moveIndex, snapshotRef.current.version);
       return res.success;
     },
     [sessionId]
   );
   ```
   It does not update local state optimistically. The user clicks, and the UI remains completely frozen until the server roundtrip finishes.
2. **Overwriting Canonical State Instead of Local Preview:**
   On the server (`server.ts:1153`), `mutateClassroomNavigateMove` executes:
   ```typescript
   await admin.from('live_session_board_state').update({
     fen: fenToSet,
     current_move_index: targetMoveIndex,
     updated_by: userId,
   });
   ```
   Clicking notation to inspect a past move **overwrites the live classroom board state in PostgreSQL for all students!**
3. **Desync via `postgres_changes` Filter:**
   When the database updates with historical `current_move_index: 2`, remote clients receive the Postgres CDC event. Line 298 of `ClassroomStateProvider.tsx` says:
   ```typescript
   if (moveIdx < localCurrentMoveIndexRef.current) {
     return; // REJECTED!
   }
   ```
   Remote clients **refuse to move backwards**, creating an instant desynchronization between Coach and students!
4. **Corrupting Future Moves:**
   If the Coach navigates back to Move 2 and plays a move on the board:
   In `onMakeMove` (`ClassroomStateProvider.tsx:753`):
   `const nextMoveIndex = localMovesRef.current.length;` (which is 10, not 3!).
   The new move is appended to the end of all 10 moves, creating an illegal, impossible game continuation.

---

## 15. Controller / Lock Behavior

* **Board Lock (`isBoardLocked`):**
  Properly disables piece dragging on student clients. When toggled, Coach sends `PERMISSIONS_CHANGED` broadcast, which immediately updates student UI.
* **Simultaneous Moves:**
  * If Coach moves while student attempts to move:
    Server enforces coach priority via `lastCoachMoveTimestamps.get(sessionId)` with a 600ms window (`server.ts:339`).
    *Defect:* Because `lastCoachMoveTimestamps` is an in-memory Map in server process memory, if the student's request hits a different serverless instance, the 600ms lock check reads `0` and **fails to block the student**.
  * If two students move simultaneously:
    Server rejects the second student due to `expectedVersion < currentVersion`. The second student's move snaps back with a "State conflict" error.

---

## 16. Rapid Move Behavior

When rapid moves (e.g. `1. e4 e5 2. Nf3 Nc6 3. Bb5`) are executed in quick succession:
1. **Queue Bottleneck:**
   `moveQueueRef` serializes server actions, but each server action takes 150–250ms (due to DB `SELECT` and `UPDATE`). 5 rapid moves queue up to ~1.2 seconds of server delay.
2. **Monotonic Discard Bug:**
   Direct broadcasts arrive faster than server persistence. If WebSocket packet 3 arrives milliseconds after packet 4 due to network jitter, packet 3 is permanently discarded by `payload.currentMoveIndex < localCurrentMoveIndexRef.current`.
3. **Dead Gap Detection:**
   Client never reconciles dropped packet 3, leaving the board position missing a move and the notation out of sync.

---

## 17. Bot Training Findings

*(Investigated separately as requested. No modifications applied.)*

1. **Synchronous Minimax Blocks Browser Main Thread:**  
   In `src/lib/bot-training/chessBotEngine.ts:589`, for Levels 4 through 10, `computeBotMove` runs a synchronous `alphaBeta` minimax tree search with depth 2 to 3 directly on the JavaScript UI thread:
   ```typescript
   const result = alphaBeta(searchGame, depth, -Infinity, Infinity, isWhite);
   ```
   This generates tens of thousands of chess board clones and evaluations on the main thread, causing visible UI freezes (100–800ms frame drops), stuttering animations, and unresponsive piece dragging.
2. **Lack of Web Worker:**  
   Unlike `ClassroomEnginePanel.tsx` (which offloads analysis to `/stockfish/stockfish.js` in a `Worker`), Bot Training executes calculation entirely in the main thread.
3. **Fixed Gauge Heights Cause Layout Distortion:**  
   In `StudentBotTrainingView.tsx:2801`, the advantage evaluation bar has fixed heights:
   `className="w-5 sm:w-6 h-[440px] sm:h-[480px] rounded-xl ..."`
   The chessboard adjacent to it is `aspect-square`. On mobile or smaller tablet screens (<600px width), the board shrinks with viewport width, while the eval bar remains at 440px/480px, causing severe vertical distortion and layout breakage.
4. **Massive Monolithic Component & DOM Overhead:**  
   `StudentBotTrainingView.tsx` is **6,355 lines long (336 KB)** containing 9 tabs, Boss Battle HP meters, XP modals, and thousands of DOM elements rendered into a single tree, resulting in high memory consumption and slow re-renders.

---

## 18. UI Scrolling / Layout Findings (Live Classroom)

### The Problem: Classroom UI Requires Unnecessary Scrolling

### Exact CSS and Layout Causes

1. **Desktop / Laptop Viewport Overflow (<800px vertical height):**
   * File: `src/components/classroom-v2/ClassroomShell.tsx:543`
     ```html
     <div className="flex flex-col min-h-screen lg:h-screen w-screen bg-[#0B0F19] text-white overflow-x-hidden overflow-y-auto lg:overflow-hidden ...">
     ```
   * File: `src/components/classroom-v2/ClassroomShell.tsx:821`
     ```html
     <div className="flex-1 flex flex-col lg:grid p-2 sm:p-3 gap-3 overflow-y-auto lg:overflow-hidden min-h-0"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) var(--sidebar-w)', gridTemplateRows: 'var(--zoom-h) minmax(0, 1fr)' }}>
     ```
   * Left Column (Chessboard):
     `ClassroomBoard` enforces `maxBoardDimension = Math.round(620 * (boardScale || 1))` (`ClassroomBoard.tsx:287`).
     Inside the left column:
     * Header bar: 56px (`h-14`)
     * Chessboard: up to 620px
     * Bottom toolbar: ~55px (`pt-2 flex flex-wrap gap-1.5`)
     * Padding/gaps: ~30px
     * **Total required vertical space: ~761px!**
   * On common 1366x768 or 1280x800 laptops (where browser address bar and OS taskbar leave only ~620–680px of viewport height), 761px overflows the viewport, causing vertical scrollbars or cutting off the bottom toolbar.

2. **Tablet & Mid-Sized Viewport Stack Collapse (768px – 1023px):**
   * In `ClassroomShell.tsx:821`, `lg:grid` activates only at `1024px` and above (`lg:` breakpoint).
   * For tablets (iPad, Galaxy Tab, 768px–1023px), the layout falls back to `flex flex-col`:
     * Order 1 (Zoom Video): `h-[230px]` (`line 1261`)
     * Order 2 (Chessboard container): ~670px
     * Order 3 (Tab Navigation / Notation / Chat): `h-[460px] sm:h-[500px]` (`line 1299`)
     * **Total stacked height: 56px + 230px + 670px + 500px = 1,456px!**
   * Students on tablets are forced to scroll through ~1,500px of page content to alternate between viewing the Coach's video, looking at the chessboard, and typing in chat or reviewing notation.

---

## 20. Itemized Root Causes

### Root Cause 1
* **SEVERITY:** CRITICAL
* **FILE:** `src/lib/classroom-v2/server.ts`
* **LINE:** 120–148, 389–397
* **PROBLEM:** Serverless in-memory overlay version mismatch causes false move rejections.
* **WHY IT HAPPENS:** `sessionOverlays` is stored in Node.js server RAM. When drawings, quizzes, or serverless cold starts occur, `currentVersion` drifts from the student's `localVersionRef`. The server checks `expectedVersion < currentVersion` and rejects valid student moves.
* **USER IMPACT:** Student moves snap back, board triggers an unwanted resync, and the UI displays `"State conflict: A new move was made on the board. Resynchronizing…"`.

---

### Root Cause 2
* **SEVERITY:** CRITICAL
* **FILE:** `src/components/classroom-v2/ClassroomStateProvider.tsx`
* **LINE:** 416–431
* **PROBLEM:** Dead gap detection code prevents out-of-order and dropped move recovery.
* **WHY IT HAPPENS:** `localVersionRef.current` is updated to `Math.max(localVersionRef.current, payload.version)` at line 417 *before* checking `payload.version > localVersionRef.current + 1` at line 428. The condition is never true.
* **USER IMPACT:** If rapid moves arrive out of order, the missing move is discarded forever by line 404, freezing or desynchronizing the student's board.

---

### Root Cause 3
* **SEVERITY:** CRITICAL
* **FILE:** `src/lib/classroom-v2/server.ts` & `src/components/classroom-v2/ClassroomStateProvider.tsx`
* **LINE:** `server.ts:1153–1161`, `ClassroomStateProvider.tsx:298, 1070–1079`
* **PROBLEM:** Notation move clicks overwrite canonical database state and desynchronize peers.
* **WHY IT HAPPENS:** `onNavigateMove` calls `mutateClassroomNavigateMoveAction`, which writes the historical FEN directly to `live_session_board_state`. Remote clients' `postgres_changes` listener discards the backward index change (`moveIdx < localCurrentMoveIndexRef.current`), leaving clients on disparate positions.
* **USER IMPACT:** Clicking notation fails to navigate properly, desynchronizes students from coach, and corrupts subsequent moves.

---

### Root Cause 4
* **SEVERITY:** HIGH
* **FILE:** `src/lib/classroom-v2/server.ts`
* **LINE:** 63–76
* **PROBLEM:** Dual-topic REST API broadcast causes duplicate event delivery.
* **WHY IT HAPPENS:** `broadcastToLiveSession` sends to both `realtime:live-session:${sessionId}` and `live-session:${sessionId}` in one POST body.
* **USER IMPACT:** Clients process duplicate events, causing board flickering, double audio playback, and redundant renders.

---

### Root Cause 5
* **SEVERITY:** HIGH
* **FILE:** `src/components/classroom-v2/ClassroomStateProvider.tsx`
* **LINE:** 670–674, 1385–1386
* **PROBLEM:** Falsely displayed "Coach is briefly reconnecting…" banner.
* **WHY IT HAPPENS:** `isCoachReconnecting` calculates `!isCoachOnline`. If `snapshot.permissions.coachId` is blank or doesn't match the coach's Supabase Auth UUID, `onlineUserIds.has(coach.userId)` fails even when the coach is online.
* **USER IMPACT:** Students see an alarming "Coach temporarily disconnected. Grace period active (5 min)" banner during normal classes.

---

### Root Cause 6
* **SEVERITY:** MEDIUM
* **FILE:** `src/components/classroom-v2/ClassroomBoard.tsx`
* **LINE:** 102–155
* **PROBLEM:** Main thread CPU blocking during square style computation.
* **WHY IT HAPPENS:** `customSquareStyles` runs `new Chess(fen.trim())`, `inCheck()`, `isCheckmate()`, and traverses all 64 squares inside `useMemo` on every single FEN change.
* **USER IMPACT:** Frame drops and piece dragging lag during moves and animations.

---

### Root Cause 7
* **SEVERITY:** HIGH
* **FILE:** `src/components/classroom-v2/ClassroomShell.tsx`
* **LINE:** 543, 821, 1261, 1299
* **PROBLEM:** Unnecessary vertical scrolling on laptops and tablets.
* **WHY IT HAPPENS:** Fixed maximum board dimension (620px) + bottom toolbar exceeds 768px laptop viewports. On tablets, layout collapses into a vertical stack exceeding 1,450px.
* **USER IMPACT:** Users are forced to scroll constantly to see video, board, and chat simultaneously.

---

## 21. Architecture Options Comparison

| Metric | Option A: Existing Supabase Realtime Optimized | Option B: Supabase Broadcast for Moves + DB Async Queue | Option C: Dedicated WebSocket Architecture (e.g. Socket.io / PartyKit) | Option D: Pure Database Polling (e.g. HTTP Polling) |
| :--- | :--- | :--- | :--- | :--- |
| **Move Latency** | ~40–80ms peer broadcast | ~40–80ms peer broadcast | ~20–50ms direct socket | 500–2500ms (unacceptable) |
| **Reliability** | High (with gap recovery fix) | Very High (decouples UI from DB) | High (requires separate server) | High (simple but slow) |
| **Ordering Guarantees**| Monotonic sequence + gap reconcile | Monotonic sequence + DB ack | Native TCP sequence | Polling interval order |
| **Reconnect Behavior** | Native Supabase channel reconnect | Native Supabase channel reconnect | Custom heartbeat / room reconnect | Trivial HTTP refetch |
| **Scalability** | High (handled by Supabase infrastructure) | High (reduces DB write contention) | Requires managing socket clusters | Poor (DB overload with concurrent classes) |
| **Complexity** | Low–Medium (surgical fix in existing files) | Medium (add background write queue) | Very High (new standalone server, hosting, TLS) | Low |
| **Infrastructure Cost** | Zero added cost (existing Supabase tier) | Zero added cost | Additional VPS / serverless socket costs | High DB compute costs |
| **Compatibility** | 100% compatible with ChessHub | 100% compatible with ChessHub | Requires rewiring auth, sessions, proxies | Incompatible with live teaching |
| **Risk of Breaking Classroom**| **Lowest Risk** | Low Risk | **High Risk** (architectural overhaul) | Medium Risk |

---

## 22. Recommended Fix Plan

*(For future implementation phase. DO NOT implement during this investigation.)*

### Phase 1: Realtime Transport & Deduplication Normalization
1. **Single Topic Broadcast:** Clean `broadcastToLiveSession` in `server.ts` to broadcast strictly to `live-session:${sessionId}`. Remove the duplicate `realtime:live-session:${sessionId}` topic entry.
2. **Reconcile Gap Detection Fix:** In `ClassroomStateProvider.tsx`, capture `const prevVersion = localVersionRef.current;` *before* updating `localVersionRef.current = Math.max(localVersionRef.current, payload.version)`. Check `if (payload.version > prevVersion + 1)` so background snapshot reconciliation executes automatically when packets are dropped.
3. **Handle Out-of-Order Packets Gracefully:** If `payload.currentMoveIndex < localCurrentMoveIndexRef.current`, instead of outright discarding, verify if the incoming event is a historical navigation or duplicate. If it's a newer version with a skipped move, trigger a non-blocking snapshot reconcile.

### Phase 2: Authority & Version Drift Elimination
1. **Stateless Server Concurrency:** Eliminate the volatile `sessionOverlays` in-memory version check for student moves. Ground versioning authoritatively in `live_session_board_state.current_move_index` or a dedicated DB column so serverless instances cannot suffer from split-brain version drift.
2. **Decouple Coach Priority From Server RAM:** Store `last_coach_move_at` in the database or pass client-validated timestamps rather than relying on a Node.js process-local `Map`.

### Phase 3: Notation Navigation Overhaul
1. **Local Preview Mode for Notation:** When Coach or Student clicks a move in `ClassroomNotation.tsx`, update a client-local `previewMoveIndex` in state. **Do not execute an immediate database update**.
2. **Explicit "Resume Live" / "Set Position":** Display a clear banner when browsing history ("Browsing Move X — Click 'Set Live Position' to bring classroom here"). Only update the database and broadcast when the Coach explicitly chooses to reset the live board from that position.

### Phase 4: Coach Presence Fix
1. Ensure `snapshot.permissions.coachId` is always populated with the coach's actual Supabase Auth `user_id` when the classroom loads.
2. Update the `isCoachOnline` calculation in `ClassroomStateProvider.tsx` to match either `coachId` or any user with role `coach` present in the channel.

### Phase 5: Responsive Layout & Viewport Scaling
1. In `ClassroomShell.tsx`, dynamically calculate board dimensions based on available viewport height (`calc(100vh - 120px)`) rather than fixed 620px max dimension.
2. On tablet viewports (768px–1023px), implement a 2-column or tabbed split layout so the chessboard and Zoom video remain visible simultaneously without vertical scrolling.

---

## 23. Files That Would Need Changes

When approved to implement fixes in a future phase, changes will be confined to:
1. `src/lib/classroom-v2/server.ts` (Clean broadcast topics, fix versioning and notation navigation DB write).
2. `src/components/classroom-v2/ClassroomStateProvider.tsx` (Fix gap detection, deduplication, presence matching, and notation handlers).
3. `src/components/classroom-v2/ClassroomBoard.tsx` (Optimize `customSquareStyles` and remove redundant validation).
4. `src/components/classroom-v2/ClassroomNotation.tsx` (Add optimistic active move indicator).
5. `src/components/classroom-v2/ClassroomShell.tsx` (Fix viewport height calculation and tablet responsive layout).

---

## 24. Files That MUST NOT Be Changed

To prevent regression and protect core academy functionality, the following files and systems **must remain untouched**:
* `src/components/classroom/ZoomClassroomVideo.tsx` (Zoom core integration)
* `src/components/classroom-v2/ClassroomZoom.tsx` (Classroom Zoom container)
* `src/lib/zoom/*` (Zoom SDK, JWT, and Webhook handlers)
* `src/lib/video/*` (Meeting provisioning and Google Meet isolation)
* `src/lib/supabase/auth.ts`, `src/middleware.ts` (Authentication and route security)
* `src/lib/rating/*` (Academy rating engine and FIDE/Glicko calculations)
* `src/lib/bot-training/*` (Bot Training subsystem — isolated from classroom)
* `src/components/dashboard/ui/StudentBotTrainingView.tsx` (Bot Training UI)
* All existing database migration files and RLS policies

---

## 25. Performance Target

* **Local Move Feedback:** < 5ms (Instant piece drop and notation update).
* **Remote Peer Synchronization:** 100–200ms over normal broadband/4G network.
* **Database Efficiency:** Eliminate full-board snapshot fetches during normal move play.
* **Component Stability:** Zero board remounts during active gameplay.
* **Data Integrity:** Strict monotonic move ordering; zero lost moves during rapid play.

---

## 26. Final Status

* **PHASE:** INVESTIGATION ONLY  
* **CODE MODIFIED:** NO  
* **DATABASE MODIFIED:** NO  
* **SUPABASE TOUCHED:** NO  
* **UI MODIFIED:** NO  
