# ChessHub Academy: Master Rating, Leaderboard & Adaptive Bot Architecture
## System Architecture Blueprint (Phase 2 Design)

**Document:** `docs/RATING_LEADERBOARD_ARCHITECTURE.md`  
**Status:** ARCHITECTURE ONLY — APPROVED SPECIFICATION (NO IMPLEMENTATION)  
**Date:** September 27, 2026  
**Target:** ChessHub Academy Production Platform  

---

### Executive Architectural Blueprint

This document specifies the canonical architectural design for integrating a complete **Rating System**, **Multi-level Adaptive Bot Engine**, **Mistake & Weakness Analytics Loop**, **Zero-Simulation Leaderboard System**, and **Server-Authoritative Anti-Abuse Foundation** into ChessHub Academy.

The design strictly satisfies every non-negotiable product constraint:
- **Zero UI Disruption:** No redesign of unrelated student, coach, or classroom UI.
- **Classroom Isolation:** Zero modification to classroom realtime channels, WebRTC, Zoom, or Google Meet.
- **Strict Rating Segregation:** Human ratings (Blitz, Rapid, Classical), Bot rating, and Puzzle rating are stored in independent rating profiles and never cross-pollinated. Initial rating for all categories is **400**.
- **Server Authority & Security:** All ratings, rating deltas, XP, level unlocks, and mistake classifications are generated exclusively on the server. Client-side RLS write permissions on rating tables are completely revoked.
- **Zero Fake Data:** Elimination of `leaderboardSimulation.ts` and all simulated peer generation. Leaderboards reflect 100% genuine database records.
- **No AI / LLM Dependency in V1:** Adaptive training, mistake classification, and weakness clustering operate entirely on chess rules, centipawn evaluations, and deterministic algorithms.

```
                      ┌──────────────────────────────────────────────┐
                      │              STUDENT DASHBOARD               │
                      │  "MY CHESS" Panel: Blitz / Rapid / Classical  │
                      │           Bot Rating / Puzzle Rating         │
                      └──────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
      ┌─────────────────────────────────┐        ┌──────────────────────────────────┐
      │     HUMAN RATED MATCH SYSTEM    │        │       BOT TRAINING SYSTEM        │
      │  - Blitz / Rapid / Classical    │        │  - Levels 1–3: Minimax PST (Easy)│
      │  - Server-side Clock & Resign   │        │  - Levels 4–10: Adaptive Engine  │
      │  - Anti-Abuse & Match History   │        │  - Modes: Normal/Mistake/Opening │
      └────────────────┬────────────────┘        └─────────────────┬────────────────┘
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │ (Game Completed Event)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │        CANONICAL RATING ENGINE (ELO)         │
                      │  - Expected Score: Ea = 1 / (1 + 10^ΔR/400)  │
                      │  - Ra_new = Ra + K * (Sa - Ea)               │
                      │  - Configurable K-Factor (K=40/20/10)        │
                      │  - Server-side Idempotency & Audit Trail     │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          POST-GAME ANALYSIS PIPELINE         │
                      │  - Asynchronous Stockfish 16 Centipawn Eval │
                      │  - Mistake Detection: MINOR/MISTAKE/         │
                      │    SERIOUS_MISTAKE/BLUNDER                   │
                      │  - Pre-mistake FEN Extraction & Solve Flow   │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │           WEAKNESS & ADAPTIVE ENGINE         │
                      │  - 19 Canonical Taxonomic Categories         │
                      │  - Trend Calculation: Improving/Stable/Worse │
                      │  - Deterministic Training Priority Score     │
                      │  - Multi-Factor Bot Level Readiness Score    │
                      │  - Coach Review, Assignment & Overrides      │
                      └──────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
      ┌─────────────────────────────────┐        ┌──────────────────────────────────┐
      │      LEADERBOARD SYSTEM         │        │       XP & REWARD ENGINE         │
      │  - Scopes: Global/Country/      │        │  - Strict Ledger (xp_transactions│
      │    Academy/Coach-assigned       │        │  - Anti-farming rate limits      │
      │  - Periods: Day/Week/Month/All  │        │  - Milestone Achievements        │
      │  - 9 Discrete Metric Categories │        │  - Badge Engine                  │
      └─────────────────────────────────┘        └──────────────────────────────────┘
```

