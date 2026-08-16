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
    await loginPage.verifyLoginSuccess(/\/dashboard/);
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

  /**
   * EXPECTED SECURITY BEHAVIOR:
   * Production HTTP responses must include strict security headers:
   * - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
   * - X-Content-Type-Options: nosniff (prevents MIME type sniffing)
   * - Referrer-Policy: strict-origin-when-cross-origin (protects referrer privacy)
   * - Content-Security-Policy: default-src 'self'... (restricts resource loading)
   *
   * ACTUAL BEHAVIOR:
   * Next.js middleware ('src/middleware.ts') attaches these security headers to all HTTP responses.
   *
   * WHY THE EXPECTATION IS CORRECT:
   * Security headers are essential defense-in-depth protections mandated by OWASP guidelines.
   */
  test('✓ Security Headers Verification', async ({ request }) => {
    const response = await request.get('/dashboard/admin');
    const headers = response.headers();
    expect(headers['x-frame-options']?.toLowerCase()).toBe('sameorigin');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toBeDefined();
  });
});
