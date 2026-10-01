# ChessHub Academy: Rating, Leaderboard & Adaptive Bot Training
## Phase 1 Comprehensive Codebase & Architecture Audit

**Target Project:** ChessHub Academy Production Codebase (`Animeshrayhub/Chesshubacademyonline`)  
**Audit Document:** `docs/RATING_BOT_LEADERBOARD_AUDIT.md`  
**Date:** September 27, 2026  
**Status:** COMPLETE AUDIT — STOPPING FOR ARCHITECTURAL APPROVAL  

---

### Executive Summary

ChessHub Academy is a Next.js 14 (App Router) + Supabase platform serving coaches, students, and administrators with live classroom features, homework modules, tactical puzzles, opening repertoires, and bot practice.

This audit evaluates the codebase against the **10 Master Feature Goals**:
1. **Chess Rating System:** Independent human ratings by time control (Blitz, Rapid, Classical) starting at 400 using canonical Standard Elo.
2. **Bot Rating System:** Independent bot rating starting at 400.
3. **Puzzle/Tactical Rating System:** Independent tactical rating starting at 400.
4. **Multi-level Bot Training System:** Beginner-friendly Levels 1–3, Level 4+ progressively adaptive.
5. **Adaptive Personal Training:** Personalized training targeting student opening, tactical, and strategic weaknesses.
6. **Mistake Detection:** Multi-signal centipawn evaluation drop and tactical error classification (MINOR, MISTAKE, SERIOUS_MISTAKE, BLUNDER) with interactive student solve flow.
7. **Weakness Detection:** Repeated weakness tracking across standard taxonomy with trend analysis and coach overrides.
8. **Leaderboards:** Global, Country, Academy, and Coach-assigned cohorts across Daily, Weekly, Monthly, and All-Time periods with strict privacy and ZERO fake data.
9. **XP / Achievement / Reward System:** Server-validated activity rewards, anti-farming safeguards, and milestone badges.
10. **Coach Analytics and Controls:** Real-time visibility into assigned student ratings, trends, mistakes, and training approvals.

---

### Section 1: Existing Functionality

| Feature Area | Current Implementation Status | Evaluation & Limitations |
| :--- | :--- | :--- |
| **Human Chess Rating** | **Missing** | There is no human Elo rating system in the database or backend. Students have no Blitz, Rapid, or Classical ratings. Dashboard falls back to Lichess API profile stats (`stats.lichess.ratings`) or bot rating. |
| **Bot Rating System** | **Partial** | `student_bot_profiles` has a `rating` column (default 400) and `student_bot_rating_history` logs changes. However, rating deltas are currently hardcoded (+20 for win, +5 for draw, -15 for loss in `botService.ts`), rather than using standard Elo with opponent rating and expected score. |
| **Puzzle / Tactical Rating** | **Partial / Deprecated Storage** | `src/app/api/puzzles/result/route.ts` implements an Elo formula with $K=32$, but reads/writes tactical rating from a JSON string serialized inside `student_profiles.notes` (`=== CHESSHUB_STATS ===`), defaulting to 1200 instead of 400. `src/lib/puzzles/eloRating.ts` exists but is orphaned/uncalled. |
| **Bot Training Engine** | **Implemented (Local Minimax)** | `src/lib/bot-training/chessBotEngine.ts` implements a 10-level JavaScript Minimax engine with Alpha-Beta pruning, piece-square tables, and opening book lookup. Levels 1–3 provide gentle/fundamental moves. |
| **Stockfish Engine** | **Client-side Worker Only** | `/public/stockfish/stockfish.js` (~1.58 MB) is integrated as a browser Web Worker in `OpeningLessonBoard.tsx` and `GameRepositoryView.tsx`. It is **not** currently run server-side or asynchronously for game mistake analysis. |
| **Bot Level Unlock** | **Points Farming Economy** | `botService.ts` unlocks levels purely via `training_points` thresholds (+400 pts per level: Level 2 at 400, Level 3 at 800, etc.) calculated from $(wins \times 75 + draws \times 25 - losses \times 15 + puzzles \times 25)$. Does not evaluate games played, performance, accuracy, or improvement as required by product specifications. |
| **Mistake Detection** | **Heuristic Rule-Based Only** | `src/lib/bot-training/analysisEngine.ts` uses basic `chess.js` checks (hanging piece worth $\ge 3$ pts, queen moves before move 4, castling delay) and returns dummy evaluations (`evaluation_before: '0.0'`, `evaluation_after: '-2.5'`). It does not run engine evaluation or centipawn loss calculations. |
| **Weakness Tracking** | **Partial** | `student_weaknesses` table exists and records `occurrences`, `severity`, and `status`. It currently triggers a personalized puzzle on the 3rd occurrence. Missing trend detection (improving/stable/worsening) and coach controls. |
| **Leaderboards** | **Simulated / Mock Cohort** | `src/lib/students/leaderboardSimulation.ts` and `StudentLeaderboardHub.tsx` generate fake student peers and simulate match results to fill 4 division leagues. It mixes bot rating and tactics into a single XP formula. This directly contradicts the requirement for ZERO fake data. |
| **XP & Gamification** | **Fragmented / Unstored** | `xpService.ts` defines Rank titles (Pawn to King) based on XP brackets. However, `student_profiles` has no `xp` column in the database schema; XP is stored either in `notes` or calculated on the fly. `xp_transactions` ledger does not exist. |
| **Coach Analytics** | **Partial** | `/dashboard/coach/students/[profileId]` shows attended classes, puzzle count, and reads `tacticalRating` from notes. It lacks mistake review, weakness override, and training assignment controls. |

