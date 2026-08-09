import { test, expect } from '../fixtures';

test.describe('Section 14: Performance SLA Tests', () => {
  const pagesToTest = ['/', '/book-demo', '/login', '/programs'];

  for (const path of pagesToTest) {
    test(`✓ Measure metrics and assert < 3s SLA on ${path}`, async ({ page, perfHelper }) => {
      await page.goto(path);
      const metrics = await perfHelper.assertPerformanceSLA(3000);

      console.log(`[Performance SLA - ${path}]`, {
        FirstPaint: `${metrics.firstPaint.toFixed(2)}ms`,
        LCP: `${metrics.largestContentfulPaint.toFixed(2)}ms`,
        TTI: `${metrics.timeToInteractive.toFixed(2)}ms`,
        PageLoadTime: `${metrics.pageLoadTime.toFixed(2)}ms`,
      });
    });
  }
});
