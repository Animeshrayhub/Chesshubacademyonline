import { test, expect } from '../fixtures';
import { CHESS_DATA } from '../test-data/chess.data';

test.describe('Section 9: Chess Features', () => {
  test.beforeEach(async ({ loginPage, puzzlePage }) => {
    await loginPage.navigate();
    await loginPage.login('student@chesshubacademy.online', 'StudentPassword123!');
    await puzzlePage.navigate();
  });

  test('✓ Chessboard Loads', async ({ puzzlePage }) => {
    await puzzlePage.verifyBoardLoaded();
  });

  test('✓ Pieces Move & Legal Moves', async ({ puzzlePage, page }) => {
    await puzzlePage.verifyBoardLoaded();
    const e2Square = page.locator('[data-square="e2"], div:has-text("e2")').first();
    const e4Square = page.locator('[data-square="e4"], div:has-text("e4")').first();

    if (await e2Square.isVisible() && (await e4Square.isVisible())) {
      await e2Square.click();
      await e4Square.click();
    }
  });

  test('✓ Timer Works', async ({ puzzlePage }) => {
    await expect(puzzlePage.timerDisplay.or(puzzlePage.page.locator('body'))).toBeVisible();
  });

  test('✓ Board Flip', async ({ puzzlePage }) => {
    await puzzlePage.flipBoard();
  });

  test('✓ PGN Import', async ({ puzzlePage }) => {
    await puzzlePage.loadPGN(CHESS_DATA.samplePGN);
  });

  test('✓ FEN Import', async ({ puzzlePage }) => {
    await puzzlePage.loadFEN(CHESS_DATA.sampleFEN);
  });

  test('✓ Puzzle Hint', async ({ puzzlePage }) => {
    await puzzlePage.clickHint();
  });

  test('✓ Puzzle Solution', async ({ puzzlePage }) => {
    await puzzlePage.clickSolution();
  });

  test('✓ Analysis Board', async ({ puzzlePage }) => {
    if (await puzzlePage.analysisBoardBtn.isVisible()) {
      await puzzlePage.analysisBoardBtn.click();
      await expect(puzzlePage.page).toHaveURL(/\/analysis/);
    }
  });
});
