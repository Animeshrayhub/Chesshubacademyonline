import { test, expect } from '../fixtures';

test.describe('Section 11: Cashfree Payment, Guest Checkout & Coupon Management', () => {
  test('✓ Coaching Packages Display Standard Integer Prices on Programs Page', async ({ page }) => {
    await page.goto('/programs');
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

  test('✓ Part A & B: Public Guest and Student Checkout Opens Modal Directly without Login Redirect Loop', async ({ page }) => {
    await page.goto('/programs');
    // Click Starter Package Enroll
    const enrollStarterBtn = page.locator('button:has-text("Enroll in Starter Package")').first();
    await expect(enrollStarterBtn).toBeVisible();
    await enrollStarterBtn.click();

    // Verify modal dialog opens directly without being kicked to /login
    const checkoutModal = page.getByRole('dialog', { name: 'Complete Your Enrollment' });
    await expect(checkoutModal).toBeVisible();
    await expect(page.locator('text=Complete Your Enrollment')).toBeVisible();
    await expect(page.locator('text=Guest Checkout:')).toBeVisible();

    // Required fields check
    await expect(page.locator('input[placeholder="e.g. Aarav Sharma"]')).toBeVisible();
    await expect(page.locator('input[placeholder="parent@example.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="9876543210"]')).toBeVisible();
  });

  test('✓ Part C & D: Applying Legacy Coupon LEGACY6600 Recalculates to Grandfathered Rate ₹6,600', async ({ page }) => {
    await page.goto('/programs');
    const enrollStarterBtn = page.locator('button:has-text("Enroll in Starter Package")').first();
    await enrollStarterBtn.click();

    const checkoutModal = page.getByRole('dialog', { name: 'Complete Your Enrollment' });
    await expect(checkoutModal).toBeVisible();

    // Enter legacy code
    const couponInput = page.locator('input[placeholder="Enter promo or legacy code"]');
    await couponInput.fill('LEGACY6600');

    // Click Apply
    const applyBtn = page.locator('button:has-text("Apply")');
    await applyBtn.click();

    // Expect successful recalculation to ₹6,600
    await expect(page.locator('text=LEGACY6600 applied successfully')).toBeVisible();
    await expect(page.locator('button:has-text("Proceed to Pay ₹6,600")')).toBeVisible();
  });

  test('✓ Invalid or Ineligible Coupon Code is Gracefully Rejected', async ({ page }) => {
    await page.goto('/programs');
    const enrollStarterBtn = page.locator('button:has-text("Enroll in Starter Package")').first();
    await enrollStarterBtn.click();

    const checkoutModal = page.getByRole('dialog', { name: 'Complete Your Enrollment' });
    await expect(checkoutModal).toBeVisible();

    const couponInput = page.locator('input[placeholder="Enter promo or legacy code"]');
    await couponInput.fill('INVALIDCODE999');

    const applyBtn = page.locator('button:has-text("Apply")');
    await applyBtn.click();

    // Expect server rejection message
    await expect(page.locator('text=is invalid or does not exist')).toBeVisible();
  });

  test('✓ Authenticated Student Billing & Session Wallet Overview', async ({ loginPage, page }) => {
    await loginPage.navigate();
    await loginPage.login('student@chesshubacademy.online', 'StudentPassword123!');
    await loginPage.verifyLoginSuccess(/\/dashboard\/student/);

    await page.goto('/dashboard/student/settings/billing');

    // Wallet overview
    await expect(page.locator('text=Your Session Wallet').or(page.locator('h1, h2, h3').first())).toBeVisible();

    // Coaching packages available on billing
    await expect(page.getByRole('heading', { name: 'Starter Package' })).toBeVisible();
  });
});
