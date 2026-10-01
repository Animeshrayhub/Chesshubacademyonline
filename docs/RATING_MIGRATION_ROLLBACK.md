# ChessHub Academy: Rating & Adaptive Bot Migration Rollback Plan
## Migration Reversal & Safety Specification

**Document:** `docs/RATING_MIGRATION_ROLLBACK.md`  
**Migration Target:** `supabase/migrations/20260928000000_rating_bot_leaderboard_system.sql`  
**Date:** September 27, 2026  
**Status:** VALIDATED ROLLBACK PLAN  

---

### 1. Safety Principles & Invariants

This rollback procedure is designed under strict production safety invariants:
1. **Never Drop Pre-Existing Core Tables:**
   `public.users`, `public.student_profiles`, `public.coach_profiles`, `public.classes`, `public.class_students`, `public.classroom_sessions`, `public.homework_assignments`, and `public.puzzle_results` are NEVER dropped.
2. **Never Drop Pre-Existing Bot Tables:**
   `public.student_bot_profiles`, `public.student_bot_games`, `public.student_bot_rating_history`, `public.student_bot_mistakes`, `public.student_weaknesses`, and `public.personalized_puzzles` are NEVER dropped.
3. **Preserve Additive Columns:**
   Columns added to existing tables (`users.country`, `student_bot_games.starting_position_type`, `student_bot_mistakes.attempt_status`, `student_weaknesses.trend`) are retained as non-destructive nullable/defaulted columns.
4. **Zero Data Loss on Notes:**
   Because `student_profiles.notes` was never truncated or modified during migration, rolling back leaves all historical student notes 100% intact.

---

### 2. Rollback SQL Execution Script

If an immediate reversal of `20260928000000_rating_bot_leaderboard_system.sql` is required:

```sql
-- ==============================================================================
-- CHESSHUB ACADEMY: ROLLBACK FOR 20260928000000_rating_bot_leaderboard_system.sql
-- ==============================================================================

BEGIN;

-- 1. Drop New Subsystem Tables (in reverse dependency order)
DROP TABLE IF EXISTS public.rating_abuse_flags CASCADE;
DROP TABLE IF EXISTS public.student_achievements CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.xp_transactions CASCADE;
DROP TABLE IF EXISTS public.bot_level_progression CASCADE;
DROP TABLE IF EXISTS public.rated_games CASCADE;
DROP TABLE IF EXISTS public.rating_history CASCADE;
DROP TABLE IF EXISTS public.student_ratings CASCADE;
DROP TABLE IF EXISTS public.bot_difficulty_profiles CASCADE;

-- 2. Drop Added Indexes on Existing Tables
DROP INDEX IF EXISTS public.idx_users_country_active;

-- 3. Restore Legacy RLS Policies on Bot Tables (if required for backward compatibility)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_can_insert_own_bot_profile' AND tablename = 'student_bot_profiles') THEN
    CREATE POLICY "student_can_insert_own_bot_profile"
      ON public.student_bot_profiles FOR INSERT
      WITH CHECK (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_can_update_own_bot_profile' AND tablename = 'student_bot_profiles') THEN
    CREATE POLICY "student_can_update_own_bot_profile"
      ON public.student_bot_profiles FOR UPDATE
      USING (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_can_insert_own_rating_history' AND tablename = 'student_bot_rating_history') THEN
    CREATE POLICY "student_can_insert_own_rating_history"
      ON public.student_bot_rating_history FOR INSERT
      WITH CHECK (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_can_upsert_own_weaknesses' AND tablename = 'student_weaknesses') THEN
    CREATE POLICY "student_can_upsert_own_weaknesses"
      ON public.student_weaknesses FOR INSERT
      WITH CHECK (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_can_update_own_weaknesses' AND tablename = 'student_weaknesses') THEN
    CREATE POLICY "student_can_update_own_weaknesses"
      ON public.student_weaknesses FOR UPDATE
      USING (student_id = auth.uid());
  END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

### 3. Post-Rollback State Verification

Following execution of this rollback script:
- All 9 newly introduced tables are dropped cleanly.
- Pre-existing tables and columns remain intact.
- Pre-existing bot training tables continue functioning in their legacy state.
- No historical student data or classroom linkages are affected.
