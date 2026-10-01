# ChessHub Academy: Multi-Level Bot Training Architecture
## Phase 2 Engine Tuning, Adaptive Progression & Challenge Mode Design

**Document:** `docs/BOT_TRAINING_ARCHITECTURE.md`  
**Status:** ARCHITECTURE DESIGN ONLY  
**Date:** September 27, 2026  
**Target:** ChessHub Academy Bot Training Hub  

---

### 1. Engine Allocation: Minimax vs. Stockfish

A core finding from the Phase 1 audit is that ChessHub Academy already contains two engines:
1. **Internal TypeScript Minimax Engine** (`src/lib/bot-training/chessBotEngine.ts`) with Piece-Square Tables (PST) and Opening Book.
2. **Stockfish 16 WebAssembly Engine** (`/public/stockfish/stockfish.js`) operating via browser Web Workers.

To avoid redundant engine installations and preserve beginner friendliness, tasks are strictly assigned as follows:

| Engine Role | Engine Selection | Rationale |
| :--- | :--- | :--- |
| **Levels 1–3 Gameplay (Easy Bots)** | **Minimax Engine (`chessBotEngine.ts`)** | Stockfish at Skill Level 0 still calculates tactical defenses unnaturally for novices. Minimax provides authentic beginner play: gentle development, safe captures, missed traps, and forgiving responses. |
| **Levels 4–10 Gameplay (Adaptive Bots)** | **Stockfish 16 (`stockfish.js`)** | Scales authentically from Club player (1000) to Grandmaster (2000+) using UCI `Skill Level` ($0 \dots 20$) and `Depth` ($3 \dots 18$). |
| **Post-Game Mistake Analysis** | **Stockfish 16 (`stockfish.js`)** | Web worker executes asynchronous UCI `go depth 12` evaluations per move, parsing `score cp` to measure genuine centipawn drops. |
| **Adaptive Master & Challenge Mode** | **Stockfish 16 (`stockfish.js`)** | Powers handicaps, tactical puzzles, and time-pressure challenges. |

---

### 2. 10-Level Bot Specifications & Calibrated Difficulty

Bot training is **unlocked for all students** from day one. No student needs to reach a human rating threshold to access bot training.

```
 LEVEL 1: PAWN NOVICE (Rating ~400)
 ├── Engine: Minimax Depth 1 | PST | 45% pawn moves, 30% minor moves
 ├── Characteristics: Avoids punishing traps; child-friendly; allows student to develop pieces
 └── Personality: Friendly Coach ♟️ ("Great move! Castle when you can!")

 LEVEL 2: KNIGHT SCOUT (Rating ~600)
 ├── Engine: Minimax Depth 1-2 | Alpha-Beta | Basic capture ordering
 ├── Characteristics: Solid fundamental development; avoids 1-move hanging pieces
 └── Personality: Knight Scout ♞ ("Watch out for pins and forks!")

 LEVEL 3: BISHOP TACTICIAN (Rating ~800)
 ├── Engine: Minimax Depth 4 | Opening Book with Italian & Fried Liver
 ├── Characteristics: Introduces aggressive opening sacrifices; punishes undefended pieces
 └── Personality: Bishop Tactician ♝ ("Can you defend your f7 square?")

 LEVEL 4: ROOK GUARDIAN (Rating ~1000)
 ├── Engine: Stockfish Skill Level 3 | Depth 4 | Contempt 0
 ├── Characteristics: Solid club-level play; central pawn control; basic endgames
 └── Personality: Rook Guardian ♜ (Solid positional defense)

 LEVEL 5: QUEEN STRIKER (Rating ~1200)
 ├── Engine: Stockfish Skill Level 6 | Depth 6
 ├── Characteristics: Active tactical opportunist; seeks skewers, pins, and discovered checks
 └── Personality: Queen Striker ♛ (Sharp tactical counter-attacks)

 LEVEL 6: CANDIDATE MASTER (Rating ~1400)
 ├── Engine: Stockfish Skill Level 9 | Depth 8
 ├── Characteristics: Exploits weak pawn structures; converts material advantages
 └── Personality: CM Bot 🏅 (Positional clamp & structure exploitation)

 LEVEL 7: FIDE MASTER (Rating ~1600)
 ├── Engine: Stockfish Skill Level 12 | Depth 10
 ├── Characteristics: Accurate opening execution; punishes tactical inaccuracies promptly
 └── Personality: FM Bot 🎖️ (Deep tactical combinations)

 LEVEL 8: INTERNATIONAL MASTER (Rating ~1800)
 ├── Engine: Stockfish Skill Level 15 | Depth 12
 ├── Characteristics: Dynamic counter-play; endgame conversion mastery
 └── Personality: IM Bot 🥇 (Master calculation speed)

 LEVEL 9: GRANDMASTER (Rating ~2000)
 ├── Engine: Stockfish Skill Level 18 | Depth 14
 ├── Characteristics: Relentless pressure; deep prophylaxis; near-flawless endgame play
 └── Personality: GM Bot 👑 (Grandmaster precision)

 LEVEL 10: SUPER ENGINE (Rating ~2200)
 ├── Engine: Stockfish Skill Level 20 | Depth 16-18
 ├── Characteristics: Maximum engine depth; uncompromising tactical execution
 └── Personality: Super Engine ⚡ (The ultimate academy challenge)
```