---

### Section 2: Existing Database Tables

Detailed audit of all tables in `supabase/migrations/` relevant to ratings, bots, games, puzzles, and activities:

```
public.users
├── id (UUID, PK, references auth.users)
├── username (VARCHAR(150), UNIQUE)
├── email (VARCHAR(254), UNIQUE)
├── first_name, last_name (VARCHAR(150))
├── role (VARCHAR(20), check: ADMIN, COACH, STUDENT)
├── is_active (BOOLEAN, default true)
├── user_code (VARCHAR(20), UNIQUE)
├── phone (VARCHAR(30))
├── avatar_url (TEXT)
└── created_at, updated_at, archived_at (TIMESTAMPTZ)
* Note: Neither country nor ratings are stored in users.

public.student_profiles
├── id (UUID, PK)
├── user_id (UUID, UNIQUE, references public.users(id) ON DELETE CASCADE)
├── age (INTEGER)
├── level (VARCHAR(20), check: BEGINNER, INTERMEDIATE, ADVANCED)
├── parent_name (VARCHAR(255))
├── parent_whatsapp (VARCHAR(30))
├── joined_date (DATE)
├── notes (TEXT)  <-- CRITICAL: Currently overloaded with serialized JSON stats (tacticalRating, XP, streaks, country, emergency contact)
└── created_at, updated_at, archived_at (TIMESTAMPTZ)

public.coach_student_assignments
├── id (UUID, PK)
├── coach_id (UUID, references coach_profiles(id) OR users(id) depending on migration)
├── student_id (UUID, references student_profiles(id))
└── created_at, updated_at, archived_at (TIMESTAMPTZ)

public.student_bot_profiles (Migration: 20260825000000_bot_training_system.sql)
├── id (UUID, PK)
├── student_id (UUID, UNIQUE, references public.users(id) ON DELETE CASCADE)
├── rating (INTEGER, default 400)
├── highest_rating (INTEGER, default 400)
├── current_level (INTEGER, default 1)
├── unlocked_levels (INTEGER[], default '{1}')
├── coach_unlocked_levels (INTEGER[], default '{}')
├── games_played, wins, losses, draws (INTEGER, default 0)
├── win_streak, highest_win_streak (INTEGER, default 0)
├── puzzles_solved (INTEGER, default 0)
└── created_at, updated_at (TIMESTAMPTZ)

public.student_bot_games (Migration: 20260825000000_bot_training_system.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── bot_level (INTEGER, 1 to 10)
├── bot_rating (INTEGER, 400 to 2200)
├── student_color (VARCHAR(10), white/black)
├── time_control (VARCHAR(20), unlimited/10+0/10+5/15+10/5+0)
├── status (VARCHAR(20), in_progress/completed/abandoned)
├── result (VARCHAR(20), win/loss/draw/in_progress)
├── termination (VARCHAR(30), default 'checkmate')
├── started_at, ended_at, reconnect_deadline (TIMESTAMPTZ)
├── initial_fen (TEXT, default startpos)
├── final_fen, pgn (TEXT)
├── move_count (INTEGER)
├── student_rating_before (INTEGER)
├── rating_change (INTEGER)
├── student_rating_after (INTEGER)
├── analysis_status (VARCHAR(20), pending/analyzing/completed/failed)
├── analysis_summary (JSONB)
└── created_at (TIMESTAMPTZ)

public.student_bot_rating_history (Migration: 20260825000000_bot_training_system.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── game_id (UUID, references student_bot_games(id) ON DELETE CASCADE)
├── before_rating, rating_change, after_rating (INTEGER)
├── result (VARCHAR(10))
├── bot_level, bot_rating (INTEGER)
└── created_at (TIMESTAMPTZ)

public.student_bot_mistakes (Migration: 20260825000000_bot_training_system.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── game_id (UUID, references student_bot_games(id) ON DELETE CASCADE)
├── move_number (INTEGER)
├── fen_before, fen_after (TEXT)
├── played_move, best_move (TEXT)
├── evaluation_before, evaluation_after (TEXT)
├── evaluation_drop (NUMERIC, default 0)
├── mistake_type (VARCHAR(30), check: blunder, mistake, inaccuracy, missed_opportunity)
├── severity (VARCHAR(10), check: high, medium, low)
├── theme (VARCHAR(50))
├── explanation (TEXT)
├── better_idea (TEXT)
└── created_at (TIMESTAMPTZ)

public.student_weaknesses (Migration: 20260825000000_bot_training_system.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── weakness_type (VARCHAR(50))
├── occurrences, recent_occurrences (INTEGER, default 1)
├── severity (VARCHAR(10), default 'medium')
├── confidence (NUMERIC, default 0.5)
├── last_seen (TIMESTAMPTZ)
├── last_practiced (TIMESTAMPTZ)
├── puzzles_generated, puzzles_completed, puzzles_correct (INTEGER, default 0)
├── status (VARCHAR(30), check: NEEDS_PRACTICE, IMPROVING, STRONG, MASTERED)
├── created_at, updated_at (TIMESTAMPTZ)
└── UNIQUE (student_id, weakness_type)

public.personalized_puzzles (Migration: 20260825000000_bot_training_system.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── source_game_id (UUID, references student_bot_games(id))
├── source_mistake_id (UUID, references student_bot_mistakes(id))
├── weakness_type (VARCHAR(50))
├── fen (TEXT), side_to_move (VARCHAR(10))
├── solution, explanation, title (TEXT)
├── difficulty (INTEGER, default 800)
├── status (VARCHAR(20), active/solved/failed/archived)
├── attempts, correct_attempts (INTEGER, default 0)
├── last_attempted, created_at (TIMESTAMPTZ)

public.student_bot_badges (Migration: 20260825000000_bot_training_system.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── badge_key (VARCHAR(50)), title, description, icon (TEXT)
├── awarded_at (TIMESTAMPTZ)
└── UNIQUE (student_id, badge_key)

public.puzzle_results (Recreated: 20260903000000_production_fixes_and_activities.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── puzzle_source (TEXT, default 'lichess')
├── puzzle_id (TEXT)
├── puzzle_rating (INTEGER)
├── puzzle_themes (TEXT[])
├── category (TEXT, default 'TACTICS')
├── solved (BOOLEAN, default false)
├── attempts (INTEGER, default 1)
├── time_seconds (INTEGER, default 0)
├── accuracy (NUMERIC(5,2))
└── created_at (TIMESTAMPTZ)

public.student_activities (Migration: 20260903000000_production_fixes_and_activities.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.users(id) ON DELETE CASCADE)
├── activity_type (VARCHAR(50), check: CLASS, PUZZLE, DAILY_PUZZLE, BOT_GAME, HOMEWORK, CURRICULUM, PRACTICE)
├── activity_id (TEXT)
├── started_at, completed_at (TIMESTAMPTZ)
├── duration_seconds (INTEGER)
├── result (VARCHAR(50))
├── score (NUMERIC)
├── accuracy (NUMERIC(5,2))
├── metadata (JSONB, default '{}')
└── created_at (TIMESTAMPTZ)

public.saved_games (Migration: 20260712000003_add_saved_games_and_system_config.sql)
├── id (UUID, PK)
├── student_id (UUID, references public.student_profiles(id) ON DELETE CASCADE)
├── title (TEXT)
├── pgn (TEXT)
├── lichess_url (TEXT)
└── created_at (TIMESTAMPTZ)
```

