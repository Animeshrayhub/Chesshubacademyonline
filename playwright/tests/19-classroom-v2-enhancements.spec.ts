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

async function dragPiece(page: any, from: string, to: string) {
  await dismissZoomModal(page);
  const pieceEl = page.locator(`[data-square="${from}"] img, [data-square="${from}"] svg`).first();
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

test.describe('Classroom V2: Targeted Enhancements & Quality Suite', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1440, height: 900 } });

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

    const { data: studentUser } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.student.email)
      .maybeSingle();

    const { data: cp } = await admin
      .from('coach_profiles')
      .select('id')
      .eq('user_id', coachUser!.id)
      .maybeSingle();

    let { data: sp } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', studentUser!.id)
      .maybeSingle();

    if (!sp) {
      const { data: createdSp } = await admin
        .from('student_profiles')
        .insert({ user_id: studentUser!.id, level: 'BEGINNER' })
        .select('id')
        .single();
      sp = createdSp;
    }

    await admin.from('classes').delete().eq('id', testClassId);
    await admin.from('live_sessions').delete().eq('class_id', testClassId);

    // Create scheduled class for today
    await admin.from('classes').insert({
      id: testClassId,
      coach_id: cp?.id || coachUser!.id,
      status: 'SCHEDULED',
      class_type: 'PRIVATE',
      scheduled_start: new Date().toISOString(),
      duration_minutes: 60,
    });

    if (sp?.id) {
      await admin.from('class_students').delete().eq('class_id', testClassId);
      await admin.from('class_students').insert({
        class_id: testClassId,
        student_id: sp.id,
      });
    }
  });

  test('✓ Date Filtering: Coach & Student Dashboards default to Today', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Coach Dashboard Date Default
    await loginAs(page, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await page.goto('/dashboard/coach/classes');
    await page.waitForLoadState('networkidle');

    const coachStartDate = page.locator('input[type="date"]').first();
    await expect(coachStartDate).toBeVisible({ timeout: 10000 });
    const coachToday = await coachStartDate.inputValue();
    const d = new Date();
    const expectedToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(coachToday).toBe(expectedToday);

    // 2. Student Dashboard Date Default
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    await loginAs(studentPage, TEST_USERS.student.email, TEST_USERS.student.password);
    await studentPage.goto('/dashboard/student/classes');
    await studentPage.waitForLoadState('networkidle');

    const studentStartDate = studentPage.locator('input[type="date"]').first();
    await expect(studentStartDate).toBeVisible({ timeout: 10000 });
    const studentToday = await studentStartDate.inputValue();
    expect(studentToday).toBe(expectedToday);

    await context.close();
    await studentContext.close();
  });

  test('✓ Zoom Video Layout & Aspect Ratio: Gallery/Speaker selector persists locally', async ({ page }) => {
    await loginAs(page, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');
    await dismissZoomModal(page);

    // 1. Select Speaker layout
    const speakerBtn = page.locator('button:has-text("Speaker")').first();
    await expect(speakerBtn).toBeVisible({ timeout: 10000 });
    await speakerBtn.click();

    // Verify localStorage
    const savedLayout = await page.evaluate(() => localStorage.getItem('classroom_zoom_layout'));
    expect(savedLayout).toBe('speaker');

    // 2. Select Gallery layout
    const galleryBtn = page.locator('button:has-text("Gallery")').first();
    await expect(galleryBtn).toBeVisible({ timeout: 5000 });
    await galleryBtn.click();

    const savedLayout2 = await page.evaluate(() => localStorage.getItem('classroom_zoom_layout'));
    expect(savedLayout2).toBe('gallery');
  });

  test('✓ Board Coordinates & Themes: 64 squares overlay and responsive sizing', async ({ page }) => {
    await loginAs(page, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');
    await dismissZoomModal(page);

    // 1. Check coordinates toggle button
    const coordsBtn = page.locator('button:has-text("Coords")').first();
    await expect(coordsBtn).toBeVisible({ timeout: 10000 });

    // Coordinates overlay labels should be present (e.g., e4, a1)
    await expect(page.locator('#classroom-board').locator('text="e4"').first()).toBeVisible({ timeout: 5000 });

    // 2. Theme selection
    const themeBtn = page.locator('button:has-text("Theme")').first();
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    const walnutOption = page.locator('button:has-text("Walnut")').first();
    await expect(walnutOption).toBeVisible();
    await walnutOption.click();

    const savedTheme = await page.evaluate(() => localStorage.getItem('classroom_board_theme'));
    expect(savedTheme).toBe('walnut');

    // 3. Manual board scale +/-
    const decScaleBtn = page.locator('button[title="Decrease Board Size"]').first();
    await expect(decScaleBtn).toBeVisible();
    await decScaleBtn.click();
    const savedScale = await page.evaluate(() => localStorage.getItem('classroom_board_scale'));
    expect(Number(savedScale)).toBeLessThan(1.0);
  });

  test('✓ Free Move Teaching Mode: Allows free piece repositioning and displays safe notation', async ({ page }) => {
    await loginAs(page, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');
    await dismissZoomModal(page);

    // 1. Toggle Free Move button in toolbar
    const freeMoveBtn = page.locator('button:has-text("Free Move")').first();
    await expect(freeMoveBtn).toBeVisible({ timeout: 10000 });
    await expect(freeMoveBtn).toContainText('OFF');

    await freeMoveBtn.click();
    await expect(freeMoveBtn).toContainText('ON');

    // 2. Play free / illegal move: pawn e2 to e5 (illegal 3-square jump in standard chess)
    await dragPiece(page, 'e2', 'e5');
    await page.waitForTimeout(2000);

    // Notation should display safe representation e2 → e5 without crashing!
    const notation = page.locator('#classroom-notation');
    await expect(notation.locator('text=/e2.*e5/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('✓ Coach Stockfish MultiPV=3: Strength levels and scrollable analysis', async ({ page }) => {
    await loginAs(page, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await page.goto(`/classroom/${testClassId}`);
    await page.waitForLoadState('networkidle');
    await dismissZoomModal(page);

    // 1. Switch to Engine tab
    const engineTab = page.locator('button:has-text("ENGINE")').first();
    await expect(engineTab).toBeVisible({ timeout: 10000 });
    await engineTab.click();

    // 2. Check engine panel headers
    await expect(page.locator('text=/Stockfish 16/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Top 3 Principal Variations/i').first()).toBeVisible({ timeout: 10000 });

    // 3. Select strength level
    const strengthSelect = page.locator('select').filter({ hasText: /Beginner|Easy|Medium|Hard/i }).first();
    await expect(strengthSelect).toBeVisible();
    await strengthSelect.selectOption('Hard');
    await expect(page.locator('text=/Depth.*18/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('✓ End Class Review Step: Coach records review and Student views completed class feedback', async ({ browser }) => {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const coachPage = await coachContext.newPage();

    // 1. Coach enters classroom and clicks End Class
    await loginAs(coachPage, TEST_USERS.coach.email, TEST_USERS.coach.password);
    await coachPage.goto(`/classroom/${testClassId}`);
    await coachPage.waitForLoadState('networkidle');
    await dismissZoomModal(coachPage);

    const endBtn = coachPage.locator('button:has-text("End Class")').first();
    await expect(endBtn).toBeVisible({ timeout: 10000 });
    await endBtn.click();

    // 2. Verify End Class Review Modal
    await expect(coachPage.locator('text=/Complete Class & Review/i').first()).toBeVisible({ timeout: 5000 });
    await expect(coachPage.locator('text=/WHAT WE LEARNED/i').first()).toBeVisible();

    // Fill "WHAT WE LEARNED"
    const learnedTextarea = coachPage.locator('textarea[placeholder*="Key concepts"]').first();
    await learnedTextarea.fill('Sicilian Defense Dragon Variation & Endgame King Activity');

    // Fill personal student feedback
    const feedbackInput = coachPage.locator('input[placeholder*="Personal feedback"]').first();
    if (await feedbackInput.isVisible().catch(() => false)) {
      await feedbackInput.fill('Excellent tactical awareness and calculation on move 12!');
    }

    // Click "Save Review & Conclude Class"
    const saveReviewBtn = coachPage.locator('button:has-text("Save Review & Conclude Class")').first();
    await expect(saveReviewBtn).toBeVisible();
    await saveReviewBtn.click();

    await coachPage.waitForURL(/\/dashboard\/coach\/classes/, { timeout: 25000 });

    // 3. Student logs in and checks completed class details
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const studentPage = await studentContext.newPage();
    await loginAs(studentPage, TEST_USERS.student.email, TEST_USERS.student.password);
    await studentPage.goto('/dashboard/student/classes');
    await studentPage.waitForLoadState('networkidle');

    // Switch to COMPLETED tab
    const completedTab = studentPage.locator('button', { hasText: 'COMPLETED' }).first();
    await expect(completedTab).toBeVisible({ timeout: 10000 });
    await completedTab.click();
    await studentPage.waitForTimeout(1000);

    // Verify "What We Learned" is visible on the card
    await expect(studentPage.locator('text=/What We Learned/i').first()).toBeVisible({ timeout: 15000 });
    await expect(studentPage.locator('text=/Sicilian Defense/i').first()).toBeVisible({ timeout: 10000 });

    await coachContext.close();
    await studentContext.close();
  });
});
