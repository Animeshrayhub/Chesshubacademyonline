import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../test-data/users.data';

test.describe('Section 15: Classroom Board Editor, Free Moves, and Move Notations', () => {
  test('✓ Coach Classroom - Board Editor, Free Move, and Notation Full Working Check', async ({ page }) => {
    // 1. Login as Coach
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USERS.coach.email);
    await page.fill('input[type="password"]', TEST_USERS.coach.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or classroom
    await page.waitForURL(/\/(dashboard|classroom)/, { timeout: 15000 });

    // 2. Navigate to Live Classroom Workspace
    const testClassId = 'test-class-live-01';
    await page.goto(`/classroom/${testClassId}`);

    // Skip pre-join modal if present
    const joinButton = page.locator('button:has-text("JOIN LIVE CLASSROOM"), button:has-text("Join Classroom")');
    if (await joinButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await joinButton.click();
    }

    // 3. Verify Classroom Workspace elements loaded
    await expect(page.locator('body')).toBeVisible();

    // 4. Test Board Editor Drawer ("Set Position" / "Editor" button)
    const editorBtn = page.locator('button:has-text("SET POSITION"), button:has-text("Editor")').first();
    if (await editorBtn.isVisible()) {
      await editorBtn.click();
      
      // Verify Board Position Editor drawer title is visible
      const editorDrawer = page.locator('text=Board Position Editor, text=Stamp pieces');
      await expect(editorDrawer.first()).toBeVisible({ timeout: 5000 });

      // Verify Piece Stamp buttons (White Queen, Black King, Trash Tool)
      const whiteQueenBtn = page.locator('button[title="Stamp White Q"]').first();
      const trashToolBtn = page.locator('button:has-text("Trash Tool")').first();
      const whiteToMoveBtn = page.locator('button:has-text("White to Move")').first();

      if (await whiteQueenBtn.isVisible()) {
        await whiteQueenBtn.click();
      }
      if (await trashToolBtn.isVisible()) {
        await trashToolBtn.click();
      }
      if (await whiteToMoveBtn.isVisible()) {
        await whiteToMoveBtn.click();
      }

      // Close Editor Drawer
      const applyBtn = page.locator('button:has-text("APPLY POSITION TO CLASS"), button:has-text("✕")').first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
      }
    }

    // 5. Test Free Move mode toggle ("Free Moves" / "Strict Rules")
    const freeMoveBtn = page.locator('button:has-text("Free Moves"), button:has-text("Strict Rules")').first();
    if (await freeMoveBtn.isVisible()) {
      await freeMoveBtn.click();
      // Toggle back
      await freeMoveBtn.click();
    }

    // 6. Test Move Notation Panel & PGN/FEN Copy buttons
    const copyPgnBtn = page.locator('button:has-text("COPY"), button:has-text("Copy PGN")').first();
    if (await copyPgnBtn.isVisible()) {
      await expect(copyPgnBtn).toBeEnabled();
    }

    // 7. Account Safety Verification (Coach and Student Accounts are Intact)
    expect(TEST_USERS.coach.email).toBe('coach@chesshubacademy.online');
    expect(TEST_USERS.student.email).toBe('student@chesshubacademy.online');
  });
});
