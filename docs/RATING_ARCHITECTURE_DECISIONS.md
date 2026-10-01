# ChessHub Academy: Architecture Decision Records (ADRs)
## Rating, Leaderboard & Adaptive Bot Training Architecture

**Document:** `docs/RATING_ARCHITECTURE_DECISIONS.md`  
**Status:** ARCHITECTURE DESIGN ONLY  
**Date:** September 27, 2026  
**Target:** ChessHub Academy Architectural Record  

---

### ADR-001: Absolute Segregation of Rating Categories

- **Context:** Previous prototype implementations mixed bot training scores, puzzle counts, and Lichess ratings into a single blended metric on the student dashboard.
- **Decision:** Establish 5 strictly isolated rating categories:
  1. Blitz Rating (Human)
  2. Rapid Rating (Human)
  3. Classical Rating (Human)
  4. Bot Rating (Engine)
  5. Puzzle Rating (Tactical)
  All categories start at **400** and never cross-pollinate.
- **Reasoning:** Human ratings reflect competitive matchmaking against peers. Mixing engine games or tactical puzzles with human Elo corrupts statistical validity, produces skewed matchmaking, and confuses coaches evaluating authentic tournament readiness.

---

### ADR-002: Canonical Standard Elo Formula with Tiered K-Factor

- **Context:** Bot training previously applied flat $+20/+5/-15$ rating deltas, while puzzle solving calculated Elo on the fly and wrote to unstructured JSON strings.
- **Decision:** Implement a single canonical service (`src/lib/rating/ratingService.ts`) applying standard FIDE/USCF Elo:
  $$E_a = \frac{1}{1 + 10^{(R_b - R_a)/400}}, \quad R_{a,new} = R_a + \text{round}(K \times (S_a - E_a))$$
  Tiered K-Factor:
  - $K = 40$ for provisional students ($< 30$ games).
  - $K = 20$ for established students ($< 2400$).
  - $K = 10$ for elite students ($\ge 2400$).
- **Reasoning:** Standard Elo is proven, mathematically sound, and universally understood by parents, coaches, and students. A high initial K-factor enables rapid convergence to true skill level, while a lower K-factor provides stability for experienced players.

---

### ADR-003: Multi-Factor Readiness Score for Bot Progression

- **Context:** The legacy bot system unlocked levels purely by accumulating `training_points` (+400 pts per tier), enabling students to unlock Level 10 simply by repeatedly winning against Level 1.
- **Decision:** Require a composite readiness score ($\ge 75$ threshold) evaluated across:
  $$\text{Readiness} = (GamesScore \times 0.20) + (PerfScore \times 0.30) + (AccScore \times 0.30) + (ImpScore \times 0.20)$$
  evaluated strictly on games played at the student's highest unlocked level.
- **Reasoning:** Prevents gaming the system via low-level bot farming. Guarantees that advancing to higher levels reflects verified chess competence, tactical accuracy, and demonstrable progress.

---

### ADR-004: Engine Role Allocation: Minimax vs. Stockfish 16

- **Context:** ChessHub has an internal TypeScript Minimax engine (`chessBotEngine.ts`) and a Stockfish 16 WebAssembly engine (`/public/stockfish/stockfish.js`).
- **Decision:**
  - Minimax powers **Levels 1–3 (Pawn, Knight, Bishop)**.
  - Stockfish powers **Levels 4–10 (Rook to Super Engine)** and **Post-Game Centipawn Mistake Analysis**.
- **Reasoning:** Stockfish even at Skill Level 0 plays unnaturally stiff moves that alienate beginners and young children. The Minimax engine provides gentle, encouraging play with Piece-Square Tables and child-friendly blunder profiles. For Level 4+ and post-game centipawn loss calculation, Stockfish 16 provides industry-grade precision.

---

### ADR-005: Complete Elimination of Client-Side Simulated Leaderboards

- **Context:** `src/lib/students/leaderboardSimulation.ts` generated synthetic student peers, fake match events, and simulated rankings.
- **Decision:** Completely eliminate `leaderboardSimulation.ts`. Replace with authentic SQL queries using PostgreSQL window functions (`DENSE_RANK()`) over `public.student_ratings`.
- **Reasoning:** Adheres strictly to the locked **ZERO FAKE DATA** directive. Synthetic data undermines trust, misleads coaches, and creates legal/ethical issues regarding perceived student performance.

---

### ADR-006: Server-Authoritative Rating Updates & RLS Hardening

- **Context:** `20260825000001_bot_training_rls.sql` permitted client-side `UPDATE` on `student_bot_profiles`, allowing users to forge ratings from the browser console.
- **Decision:** Revoke all direct client `UPDATE` and `INSERT` permissions on rating and progression tables. All rating mutations must execute via Server Actions using the admin client (`service_role`).
- **Reasoning:** Client-side rating updates represent a catastrophic security failure. Server authority ensures that only verified, completed game move sequences calculate rating adjustments.

---

### ADR-007: Normalized Country Column on `users` Table

- **Context:** Student country was previously serialized as a JSON property inside `student_profiles.notes`.
- **Decision:** Add a normalized column `country VARCHAR(100)` to `public.users` with a B-tree index.
- **Reasoning:** Full table scans and JSON deserialization over `notes` are unindexable and prohibitively slow for Country Leaderboard queries. A normalized column enables $O(\log n)$ indexed lookups.

---

### ADR-008: Interactive Pre-Mistake Solve Flow

- **Context:** Previous game reviews showed static text explanations of mistakes after the match.
- **Decision:** When an important mistake (`SERIOUS_MISTAKE` or `BLUNDER`) occurs:
  1. Capture the exact FEN position before the mistake.
  2. Prompt the student with "Find the best move" on an interactive board with hidden solutions.
  3. Allow up to 3 attempts with progressive hints.
  4. Enable immediate transition to "Play Out vs Bot".
- **Reasoning:** Active recall produces vastly superior tactical learning outcomes compared to passive reading. Practicing the winning or defensive technique against a bot solidifies the learning.

---

### ADR-009: Strict Idempotency Key Architecture for Rating & XP Transactions

- **Context:** Network retries or rapid double-clicking on game completion could trigger duplicate rating adjustments and XP inflation.
- **Decision:** Enforce database-level unique constraints on `idempotency_key` (format: `"rating:{gameId}:{studentId}"` and `"xp:{sourceType}:{sourceId}"`).
- **Reasoning:** Guarantees that network retries or malicious replays are idempotent: the second attempt returns the cached result without modifying rating or XP balances.

---

### ADR-010: Asynchronous Post-Game Analysis Pipeline

- **Context:** Running heavy chess engine analysis synchronously inside the chess move handler introduces severe UI stutter and could disrupt live classroom boards.
- **Decision:** Move execution and game completion are decoupled from deep engine analysis. The game concludes immediately, records the result and rating change, and queues Stockfish evaluation asynchronously.
- **Reasoning:** Preserves sub-50ms chessboard responsiveness and guarantees that classroom realtime WebRTC and WebSocket channels remain 100% latency-free.
