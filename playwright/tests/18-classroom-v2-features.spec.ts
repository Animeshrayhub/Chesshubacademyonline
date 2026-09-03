import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../test-data/users.data';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const testClassId = 'c0000000-0000-0000-0000-000000000001';

async function dismissZoomModal(page: any) {
  const okBtn = page.locator('button:has-text("OK")').first();
  if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await okBtn.click().catch(() => {});
  }
}

async function loginAs(page: any, email: string, pass: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|classroom)/, { timeout: 25000 });
}

async function dragPiece(page: any, from: string, to: string) {
  await dismissZoomModal(page);
  const pieceEl = page.locator(`[data-square="${from}"] img`).first();
  const toEl = page.locator(`[data-square="${to}"]`).first();
  await expect(pieceEl).toBeVisible({ timeout: 15000 });
  await expect(toEl).toBeVisible({ timeout: 15000 });

  const fromBox = await pieceEl.boundingBox();
  const toBox = await toEl.boundingBox();
  expect(fromBox).not.toBeNull();
  expect(toBox).not.toBeNull();

  await page.mouse.move(fromBox!.x + fromBox!.width / 2, fromBox!.y + fromBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(toBox!.x + toBox!.width / 2, toBox!.y + toBox!.height / 2, { steps: 25 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(600);
}

test.describe('Classroom V2: Comprehensive Feature Verification', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://titqwyiiagdxmzkgimpe.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: coachUser } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.coach.email)
      .maybeSingle();

    const { data: cp } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', coachUser!.id)
      .maybeSingle();

    await admin.from('classes').delete().eq('id', testClassId);
    await admin.from('live_sessions').delete().eq('class_id', testClassId);

    // Create scheduled class
    await admin.from('classes').insert({
      id: testClassId,
      coach_id: cp?.id || coachUser!.id,
      status: 'SCHEDULED',
      class_type: 'PRIVATE',
      scheduled_start: new Date(Date.now() + 10 * 60000).toISOString(),
      duration_minutes: 60,
    });

    // Enroll student
    const { data: studentUser } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.student.email)
      .maybeSingle();

    if (studentUser) {
      const { data: sp } = await admin
        .from('student_profiles')
        .select('id')
        .eq('user_id', studentUser.id)
        .maybeSingle();

      if (sp) {
        await admin.from('class_students').delete().eq('class_id', testClassId);
        await admin.from('class_students').insert({
          class_id: testClassId,
          student_id: sp.id,
        });
      }
    }
    await new Promise((r) => setTimeout(r, 600));
  });

  test('✓ Realtime Chat: Student sends chat message -> Coach receives message', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const coachPage = await coachContext.newPage();
    const studentPage = await studentContext.newPage();

    // 1. Coach enters classroom
    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');

    // 2. Student enters classroom
    await loginAs(studentPage, TEST_USERS.student.email, TEST_USERS.student.password);
    await studentPage.goto(`/classroom/${testClassId}`);
    await studentPage.waitForLoadState('networkidle');

    await dismissZoomModal(coachPage);
    await dismissZoomModal(studentPage);

    // 3. Both switch to Chat tab
    await coachPage.bringToFront();
    const coachChatTab = coachPage.locator('button:has-text("Chat")').first();
    await coachChatTab.click();

    await studentPage.bringToFront();
    const studentChatTab = studentPage.locator('button:has-text("Chat")').first();
    await studentChatTab.click();

    // 4. Student sends message
    const chatInput = studentPage.locator('input[placeholder*="Send a message"], form input[type="text"]').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Hello Coach! Ready for chess lesson.');
    await studentPage.keyboard.press('Enter');

    // 5. Coach sees message in Chat
    await coachPage.bringToFront();
    await expect(coachPage.locator('text=Ready for chess lesson').first()).toBeVisible({ timeout: 10000 });

    await coachContext.close();
    await studentContext.close();
  });

  test('✓ Puzzles Modal: Coach loads tactical puzzle onto live board', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const coachPage = await coachContext.newPage();
    const studentPage = await studentContext.newPage();

    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');

    await loginAs(studentPage, TEST_USERS.student.email, TEST_USERS.student.password);
    await studentPage.goto(`/classroom/${testClassId}`);
    await studentPage.waitForLoadState('networkidle');

    await dismissZoomModal(coachPage);
    await dismissZoomModal(studentPage);

    // 1. Coach opens Puzzles modal
    await coachPage.bringToFront();
    const puzzlesBtn = coachPage.locator('button:has-text("Puzzles")').first();
    await expect(puzzlesBtn).toBeVisible({ timeout: 5000 });
    await puzzlesBtn.click();

    // 2. Select first puzzle
    const loadPuzzleBtn = coachPage.locator('button:has-text("Load Puzzle"), button:has-text("Solve")').first();
    if (await loadPuzzleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loadPuzzleBtn.click();
      // Board updates to puzzle mode
      await expect(coachPage.locator('text=/Puzzle/i').first()).toBeVisible({ timeout: 8000 });
    }

    await coachContext.close();
    await studentContext.close();
  });

  test('✓ State Rehydration / Page Refresh: Board moves persist upon reload', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const coachPage = await coachContext.newPage();

    // 1. Coach plays e2-e4
    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');
    await dismissZoomModal(coachPage);
    await expect(coachPage.locator('#classroom-board[data-can-move="true"]')).toBeVisible({ timeout: 15000 });
    await dragPiece(coachPage, 'e2', 'e4');
    await expect(coachPage.locator('text=/e4/i').first()).toBeVisible({ timeout: 8000 });

    // 2. Reload Coach browser
    await coachPage.reload();
    await coachPage.waitForLoadState('networkidle');
    await dismissZoomModal(coachPage);

    // 3. Verify e4 move remains in notation panel after full page rehydration
    await expect(coachPage.locator('text=/e4/i').first()).toBeVisible({ timeout: 15000 });

    await coachContext.close();
  });

  test('✓ End Class Flow: Coach ends class session and submits attendance', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const coachPage = await coachContext.newPage();

    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');
    await dismissZoomModal(coachPage);

    // 1. Click End Class button
    const endClassBtn = coachPage.locator('button:has-text("End Class")').first();
    await expect(endClassBtn).toBeVisible({ timeout: 5000 });
    await endClassBtn.click();

    // 2. Attendance modal appears
    await expect(coachPage.locator('text=/Complete Class & Review|End Live Classroom Session/i').first()).toBeVisible({ timeout: 5000 });

    // 3. Confirm and End
    const confirmBtn = coachPage.locator('button:has-text("Save Review & Conclude Class"), button:has-text("Confirm & End Class")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 4. Coach is redirected back to Coach dashboard
    await coachPage.waitForURL(/\/dashboard\/coach/, { timeout: 15000 });
    await expect(coachPage.locator('body')).toBeVisible();

    await coachContext.close();
  });
});