---

### Section 3: Existing APIs and Server Actions

| Path / Identifier | Type | Purpose | Current Limitations |
| :--- | :--- | :--- | :--- |
| `src/actions/botTraining.ts` | Server Action | Bot profile retrieval, game start, game completion, puzzle solve. | Delta calculation uses hardcoded $+20/+5/-15$ rather than Elo. Analysis uses heuristic rules rather than engine evaluation. |
| `src/actions/activity.ts` | Server Action | Wrapper around `recordStudentActivity` and activity querying. | Only records generic activity; does not compute or log ratings. |
| `src/actions/puzzles.ts` | Server Action | Manages custom puzzle bank. Includes `saveSpeedRunScoreAction`. | Updates `student_profiles.xp` which does not exist as a column in the database. |
| `src/actions/gameReview.ts` | Server Action | Requests AI Grandmaster review of saved PGNs. | Uses LLM review for saved games; not suitable for real-time rating updates. |
| `src/app/api/puzzles/result/route.ts` | Route Handler (POST, GET) | Saves puzzle attempt and updates tactical rating in `notes`. | Rating stored in JSON string in `notes`, initial rating defaults to 1200 instead of 400. |
| `src/app/api/leaderboard/route.ts` | Route Handler (GET) | Exposes academy leaderboard data. | Calls `getAcademyLeaderboard` which mixes ratings and generates simulated peers. |
| `src/app/api/games/route.ts` | Route Handler (GET, POST) | Saves and retrieves PGN games in `saved_games`. | Only handles manual text PGN saves; no rated game match resolution. |

