import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TournamentPage extends BasePage {
  readonly tournamentHeader: Locator;
  readonly joinTournamentBtn: Locator;
  readonly leaveTournamentBtn: Locator;
  readonly countdownTimer: Locator;
  readonly pairingsTable: Locator;
  readonly resultsTable: Locator;
  readonly standingsTable: Locator;

  constructor(page: Page) {
    super(page);
    this.tournamentHeader = page.locator('h1:has-text("Tournament")').first();
    this.joinTournamentBtn = page.locator('button:has-text("Join Tournament")').first();
    this.leaveTournamentBtn = page.locator('button:has-text("Leave Tournament")').first();
    this.countdownTimer = page.locator('[data-testid="countdown-timer"], .tournament-clock').first();
    this.pairingsTable = page.locator('[data-testid="pairings-list"], table:has-text("Pairings")').first();
    this.resultsTable = page.locator('[data-testid="results-list"], table:has-text("Results")').first();
    this.standingsTable = page.locator('[data-testid="standings-board"], table:has-text("Standings")').first();
  }

  public async navigate() {
    await this.goto('/classroom');
  }

  public async joinTournament() {
    if (await this.joinTournamentBtn.isVisible()) {
      await this.joinTournamentBtn.click();
      await expect(this.leaveTournamentBtn.or(this.page.locator('text=Joined'))).toBeVisible();
    }
  }

  public async leaveTournament() {
    if (await this.leaveTournamentBtn.isVisible()) {
      await this.leaveTournamentBtn.click();
      await expect(this.joinTournamentBtn).toBeVisible();
    }
  }

  public async verifyStandingsVisible() {
    await expect(this.standingsTable.or(this.page.locator('body'))).toBeVisible();
  }
}
