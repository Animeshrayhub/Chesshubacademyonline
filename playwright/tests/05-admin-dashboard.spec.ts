import { test, expect } from '../fixtures';

test.describe('Section 8: Admin Dashboard', () => {
  test.beforeEach(async ({ loginPage, adminDashboardPage }) => {
    await loginPage.navigate();
    await loginPage.login('admin@chesshubacademy.online', 'AdminPassword123!');
    await loginPage.verifyLoginSuccess(/\/dashboard\/admin/);
  });

  test('✓ Dashboard Loads', async ({ adminDashboardPage }) => {
    await expect(adminDashboardPage.adminHeader).toBeVisible();
  });

  test('✓ Create Student', async ({ adminDashboardPage }) => {
    await adminDashboardPage.createStudent('Bobby Fischer Jr.', 'bobby@example.com');
  });

  test('✓ Edit Student', async ({ adminDashboardPage }) => {
    await adminDashboardPage.editStudent('Robert James Fischer');
  });

  test('✓ Delete Student', async ({ adminDashboardPage }) => {
    await adminDashboardPage.deleteStudent();
  });

  test('✓ Create Coach', async ({ adminDashboardPage }) => {
    await adminDashboardPage.createCoach('GM Garry Kasparov', 'kasparov@example.com');
  });

  test('✓ Analytics', async ({ adminDashboardPage }) => {
    await expect(adminDashboardPage.analyticsWidget).toBeVisible();
  });

  test('✓ Reports', async ({ adminDashboardPage }) => {
    await expect(adminDashboardPage.reportsSection).toBeVisible();
  });
});
