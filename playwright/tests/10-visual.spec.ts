import { test, expect } from '../fixtures';

test.describe('Section 13: Visual Testing', () => {
  test('✓ Home Page Baseline Snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('home-page-desktop.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });

  test('✓ Book Demo Page Baseline Snapshot', async ({ page }) => {
    await page.goto('/book-demo');
    await expect(page).toHaveScreenshot('book-demo-desktop.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });

  test('✓ Login Page Baseline Snapshot', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login-page-desktop.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('✓ Detect UI Health (Broken Images, Overflows)', async ({ page, aiHelper }) => {
    await page.goto('/');
    const uiReport = await aiHelper.detectBrokenUI();

    expect(uiReport.hasBrokenImages, `Broken images detected: ${uiReport.brokenImageUrls.join(', ')}`).toBe(false);
    expect(uiReport.overflowingElementsCount, 'Detected overflowing elements beyond viewport width').toBeLessThanOrEqual(5);
  });
});
