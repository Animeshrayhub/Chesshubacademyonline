# ChessHub Academy: Mistake Detection & Adaptive Weakness Architecture
## Phase 2 Analytics Pipeline, Weakness Taxonomy & Coach Control Model

**Document:** `docs/ADAPTIVE_WEAKNESS_ARCHITECTURE.md`  
**Status:** ARCHITECTURE DESIGN ONLY  
**Date:** September 27, 2026  
**Target:** ChessHub Academy Adaptive Personal Training Engine  

---

### 1. Data-Driven Mistake Detection Engine

Instead of relying solely on shallow heuristic rules, mistake detection is grounded in **asynchronous Stockfish 16 centipawn evaluation drops** complemented by chess rule signals.

#### 1.1. Multi-Signal Evaluation
For every move played by the student:
1. **Centipawn Evaluation Drop ($\Delta \text{cp}$):**
   $$\Delta \text{cp} = \text{eval}(\text{best\_move}) - \text{eval}(\text{played\_move})$$
   (Adjusted for perspective: positive value indicates drop in student's advantage).
2. **Material Delta:** Difference in material balance immediately following the move.
3. **Tactical Opportunity Loss:** Best move was a forcing tactic (fork, pin, checkmate in $N$) missed by the student.
4. **King Safety Degradation:** Exposure of student king to checks or loss of castling rights.
5. **Repeated Pattern Flag:** Same mistake theme committed in previous games.

#### 1.2. Centipawn Severity Thresholds

| Severity Tier | Centipawn Drop ($\Delta \text{cp}$) | Mate Signals | Operational Description |
| :--- | :--- | :--- | :--- |
| **`MINOR`** (Inaccuracy) | $30 \le \Delta \text{cp} < 80$ | — | Suboptimal move; allows opponent slight counterplay or concedes a tempo. |
| **`MISTAKE`** | $80 \le \Delta \text{cp} < 150$ | — | Noticeable error; loses a pawn or strategic square without compensation. |
| **`SERIOUS_MISTAKE`** | $150 \le \Delta \text{cp} < 300$ | — | Concedes minor piece or major positional deterioration. |
| **`BLUNDER`** | $\Delta \text{cp} \ge 300$ | Forced mate allowed or missed mate-in-1/2 | Decisive error; hangs a rook/queen, misses mate-in-1, or converts a winning position to lost. |

*Configurable Safeguard:* If evaluation before the move was already $\le -8.00$ (lost position), an evaluation drop is classified as `MISTAKE` rather than `BLUNDER` to avoid penalizing hopeless defenses disproportionately.

---

### 2. Actual Game Mistake Solve Flow

When an important mistake (`SERIOUS_MISTAKE` or `BLUNDER`) is detected:

```
  [STEP 1: PRE-MISTAKE CAPTURE]
  Store the exact FEN position immediately BEFORE the student's mistake.
                           │
                           ▼
  [STEP 2: RECORD IN DATABASE]
  Insert into public.student_bot_mistakes:
  - fen_before, fen_after, move_number
  - played_move, best_move
  - evaluation_before, evaluation_after, evaluation_drop
  - theme (weakness category), severity
  - attempt_status = 'unattempted'
                           │
                           ▼
  [STEP 3: INTERACTIVE ATTEMPT PROMPT]
  In Student Dashboard / Mistake Practice:
  Student sees: "Find the best move."
  - Shows board at fen_before with student's pieces.
  - Solution and engine evaluation are HIDDEN.
                           │
                           ▼
  [STEP 4: STUDENT ATTEMPTS POSITION]
  Student plays a move on the interactive board:
  - If played move == best_move: Marked SUCCESS.
  - If played move != best_move: Allowed up to 3 attempts.
  - Hint button: Highlights piece to move (Attempt 2), highlights target square (Attempt 3).
                           │
                           ▼
  [STEP 5: RESULT LOGGING]
  Update public.student_bot_mistakes:
  - attempt_status = 'solved' | 'failed'
  - attempts_count, solve_time_seconds, solved_at
  - Award +15 XP for solving without hints.
                           │
                           ▼
  [STEP 6: HANDOFF TO BOT TRAINING]
  Position is tagged as available for "Mistake Training" bot matches.
  Student can click "Play Out vs Bot" to practice converting the position from that exact FEN.
```

---

### 3. Canonical Weakness Taxonomy (19 Standard Categories)

ChessHub Academy adopts a standardized 19-category weakness taxonomy:

```
 1. OPENING            - Failure to follow opening principles, early queen sorties
 2. DEVELOPMENT        - Slow minor piece activation, neglected development
 3. KING_SAFETY        - Delayed castling, damaged pawn shield, open king files
 4. MATERIAL           - Unfavorable piece trades, bad swaps
 5. TACTICS            - General missed tactical combinations
 6. CALCULATION        - Miscalculated exchange sequences
 7. HANGING_PIECES     - Leaving pieces completely undefended
 8. FORKS              - Vulnerability to knight/pawn double attacks
 9. PINS               - Moving pinned pieces, falling into absolute/relative pins
10. SKEWERS            - Exposing high-value piece in front of lesser piece
11. DISCOVERED_ATTACKS - Failure to anticipate moving piece unmasking a battery
12. DOUBLE_CHECK       - Ignoring double check requiring king moves
13. CHECKMATE          - Missed mate in 1 or 2, failing to prevent mate threats
14. DEFENSE            - Passive responses, failing to eliminate key threats
15. ATTACK             - Hesitation during winning attacks, missing initiative
16. PAWN_STRUCTURE     - Creating isolated, doubled, or backward pawns
17. ENDGAME            - King activity errors, opposition errors, pawn conversion
18. POSITIONAL_PLAY    - Weak color complexes, conceding outpost squares
19. TIME_MANAGEMENT    - Extreme move hesitation or blitzing under time pressure
```

---

### 4. Repeated Weakness & Trend Analysis

When a student accumulates mistakes:
- **Frequency ($F$):** Number of occurrences of a weakness category across the last 15 games.
- **Severity ($S$):** Weighted score where $\text{BLUNDER} = 3$, $\text{SERIOUS\_MISTAKE} = 2$, $\text{MISTAKE} = 1$.
- **Trend Calculation:**
  Comparing the mistake occurrences in the last 5 games ($M_{last5}$) vs the prior 5 games ($M_{prev5}$):
  $$\text{Trend} = \begin{cases} 
  \text{IMPROVING} & \text{if } M_{last5} \le M_{prev5} - 1 \\ 
  \text{WORSENING} & \text{if } M_{last5} \ge M_{prev5} + 2 \\ 
  \text{STABLE} & \text{otherwise} 
  \end{cases}$$

---

### 5. Deterministic Adaptive Training Priority Algorithm

When ChessHub generates personalized training plans and recommendations, it sorts weaknesses using a deterministic priority score:

$$\text{Priority Score} = (W_{\text{freq}} \times 0.40) + (W_{\text{sev}} \times 0.40) + (W_{\text{trend}} \times 0.20)$$

Where:
- $W_{\text{freq}} = \min(100, F \times 20)$ (5 occurrences maxes this score at 100).
- $W_{\text{sev}} = \min(100, \frac{\text{Total Severity Points}}{F} \times 33.3)$ (Average severity of mistakes).
- $W_{\text{trend}}$:
  - `WORSENING`: 100 points
  - `STABLE`: 60 points
  - `IMPROVING`: 20 points

#### Automated Output:
The highest priority weakness automatically triggers:
1. **Bot Starting Positions:** Next "Weakness Training" match loads positions targeting that theme.
2. **Tactical Puzzle Bank:** Recommends curated puzzles matching that theme from `weaknessPuzzleBank.ts`.
3. **Student Weakness Report:** Shown on the student dashboard under "Focus Area".
4. **Coach Notification:** An alert generated for the assigned coach.

---

### 6. Coach Analytics & Control Model

Coaches maintain full authority over automated recommendations:

```
                         ┌────────────────────────────────────┐
                         │   COACH DASHBOARD: STUDENT VIEW    │
                         └─────────────────┬──────────────────┘
                                           │
             ┌─────────────────────────────┼─────────────────────────────┐
             ▼                             ▼                             ▼
  ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
  │   MISTAKE REVIEW     │      │   WEAKNESS OVERRIDE  │      │  TRAINING ASSIGNMENT │
  │ - Review board FEN   │      │ - Approve / Reject   │      │ - Push custom FEN to │
  │ - Eval drop & move   │      │ - Change category    │      │   student queue      │
  │ - Reclassify severity│      │ - Add coach notes    │      │ - Assign puzzle set  │
  └──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

#### Authorization & Persistence:
- All coach adjustments update `student_weaknesses.coach_approved` and `student_weaknesses.coach_override_by`.
- When an override is present, the automated recommendation engine respects the coach's categorization and assigned difficulty over the algorithmic default.

---

### 7. Opening Adaptation Architecture

To avoid generating random, irrelevant opening setups:
1. **Repertoire Tracking:** Every game records `opening_name` and `eco` in `student_bot_games`.
2. **Opening Performance Ledger:**
   - Win/Draw/Loss rate per ECO code.
   - Average move number where first inaccuracy occurs.
   - Common mistake moves against specific defenses.
3. **Targeted Opening Generation:**
   - Example: If a student plays 1. e4 e5 2. Nf3 Nc6 3. Bc4 (Italian Game) frequently, but commits castling blunders on move 7 against 3... Bc5:
   - The Bot Training system initiates games from move 6 of the Italian Game, challenging the student specifically on their known problem move.
