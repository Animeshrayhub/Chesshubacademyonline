# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 14-security.spec.ts >> Section 17: Security Audits >> ✓ CSRF Protection / Headers Verification
- Location: playwright\tests\14-security.spec.ts:35:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 404
Received array: [200, 400, 401, 403, 422]
```

# Test source

```ts
  1  | import { Dialog } from '@playwright/test';
  2  | import { test, expect } from '../fixtures';
  3  | 
  4  | test.describe('Section 17: Security Audits', () => {
  5  |   test('✓ Protected Routes Redirect Unauthenticated Users', async ({ page }) => {
  6  |     await page.context().clearCookies();
  7  |     await page.goto('/dashboard/admin');
  8  |     await expect(page).toHaveURL(/\/login|\/unauthorized/);
  9  |   });
  10 | 
  11 |   test('✓ Unauthorized Role Access Blocked (Student accessing Admin)', async ({ loginPage, page }) => {
  12 |     await loginPage.navigate();
  13 |     await loginPage.login('student@chesshubacademy.online', 'StudentPassword123!');
  14 |     await page.goto('/dashboard/admin');
  15 |     await expect(page).toHaveURL(/\/unauthorized|\/login|\/dashboard\/student/);
  16 |   });
  17 | 
  18 |   test('✓ XSS Prevention in Form Inputs', async ({ page, bookDemoPage }) => {
  19 |     await bookDemoPage.navigate();
  20 |     const xssPayload = '<script>alert("xss")</script>';
  21 | 
  22 |     let alertFired = false;
  23 |     page.on('dialog', (dialog: Dialog) => {
  24 |       alertFired = true;
  25 |       dialog.dismiss();
  26 |     });
  27 | 
  28 |     await bookDemoPage.parentNameInput.fill(xssPayload);
  29 |     await bookDemoPage.emailInput.fill('xss@example.com');
  30 |     await bookDemoPage.submitForm();
  31 | 
  32 |     expect(alertFired, 'XSS script execution payload was unexpectedly executed!').toBe(false);
  33 |   });
  34 | 
  35 |   test('✓ CSRF Protection / Headers Verification', async ({ request }) => {
  36 |     const response = await request.post('/api/book-demo', {
  37 |       data: { test: true },
  38 |       headers: {
  39 |         'Content-Type': 'application/json',
  40 |       },
  41 |     });
  42 | 
  43 |     // Should require validation or appropriate response
> 44 |     expect([200, 400, 401, 403, 422]).toContain(response.status());
     |                                       ^ Error: expect(received).toContain(expected) // indexOf
  45 |   });
  46 | });
  47 | 
```