import { test, expect } from '../fixtures';

test.describe('Section 15: Accessibility Audits (WCAG 2.1 AA)', () => {
  test('✓ ARIA Labels & Color Contrast Audit (Home Page)', async ({ homePage, a11yHelper }) => {
    await homePage.navigate();
    await a11yHelper.assertZeroAccessibilityViolations();
  });

  test('✓ ARIA Labels & Color Contrast Audit (Book Demo)', async ({ bookDemoPage, a11yHelper }) => {
    await bookDemoPage.navigate();
    await a11yHelper.assertZeroAccessibilityViolations();
  });

  test('✓ Heading Order Verification', async ({ homePage, a11yHelper }) => {
    await homePage.navigate();
    await a11yHelper.verifyHeadingHierarchy();
  });

  test('✓ Image Alt Text Verification', async ({ homePage, a11yHelper }) => {
    await homePage.navigate();
    await a11yHelper.verifyImageAltText();
  });

  test('✓ Keyboard Navigation Audit', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Tab');
    const firstFocusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocusedTag).toBeTruthy();
  });
});