---

### Comprehensive Answers to the 30 Architectural Questions

#### 1. Which existing tables should be reused?
The following tables are preserved and reused:
- `public.users`: Core identity (auth linkage, roles, username, email, phone, avatar).
- `public.student_profiles`: Academic profile metadata (age, parent info, enrollment date).
- `public.coach_profiles`: Coach bio, credentials, title, languages.
- `public.coach_student_assignments`: Active mappings between coaches and assigned students.
- `public.student_bot_profiles`: Reused for bot-specific stats (`highest_rating`, `win_streak`, `highest_win_streak`, `puzzles_solved`).
- `public.student_bot_games`: Reused for logging bot games (with augmented schema).
- `public.student_bot_rating_history`: Reused as the bot-specific rating audit log.
- `public.student_bot_mistakes`: Reused as the mistake position repository (with augmented schema).
- `public.student_weaknesses`: Reused for tracking taxonomy frequencies (with augmented schema).
- `public.personalized_puzzles`: Reused for mistake-generated puzzles.
- `public.student_bot_badges`: Reused for bot training badges.
- `public.puzzle_results`: Reused for tactical puzzle attempt history.
- `public.student_activities`: Reused for dashboard timeline audit logging.
- `public.classes`, `public.class_students`, `public.classroom_sessions`: Kept 100% untouched.

#### 2. Which existing tables need modification?
No existing columns will be dropped or renamed. Additive columns only:
1. `public.users`:
   - `ADD COLUMN IF NOT EXISTS country VARCHAR(100)`: Normalized ISO country name/code for country leaderboard without string parsing.
2. `public.student_bot_games`:
   - `ADD COLUMN IF NOT EXISTS starting_position_type VARCHAR(20) DEFAULT 'NORMAL' CHECK (starting_position_type IN ('NORMAL', 'OPENING', 'MISTAKE', 'WEAKNESS'))`
   - `ADD COLUMN IF NOT EXISTS opening_name TEXT`
   - `ADD COLUMN IF NOT EXISTS eco VARCHAR(10)`
   - `ADD COLUMN IF NOT EXISTS accuracy NUMERIC(5,2)`
   - `ADD COLUMN IF NOT EXISTS blunders_count INTEGER DEFAULT 0`
   - `ADD COLUMN IF NOT EXISTS mistakes_count INTEGER DEFAULT 0`
3. `public.student_bot_mistakes`:
   - `ADD COLUMN IF NOT EXISTS attempt_status VARCHAR(20) DEFAULT 'unattempted' CHECK (attempt_status IN ('unattempted', 'solved', 'failed'))`
   - `ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0`
   - `ADD COLUMN IF NOT EXISTS solve_time_seconds INTEGER`
   - `ADD COLUMN IF NOT EXISTS solved_at TIMESTAMPTZ`
   - `ADD COLUMN IF NOT EXISTS coach_assigned BOOLEAN DEFAULT false`
   - `ADD COLUMN IF NOT EXISTS coach_notes TEXT`
4. `public.student_weaknesses`:
   - `ADD COLUMN IF NOT EXISTS trend VARCHAR(20) DEFAULT 'STABLE' CHECK (trend IN ('IMPROVING', 'STABLE', 'WORSENING'))`
   - `ADD COLUMN IF NOT EXISTS coach_approved BOOLEAN DEFAULT true`
   - `ADD COLUMN IF NOT EXISTS coach_override_severity VARCHAR(10)`
   - `ADD COLUMN IF NOT EXISTS coach_notes TEXT`
   - `ADD COLUMN IF NOT EXISTS coach_override_by UUID REFERENCES public.users(id)`

#### 3. Which new tables are actually necessary?
To support the locked requirements without hacky JSON storage, exactly **7 new tables** are required:
1. `public.student_ratings`: Per-student, per-category normalized rating state (Blitz, Rapid, Classical, Bot, Puzzle).
2. `public.rating_history`: Canonical, immutable rating audit log for all human and puzzle rating changes.
3. `public.rated_games`: Human-vs-human rated match records across time control categories.
4. `public.bot_level_progression`: Multi-factor readiness scores and unlock state for Bot Levels 1–10.
5. `public.xp_transactions`: Server-validated ledger tracking all XP earned with idempotency keys.
6. `public.achievements` & `public.student_achievements`: Canonical definitions and user unlock records.
7. `public.rating_abuse_flags`: Anti-abuse incident flags for admin/coach review.

