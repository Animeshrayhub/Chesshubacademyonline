import { test, expect } from '../fixtures';
import { TEST_USERS } from '../test-data/users.data';

test.describe('Section 4: Login Tests', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('✓ Admin Login', async ({ loginPage }) => {
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    await loginPage.verifyLoginSuccess(/\/dashboard/);
  });

  test('✓ Coach Login', async ({ loginPage }) => {
    await loginPage.login(TEST_USERS.coach.email, TEST_USERS.coach.password);
    await loginPage.verifyLoginSuccess(/\/dashboard/);
  });

  test('✓ Student Login', async ({ loginPage }) => {
    await loginPage.login(TEST_USERS.student.email, TEST_USERS.student.password);
    await loginPage.verifyLoginSuccess(/\/dashboard/);
  });

  test('✓ Invalid Password', async ({ loginPage }) => {
    await loginPage.login(TEST_USERS.student.email, TEST_USERS.invalidUser.password);
    await loginPage.verifyErrorMessage();
  });

  test('✓ Empty Fields', async ({ loginPage }) => {
    await loginPage.login(TEST_USERS.emptyUser.email, TEST_USERS.emptyUser.password);
    await loginPage.verifyFieldValidations();
  });

  test('✓ Logout', async ({ loginPage, page }) => {
    await loginPage.login(TEST_USERS.student.email, TEST_USERS.student.password);
    await loginPage.verifyLoginSuccess(/\/dashboard/);
    await loginPage.logout();
    await expect(page).toHaveURL(/\/login|\/$/);
  });

  test('✓ Session Expiry / Protected Route Redirect', async ({ page }) => {
    // Clear cookies / session context
    await page.context().clearCookies();
    await page.goto('/dashboard/student');
    await expect(page).toHaveURL(/\/login|\/unauthorized/);
  });
});
