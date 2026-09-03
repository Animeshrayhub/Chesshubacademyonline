# CHESSHUB ACADEMY — CLASSROOM V2 SETUP & REPAIR INSTRUCTIONS

## 1. Root Cause Analysis: Why Chess Pieces Were Not Moving
1. **`react-chessboard` v5 API Event Signature Mismatch**:
   - `package.json` installs `react-chessboard` `^5.10.0`.
   - In `react-chessboard` v5, the `onPieceDrop` callback passes a **single object**:
     ```ts
     ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs) => boolean
     ```
   - However, legacy code and `ClassroomBoard.tsx` expected 3 separate arguments:
     ```ts
     (sourceSquare: string, targetSquare: string, piece: string) => boolean
     ```
   - When a user dragged and dropped a piece (e.g. White Pawn from `e2` to `e4`), `handlePieceDrop` received the object `{ piece: 'wP', sourceSquare: 'e2', targetSquare: 'e4' }` as the first argument (`sourceSquare`) and `undefined` as `targetSquare`.
   - `chess.js` validation immediately rejected the move with `"Illegal chess move"`, causing the piece to immediately snap back.
2. **`ChessboardAdapter` Dragging & Arrow Props**:
   - In v5, `arePiecesDraggable` was renamed to `allowDragging`.
   - `customArrows` was replaced with `arrows: [{ startSquare, endSquare, color }]`.
   - Both properties have now been normalized inside [`src/components/dashboard/ui/ChessboardWrapper.tsx`](file:///d:/newchesshub/src/components/dashboard/ui/ChessboardWrapper.tsx) and [`src/components/classroom-v2/ClassroomBoard.tsx`](file:///d:/newchesshub/src/components/classroom-v2/ClassroomBoard.tsx).

---

## 2. Optional Database Schema Migration
If you would like the database to store canonical columns (`version`, `is_board_locked`, `board_controllers`, `mode`, `orientation`, `puzzle_state`, `game_state`, `curriculum_state`, `arrows`, `highlights`) directly as first-class PostgreSQL table columns:

1. Open your Supabase Dashboard:
   👉 **https://app.supabase.com/project/titqwyiiagdxmzkgimpe/sql/new**
2. Open the file [`MANUAL_SUPABASE_MIGRATION_CLASSROOM_V2.sql`](file:///d:/newchesshub/MANUAL_SUPABASE_MIGRATION_CLASSROOM_V2.sql) located at the root of this project.
3. Paste the contents into the SQL Editor and click **Run**.