#### 4. How should human ratings be stored?
Human ratings will be stored in `public.student_ratings` keyed by `(student_id, rating_category)`. Each record contains `current_rating` (default 400), `highest_rating` (400), `lowest_rating` (400), `games_played` (0), `wins` (0), `losses` (0), `draws` (0), `is_provisional` (true until 30 games), `is_frozen` (false), and `updated_at`.

#### 5. How should Blitz/Rapid/Classical be separated?
Via the `rating_category` enum check: `'blitz'`, `'rapid'`, `'classical'`. Time controls map deterministically to these categories:
- **Blitz:** Estimated duration $< 10$ minutes (e.g. 3+0, 3+2, 5+0, 5+3).
- **Rapid:** Estimated duration $\ge 10$ minutes and $< 30$ minutes (e.g. 10+0, 10+5, 15+10).
- **Classical:** Estimated duration $\ge 30$ minutes (e.g. 30+0, 45+15, 60+30).  
A game's result modifies **only** the rating category corresponding to its time control.

#### 6. How should Bot Rating be stored?
Stored as `rating_category = 'bot'` in `public.student_ratings`, and mirrored in `public.student_bot_profiles.rating` for backwards compatibility. Bot games **never** update human Blitz, Rapid, or Classical ratings.

#### 7. How should Puzzle Rating be stored?
Stored as `rating_category = 'puzzle'` in `public.student_ratings`. Solving or failing tactical puzzles updates **only** this category. Puzzles start at rating **400** (deprecating the legacy 1200 default in `student_profiles.notes`).

#### 8. How should rating history be stored?
In `public.rating_history`. Every rating change creates an immutable event row:
`id`, `student_id`, `rating_category`, `game_id`, `rating_before`, `rating_change`, `rating_after`, `opponent_id`, `opponent_rating`, `result` ('win'|'loss'|'draw'), `reason`, `idempotency_key`, `created_at`.  
This enables historical rating graphs for every category independently.

#### 9. How should rated games be stored?
In `public.rated_games`. Stores `id`, `white_player_id`, `black_player_id`, `time_control_category`, `time_control`, `result`, `termination`, `pgn`, `initial_fen`, `final_fen`, `white_rating_before`, `white_rating_change`, `white_rating_after`, `black_rating_before`, `black_rating_change`, `black_rating_after`, `is_processed`, `idempotency_key`, `created_at`.

#### 10. How should Bot games be stored?
In the existing `public.student_bot_games` table, augmented with `starting_position_type` ('NORMAL'|'OPENING'|'MISTAKE'|'WEAKNESS'), `opening_name`, `eco`, `accuracy`, and mistake counts. A stable UUID generated at game start identifies the record.

#### 11. How should duplicate rating updates be prevented?
By enforcing database-level unique constraints on `idempotency_key` across `public.rating_history`, `public.rated_games`, and `public.xp_transactions`.  
The server constructs `idempotency_key = "rating:{gameId}:{studentId}"`. If a client replays or double-submits a game completion request, the second call detects the completed status and returns the cached result without modifying rating.

#### 12. How should Elo calculation be centralized?
In a single canonical backend module: `src/lib/rating/ratingService.ts`.  
- Expected score: $E_a = \frac{1}{1 + 10^{(R_b - R_a)/400}}$
- Rating delta: $\Delta R = \text{round}(K \times (S_a - E_a))$
- New rating: $R_{new} = \max(100, R_a + \Delta R)$ (Floor at 100, starting at 400).
- Configurable K-Factor:
  - $K = 40$ for provisional players ($< 30$ games).
  - $K = 20$ for established players ($< 2400$).
  - $K = 10$ for master players ($\ge 2400$).
No other file in the codebase is permitted to calculate rating deltas directly.

