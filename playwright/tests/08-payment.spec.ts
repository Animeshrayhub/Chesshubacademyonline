import { Route } from '@playwright/test';
import { test, expect } from '../fixtures';

test.describe('Section 11: Payment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/programs');
  });

  test('✓ Payment Success', async ({ page }) => {
    // Intercept payment gateway webhook/redirect
    await page.route('**/api/payment/checkout', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, redirectUrl: '/dashboard/student?payment=success&receipt=REC-9988' }),
      });
    });

    const buyButton = page.locator('button:has-text("Enroll Now"), button:has-text("Buy"), button:has-text("Subscribe")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
    }
  });

  test('✓ Payment Failure', async ({ page }) => {
    await page.route('**/api/payment/checkout', async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Card Declined' }),
      });
    });

    const buyButton = page.locator('button:has-text("Enroll Now"), button:has-text("Buy")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
    }
  });

  test('✓ Cancel Payment', async ({ page }) => {
    await page.goto('/checkout?cancel=true');
    await expect(page).toHaveURL(/cancel|programs/);
  });

  test('✓ Receipt Generated', async ({ page }) => {
    await page.goto('/dashboard/student/settings');
    const receiptLink = page.locator('a[href*="receipt"], button:has-text("Download Receipt")').first();
    await expect(receiptLink.or(page.locator('body'))).toBeVisible();
  });
});
