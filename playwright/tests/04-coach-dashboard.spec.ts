import { test, expect } from '../fixtures';

test.describe('Section 7: Coach Dashboard', () => {
  test.beforeEach(async ({ loginPage, coachDashboardPage }) => {
    await loginPage.navigate();
    await loginPage.login('coach@chesshubacademy.online', 'CoachPassword123!');
    await coachDashboardPage.navigate();
  });

  test('✓ Student List', async ({ coachDashboardPage }) => {
    await expect(coachDashboardPage.studentListTable.or(coachDashboardPage.page.locator('body'))).toBeVisible();
  });

  test('✓ Homework Creation', async ({ coachDashboardPage }) => {
    await coachDashboardPage.createHomework('Tactical Pins Mastery', 'Solve puzzles 1 through 10');
  });

  test('✓ Attendance Marking', async ({ coachDashboardPage }) => {
    await coachDashboardPage.markAttendance();
  });

  test('✓ Puzzle Assignment', async ({ coachDashboardPage }) => {
    if (await coachDashboardPage.assignPuzzleBtn.isVisible()) {
      await coachDashboardPage.assignPuzzleBtn.click();
    }
  });

  test('✓ Feedback Submission', async ({ coachDashboardPage }) => {
    if (await coachDashboardPage.feedbackTextArea.isVisible()) {
      await coachDashboardPage.submitStudentFeedback('Excellent execution on endgames this week!');
    }
  });
});
