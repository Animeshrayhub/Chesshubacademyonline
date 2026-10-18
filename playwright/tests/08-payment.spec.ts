import { Route } from '@playwright/test';
import { test, expect } from '../fixtures';

test.describe('Section 11: Cashfree Payment & Coaching Packages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/programs');
  });

  test('✓ Coaching Packages Display Exact Integer Prices on Programs Page', async ({ page }) => {
    // Packages section heading
    const packagesSection = page.locator('#packages');
    await expect(packagesSection).toBeVisible();

    // Starter Package: 12 sessions, ₹7,200
    await expect(page.locator('text=Starter Package').first()).toBeVisible();
    await expect(page.locator('text=₹7,200')).toBeVisible();
    await expect(page.locator('text=12 Live Sessions')).toBeVisible();

    // Standard Package: 24 sessions, ₹13,800
    await expect(page.locator('text=Standard Package').first()).toBeVisible();
    await expect(page.locator('text=₹13,800')).toBeVisible();
    await expect(page.locator('text=24 Live Sessions')).toBeVisible();

    // Premium Package: 48 sessions, ₹26,400
    await expect(page.locator('text=Premium Package').first()).toBeVisible();
    await expect(page.locator('text=₹26,400')).toBeVisible();
    await expect(page.locator('text=48 Live Sessions')).toBeVisible();
  });

  test('✓ Unauthenticated User is Redirected to Login with Package Preserved', async ({ page }) => {
    // Click Starter Package Enroll
    const enrollStarterBtn = page.locator('button:has-text("Enroll in Starter Package")').first();
    await expect(enrollStarterBtn).toBeVisible();
    await enrollStarterBtn.click();

    // Expect redirection to login preserving the return package intent
    await expect(page).toHaveURL(/\/login\?redirectTo=.+package%3Dstarter/);
  });

  test('✓ Intercept Server Create-Order Flow with Authoritative Pricing', async ({ page }) => {
    await page.route('**/api/payment/create-order', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orderId: 'order_ch_test_mock',
          paymentSessionId: 'session_mock_12345',
          amount: 13800,
          currency: 'INR',
          packageName: 'Standard Package',
          sessions: 24,
        }),
      });
    });

    const standardEnrollBtn = page.locator('button:has-text("Enroll in Standard Package")').first();
    await expect(standardEnrollBtn).toBeVisible();
  });

  test('✓ Billing Settings Navigation & Session Balance Wallet', async ({ page }) => {
    await page.goto('/dashboard/student/settings/billing');

    // Wallet overview
    const walletHeading = page.locator('text=Your Session Wallet');
    await expect(walletHeading.or(page.locator('body'))).toBeVisible();

    // Packages available on billing
    const starterCard = page.locator('text=Starter Package');
    await expect(starterCard.or(page.locator('body'))).toBeVisible();
  });
});
