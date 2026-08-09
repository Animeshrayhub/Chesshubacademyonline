import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  readonly profileHeader: Locator;
  readonly nameInput: Locator;
  readonly bioInput: Locator;
  readonly avatarUploadInput: Locator;
  readonly saveProfileBtn: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.profileHeader = page.locator('h1:has-text("Profile")').first();
    this.nameInput = page.locator('input[name="fullName"], input[name="name"]').first();
    this.bioInput = page.locator('textarea[name="bio"]').first();
    this.avatarUploadInput = page.locator('input[type="file"]').first();
    this.saveProfileBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update Profile")').first();
    this.successMessage = page.locator('.toast-success, [role="status"]').first();
  }

  public async navigate() {
    await this.goto('/dashboard/student/settings/profile');
  }

  public async updateProfile(name: string, bio?: string) {
    if (await this.nameInput.isVisible()) {
      await this.nameInput.fill(name);
    }
    if (bio && (await this.bioInput.isVisible())) {
      await this.bioInput.fill(bio);
    }
    if (await this.saveProfileBtn.isVisible()) {
      await this.saveProfileBtn.click();
    }
  }
}
