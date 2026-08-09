import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CoachDashboardPage extends BasePage {
  readonly coachHeader: Locator;
  readonly studentListTable: Locator;
  readonly createHomeworkBtn: Locator;
  readonly homeworkTitleInput: Locator;
  readonly homeworkDescriptionInput: Locator;
  readonly submitHomeworkBtn: Locator;
  readonly attendanceCheckboxes: Locator;
  readonly saveAttendanceBtn: Locator;
  readonly assignPuzzleBtn: Locator;
  readonly feedbackTextArea: Locator;
  readonly submitFeedbackBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.coachHeader = page.locator('h1:has-text("Coach"), h1:has-text("Dashboard")').first();
    this.studentListTable = page.locator('table, [data-testid="student-roster"]').first();
    this.createHomeworkBtn = page.locator('button:has-text("Create Homework"), a[href*="homework/new"]').first();
    this.homeworkTitleInput = page.locator('input[name="title"], #title').first();
    this.homeworkDescriptionInput = page.locator('textarea[name="description"], #description').first();
    this.submitHomeworkBtn = page.locator('button[type="submit"]:has-text("Assign"), button:has-text("Save Homework")').first();
    this.attendanceCheckboxes = page.locator('input[type="checkbox"][name*="attendance"]');
    this.saveAttendanceBtn = page.locator('button:has-text("Save Attendance")').first();
    this.assignPuzzleBtn = page.locator('button:has-text("Assign Puzzle")').first();
    this.feedbackTextArea = page.locator('textarea[name="feedback"]').first();
    this.submitFeedbackBtn = page.locator('button:has-text("Submit Feedback")').first();
  }

  public async navigate() {
    await this.goto('/dashboard/coach');
  }

  public async createHomework(title: string, desc: string) {
    await this.goto('/dashboard/coach/homework');
    if (await this.createHomeworkBtn.isVisible()) {
      await this.createHomeworkBtn.click();
    }
    await this.homeworkTitleInput.fill(title);
    await this.homeworkDescriptionInput.fill(desc);
    await this.submitHomeworkBtn.click();
  }

  public async markAttendance() {
    await this.goto('/dashboard/coach/attendance');
    const checkboxes = await this.attendanceCheckboxes.all();
    if (checkboxes.length > 0) {
      await checkboxes[0].check();
    }
    if (await this.saveAttendanceBtn.isVisible()) {
      await this.saveAttendanceBtn.click();
    }
  }

  public async submitStudentFeedback(feedbackText: string) {
    await this.feedbackTextArea.fill(feedbackText);
    await this.submitFeedbackBtn.click();
  }
}
