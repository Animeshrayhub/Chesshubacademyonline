import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { DemoFormData } from '../test-data/demoForms.data';

export class BookDemoPage extends BasePage {
  readonly pageTitle: Locator;
  readonly parentNameInput: Locator;
  readonly studentNameInput: Locator;
  readonly emailInput: Locator;
  readonly mobileInput: Locator;
  readonly gradeSelect: Locator;
  readonly datePicker: Locator;
  readonly timeSelect: Locator;
  readonly submitButton: Locator;
  readonly successToast: Locator;
  readonly emailValidationMsg: Locator;
  readonly mobileValidationMsg: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1:has-text("Book"), h2:has-text("Demo")').first();
    this.parentNameInput = page.locator('input[name="parentName"], input[id="parentName"]').first();
    this.studentNameInput = page.locator('input[name="studentName"], input[id="studentName"]').first();
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.mobileInput = page.locator('input[type="tel"], input[name="mobile"], input[name="phone"]').first();
    this.gradeSelect = page.locator('select[name="grade"], select[name="class"]').first();
    this.datePicker = page.locator('input[type="date"], input[name="preferredDate"]').first();
    this.timeSelect = page.locator('select[name="preferredTime"]').first();
    this.submitButton = page.locator('button[type="submit"]:has-text("Book"), button:has-text("Confirm Demo")').first();
    this.successToast = page.locator('.toast-success, [data-testid="demo-success-toast"], text=Booked Successfully').first();
    this.emailValidationMsg = page.locator('#email-error, text=invalid email').first();
    this.mobileValidationMsg = page.locator('#mobile-error, text=invalid phone').first();
  }

  public async navigate() {
    await this.goto('/book-demo');
  }

  public async fillDemoForm(data: DemoFormData) {
    if (await this.parentNameInput.isVisible()) {
      await this.parentNameInput.fill(data.parentName);
    }
    if (await this.studentNameInput.isVisible()) {
      await this.studentNameInput.fill(data.studentName);
    }
    await this.emailInput.fill(data.email);
    await this.mobileInput.fill(data.mobile);

    if (data.grade && (await this.gradeSelect.isVisible())) {
      await this.gradeSelect.selectOption({ label: data.grade }).catch(() => {});
    }

    if (data.preferredDate && (await this.datePicker.isVisible())) {
      await this.datePicker.fill(data.preferredDate);
    }
  }

  public async submitForm() {
    await this.submitButton.click();
  }

  public async verifyFormOpened() {
    await expect(this.submitButton).toBeVisible();
  }

  public async verifySuccessMessage() {
    await expect(this.successToast.or(this.page.locator('text=Thank you'))).toBeVisible({ timeout: 10000 });
  }
}