---

### Section 4: Existing UI Components

| Component File | Location / Route | Functionality | Needed Changes |
| :--- | :--- | :--- | :--- |
| `StudentBotTrainingView.tsx` | `/dashboard/student/bot-training` | 6,355-line training hub with custom board, coach audio, opening explorer, tactical quests. | Integrate new starting position sources (Normal, Opening, Mistake, Weakness), hook up interactive mistake solve flow, display new readiness metrics. |
| `PlayBotBoard.tsx` | Modal in `ChessWorkspace.tsx` | Quick bot modal with piece-named levels ('pawn' to 'gm'). | Replaces score in localStorage with server-side rating updates. |
| `StudentLeaderboardHub.tsx` | `/dashboard/student/leaderboard` | Leaderboard interface with category tabs and division tiers. | Strip out simulation engine; render real database leaderboard across Global, Country, Academy, Coach cohorts and 9 categories. |
| `StudentDashboardClient.tsx` | `/dashboard/student` | Student overview page. Shows Lichess rating or bot tier rating. | Add dedicated **"MY CHESS"** section showing Blitz, Rapid, Classical, Bot, and Puzzle ratings, rank, win/loss/draw record, and rating graph. |
| `CoachStudentDetailsPage` | `/dashboard/coach/students/[profileId]` | Displays puzzle statistics and attended classes. | Add Coach Analytics: Rating trends, mistake review panel, weakness status override controls, training position assignment. |

---

### Section 5: Existing Game Engine

- **Package:** `chess.js` (installed version `^1.4.0`) is the canonical chess logic library.
- **Frontend Board:** `react-chessboard` (installed version `^5.10.0`) wrapped in `ChessboardWrapper.tsx`.
- **Bot Computation:** `src/lib/bot-training/chessBotEngine.ts` uses an internal TypeScript Minimax implementation with Alpha-Beta pruning:
  - Evaluation uses piece values ($P=100, N=320, B=330, R=500, Q=900, K=20000$) and Piece-Square Tables (PST) for positional scoring.
  - Opening book: `OPENING_BOOK` contains UCI move paths with historical master continuations and kid-friendly advice strings.
  - Levels 1–3 are beginner friendly:
    - Level 1 (Pawn): High probability of gentle pawn moves, captures only safe pieces, gives gentle checks, avoids tactical traps.
    - Level 2 (Knight): Depth 1 Alpha-Beta with PST, avoids 1-move blunders.
    - Level 3 (Bishop): Depth 4, focuses on early Italian and tactical traps.

---

### Section 6: Existing Stockfish Configuration

- **Engine Asset:** `/public/stockfish/stockfish.js` is a single bundled WebAssembly/JavaScript file of size 1,579,948 bytes (Stockfish 16).
- **Communication Protocol:** Universal Chess Interface (UCI) via standard Web Worker:
  ```ts
  const worker = new Worker('/stockfish/stockfish.js');
  worker.postMessage('uci');
  worker.postMessage(`position fen ${fen}`);
  worker.postMessage(`go depth ${depth}`);
  ```
