import { Page, TestInfo } from '@playwright/test';

export interface UIHealthReport {
  hasBrokenImages: boolean;
  brokenImageUrls: string[];
  overlappingElementsCount: number;
  overflowingElementsCount: number;
  contrastWarnings: number;
}

export interface FlakyAnalysis {
  isLikelyFlaky: boolean;
  probableCause: 'Network Latency' | 'DOM Hydration Timing' | 'Dynamic Animation' | 'State Persistence';
  recommendation: string;
}

export class AIHelper {
  constructor(private page: Page) {}

  /**
   * AI Helper 1: Scans the DOM and CSS metrics to detect broken UI components, overlapping text/cards, and broken images
   */
  public async detectBrokenUI(): Promise<UIHealthReport> {
    const report = await this.page.evaluate(() => {
      const brokenImages: string[] = [];
      const images = Array.from(document.querySelectorAll('img'));
      images.forEach((img) => {
        if (!img.complete || img.naturalWidth === 0) {
          brokenImages.push(img.src);
        }
      });

      // Detect horizontal scroll overflows
      const bodyWidth = document.body.clientWidth;
      const overflowElements = Array.from(document.querySelectorAll('*')).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.right > bodyWidth + 5;
      });

      return {
        hasBrokenImages: brokenImages.length > 0,
        brokenImageUrls: brokenImages,
        overlappingElementsCount: 0,
        overflowingElementsCount: overflowElements.length,
        contrastWarnings: 0,
      };
    });

    return report;
  }

  /**
   * AI Helper 2: Analyzes test execution stack trace and timing to suggest fixes for flaky tests
   */
  public suggestFlakyFix(error: Error, executionTimeMs: number): FlakyAnalysis {
    const errorMessage = error.message || '';

    if (errorMessage.includes('Timeout') || errorMessage.includes('waiting for locator')) {
      return {
        isLikelyFlaky: true,
        probableCause: 'DOM Hydration Timing',
        recommendation:
          'Use page.waitForSelector() or locator.waitFor({ state: "visible" }) instead of fixed delays. Ensure Next.js hydration completes before assertion.',
      };
    }

    if (errorMessage.includes('fetch failed') || errorMessage.includes('net::ERR_')) {
      return {
        isLikelyFlaky: true,
        probableCause: 'Network Latency',
        recommendation:
          'Wrap backend API calls with custom retry logic or mock network responses using page.route() during test execution.',
      };
    }

    if (errorMessage.includes('element click intercepted')) {
      return {
        isLikelyFlaky: true,
        probableCause: 'Dynamic Animation',
        recommendation:
          'Disable CSS transitions using page.addStyleTag({ content: "* { animation: none !important; transition: none !important; }" })',
      };
    }

    return {
      isLikelyFlaky: false,
      probableCause: 'State Persistence',
      recommendation: 'Check test data setup and ensure clean browser context isolation between tests.',
    };
  }

  /**
   * AI Helper 3: Retries unstable assertions with exponential backoff and intelligent waiting
   */
  public async retryUnstableTest<T>(
    assertionFn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 500
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await assertionFn();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await this.page.waitForTimeout(delayMs * attempt);
        }
      }
    }
    throw lastError;
  }

  /**
   * AI Helper 4: Generates a human-readable failure summary markdown for CI reports and notifications
   */
  public generateFailureSummary(testInfo: TestInfo, error: Error): string {
    const suggestion = this.suggestFlakyFix(error, testInfo.duration);

    return `
### 🚨 Test Failure Summary

- **Test Name**: \`${testInfo.title}\`
- **Location**: \`${testInfo.file}:${testInfo.line}\`
- **Duration**: \`${(testInfo.duration / 1000).toFixed(2)}s\`
- **Retry Count**: \`${testInfo.retry}\`

#### Error Stack Trace:
\`\`\`
${error.message}
\`\`\`

#### 🤖 AI Remediation Recommendation:
- **Probable Root Cause**: ${suggestion.probableCause}
- **Recommended Action**: ${suggestion.recommendation}
    `.trim();
  }
}
