import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { BookDemoPage } from '../pages/BookDemoPage';
import { StudentDashboardPage } from '../pages/StudentDashboardPage';
import { CoachDashboardPage } from '../pages/CoachDashboardPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { PuzzlePage } from '../pages/PuzzlePage';
import { TournamentPage } from '../pages/TournamentPage';
import { HomeworkPage } from '../pages/HomeworkPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SettingsPage } from '../pages/SettingsPage';
import { Logger } from '../utils/logger';
import { PerformanceHelper } from '../utils/perfHelper';
import { A11yHelper } from '../utils/a11yHelper';
import { AIHelper } from '../utils/aiHelper';
import { DbHelper } from '../utils/dbHelper';

export type CustomFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  signupPage: SignupPage;
  bookDemoPage: BookDemoPage;
  studentDashboardPage: StudentDashboardPage;
  coachDashboardPage: CoachDashboardPage;
  adminDashboardPage: AdminDashboardPage;
  puzzlePage: PuzzlePage;
  tournamentPage: TournamentPage;
  homeworkPage: HomeworkPage;
  profilePage: ProfilePage;
  settingsPage: SettingsPage;
  logger: Logger;
  perfHelper: PerformanceHelper;
  a11yHelper: A11yHelper;
  aiHelper: AIHelper;
  dbHelper: DbHelper;
};

export const test = base.extend<CustomFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  bookDemoPage: async ({ page }, use) => {
    await use(new BookDemoPage(page));
  },
  studentDashboardPage: async ({ page }, use) => {
    await use(new StudentDashboardPage(page));
  },
  coachDashboardPage: async ({ page }, use) => {
    await use(new CoachDashboardPage(page));
  },
  adminDashboardPage: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },
  puzzlePage: async ({ page }, use) => {
    await use(new PuzzlePage(page));
  },
  tournamentPage: async ({ page }, use) => {
    await use(new TournamentPage(page));
  },
  homeworkPage: async ({ page }, use) => {
    await use(new HomeworkPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  logger: async ({ page }, use, testInfo) => {
    const logger = new Logger(page);
    await use(logger);
    if (testInfo.status !== testInfo.expectedStatus) {
      await logger.attachLogsToReport(testInfo);
    }
  },
  perfHelper: async ({ page }, use) => {
    await use(new PerformanceHelper(page));
  },
  a11yHelper: async ({ page }, use) => {
    await use(new A11yHelper(page));
  },
  aiHelper: async ({ page }, use) => {
    await use(new AIHelper(page));
  },
  dbHelper: async ({ page }, use) => {
    await use(new DbHelper(page));
  },
});

export { expect } from '@playwright/test';
