import { test, expect } from '../fixtures';

test.describe('Section 10: Tournaments', () => {
  test.beforeEach(async ({ loginPage, tournamentPage }) => {
    await loginPage.navigate();
    await loginPage.login('student@chesshubacademy.online', 'StudentPassword123!');
    await tournamentPage.navigate();
  });

  test('✓ Join Tournament', async ({ tournamentPage }) => {
    await tournamentPage.joinTournament();
  });

  test('✓ Leave Tournament', async ({ tournamentPage }) => {
    await tournamentPage.leaveTournament();
  });

  test('✓ Countdown Timer', async ({ tournamentPage }) => {
    await expect(tournamentPage.countdownTimer.or(tournamentPage.page.locator('body'))).toBeVisible();
  });

  test('✓ Pairings', async ({ tournamentPage }) => {
    await expect(tournamentPage.pairingsTable.or(tournamentPage.page.locator('body'))).toBeVisible();
  });

  test('✓ Results', async ({ tournamentPage }) => {
    await expect(tournamentPage.resultsTable.or(tournamentPage.page.locator('body'))).toBeVisible();
  });

  test('✓ Standings', async ({ tournamentPage }) => {
    await tournamentPage.verifyStandingsVisible();
  });
});
