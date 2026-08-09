import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly emailErrorMsg: Locator;
  readonly passwordErrorMsg: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signupLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
    this.loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
    this.errorMessage = page.locator('[role="alert"], .error-banner, .text-red-500').first();
    this.emailErrorMsg = page.locator('#email-error, [data-testid="email-error"]').first();
    this.passwordErrorMsg = page.locator('#password-error, [data-testid="password-error"]').first();
    this.forgotPasswordLink = page.locator('a[href*="forgot-password"]');
    this.signupLink = page.locator('a[href*="signup"]');
  }

  public async navigate() {
    await this.goto('/login');
  }

  public async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }

  public async verifyLoginSuccess(targetDashboardPattern: RegExp = /\/dashboard/) {
    await this.page.waitForURL(targetDashboardPattern, { timeout: 15000 });
    expect(this.page.url()).toMatch(targetDashboardPattern);
  }

  public async verifyErrorMessage(expectedText?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (expectedText) {
      await expect(this.errorMessage).toContainText(expectedText);
    }
  }

  public async verifyFieldValidations() {
    await this.login('', '');
    await expect(this.loginButton).toBeVisible();
  }
}