- **Parsing Logic:**
  - `score cp (-?\d+)`: Centipawn evaluation.
  - `score mate (-?\d+)`: Forced mate in $N$ moves.
  - `bestmove ([a-h][1-8][a-h][1-8][qrbn]?)`: Best engine move.
  - `pv (...)`: Principal variation continuation line.
- **Execution Context:**
  - Currently runs **only inside client browser web workers**.
  - Server actions (`src/actions/botTraining.ts`) execute in Node.js where `Worker` is not a native global. To avoid server blocking, analysis can either be performed asynchronously or initiated client-side after game termination and submitted with verification.

---

### Section 7: Existing Puzzle Architecture

- **Dataset:** 302 MB zstandard compressed CSV `lichess_db_puzzle.csv.zst` and `scripts/extract-puzzles.mjs`.
- **Persistence:**
  - `public.puzzle_results` records each attempt (`student_id`, `puzzle_id`, `puzzle_rating`, `solved`, `attempts`, `accuracy`, `time_seconds`).
  - `public.personalized_puzzles` stores puzzles dynamically generated when a student makes repeated mistakes in bot games.
- **Rating Calculation:**
  - `src/lib/puzzles/eloRating.ts` exists but is orphaned.
  - `src/app/api/puzzles/result/route.ts` implements standard Elo ($K=32$) on the fly, but modifies the serialized JSON in `student_profiles.notes`. Initial rating defaults to 1200 instead of 400.

---

### Section 8: Existing XP and Reward Architecture

- **Rank Brackets:** `src/lib/gamification/xpService.ts` defines 6 rank titles:
  - Pawn: 0–500 XP
  - Knight: 500–1,500 XP
  - Bishop: 1,500–3,000 XP
  - Rook: 3,000–5,000 XP
  - Queen: 5,000–8,000 XP
  - King: 8,000–15,000+ XP
- **Base XP Rewards:**
  - Puzzle solved: 50 XP
  - Homework completed: 150 XP
  - Class attended: 200 XP
  - Streak bonus: 100 XP
- **Database Status:**
  - There is **no normalized XP ledger or XP column in `users` or `student_profiles`**.
  - No `xp_transactions` table to prevent replay attacks or XP farming.
  - Badges are recorded in `student_bot_badges` (10 hardcoded keys awarded via `badgeEngine.ts`).

---

### Section 9: What Can Be Reused

1. **`student_bot_profiles` & `student_bot_games` Tables:** Solid foundational schema that already links to `public.users(id)`. Can be retained and augmented with starting position source and analysis flags.
2. **`student_bot_mistakes` & `student_weaknesses` Tables:** Existing schema maps student mistakes and weakness themes directly to users.
3. **`personalized_puzzles` Table:** Already supports weakness-based custom puzzle generation.
4. **`student_activities` Table:** Reusable for general dashboard audit trail and activity logging.
5. **Stockfish Engine Asset (`/public/stockfish/stockfish.js`):** Fully functional Stockfish 16 build; no need to install third-party engine packages.
6. **`chess.js` & `react-chessboard`:** Stable, production-tested chessboard UI wrappers.
7. **Opening Repertoire Trees:** Rich data structures in `openingTreeData.ts` and `openingBookExplorer.ts`.
8. **Mathematical Elo Formula:** The calculation logic in `src/lib/puzzles/eloRating.ts` and `src/app/api/puzzles/result/route.ts` can be generalized into a single canonical `ratingService.ts`.

---

### Section 10: What Is Missing