#### 13. How should bot rating be calculated?
Using the canonical Elo formula against the designated bot rating. Each of the 10 bot levels has an approximate calibrated rating:
- Level 1: 400
- Level 2: 600
- Level 3: 800
- Level 4: 1000
- Level 5: 1200
- Level 6: 1400
- Level 7: 1600
- Level 8: 1800
- Level 9: 2000
- Level 10: 2200  
The student's `bot` rating updates based on standard Elo against this bot rating.

#### 14. How should level progression be stored?
In `public.bot_level_progression`. Each row represents `(student_id, bot_level)` with component scores: `games_score`, `performance_score`, `accuracy_score`, `improvement_score`, combined into `readiness_score`, alongside `is_unlocked` and `coach_unlocked`.

#### 15. How should level unlock readiness be calculated?
Using a multi-factor deterministic formula:
$$\text{Readiness Score} = (S_{\text{games}} \times 0.20) + (S_{\text{perf}} \times 0.30) + (S_{\text{acc}} \times 0.30) + (S_{\text{imp}} \times 0.20)$$
Where:
- $S_{\text{games}} = \min(100, \frac{\text{games\_at\_current\_level}}{5} \times 100)$ (Requires at least 5 games).
- $S_{\text{perf}} = \text{win\_rate} \times 100$ against current level bots.
- $S_{\text{acc}} = \text{average accuracy percentage}$ across the last 5 games.
- $S_{\text{imp}} = \text{accuracy trend}$ (positive change between first half and second half of matches).  
Unlock threshold: $\text{Readiness Score} \ge 75$ unlocks the next level. Farming weak bots (e.g. Level 1) yields 0 progression points towards Level 5.

#### 16. How should mistake events be stored?
In `public.student_bot_mistakes`. Every mistake records: `student_id`, `game_id`, `move_number`, `fen_before`, `fen_after`, `played_move`, `best_move`, `eval_before`, `eval_after`, `eval_drop`, `severity` ('MINOR'|'MISTAKE'|'SERIOUS_MISTAKE'|'BLUNDER'), `theme`, `explanation`, `better_idea`, `attempt_status` ('unattempted'|'solved'|'failed').

#### 17. How should game analysis be stored?
Stored as JSONB in `student_bot_games.analysis_summary` and normalized in `student_bot_mistakes`. The summary includes overall accuracy (0–100%), count of blunders, mistakes, inaccuracies, missed opportunities, opening name, ECO code, and key moments.

#### 18. How should weaknesses be represented?
In `public.student_weaknesses` using a standard 19-category taxonomy:
`OPENING`, `DEVELOPMENT`, `KING_SAFETY`, `MATERIAL`, `TACTICS`, `CALCULATION`, `HANGING_PIECES`, `FORKS`, `PINS`, `SKEWERS`, `DISCOVERED_ATTACKS`, `DOUBLE_CHECK`, `CHECKMATE`, `DEFENSE`, `ATTACK`, `PAWN_STRUCTURE`, `ENDGAME`, `POSITIONAL_PLAY`, `TIME_MANAGEMENT`.  
Each record contains `occurrences`, `recent_occurrences`, `severity`, `confidence`, `trend`, and `status` ('NEEDS_PRACTICE'|'IMPROVING'|'STRONG'|'MASTERED').

#### 19. How should repeated weaknesses be calculated?
When a game completes, detected mistakes are mapped to categories. If a student commits $\ge 3$ mistakes in the same category within their last 10 games:
- Marked as active repeated weakness.
- Trend is calculated: comparing the mistake rate in the last 5 games vs the prior 5 games:
  - If decreasing by $\ge 20\%$: `IMPROVING`.
  - If increasing by $\ge 20\%$: `WORSENING`.
  - Otherwise: `STABLE`.

#### 20. How should training recommendations be stored?
Generated deterministically and stored in `student_weaknesses` metadata or served dynamically via `getStudentRecommendations(studentId)`. The recommendation links:
1. Targeted bot starting positions from that specific weakness.
2. Curated tactical puzzle sets matching the theme from `weaknessPuzzleBank.ts`.
3. Notification to the assigned coach.

