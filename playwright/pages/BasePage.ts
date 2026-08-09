import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';
import { PerformanceHelper } from '../utils/perfHelper';
import { A11yHelper } from '../utils/a11yHelper';
import { AIHelper } from '../utils/aiHelper';

export abstract class BasePage {
  readonly page: Page;
  readonly logger: Logger;
  readonly perfHelper: PerformanceHelper;
  readonly a11yHelper: A11yHelper;
  readonly aiHelper: AIHelper;

  // Common Header & Layout Elements
  readonly headerLogo: Locator;
  readonly navHome: Locator;
  readonly navLogin: Locator;
  readonly navBookDemo: Locator;
  readonly userMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly notificationBell: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logger = new Logger(page);
    this.perfHelper = new PerformanceHelper(page);
    this.a11yHelper = new A11yHelper(page);
    this.aiHelper = new AIHelper(page);

    this.headerLogo = page.locator('header a:has-text("ChessHub"), header a[href="/"]').first();
    this.navHome = page.locator('nav a[href="/"]').first();
    this.navLogin = page.locator('a[href="/login"], button:has-text("Login")').first();
    this.navBookDemo = page.locator('a[href="/book-demo"], button:has-text("Book Demo")').first();
    this.userMenuButton = page.locator('button[id*="user-menu"], button[aria-label="User Menu"]').first();
    this.logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    this.notificationBell = page.locator('button[aria-label*="Notification"]').first();
  }

  /**
   * Navigates to a specific path and waits for network idle / DOM content loaded
   */
  public async goto(path: string = '/') {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Performs a visual screenshot baseline match assertion
   */
  public async verifyVisualSnapshot(snapshotName: string) {
    await expect(this.page).toHaveScreenshot(snapshotName);
  }

  /**
   * Performs user logout workflow
   */
  public async logout() {
    if (await this.userMenuButton.isVisible()) {
      await this.userMenuButton.click();
    }
    if (await this.logoutButton.isVisible()) {
      await this.logoutButton.click();
    } else {
      await this.page.goto('/login');
    }
    await this.page.waitForURL(/\/login|\/$/);
  }

  /**
   * Validates page SEO metadata
   */
  public async verifySEO(expectedTitlePattern: RegExp | string) {
    await expect(this.page).toHaveTitle(expectedTitlePattern);
    const metaDescription = this.page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
  }
}
