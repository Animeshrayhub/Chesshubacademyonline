import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminDashboardPage extends BasePage {
  readonly adminHeader: Locator;
  readonly addStudentBtn: Locator;
  readonly addCoachBtn: Locator;
  readonly studentNameInput: Locator;
  readonly studentEmailInput: Locator;
  readonly coachNameInput: Locator;
  readonly coachEmailInput: Locator;
  readonly submitUserBtn: Locator;
  readonly editStudentBtn: Locator;
  readonly deleteStudentBtn: Locator;
  readonly confirmDeleteBtn: Locator;
  readonly analyticsWidget: Locator;
  readonly reportsSection: Locator;

  constructor(page: Page) {
    super(page);
    this.adminHeader = page.locator('h1:has-text("Admin"), h1:has-text("Overview")').first();
    this.addStudentBtn = page.locator('button:has-text("Add Student"), a[href*="students/new"]').first();
    this.addCoachBtn = page.locator('button:has-text("Add Coach"), a[href*="coaches/new"]').first();
    this.studentNameInput = page.locator('input[name="name"], #student-name').first();
    this.studentEmailInput = page.locator('input[name="email"], #student-email').first();
    this.coachNameInput = page.locator('input[name="name"], #coach-name').first();
    this.coachEmailInput = page.locator('input[name="email"], #coach-email').first();
    this.submitUserBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
    this.editStudentBtn = page.locator('button[aria-label*="Edit"], button:has-text("Edit")').first();
    this.deleteStudentBtn = page.locator('button[aria-label*="Delete"], button:has-text("Delete")').first();
    this.confirmDeleteBtn = page.locator('button:has-text("Confirm Delete"), button:has-text("Yes")').first();
    this.analyticsWidget = page.locator('[data-testid="analytics-widget"], .analytics-card').first();
    this.reportsSection = page.locator('[data-testid="reports-section"], a[href*="/reports"]').first();
  }

  public async navigate() {
    await this.goto('/dashboard/admin');
  }

  public async createStudent(name: string, email: string) {
    await this.goto('/dashboard/admin/students');
    if (await this.addStudentBtn.isVisible()) {
      await this.addStudentBtn.click();
    }
    await this.studentNameInput.fill(name);
    await this.studentEmailInput.fill(email);
    await this.submitUserBtn.click();
  }

  public async createCoach(name: string, email: string) {
    await this.goto('/dashboard/admin/coaches');
    if (await this.addCoachBtn.isVisible()) {
      await this.addCoachBtn.click();
    }
    await this.coachNameInput.fill(name);
    await this.coachEmailInput.fill(email);
    await this.submitUserBtn.click();
  }

  public async editStudent(newName: string) {
    await this.goto('/dashboard/admin/students');
    if (await this.editStudentBtn.isVisible()) {
      await this.editStudentBtn.click();
      await this.studentNameInput.fill(newName);
      await this.submitUserBtn.click();
    }
  }

  public async deleteStudent() {
    await this.goto('/dashboard/admin/students');
    if (await this.deleteStudentBtn.isVisible()) {
      await this.deleteStudentBtn.click();
      if (await this.confirmDeleteBtn.isVisible()) {
        await this.confirmDeleteBtn.click();
      }
    }
  }
}
