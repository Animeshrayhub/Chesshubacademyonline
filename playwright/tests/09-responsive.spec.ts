import { test, expect } from '../fixtures';

test.describe('Section 12: Responsive Testing', () => {
  const routes = ['/', '/book-demo', '/login', '/programs', '/about'];

  for (const route of routes) {
    test(`✓ Responsive Layout sanity check on ${route}`, async ({ page, aiHelper }) => {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const health = await aiHelper.detectBrokenUI();
      expect(health.hasBrokenImages, `Found broken images on ${route}`).toBeFalsy();
    });
  }
});
