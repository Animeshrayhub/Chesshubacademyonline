import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../test-data/users.data';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const testClassId = 'c0000000-0000-0000-0000-000000000001';

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

async function loginAs(page: any, email: string, pass: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|classroom)/, { timeout: 25000 });
}

async function dismissZoomModal(page: any) {
  const okBtn = page.locator('button:has-text("OK")').first();
  if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await okBtn.click().catch(() => {});
  }
}

test.describe('Classroom V2: Multi-Browser Piece Movement & Realtime Sync', () => {
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
    await admin.from('classroom_sessions').delete().eq('class_id', testClassId);
    await admin.from('classroom_state_events').delete().eq('class_id', testClassId);

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

  test('✓ Coach Browser: drags e2-e4 and updates notation panel', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await coachContext.newPage();

    page.on('console', (msg) => {
      if (msg.text().includes('[Classroom') || msg.text().includes('[Chessboard')) {
        console.log(`[Coach Console]: ${msg.text()}`);
      }
    });

    // 1. Login as Coach
    await loginAs(page, TEST_USERS.coach.email, TEST_USERS.coach.password);

    // 2. Open classroom
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');
    await dismissZoomModal(page);
    await expect(page.locator('#classroom-board[data-can-move="true"]')).toBeVisible({ timeout: 15000 });

    // 3. Drag e2 to e4
    await dragPiece(page, 'e2', 'e4');

    // 4. Verify notation panel contains "e4"
    const notationPawn = page.locator('text=/e4/i');
    await expect(notationPawn.first()).toBeVisible({ timeout: 8000 });

    await coachContext.close();
  });

  test('✓ Multi-Browser Sync: Coach plays e2-e4 -> Student receives e4 update', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const coachPage = await coachContext.newPage();
    const studentPage = await studentContext.newPage();

    coachPage.on('console', (msg) => {
      console.log(`[Coach Console ${msg.type()}]: ${msg.text()}`);
    });
    studentPage.on('console', (msg) => {
      console.log(`[Student Console ${msg.type()}]: ${msg.text()}`);
    });

    // 1. Coach logs in
    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);

    // 2. Student logs in
    await loginAs(studentPage, TEST_USERS.student.email, TEST_USERS.student.password);

    // 3. Coach enters classroom (live session becomes active)
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');

    // 4. Student enters classroom
    await studentPage.goto(`/classroom/${testClassId}`);
    await studentPage.waitForLoadState('networkidle');

    // Dismiss any Zoom embedded modals that might overlay the board in test environment
    await dismissZoomModal(coachPage);
    await dismissZoomModal(studentPage);

    // Allow presence and initial session sync to settle
    await coachPage.waitForTimeout(2000);

    // 5. Bring Coach to front and play e2-e4
    await coachPage.bringToFront();
    await dismissZoomModal(coachPage);
    await expect(coachPage.locator('#classroom-board[data-can-move="true"]')).toBeVisible({ timeout: 15000 });
    await dragPiece(coachPage, 'e2', 'e4');

    // 6. Coach sees e4
    await expect(coachPage.locator('text=/e4/i').first()).toBeVisible({ timeout: 8000 });

    // 7. Student receives e4 in realtime
    await studentPage.bringToFront();
    await expect(studentPage.locator('text=/e4/i').first()).toBeVisible({ timeout: 10000 });

    await coachContext.close();
    await studentContext.close();
  });

  test('✓ Coach grants student board control -> Student plays e7-e5 -> Coach sees e5', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const coachPage = await coachContext.newPage();
    const studentPage = await studentContext.newPage();

    // 1. Coach logs in and enters classroom
    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');

    // 2. Student logs in and enters classroom
    await loginAs(studentPage, TEST_USERS.student.email, TEST_USERS.student.password);
    await studentPage.goto(`/classroom/${testClassId}`);
    await studentPage.waitForLoadState('networkidle');

    // Dismiss any Zoom embedded modals that might overlay the board in test environment
    await dismissZoomModal(coachPage);
    await dismissZoomModal(studentPage);

    // Allow presence and initial session sync to settle
    await coachPage.waitForTimeout(2000);

    // 3. Coach plays e2 to e4 first
    await coachPage.bringToFront();
    await dismissZoomModal(coachPage);
    await expect(coachPage.locator('#classroom-board[data-can-move="true"]')).toBeVisible({ timeout: 15000 });
    await dragPiece(coachPage, 'e2', 'e4');
    await expect(coachPage.locator('text=/e4/i').first()).toBeVisible({ timeout: 8000 });
    await studentPage.bringToFront();
    await dismissZoomModal(studentPage);
    await expect(studentPage.locator('text=/e4/i').first()).toBeVisible({ timeout: 8000 });

    // 4. Coach switches to Participants tab and grants control
    await coachPage.bringToFront();
    const participantsTab = coachPage.locator('button:has-text("Participants")').first();
    await expect(participantsTab).toBeVisible({ timeout: 10000 });
    await participantsTab.click();

    const controlBtn = coachPage.locator('[data-testid="student-control-toggle"]').first();
    await expect(controlBtn).toBeVisible({ timeout: 10000 });
    await controlBtn.click();
    await expect(controlBtn).toHaveText('ON', { timeout: 10000 });

    // 5. In Student Browser, wait for board control to be active, then drag e7 to e5
    await studentPage.bringToFront();
    await expect(studentPage.locator('#classroom-board[data-can-move="true"]')).toBeVisible({ timeout: 10000 });
    await dragPiece(studentPage, 'e7', 'e5');

    // 6. Verify e5 is registered in Student notation
    await expect(studentPage.locator('text=/e5/i').first()).toBeVisible({ timeout: 8000 });

    // 7. Switch Coach back to Moves tab and verify e5 reaches Coach Browser
    await coachPage.bringToFront();
    const movesTab = coachPage.locator('button:has-text("Moves")').first();
    await movesTab.click();
    await expect(coachPage.locator('text=/e5/i').first()).toBeVisible({ timeout: 10000 });

    await coachContext.close();
    await studentContext.close();
  });
});