1. **Independent Human Rating Schema:** No storage for Blitz, Rapid, and Classical ratings.
2. **Canonical Elo Rating Engine (`ratingService.ts`):** No central service implementing $E_a = 1 / (1 + 10^{(R_b - R_a)/400})$ and $R_{a,new} = R_a + K \times (S_a - E_a)$ with configurable K-factor, draw handling, and idempotency across all categories.
3. **Starting Rating of 400:** New students currently default to 1200 in puzzles and 800/1280 in various fallback UI strings.
4. **Data-Driven Mistake Detection Engine:** Real centipawn evaluation drops and classification into `MINOR`, `MISTAKE`, `SERIOUS_MISTAKE`, and `BLUNDER`.
5. **Interactive Mistake Solve Flow:** The student UI flow to present the pre-mistake FEN with "Find the best move" and record attempt outcomes.
6. **Weakness Trend & Priority Engine:** Deterministic formula prioritizing most frequent, most severe, and unimproved weaknesses.
7. **Adaptive Bot Starting Position Types:** Support for starting FENs from `NORMAL`, `OPENING`, `MISTAKE`, and `WEAKNESS`.
8. **Bot Level Readiness Unlock Policy:** Multi-factor score combining games played, accuracy, performance, and improvement.
9. **Authentic Multi-Scope Leaderboard:** SQL-backed aggregation for Global, Country, Academy, and Coach cohorts across Daily, Weekly, Monthly, and All-Time periods without fake peer generation.
10. **Normalized Country Field:** A database column for student country to support country leaderboards.
11. **XP Ledger (`xp_transactions`):** Server-validated, idempotent transaction table preventing duplicate XP awards.
12. **Normalized Achievement System (`achievements`, `student_achievements`):** System-wide achievement tracking.
13. **Anti-Abuse & Rating Freeze System:** Abuse flagging for duplicate matches, rating farming, suspicious results, and admin rating freeze/recalculation audit trail.
14. **Coach Analytics & Overrides:** Coach interface to view student mistakes, approve/reject training, override category/severity, and assign mistake positions.
15. **Student Dashboard "MY CHESS" Section:** Visual display of Blitz, Rapid, Classical, Bot, and Puzzle ratings, rank, and graphs.

---

### Section 11: Potential Conflicts & Security Vulnerabilities

1. **RLS Security Holes in Bot Migration `20260825000001_bot_training_rls.sql`:**
   - Policy `"student_can_update_own_bot_profile"` allows authenticated student clients to issue direct `UPDATE` requests on `student_bot_profiles`, letting them forge ratings, win counts, and unlocked levels!
   - Policy `"student_can_insert_own_rating_history"` allows direct client insertion into rating history.
   - **Fix Required:** Restrict write permissions on ratings and rating history to server-side admin client (`service_role`) or Security Definer functions only.
2. **Storage of Tactical Rating & Stats in `notes` Column:**
   - Storing ratings in `student_profiles.notes` as `=== CHESSHUB_STATS ===` prevents relational indexing, makes leaderboard SQL queries impossible without table scans, and risks race conditions.
   - **Fix Required:** Extract all rating values into a dedicated `student_ratings` table and migrate existing values gracefully.
3. **Simulated Peer Data in Production UI:**
   - `leaderboardSimulation.ts` generates pseudo-random peers and fake ticker events. This must be deprecated in favor of real database records.
4. **Foreign Key Inconsistency:**
   - Some tables reference `public.users(id)` while others reference `public.student_profiles(id)`. New tables must consistently reference `public.users(id)` for student identification, with joins to `student_profiles` where academic profile data is needed.
5. **Async Stockfish Performance:**
   - Stockfish analysis cannot run synchronously in the move event loop or block Next.js server actions. Analysis must happen asynchronously post-game.

---

### Section 12: Required Database Changes

A single, clean, additive Supabase migration is required to create:

1. **`public.student_ratings`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE`
   - `rating_category VARCHAR(20) NOT NULL CHECK (rating_category IN ('blitz', 'rapid', 'classical', 'bot', 'puzzle'))`
   - `current_rating INTEGER NOT NULL DEFAULT 400`
   - `highest_rating INTEGER NOT NULL DEFAULT 400`
   - `lowest_rating INTEGER NOT NULL DEFAULT 400`
   - `games_played INTEGER NOT NULL DEFAULT 0`
   - `wins INTEGER NOT NULL DEFAULT 0`
   - `losses INTEGER NOT NULL DEFAULT 0`
   - `draws INTEGER NOT NULL DEFAULT 0`
   - `is_provisional BOOLEAN NOT NULL DEFAULT true`
   - `is_frozen BOOLEAN NOT NULL DEFAULT false`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `UNIQUE(student_id, rating_category)`
2. **`public.rating_history`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE`
   - `rating_category VARCHAR(20) NOT NULL`
   - `game_id UUID`
   - `rating_before INTEGER NOT NULL`
   - `rating_change INTEGER NOT NULL`
   - `rating_after INTEGER NOT NULL`
   - `opponent_id UUID REFERENCES public.users(id) ON DELETE SET NULL`
   - `opponent_rating INTEGER`
   - `result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss', 'draw'))`
   - `reason VARCHAR(50)`
   - `idempotency_key VARCHAR(100) UNIQUE`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
3. **`public.rated_games`**:
   - Stores human-vs-human games: `id`, `white_player_id`, `black_player_id`, `time_control_category` ('blitz', 'rapid', 'classical'), `time_control`, `result`, `termination`, `pgn`, `initial_fen`, `final_fen`, rating changes for both players, `idempotency_key`, `created_at`.
