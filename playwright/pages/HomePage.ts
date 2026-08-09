import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heroTitle: Locator;
  readonly heroSubtitle: Locator;
  readonly bookDemoCTA: Locator;
  readonly loginCTA: Locator;
  readonly featureCards: Locator;
  readonly testimonialSection: Locator;
  readonly footerLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.heroTitle = page.locator('h1').first();
    this.heroSubtitle = page.locator('p.hero-subtitle, h1 + p').first();
    this.bookDemoCTA = page.locator('a[href="/book-demo"], button:has-text("Book Free Demo")').first();
    this.loginCTA = page.locator('a[href="/login"]').first();
    this.featureCards = page.locator('.feature-card, [data-testid="feature-card"]');
    this.testimonialSection = page.locator('#testimonials, section:has-text("Students")');
    this.footerLinks = page.locator('footer a');
  }

  public async navigate() {
    await this.goto('/');
  }

  public async clickBookDemo() {
    await this.bookDemoCTA.click();
    await this.page.waitForURL(/\/book-demo/);
  }

  public async clickLogin() {
    await this.loginCTA.click();
    await this.page.waitForURL(/\/login/);
  }

  public async verifyPageLoaded() {
    await expect(this.heroTitle).toBeVisible();
  }
}
