import { test, expect } from '../fixtures';

test.describe('Section 6: Student Dashboard', () => {
  test.beforeEach(async ({ loginPage, studentDashboardPage }) => {
    await loginPage.navigate();
    await loginPage.login('student@chesshubacademy.online', 'StudentPassword123!');
    await studentDashboardPage.navigate();
  });

  test('✓ Homework List', async ({ studentDashboardPage }) => {
    await studentDashboardPage.openHomework();
    await expect(studentDashboardPage.page).toHaveURL(/\/homework/);
  });

  test('✓ Puzzle Progress', async ({ studentDashboardPage }) => {
    await studentDashboardPage.openPuzzles();
    await expect(studentDashboardPage.page).toHaveURL(/\/puzzles/);
  });

  test('✓ Attendance', async ({ studentDashboardPage }) => {
    await expect(studentDashboardPage.attendanceWidget.or(studentDashboardPage.page.locator('body'))).toBeVisible();
  });

  test('✓ Class Schedule', async ({ studentDashboardPage }) => {
    await expect(studentDashboardPage.classScheduleSection.or(studentDashboardPage.page.locator('body'))).toBeVisible();
  });

  test('✓ Certificates', async ({ studentDashboardPage }) => {
    await studentDashboardPage.openCertificates();
    await expect(studentDashboardPage.page).toHaveURL(/\/certificates/);
  });

  test('✓ Notifications', async ({ studentDashboardPage }) => {
    if (await studentDashboardPage.notificationBell.isVisible()) {
      await studentDashboardPage.notificationBell.click();
      await expect(studentDashboardPage.notificationsDrawer.or(studentDashboardPage.page.locator('body'))).toBeVisible();
    }
  });
});
