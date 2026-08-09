import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class StudentDashboardPage extends BasePage {
  readonly welcomeHeader: Locator;
  readonly homeworkTab: Locator;
  readonly homeworkList: Locator;
  readonly puzzleProgressWidget: Locator;
  readonly attendanceWidget: Locator;
  readonly classScheduleSection: Locator;
  readonly certificatesTab: Locator;
  readonly certificateItems: Locator;
  readonly notificationsDrawer: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeHeader = page.locator('h1, h2:has-text("Welcome")').first();
    this.homeworkTab = page.locator('a[href*="/homework"], button:has-text("Homework")').first();
    this.homeworkList = page.locator('[data-testid="homework-card"], .homework-item');
    this.puzzleProgressWidget = page.locator('[data-testid="puzzle-progress"], .puzzle-stats').first();
    this.attendanceWidget = page.locator('[data-testid="attendance-widget"], .attendance-card').first();
    this.classScheduleSection = page.locator('[data-testid="class-schedule"], .schedule-list').first();
    this.certificatesTab = page.locator('a[href*="/certificates"], button:has-text("Certificates")').first();
    this.certificateItems = page.locator('.certificate-card, [data-testid="certificate-item"]');
    this.notificationsDrawer = page.locator('[data-testid="notification-panel"], .notification-drawer').first();
  }

  public async navigate() {
    await this.goto('/dashboard/student');
  }

  public async verifyDashboardLoaded() {
    await expect(this.page).toHaveURL(/\/dashboard\/student/);
  }

  public async openHomework() {
    await this.goto('/dashboard/student/homework');
  }

  public async openPuzzles() {
    await this.goto('/dashboard/student/puzzles');
  }

  public async openCertificates() {
    await this.goto('/dashboard/student/certificates');
  }
}
