# ChessHub Academy: Real-Time Multi-Scope Leaderboard Architecture
## Phase 2 Authentic Ranking, Privacy & Zero-Simulation Specification

**Document:** `docs/LEADERBOARD_ARCHITECTURE.md`  
**Status:** ARCHITECTURE DESIGN ONLY  
**Date:** September 27, 2026  
**Target:** ChessHub Academy Leaderboard Hub  

---

### 1. Zero-Fake-Data Commitment & Legacy Deprecation

The Phase 1 audit revealed that `src/lib/students/leaderboardSimulation.ts` currently injects simulated peer students and fake ticker events.

#### Strict Architectural Directive:
- **`leaderboardSimulation.ts` is completely deprecated and removed from production ranking pipelines.**
- **ZERO mock production records.**
- **ZERO client-side simulated rating changes.**
- **ZERO fake student peers.**
Every row in the leaderboard represents an authentic, active student in `public.users` with verified game, puzzle, or XP records in PostgreSQL.

---

### 2. Multi-Dimensional Scopes & Scoped Isolation

| Leaderboard Scope | Filter / Population | Privacy & Access Control |
| :--- | :--- | :--- |
| **`GLOBAL`** | All active students worldwide | Public leaderboard display. Hides all private contact info. |
| **`COUNTRY`** | Active students filtered by `users.country = :selectedCountry` | Only students with configured `country` appear. Unconfigured students omitted. |
| **`ACADEMY`** | Enrolled ChessHub Academy students | Students enrolled in classes or assigned to coaches. |
| **`COACH_STUDENTS`** | Only students assigned to the authenticated coach | Enforced via join with `coach_student_assignments`. Isolated per coach. |

---

### 3. Server-Side Time Periods (UTC Boundaries)

All period calculations rely on **database UTC timestamps**. Client-side time or timezone offsets are never used to define leaderboard windows.

- **`DAILY`**:
  `created_at >= date_trunc('day', timezone('utc', now()))`
  *(Resets daily at 00:00 UTC).*
- **`WEEKLY`**:
  `created_at >= date_trunc('week', timezone('utc', now()))`
  *(Standard ISO week: resets Monday at 00:00 UTC).*
- **`MONTHLY`**:
  `created_at >= date_trunc('month', timezone('utc', now()))`
  *(Resets on the 1st calendar day of each month at 00:00 UTC).*
- **`ALL_TIME`**:
  No timestamp cutoff.

---

### 4. Nine Discrete Metric Categories

To maintain statistical integrity, **no fake "overall rating" will ever be constructed by blending incompatible metrics.** Each category tracks an unambiguous metric:

```
 1. HIGHEST CHESS RATING      - Primary: Highest active Human Rating (Rapid default, toggle Blitz/Classical)
 2. MOST WINS                - Primary: Total game wins across rated human matches
 3. BEST WIN RATE            - Primary: (Wins / Games Played) * 100 (Minimum 10 games threshold)
 4. HIGHEST PUZZLE RATING    - Primary: Tactical Puzzle Elo from student_ratings ('puzzle' category)
 5. HIGHEST XP               - Primary: Total verified XP earned from xp_transactions ledger
 6. MOST GAMES PLAYED        - Primary: Total completed rated human + bot games
 7. MOST IMPROVED PLAYER     - Primary: Positive rating delta (current_rating - rating_at_period_start)
 8. TOURNAMENT POINTS        - Primary: Accumulated tournament placement points
 9. ACHIEVEMENT POINTS       - Primary: Total achievement score from student_achievements
```

---

### 5. Canonical SQL Query Patterns

Leaderboard queries execute against indexed relational tables using PostgreSQL window functions:

#### 5.1. Highest Rating Leaderboard (Rapid)
```sql
SELECT 
  u.id AS user_id,
  u.username,
  u.avatar_url,
  u.country,
  sr.current_rating AS primary_metric,
  sr.games_played AS secondary_metric,
  sr.wins,
  sr.losses,
  sr.draws,
  DENSE_RANK() OVER (ORDER BY sr.current_rating DESC, sr.wins DESC) AS rank
FROM public.student_ratings sr
JOIN public.users u ON u.id = sr.student_id
WHERE sr.rating_category = 'rapid'
  AND u.is_active = true
  AND sr.is_frozen = false
ORDER BY rank ASC
LIMIT 50;
```

#### 5.2. Most Improved Player (Weekly)
```sql
WITH period_start_ratings AS (
  SELECT DISTINCT ON (student_id)
    student_id,
    rating_before
  FROM public.rating_history
  WHERE rating_category = 'rapid'
    AND created_at >= date_trunc('week', timezone('utc', now()))
  ORDER BY student_id, created_at ASC
)
SELECT 
  u.id AS user_id,
  u.username,
  u.avatar_url,
  (sr.current_rating - psr.rating_before) AS primary_metric, -- Rating improvement
  sr.current_rating AS secondary_metric,
  DENSE_RANK() OVER (ORDER BY (sr.current_rating - psr.rating_before) DESC) AS rank
FROM period_start_ratings psr
JOIN public.student_ratings sr ON sr.student_id = psr.student_id AND sr.rating_category = 'rapid'
JOIN public.users u ON u.id = psr.student_id
WHERE (sr.current_rating - psr.rating_before) > 0
  AND u.is_active = true
ORDER BY rank ASC
LIMIT 50;
```

#### 5.3. Coach Students Isolated Leaderboard
```sql
SELECT 
  u.id AS user_id,
  u.username,
  u.avatar_url,
  sr.current_rating AS primary_metric,
  sr.games_played AS secondary_metric,
  DENSE_RANK() OVER (ORDER BY sr.current_rating DESC) AS rank
FROM public.student_ratings sr
JOIN public.users u ON u.id = sr.student_id
JOIN public.student_profiles sp ON sp.user_id = u.id
JOIN public.coach_student_assignments csa ON csa.student_id = sp.id
WHERE sr.rating_category = 'rapid'
  AND csa.coach_id = :authenticatedCoachId
  AND csa.archived_at IS NULL
  AND u.is_active = true
ORDER BY rank ASC;
```

---

### 6. Privacy Compliance & Data Sanitization

To ensure child safety and privacy:
- **Exposed Public Fields:** `Rank`, `Avatar`, `Username`, `Country Flag`, `Metric Score`, `Games Count`.
- **Strictly Stripped Fields:** `email`, `phone`, `parent_name`, `parent_whatsapp`, `student notes`, `internal coach evaluations`, `school details`.
- Students with private profile flags can display anonymous handles (e.g. `ChessPlayer#4921`).

---

### 7. Tie-Breaking & Caching Strategy

#### Tie-Breaking Rules:
1. Higher metric score.
2. Higher win count (for rating/wins leaderboards).
3. Fewer losses.
4. Earlier timestamp of achieving the score.

#### Performance & Caching:
- In Next.js App Router, `GET /api/leaderboard` leverages route caching:
  `export const revalidate = 60;` (1-minute ISR stale-while-revalidate cache).
- High-traffic leaderboards (Global All-Time) are queried from indexed materialized views or Redis caches updated on game completion events, ensuring database load remains $< 5\%$.
