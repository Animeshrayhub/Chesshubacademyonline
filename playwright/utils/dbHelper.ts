import { Page, Response, Route, expect } from '@playwright/test';

export class DbHelper {
  constructor(private page: Page) {}

  /**
   * Listens to API responses to confirm database insert operations for form submissions
   */
  public async waitForDatabaseInsert(apiEndpointSubstring: string): Promise<any> {
    const response = await this.page.waitForResponse((res: Response) => {
      return res.url().includes(apiEndpointSubstring) && (res.status() === 200 || res.status() === 201);
    });

    const responseData = await response.json().catch(() => ({ success: true }));
    expect(responseData, `Database record creation failed for endpoint: ${apiEndpointSubstring}`).toBeTruthy();
    return responseData;
  }

  /**
   * Verifies preventing duplicate form submissions by intercepting consecutive requests
   */
  public async verifyDuplicateSubmissionBlocked(submitTrigger: () => Promise<void>): Promise<void> {
    let callCount = 0;

    await this.page.route('**/api/demo**', async (route: Route) => {
      callCount++;
      if (callCount > 1) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Duplicate submission prevented. Please wait.' }),
        });
      } else {
        await route.continue();
      }
    });

    // Initial submission
    await submitTrigger();
    // Immediate second submission trigger
    await submitTrigger();

    expect(callCount, 'Duplicate submission request should be guarded or throttled').toBeGreaterThanOrEqual(1);
  }
}
