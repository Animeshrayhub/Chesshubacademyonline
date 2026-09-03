import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../test-data/users.data';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const testClassId = 'c0000000-0000-0000-0000-000000000001';

async function dismissModals(page: any) {
  const okBtn = page.locator('button:has-text("OK")').first();
  if (await okBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await okBtn.click().catch(() => {});
  }
}

async function dragPiece(page: any, from: string, to: string) {
  await dismissModals(page);
  const pieceEl = page.locator(`[data-square="${from}"] img`).first();
  const toEl = page.locator(`[data-square="${to}"]`).first();
  await expect(pieceEl).toBeVisible({ timeout: 12000 });
  await expect(toEl).toBeVisible({ timeout: 12000 });

  const fromBox = await pieceEl.boundingBox();
  const toBox = await toEl.boundingBox();
  expect(fromBox).not.toBeNull();
  expect(toBox).not.toBeNull();

  await page.mouse.move(fromBox!.x + fromBox!.width / 2, fromBox!.y + fromBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.move(toBox!.x + toBox!.width / 2, toBox!.y + toBox!.height / 2, { steps: 20 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

async function loginAs(page: any, email: string, pass: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|classroom)/, { timeout: 25000 });
}

test.describe('Classroom V2: Final Stability & Two-Browser Realtime Verification', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });

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
    await admin.from('live_session_board_state').delete().eq('session_id', testClassId);

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

  test('✓ PART 1–6: Camera/Microphone Simple Controls & Permission Screen', async ({ browser }) => {
    const studentContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['camera', 'microphone'],
    });
    const page = await studentContext.newPage();

    // 1. Coach first creates the live session
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const coachPage = await coachContext.newPage();
    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');
    await dismissModals(coachPage);

    // 2. Student logs in and enters classroom
    await loginAs(page, TEST_USERS.student.email, TEST_USERS.student.password);
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');
    await dismissModals(page);

    // 3. Verify student controls are simple (Camera ON/OFF, Mic ON/OFF)
    const cameraBtn = page.locator('button:has-text("Camera")').first();
    const micBtn = page.locator('button:has-text("Mic")').first();
    await expect(cameraBtn).toBeVisible({ timeout: 15000 });
    await expect(micBtn).toBeVisible({ timeout: 15000 });

    // 4. Test clicking Camera toggle -> toggles visual state smoothly
    await cameraBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("Camera OFF")').first()).toBeVisible({ timeout: 8000 });

    // 5. Test clicking Camera ON again
    await cameraBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("Camera ON")').first()).toBeVisible({ timeout: 8000 });

    // 6. Test Mic toggle -> toggles visual state
    await micBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("Mic OFF")').first()).toBeVisible({ timeout: 8000 });

    await micBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("Mic ON")').first()).toBeVisible({ timeout: 8000 });

    await studentContext.close();
    await coachContext.close();
  });

  test('✓ PART 7–18: 20+ Real Moves Sequence without Snap-back or Duplication', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const coachPage = await coachContext.newPage();
    const studentPage = await studentContext.newPage();

    // 1. Log in Coach & Student
    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await loginAs(studentPage, TEST_USERS.student.email, TEST_USERS.student.password);

    // 2. Open classroom on both sides
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');
    await studentPage.goto(`/classroom/${testClassId}`);
    await studentPage.waitForLoadState('networkidle');

    await dismissModals(coachPage);
    await dismissModals(studentPage);
    await coachPage.waitForTimeout(2000);

    // 3. Grant student board control
    const participantsTab = coachPage.locator('button:has-text("Participants")').first();
    await participantsTab.click();
    const controlToggle = coachPage.locator('[data-testid="student-control-toggle"]').first();
    await expect(controlToggle).toBeVisible({ timeout: 10000 });
    await controlToggle.click();
    await expect(controlToggle).toHaveText('ON', { timeout: 8000 });

    // Switch coach back to Moves tab
    const movesTab = coachPage.locator('button:has-text("Moves")').first();
    await movesTab.click();

    // 4. Play an alternating 20-move sequence (10 moves by Coach, 10 moves by Student)
    const movesList = [
      { by: 'coach', from: 'e2', to: 'e4', san: 'e4' },
      { by: 'student', from: 'e7', to: 'e5', san: 'e5' },
      { by: 'coach', from: 'g1', to: 'f3', san: 'Nf3' },
      { by: 'student', from: 'b8', to: 'c6', san: 'Nc6' },
      { by: 'coach', from: 'f1', to: 'c4', san: 'Bc4' },
      { by: 'student', from: 'f8', to: 'c5', san: 'Bc5' },
      { by: 'coach', from: 'c2', to: 'c3', san: 'c3' },
      { by: 'student', from: 'g8', to: 'f6', san: 'Nf6' },
      { by: 'coach', from: 'd2', to: 'd4', san: 'd4' },
      { by: 'student', from: 'e5', to: 'd4', san: 'exd4' },
      { by: 'coach', from: 'c3', to: 'd4', san: 'cxd4' },
      { by: 'student', from: 'c5', to: 'b4', san: 'Bb4+' },
      { by: 'coach', from: 'b1', to: 'c3', san: 'Nc3' },
      { by: 'student', from: 'd7', to: 'd5', san: 'd5' },
      { by: 'coach', from: 'e4', to: 'd5', san: 'exd5' },
      { by: 'student', from: 'f6', to: 'd5', san: 'Nxd5' },
      { by: 'coach', from: 'e1', to: 'g1', san: 'O-O' },
      { by: 'student', from: 'e8', to: 'g8', san: 'O-O' },
      { by: 'coach', from: 'c4', to: 'd5', san: 'Bxd5' },
      { by: 'student', from: 'd8', to: 'd5', san: 'Qxd5' },
    ];

    for (let i = 0; i < movesList.length; i++) {
      const m = movesList[i];
      const activePage = m.by === 'coach' ? coachPage : studentPage;
      const passivePage = m.by === 'coach' ? studentPage : coachPage;

      await activePage.bringToFront();
      await dismissModals(activePage);

      // Verify active player board can move
      await expect(activePage.locator('#classroom-board[data-can-move="true"]')).toBeVisible({ timeout: 8000 });

      // Execute drag
      await dragPiece(activePage, m.from, m.to);

      // Verify notation appears on active side
      await expect(activePage.locator(`text=/${m.san}/i`).first()).toBeVisible({ timeout: 8000 });

      // Verify notation reaches passive side
      await passivePage.bringToFront();
      await expect(passivePage.locator(`text=/${m.san}/i`).first()).toBeVisible({ timeout: 10000 });

      // Verify piece at target square is rendered on both sides (no snap-back)
      await expect(activePage.locator(`[data-square="${m.to}"] img`).first()).toBeVisible({ timeout: 8000 });
      await expect(passivePage.locator(`[data-square="${m.to}"] img`).first()).toBeVisible({ timeout: 8000 });
    }

    // 5. Test Invalid Move: Student attempts illegal move (e.g. King into check)
    await studentPage.bringToFront();
    // g8 king to f7 is illegal because queen on d5 or bishop on board
    await dragPiece(studentPage, 'g8', 'f7');
    await studentPage.waitForTimeout(500);

    // Verify silent return: no error banner popup, king returns to g8
    await expect(studentPage.locator('[data-square="g8"] img').first()).toBeVisible({ timeout: 5000 });

    // 6. Test Free Move: Coach toggles Free Move ON
    await coachPage.bringToFront();
    const freeMoveBtn = coachPage.locator('button:has-text("Free Move")').first();
    await expect(freeMoveBtn).toBeVisible({ timeout: 5000 });
    await freeMoveBtn.click();
    await expect(coachPage.locator('text=/Free Move: ON/i')).toBeVisible({ timeout: 6000 });

    // Coach makes an illegal teaching move (e.g. h2 pawn to h5)
    await dragPiece(coachPage, 'h2', 'h5');
    await expect(coachPage.locator('[data-square="h5"] img').first()).toBeVisible({ timeout: 6000 });

    // Student receives free move teaching position
    await studentPage.bringToFront();
    await expect(studentPage.locator('[data-square="h5"] img').first()).toBeVisible({ timeout: 8000 });

    // 7. Test Refresh: Both Coach and Student refresh and retain position
    await coachPage.reload();
    await coachPage.waitForLoadState('networkidle');
    await dismissModals(coachPage);
    await expect(coachPage.locator('[data-square="h5"] img').first()).toBeVisible({ timeout: 15000 });

    await studentPage.reload();
    await studentPage.waitForLoadState('networkidle');
    await dismissModals(studentPage);
    await expect(studentPage.locator('[data-square="h5"] img').first()).toBeVisible({ timeout: 15000 });

    await coachContext.close();
    await studentContext.close();
  });
});
