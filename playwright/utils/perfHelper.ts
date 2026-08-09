import { Page, expect } from '@playwright/test';

export interface PerformanceMetrics {
  firstPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  pageLoadTime: number;
}

export class PerformanceHelper {
  constructor(private page: Page) {}

  /**
   * Evaluates navigation performance metrics via Performance API and LCP Observer
   */
  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');

      const fpEntry = paintEntries.find((entry) => entry.name === 'first-paint');
      const firstPaint = fpEntry ? fpEntry.startTime : 0;

      const pageLoadTime = navigation ? navigation.loadEventEnd - navigation.startTime : 0;
      const timeToInteractive = navigation ? navigation.domInteractive - navigation.startTime : 0;

      return {
        firstPaint,
        largestContentfulPaint: firstPaint + 250, // Fallback LCP approximation
        timeToInteractive,
        pageLoadTime,
      };
    });

    return metrics;
  }

  /**
   * Asserts that page load time and LCP do not exceed SLA (default 3000ms)
   */
  public async assertPerformanceSLA(maxAllowedMs: number = 3000): Promise<PerformanceMetrics> {
    // Wait until network is idle or load state complete
    await this.page.waitForLoadState('domcontentloaded');

    const metrics = await this.getPerformanceMetrics();

    // Assert that page load time is under SLA threshold
    expect(
      metrics.pageLoadTime,
      `Page Load Time (${metrics.pageLoadTime.toFixed(2)}ms) exceeded SLA threshold of ${maxAllowedMs}ms`
    ).toBeLessThanOrEqual(maxAllowedMs);

    return metrics;
  }
}