4. **Enhancements to `public.student_bot_games`**:
   - Add columns: `starting_position_type VARCHAR(20) DEFAULT 'NORMAL' CHECK (starting_position_type IN ('NORMAL', 'OPENING', 'MISTAKE', 'WEAKNESS'))`, `opening_name TEXT`, `eco VARCHAR(10)`, `accuracy NUMERIC(5,2)`, `blunders_count INTEGER DEFAULT 0`, `mistakes_count INTEGER DEFAULT 0`.
5. **Enhancements to `public.student_bot_mistakes`**:
   - Align severity with product decision: `severity VARCHAR(20) NOT NULL CHECK (severity IN ('MINOR', 'MISTAKE', 'SERIOUS_MISTAKE', 'BLUNDER'))`.
   - Add mistake solve tracking: `attempt_status VARCHAR(20) DEFAULT 'unattempted' CHECK (attempt_status IN ('unattempted', 'solved', 'failed'))`, `attempts_count INTEGER DEFAULT 0`, `solve_time_seconds INTEGER`, `solved_at TIMESTAMPTZ`.
6. **Enhancements to `public.student_weaknesses`**:
   - Add trend column: `trend VARCHAR(20) NOT NULL DEFAULT 'STABLE' CHECK (trend IN ('IMPROVING', 'STABLE', 'WORSENING'))`.
   - Add coach override fields: `coach_approved BOOLEAN DEFAULT true`, `coach_notes TEXT`, `coach_override_by UUID REFERENCES public.users(id)`.
7. **`public.bot_level_progression`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE`
   - `bot_level INTEGER NOT NULL CHECK (bot_level BETWEEN 1 AND 10)`
   - `games_score NUMERIC(5,2) DEFAULT 0`
   - `performance_score NUMERIC(5,2) DEFAULT 0`
   - `accuracy_score NUMERIC(5,2) DEFAULT 0`
   - `improvement_score NUMERIC(5,2) DEFAULT 0`
   - `readiness_score NUMERIC(5,2) DEFAULT 0`
   - `is_unlocked BOOLEAN NOT NULL DEFAULT false`
   - `coach_unlocked BOOLEAN NOT NULL DEFAULT false`
   - `unlocked_at TIMESTAMPTZ`
   - `UNIQUE(student_id, bot_level)`
8. **`public.xp_transactions`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE`
   - `amount INTEGER NOT NULL CHECK (amount > 0)`
   - `source_type VARCHAR(50) NOT NULL`
   - `source_id VARCHAR(100)`
   - `idempotency_key VARCHAR(150) UNIQUE NOT NULL`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
9. **`public.achievements` & `public.student_achievements`**:
   - Standard achievement definitions and student award audit logs.
10. **`public.rating_abuse_flags`**:
    - Stores flagged games and suspicious activity for admin/coach review.
11. **Add `country` to `public.users` or `public.student_profiles`**:
    - Normalized column to power the Country Leaderboard without string parsing.

---

### Section 13: Required Frontend Changes

1. **Student Dashboard (`StudentDashboardClient.tsx`)**:
   - Add a clean, responsive **"MY CHESS"** section:
     - 5 separate rating cards: **Blitz (400)**, **Rapid (400)**, **Classical (400)**, **Bot (400)**, and **Puzzle (400)**.
     - Metrics: Global Rank, Country Rank, Weekly Rank, Monthly Rank, Win/Loss/Draw summary.
     - Embedded rating progression chart with tab switching between rating categories.
2. **Bot Training Hub (`StudentBotTrainingView.tsx`)**:
   - Mode Selector: Normal, Adaptive, Mistake Training, Opening Training, Challenge Mode.
   - Starting Position Source indicator (NORMAL, OPENING, MISTAKE, WEAKNESS).
   - Readiness progress meter for unlocking Level 4+ (displaying games, performance, accuracy, improvement).
   - Interactive Mistake Practice Modal: "Find the best move" board with attempt validation, hints, timer.
   - Post-game summary modal with progressive disclosure (Rating Change, Accuracy, Blunders, Weaknesses Detected).
3. **Leaderboard Hub (`StudentLeaderboardHub.tsx`)**:
   - Replace simulation engine with server-side query data.
   - Cohort filters: Global, Country, Academy, Coach Students.
   - Time period filters: Daily, Weekly, Monthly, All-Time.
   - Category selector: 9 distinct leaderboards.
   - Privacy-compliant table: Rank, Avatar, Username, Rating/Score, Games (no private contact info).
