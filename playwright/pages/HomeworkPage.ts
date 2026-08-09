import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomeworkPage extends BasePage {
  readonly homeworkHeading: Locator;
  readonly homeworkItems: Locator;
  readonly submitHomeworkBtn: Locator;
  readonly answerTextArea: Locator;
  readonly feedbackSection: Locator;

  constructor(page: Page) {
    super(page);
    this.homeworkHeading = page.locator('h1:has-text("Homework")').first();
    this.homeworkItems = page.locator('.homework-card, [data-testid="homework-item"]');
    this.submitHomeworkBtn = page.locator('button:has-text("Submit Assignment")').first();
    this.answerTextArea = page.locator('textarea[name="solution"]').first();
    this.feedbackSection = page.locator('.coach-feedback, [data-testid="feedback-view"]').first();
  }

  public async navigate() {
    await this.goto('/dashboard/student/homework');
  }

  public async submitSolution(solutionText: string) {
    if (await this.answerTextArea.isVisible()) {
      await this.answerTextArea.fill(solutionText);
      await this.submitHomeworkBtn.click();
    }
  }
}