#### 21. How should coach overrides work?
A coach can view student mistakes in `/dashboard/coach/students/[profileId]`. Through authorized server actions (`updateWeaknessOverrideAction`), the coach can:
- Change mistake severity (e.g. BLUNDER $\to$ MISTAKE).
- Re-categorize the weakness.
- Approve or reject automated training recommendations.
- Manually assign a mistake position to the student's training queue.
Coach overrides set `coach_override_by = coach_id` and are permanently respected by the recommendation engine.

#### 22. How should opening performance be stored?
Tracked per student in `student_bot_games` with `opening_name` and `eco`. Aggregated on the fly or cached in coach analytics: games played, win rate, average accuracy, and recurring mistake move numbers for each opening played.

#### 23. How should leaderboard queries work?
Executed directly against indexed database tables (`student_ratings`, `rating_history`, `puzzle_results`, `xp_transactions`) using PostgreSQL window functions:
```sql
SELECT 
  u.id, u.username, u.avatar_url, sr.current_rating AS metric_value,
  DENSE_RANK() OVER (ORDER BY sr.current_rating DESC) as rank
FROM public.student_ratings sr
JOIN public.users u ON u.id = sr.student_id
WHERE sr.rating_category = 'rapid' AND u.is_active = true
LIMIT 50;
```
Zero client-side simulation.

#### 24. How should daily/weekly/monthly/all-time periods work?
Boundaries are calculated strictly using **database UTC timestamps**:
- **Daily:** `created_at >= date_trunc('day', timezone('utc', now()))`
- **Weekly:** `created_at >= date_trunc('week', timezone('utc', now()))` (Monday 00:00 UTC)
- **Monthly:** `created_at >= date_trunc('month', timezone('utc', now()))` (1st of month 00:00 UTC)
- **All-Time:** No time filter.
Eliminates client-side timezone drift.

#### 25. How should country leaderboard work?
Filters by `u.country = :selectedCountry` where country is stored in the normalized `users.country` column. If a student's country is `null` or unconfigured, they are included in Global and Academy leaderboards, but excluded from Country leaderboards. No IP inference.

#### 26. How should coach leaderboard isolation work?
When a coach views their student leaderboard, the query joins `coach_student_assignments`:
```sql
WHERE sr.student_id IN (
  SELECT sp.user_id 
  FROM public.coach_student_assignments csa
  JOIN public.student_profiles sp ON sp.id = csa.student_id
  WHERE csa.coach_id = auth.uid() AND csa.archived_at IS NULL
)
```
Coaches can never inspect unassigned students' private rankings.

#### 27. How should XP transactions work?
In `public.xp_transactions`. Every XP award is recorded with `amount`, `source_type` ('bot_game', 'puzzle', 'homework', 'achievement', 'streak'), `source_id`, and `idempotency_key`. The student's total XP is either the sum of transactions or an atomically updated cache column on `student_ratings`. Anti-farming rules: maximum 500 XP per calendar day from bot training.

#### 28. How should achievements work?
Canonical achievement keys (`first_win`, `win_10_games`, `bot_level_3`, `puzzle_100_solved`, etc.) stored in `public.achievements`. When game/puzzle events complete, server-side criteria are evaluated in `achievementService.ts`. Unlocked achievements insert into `public.student_achievements` and award an atomic XP transaction.

#### 29. How should suspicious activity be stored?
In `public.rating_abuse_flags`. Contains `id`, `student_id`, `flag_reason`, `severity`, `status` ('pending'|'reviewed'|'dismissed'|'penalized'), `reviewed_by`, `reviewed_at`, `details` JSONB. Flag reasons: `REPEATED_OPPONENT_FARMING`, `RAPID_RATING_SPIKE`, `IMPOSSIBLE_ACCURACY_STREAK`, `DUPLICATE_GAME_SUBMISSION`.

#### 30. How should rating freezes/corrections work?
Admins can set `is_frozen = true` in `student_ratings`. When frozen, any game completed by that user will save the game record but skip rating delta calculation. Admins can manually correct a rating by issuing a manual `rating_history` correction event with `reason = 'admin_correction'`, creating a complete audit trail.

---

### Security Architecture & RLS Fix Strategy