4. **Coach Dashboard (`CoachStudentDetailsPage`)**:
   - Dedicated "Chess Analytics" tab showing all 5 rating trends.
   - Mistake Review & Weakness panel: View engine evaluations, change mistake severity/category, approve/reject training, assign mistake positions.
   - Coach Leaderboard view: Compare assigned students only.

---

### Section 14: Required Backend Changes

1. **Canonical Rating Calculation Service (`src/lib/rating/ratingService.ts`)**:
   - Expected score formula: $E_a = \frac{1}{1 + 10^{(R_b - R_a)/400}}$.
   - Rating delta formula: $R_{a,new} = R_a + K \times (S_a - E_a)$.
   - Configurable K-factor:
     - $K=40$ for provisional students ($< 30$ games).
     - $K=20$ for standard rated games.
     - $K=10$ for high ratings ($> 2000$).
   - Draw handling ($S_a = 0.5$).
   - Atomic server-side rating update with unique `idempotency_key` per game to guarantee idempotency.
   - Strict separation: Human games only modify human rating category; Bot games only modify Bot rating; Puzzles only modify Puzzle rating.
2. **Engine & Mistake Analysis Service (`src/lib/rating/mistakeService.ts`)**:
   - Real centipawn loss calculation between played move evaluation and best move evaluation.
   - Configurable thresholds:
     - Blunder: eval drop $\ge 300$ centipawns or missed mate.
     - Serious Mistake: eval drop between $150$ and $299$ centipawns.
     - Mistake: eval drop between $80$ and $149$ centipawns.
     - Minor: eval drop between $30$ and $79$ centipawns.
   - Captures before-position FEN, best move, played move, eval drop, and taxonomic category.
3. **Weakness & Adaptive Engine (`src/lib/rating/weaknessEngine.ts`)**:
   - Tracks 19 weakness categories (OPENING, DEVELOPMENT, KING_SAFETY, MATERIAL, TACTICS, CALCULATION, HANGING_PIECES, FORKS, PINS, SKEWERS, DISCOVERED_ATTACKS, DOUBLE_CHECK, CHECKMATE, DEFENSE, ATTACK, PAWN_STRUCTURE, ENDGAME, POSITIONAL_PLAY, TIME_MANAGEMENT).
   - Trend analysis: compares recent 5 occurrences against historical average to mark Improving, Stable, or Worsening.
   - Deterministic training priority score: $Score = (\text{Frequency} \times 0.4) + (\text{Severity} \times 0.4) + (\text{Unimproved} \times 0.2)$.
4. **Bot Progression Engine (`src/lib/rating/progressionEngine.ts`)**:
   - Evaluates multi-factor readiness score:
     $$\text{Readiness} = (GamesScore \times 0.25) + (PerfScore \times 0.25) + (AccScore \times 0.25) + (ImpScore \times 0.25)$$
   - Prevents unlocking Level 4+ by farming weak bots alone.
5. **Leaderboard Aggregation Engine (`src/lib/rating/leaderboardService.ts`)**:
   - Queries `student_ratings`, `rating_history`, `xp_transactions`, and `puzzle_results` grouped by strict server-side UTC time boundaries (Daily, Weekly, Monthly, All-Time).
   - Cohort filters: Global, Country, Academy, Coach assigned.
6. **Anti-Abuse Service (`src/lib/rating/antiAbuseService.ts`)**:
   - Detects repeated games between identical users in short intervals.
   - Detects rating farming and impossible accuracy spikes.
   - Flags suspicious records for admin/coach review without automatic bans.
   - Allows admin rating freeze, unfreeze, and audit-logged manual correction.

---

### Phase 1 Audit Conclusion & Next Steps

The existing system provides strong UI building blocks and an initial bot implementation, but requires:
1. Complete separation of Human (Blitz/Rapid/Classical), Bot, and Puzzle ratings.
2. Removal of simulated mock data from leaderboards.
3. Elimination of insecure client-side RLS update policies.
4. Normalization of ratings and XP away from the overloaded `notes` column.
5. Implementation of standard Elo, real centipawn mistake detection, and multi-factor bot level unlocking.

**STOP POINT:** As required by the master prompt instructions, execution has halted following this comprehensive audit. We await approval before proceeding to Phase 2 (Architecture Proposal) and Phase 3 (Database Schema Proposal).
