import { test as base, BrowserContext } from '@playwright/test';
import { TEST_USERS } from '../test-data/users.data';

export type AuthFixtures = {
  adminContext: BrowserContext;
  coachContext: BrowserContext;
  studentContext: BrowserContext;
};

export const authTest = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USERS.admin.email);
    await page.fill('input[type="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await use(context);
    await context.close();
  },

  coachContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USERS.coach.email);
    await page.fill('input[type="password"]', TEST_USERS.coach.password);
    await page.click('button[type="submit"]');
    await use(context);
    await context.close();
  },

  studentContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USERS.student.email);
    await page.fill('input[type="password"]', TEST_USERS.student.password);
    await page.click('button[type="submit"]');
    await use(context);
    await context.close();
  },
});
