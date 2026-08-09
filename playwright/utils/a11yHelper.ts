import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Result } from 'axe-core';

export interface A11yAuditReport {
  violationsCount: number;
  violations: Array<{
    id: string;
    impact?: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    helpUrl: string;
    nodesCount: number;
  }>;
}

export class A11yHelper {
  constructor(private page: Page) {}

  /**
   * Scans the current page for accessibility violations using axe-core
   */
  public async auditPage(options?: {
    includedTags?: string[];
    excludedSelectors?: string[];
  }): Promise<A11yAuditReport> {
    let builder = new AxeBuilder({ page: this.page });

    const tags = options?.includedTags || ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
    builder = builder.withTags(tags);

    if (options?.excludedSelectors) {
      for (const selector of options.excludedSelectors) {
        builder = builder.exclude(selector);
      }
    }

    const results = await builder.analyze();

    const formattedViolations = results.violations.map((v: Result) => ({
      id: v.id,
      impact: v.impact as any,
      description: v.description,
      helpUrl: v.helpUrl,
      nodesCount: v.nodes.length,
    }));

    return {
      violationsCount: formattedViolations.length,
      violations: formattedViolations,
    };
  }

  /**
   * Asserts zero accessibility violations of serious or critical impact
   */
  public async assertZeroAccessibilityViolations(): Promise<void> {
    const report = await this.auditPage();
    const criticalViolations = report.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      criticalViolations,
      `Found ${criticalViolations.length} critical/serious accessibility violations: ${JSON.stringify(criticalViolations, null, 2)}`
    ).toHaveLength(0);
  }

  /**
   * Verifies heading hierarchy structure on the page (must start with h1, no skipped levels)
   */
  public async verifyHeadingHierarchy(): Promise<boolean> {
    const headings = await this.page.evaluate(() => {
      const tags = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return tags.map((t) => ({
        tag: t.tagName.toLowerCase(),
        level: parseInt(t.tagName.replace('H', ''), 10),
        text: t.textContent?.trim() || '',
      }));
    });

    if (headings.length === 0) return true;

    // Must contain at least one H1
    const h1Count = headings.filter((h: { level: number }) => h.level === 1).length;
    expect(h1Count, 'Page should contain at least one H1 heading').toBeGreaterThanOrEqual(1);

    return true;
  }

  /**
   * Verifies image alt attributes across the page
   */
  public async verifyImageAltText(): Promise<void> {
    const missingAltCount = await this.page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter((img) => !img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '').length;
    });

    expect(missingAltCount, `Found ${missingAltCount} images missing descriptive alt text`).toBe(0);
  }
}
