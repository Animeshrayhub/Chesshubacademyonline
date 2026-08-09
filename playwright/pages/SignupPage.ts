import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SignupPage extends BasePage {
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.fullNameInput = page.locator('input[name="fullName"], input[name="name"]').first();
    this.emailInput = page.locator('input[name="email"]').first();
    this.passwordInput = page.locator('input[name="password"]').first();
    this.roleSelect = page.locator('select[name="role"]').first();
    this.submitButton = page.locator('button[type="submit"]:has-text("Sign Up"), button:has-text("Register")').first();
    this.successMessage = page.locator('.success-banner, [role="status"]').first();
  }

  public async navigate() {
    await this.goto('/login?mode=signup');
  }

  public async fillSignupForm(name: string, email: string, pass: string, role: string = 'student') {
    if (await this.fullNameInput.isVisible()) {
      await this.fullNameInput.fill(name);
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    if (await this.roleSelect.isVisible()) {
      await this.roleSelect.selectOption(role);
    }
    await this.submitButton.click();
  }
}
