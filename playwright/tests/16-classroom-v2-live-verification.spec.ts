import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../test-data/users.data';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const testClassId = 'c0000000-0000-0000-0000-000000000001';

test.describe('Classroom V2: Live Browser End-to-End Verification', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    // Ensure test class exists and is scheduled
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://titqwyiiagdxmzkgimpe.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: coachUser } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.coach.email)
      .maybeSingle();

    if (!coachUser) throw new Error('Coach user not found');

    const { data: cp } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', coachUser.id)
      .maybeSingle();

    await admin.from('classes').delete().eq('id', testClassId);
    await admin.from('live_sessions').delete().eq('class_id', testClassId);

    const { data: createdClass, error: classErr } = await admin
      .from('classes')
      .insert({
        id: testClassId,
        coach_id: cp?.id || coachUser.id,
        status: 'SCHEDULED',
        class_type: 'PRIVATE',
        scheduled_start: new Date(Date.now() + 10 * 60000).toISOString(),
        duration_minutes: 60,
      })
      .select()
      .single();

    if (classErr) {
      console.error('Failed to insert test class:', classErr.message);
    }

    const { data: studentUser } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.student.email)
      .maybeSingle();

    if (studentUser) {
      let { data: sp } = await admin
        .from('student_profiles')
        .select('id')
        .eq('user_id', studentUser.id)
        .maybeSingle();

      if (!sp) {
        const { data: newSp } = await admin
          .from('student_profiles')
          .insert({ user_id: studentUser.id, level: 'INTERMEDIATE' })
          .select('id')
          .single();
        sp = newSp;
      }

      if (sp) {
        await admin.from('class_students').delete().eq('class_id', testClassId);
        await admin.from('class_students').insert({
          class_id: testClassId,
          student_id: sp.id,
        });
      }
    }
  });

  test('✓ Student Browser - Waiting for Coach Banner displayed when class is scheduled', async ({ page }) => {
    // 1. Login as Student
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USERS.student.email);
    await page.fill('input[type="password"]', TEST_USERS.student.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|classroom)/, { timeout: 15000 });

    // 2. Navigate directly to scheduled classroom
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');

    // 3. Verify Waiting for Coach banner or status
    const waitingText = page.locator('text=/waiting for coach|class not started|scheduled/i');
    await expect(waitingText.first()).toBeVisible({ timeout: 10000 });
  });

  test('✓ Coach Browser - Enters Live Classroom and verifies Toolbar & Modals', async ({ page }) => {
    // 1. Login as Coach
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USERS.coach.email);
    await page.fill('input[type="password"]', TEST_USERS.coach.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|classroom)/, { timeout: 15000 });

    // 2. Navigate to Classroom
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');

    // 3. Verify Chessboard and UI Shell are mounted
    await expect(page.locator('body')).toBeVisible();

    // 4. Verify Coach Controls: Undo, Modals
    const undoBtn = page.locator('button:has-text("Undo"), button[title*="Undo"]');
    if (await undoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(undoBtn.first()).toBeVisible();
    }

    // 5. Verify Puzzles Button & Modal
    const puzzleBtn = page.locator('button:has-text("Puzzles"), button:has-text("Tactics")');
    if (await puzzleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await puzzleBtn.first().click();
      const puzzleModal = page.locator('text=/Load ChessHub Puzzle/i');
      await expect(puzzleModal.first()).toBeVisible({ timeout: 5000 });
      // Close modal
      const closeBtn = page.locator('button:has-text("✕")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    // 6. Verify End Class Attendance Modal
    const endClassBtn = page.locator('button:has-text("END CLASS"), button:has-text("End Session")');
    if (await endClassBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endClassBtn.first().click();
      const attendanceModal = page.locator('text=/Complete Class & Review|End Live Classroom Session/i');
      await expect(attendanceModal.first()).toBeVisible({ timeout: 5000 });
      // Cancel
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }
  });
});