---

### 3. Progressive Level Unlock Policy (Anti-Farming Readiness)

Starting at Level 4, unlocking higher levels requires genuine chess improvement across multiple dimensions. **A student cannot unlock higher levels simply by farming Level 1 bots.**

#### Multi-Factor Readiness Formula
$$\text{Readiness Score} = (S_{\text{games}} \times 0.20) + (S_{\text{perf}} \times 0.30) + (S_{\text{acc}} \times 0.30) + (S_{\text{imp}} \times 0.20)$$

Where:
1. **$S_{\text{games}}$ (Games Requirement):**
   $$S_{\text{games}} = \min\left(100, \frac{\text{games\_played\_at\_current\_level}}{5} \times 100\right)$$
   *Must play at least 5 games at the current level.*
2. **$S_{\text{perf}}$ (Performance Score):**
   $$S_{\text{perf}} = \left(\frac{\text{wins} + 0.5 \times \text{draws}}{\text{total\_games\_at\_level}}\right) \times 100$$
3. **$S_{\text{acc}}$ (Accuracy Score):**
   $$S_{\text{acc}} = \text{Average accuracy percentage across the last 5 games at this level}$$
4. **$S_{\text{imp}}$ (Improvement Trend Score):**
   Comparing average accuracy between the latest 3 games and previous 3 games:
   - If $\Delta \text{accuracy} \ge +5\%$: $100$ pts
   - If $\Delta \text{accuracy} \ge 0\%$: $75$ pts
   - If $\Delta \text{accuracy} < 0\%$: $40$ pts

#### Unlock Decision Rule
- If $\text{Readiness Score} \ge 75$: The next level is automatically unlocked.
- **Coach Override:** A coach can unlock any level immediately via `coachUnlockBotLevelAction` (sets `coach_unlocked = true` in `bot_level_progression`).

---

### 4. Bot Starting Position Modes

Bot training games are not constrained to move 1 standard start:

1. **`NORMAL` (Standard Starting Position):**
   - FEN: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`
   - Plays a complete, standard game.
2. **`OPENING` (Opening Training):**
   - Student selects an opening from their repertoire or the system selects an opening where the student has recurring inaccuracies (e.g. Italian Game development lines, Sicilian Dragon setup).
   - Starts at move 3–6.
3. **`MISTAKE` (Mistake Position Training):**
   - Loads the exact FEN position from a previous game immediately before the student committed a blunder or serious mistake.
   - Objective: Play out the position against the bot to demonstrate the correct winning or defensive plan.
4. **`WEAKNESS` (Weakness-Generated Position):**
   - Loads a curated training FEN targeting the student's highest-priority weakness (e.g. defending against knight forks, converting rook endgames).

---

### 5. Level 10+ Progression: Continuous Progression, Adaptive Master & Challenge Mode

When a student conquers Level 10 (Super Engine):

#### 5.1. Continuous Progression
The engine scales beyond Level 10 by increasing Stockfish thinking time ($1.5s \to 3.0s$) and evaluation depth ($18 \to 22$). The bot rating adjusts dynamically based on the student's active Bot Rating.

#### 5.2. Adaptive Master Training
The bot analyzes the student's recent 10 games before the match begins:
- Selects opening lines the student struggles with.
- Aims for middlegame positions matching the student's lowest accuracy themes.

#### 5.3. Challenge Mode
Specialized high-stakes challenge scenarios:
- **King Under Siege:** Defend a slightly compromised king position with 3 minutes on the clock against Level 8 Stockfish.
- **Pawn Endgame Conversion:** Convert a $+1.5$ pawn endgame against Level 10 engine calculation.
- **Tactical Speed Run:** Play 5 consecutive sharp positions with 30 seconds per move.

---

### 6. Bot Rating Calculation Model

- Bot games update **only** the `bot` rating category in `student_ratings`.
- Calculation follows canonical Elo against the designated bot rating:
  $$E = \frac{1}{1 + 10^{(R_{\text{bot}} - R_{\text{student}})/400}}$$
  $$\Delta R = \text{round}(K \times (S - E))$$
  Where $K=20$.
- A win against a 1400 bot by an 800 student yields a substantial rating gain ($+19$), whereas a win against a 400 bot yields $+1$.
- Guaranteed idempotency: Replaying completion requests with the same `gameId` will not alter rating twice.
