# ChessHub Academy: Rating Security, RLS & Anti-Abuse Model
## Phase 2 Threat Modeling, Server Authority & Incident Response Architecture

**Document:** `docs/RATING_SECURITY_MODEL.md`  
**Status:** ARCHITECTURE DESIGN ONLY  
**Date:** September 27, 2026  
**Target:** ChessHub Academy Security & Anti-Abuse Subsystem  

---

### 1. Threat Modeling & Vulnerability Analysis

The Phase 1 audit highlighted critical security vulnerabilities in existing database policies:

| Threat Vector | Vulnerable Component | Exploitation Mechanism | Architectural Remediation |
| :--- | :--- | :--- | :--- |
| **Client-Side Rating Forgery** | `20260825000001_bot_training_rls.sql` | Student issues client `supabase.from('student_bot_profiles').update({ rating: 2400 })` directly from browser console. | **Revoke all client `UPDATE` permissions.** All rating mutations must execute via Server Actions with `service_role`. |
| **Fake Rating History Injection** | `20260825000001_bot_training_rls.sql` | Student issues client `INSERT` into `student_bot_rating_history` forging fake $+200$ wins. | **Revoke client `INSERT` permissions.** Only server admin client can insert rating events. |
| **Replay & Double-Submission** | `finishBotGameAction` | User repeats network payload to gain $+20$ repeatedly for the same completed game. | **Database Unique Constraints on `idempotency_key`.** Second attempt returns cached response without modifying rating. |
| **Rating Farming Between Colluding Accounts** | Matchmaking / Human Games | Two student accounts play 20 rapid games resigning on move 2 to transfer rating points. | **Anti-Abuse Detection Engine:** Flags repetitive matches between identical IPs or accounts in short intervals. |
| **XP Inflation / Farming** | `saveSpeedRunScoreAction` | Script spams API with fake speed-run scores. | **Server-side rate limit & `xp_transactions` ledger with daily cap (500 XP/day).** |

---

### 2. Role-Based Access Control (RBAC) Matrix

| Resource / Action | Public / Unauth | Student | Assigned Coach | Unassigned Coach | Master Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Read Public Leaderboard** | Read (Sanitized) | Read (Sanitized) | Read (Sanitized) | Read (Sanitized) | Read (Full) |
| **Read Own Rating & History** | Denied | **Read Own Only** | Read Assigned | Denied | Read (Full) |
| **Modify Rating Directly** | Denied | **DENIED** | **DENIED** | **DENIED** | Admin Action Only |
| **Read Own Game Analysis & Mistakes** | Denied | **Read Own Only** | Read Assigned | Denied | Read (Full) |
| **Override Mistake Severity / Category** | Denied | Denied | **Update Assigned** | Denied | Full Access |
| **Freeze / Unfreeze Student Rating** | Denied | Denied | Request Review | Denied | **Full Authority** |
| **Manual Rating Correction** | Denied | Denied | Denied | Denied | **Audit-Logged Only** |

---

### 3. Server-Authoritative Execution Boundary

Every sensitive operation follows the **Zero Client Trust** standard:

```
                  ┌──────────────────────────────────────────────┐
                  │                BROWSER CLIENT                │
                  │   Only sends: { gameId, moveSequence, pgn }   │
                  │   NEVER sends: rating, rating_change, XP     │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼ (Secure Server Action)
                  ┌──────────────────────────────────────────────┐
                  │             NEXT.JS SERVER ACTION            │
                  │  1. Authenticates user session via auth.uid()│
                  │  2. Validates game ownership in database     │
                  │  3. Replays move sequence with chess.js      │
                  │  4. Verifies game conclusion & winner        │
                  │  5. Calculates Elo delta with ratingService  │
                  │  6. Generates unique idempotency_key         │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼ (PostgreSQL Service Role)
                  ┌──────────────────────────────────────────────┐
                  │             DATABASE TRANSACTION             │
                  │  1. Updates student_ratings atomically       │
                  │  2. Inserts rating_history audit row         │
                  │  3. Logs xp_transactions row                 │
                  │  4. Updates game status = 'completed'        │
                  └──────────────────────────────────────────────┘
```

---

### 4. Anti-Abuse & Incident Detection Engine

The system continually monitors for suspicious patterns during game completion events:

#### 4.1. Abuse Flags & Detection Heuristics
1. **`REPEATED_OPPONENT_FARMING`**:
   - Condition: More than 3 games between the same two students within 24 hours.
   - Action: Flagged for review; subsequent games yield $K=0$ (no rating change).
2. **`RAPID_RATING_SPIKE`**:
   - Condition: Rating gain $> 300$ points within a 2-hour window.
   - Action: Temporary rating freeze pending coach/admin verification.
3. **`IMPOSSIBLE_ACCURACY_STREAK`**:
   - Condition: Student rated $< 1000$ achieves $> 96\%$ accuracy across $\ge 3$ consecutive 25+ move games.
   - Action: Flagged as potential engine assistance for coach review.
4. **`DUPLICATE_GAME_SUBMISSION`**:
   - Condition: Attempting to submit game completion with already finalized `idempotency_key`.
   - Action: Request safely rejected with cached response.

---

### 5. Rating Freeze, Correction & Audit Trail

```
                    ┌────────────────────────────────────────┐
                    │      SUSPICIOUS ACTIVITY FLAGGED       │
                    │      (Logged in rating_abuse_flags)    │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          ADMIN REVIEW CONSOLE          │
                    │  Admin reviews game PGN, accuracy,     │
                    │  opponent history, and flagged signals │
                    └───────────────────┬────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              ┌─────────────────────┐       ┌──────────────────────┐
              │   DISMISS FLAG      │       │     PENALIZE / FIX   │
              │ - Flag status =     │       │ - Freeze rating      │
              │   'DISMISSED'       │       │ - Invalidate game    │
              │ - No rating change  │       │ - Recalculate rating │
              └─────────────────────┘       └──────────┬───────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │ AUDIT LOG RECORDING  │
                                            │ Insert rating_history│
                                            │ reason = 'ADMIN_FIX' │
                                            │ admin_id, old, new   │
                                            └──────────────────────┘
```

#### Invalidation & Recalculation Procedure:
If a game is determined to be illegitimate:
1. Marked `status = 'abandoned'`, `rating_change = 0` in `public.rated_games`.
2. A compensating reversal event is inserted into `public.rating_history`:
   `rating_change = -original_delta`, `reason = 'admin_invalidation'`.
3. `current_rating` on `public.student_ratings` is restored.
4. An immutable audit record is saved in `public.audit_logs`.
