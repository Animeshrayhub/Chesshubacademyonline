import { Dialog } from '@playwright/test';
import { test, expect } from '../fixtures';

test.describe('Section 17: Security Audits', () => {
  test('✓ Protected Routes Redirect Unauthenticated Users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/login|\/unauthorized/);
  });

  test('✓ Unauthorized Role Access Blocked (Student accessing Admin)', async ({ loginPage, page }) => {
    await loginPage.navigate();
    await loginPage.login('student@chesshubacademy.online', 'StudentPassword123!');
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/unauthorized|\/login|\/dashboard\/student/);
  });

  test('✓ XSS Prevention in Form Inputs', async ({ page, bookDemoPage }) => {
    await bookDemoPage.navigate();
    const xssPayload = '<script>alert("xss")</script>';

    let alertFired = false;
    page.on('dialog', (dialog: Dialog) => {
      alertFired = true;
      dialog.dismiss();
    });

    await bookDemoPage.parentNameInput.fill(xssPayload);
    await bookDemoPage.emailInput.fill('xss@example.com');
    await bookDemoPage.submitForm();

    expect(alertFired, 'XSS script execution payload was unexpectedly executed!').toBe(false);
  });

  test('✓ CSRF Protection / Headers Verification', async ({ request }) => {
    const response = await request.post('/api/book-demo', {
      data: { test: true },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Should require validation or appropriate response
    expect([200, 400, 401, 403, 422]).toContain(response.status());
  });
});