#### Addressing the Critical Issue in `20260825000001_bot_training_rls.sql`
The Phase 1 audit revealed that existing policies allow students to directly alter their own rating via Supabase client `UPDATE`:
```sql
-- VULNERABLE EXISTING POLICY:
create policy "student_can_update_own_bot_profile"
  on public.student_bot_profiles for update
  using (student_id = auth.uid());
```

#### New Security Model
1. **Revoke Client Update Permissions:**
   - Drop `student_can_update_own_bot_profile`.
   - Drop `student_can_insert_own_rating_history`.
   - Drop `student_can_upsert_own_weaknesses`.
2. **Server Authority (Service Role Only):**
   - Rating updates, rating history inserts, XP awards, and level unlocks must be executed **exclusively** via Server Actions using `createSupabaseAdmin()` (`service_role` key) or PostgreSQL `SECURITY DEFINER` stored procedures.
3. **Student Read Permissions:**
   - Students can `SELECT` only their own ratings, games, weaknesses, and mistakes:
     ```sql
     CREATE POLICY "student_read_own_ratings" ON public.student_ratings
       FOR SELECT TO authenticated USING (student_id = auth.uid());
     ```
4. **Public Leaderboard Views:**
   - Exposes only sanitized fields: `username`, `avatar_url`, `country`, `rank`, `current_rating`. Strips email, phone, parent contact, and coach notes.

---

### Engine Architecture: Existing Minimax vs. Stockfish

| Engine Job | Minimax Engine (`chessBotEngine.ts`) | Stockfish 16 (`stockfish.js`) | Recommended Selection & Rationale |
| :--- | :--- | :--- | :--- |
| **Bot Levels 1–3 (Novice)** | **Superior for Beginners:** Configured with Piece-Square Tables and randomized pawn moves. Never plays crushing moves. | Overpowered even at `Skill Level 0`, feels mechanical and alienating for children. | **Use Minimax Engine:** Preserves kid-friendly, confidence-building gameplay. |
| **Bot Levels 4–10 (Club to Master)** | Limited depth, cannot emulate deep positional strategy. | **Exceptional:** Scalable via `Skill Level 0–20` and `Depth 1–18`. | **Use Stockfish Worker:** Provides authentic club, master, and engine strength. |
| **Post-Game Mistake Analysis** | Cannot calculate centipawn evaluation drops. | **Industry Standard:** UCI `score cp` accurately measures evaluation drop and blunders. | **Use Stockfish Engine:** Mandatory for data-driven mistake classification. |
| **Realtime Board Latency** | Instant local response ($< 10$ ms). | Instant local worker response ($< 50$ ms). | Neither affects classroom realtime board (separate channels). |

---

### Architecture Decision Map

| Architecture Document | Primary Content |
| :--- | :--- |
| [docs/RATING_DATABASE_DESIGN.md](file:///d:/newchesshub/docs/RATING_DATABASE_DESIGN.md) | Complete SQL schemas, foreign keys, indexes, RLS policies, and data migration plan. |
| [docs/BOT_TRAINING_ARCHITECTURE.md](file:///d:/newchesshub/docs/BOT_TRAINING_ARCHITECTURE.md) | 10-level engine specs, Minimax/Stockfish split, starting position modes, readiness formula. |
| [docs/ADAPTIVE_WEAKNESS_ARCHITECTURE.md](file:///d:/newchesshub/docs/ADAPTIVE_WEAKNESS_ARCHITECTURE.md) | Centipawn mistake thresholds, 19 weakness categories, trend formulas, coach overrides, solve flow. |
| [docs/LEADERBOARD_ARCHITECTURE.md](file:///d:/newchesshub/docs/LEADERBOARD_ARCHITECTURE.md) | 4 cohorts, 4 periods, 9 categories, window queries, privacy, anti-cheat, zero fake data. |
| [docs/RATING_SECURITY_MODEL.md](file:///d:/newchesshub/docs/RATING_SECURITY_MODEL.md) | RLS remediation, server authority, anti-abuse detection, rating freeze, audit trail. |
| [docs/RATING_ARCHITECTURE_DECISIONS.md](file:///d:/newchesshub/docs/RATING_ARCHITECTURE_DECISIONS.md) | Formal ADRs (Architecture Decision Records) detailing technical trade-offs and rationale. |
