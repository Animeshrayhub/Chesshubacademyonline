import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  readonly settingsHeader: Locator;
  readonly darkModeToggle: Locator;
  readonly emailNotificationsCheckbox: Locator;
  readonly changePasswordBtn: Locator;
  readonly saveSettingsBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.settingsHeader = page.locator('h1:has-text("Settings")').first();
    this.darkModeToggle = page.locator('button[aria-label*="Theme"], input[name="darkMode"]').first();
    this.emailNotificationsCheckbox = page.locator('input[name="emailNotifications"]').first();
    this.changePasswordBtn = page.locator('button:has-text("Change Password")').first();
    this.saveSettingsBtn = page.locator('button:has-text("Save Settings")').first();
  }

  public async navigate() {
    await this.goto('/dashboard/student/settings');
  }

  public async toggleTheme() {
    if (await this.darkModeToggle.isVisible()) {
      await this.darkModeToggle.click();
    }
  }
}
