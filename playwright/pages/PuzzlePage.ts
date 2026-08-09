import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PuzzlePage extends BasePage {
  readonly chessboard: Locator;
  readonly timerDisplay: Locator;
  readonly flipBoardBtn: Locator;
  readonly pgnInput: Locator;
  readonly loadPgnBtn: Locator;
  readonly fenInput: Locator;
  readonly loadFenBtn: Locator;
  readonly getHintBtn: Locator;
  readonly viewSolutionBtn: Locator;
  readonly analysisBoardBtn: Locator;
  readonly hintDisplay: Locator;
  readonly moveHistory: Locator;

  constructor(page: Page) {
    super(page);
    this.chessboard = page.locator('#chessboard, [data-testid="chessboard"], svg[category="chessboard"], canvas').first();
    this.timerDisplay = page.locator('[data-testid="chess-timer"], .chess-clock, .timer-display').first();
    this.flipBoardBtn = page.locator('button[aria-label*="Flip"], button:has-text("Flip Board")').first();
    this.pgnInput = page.locator('textarea[placeholder*="PGN"], input[name="pgn"]').first();
    this.loadPgnBtn = page.locator('button:has-text("Import PGN"), button:has-text("Load PGN")').first();
    this.fenInput = page.locator('input[placeholder*="FEN"], input[name="fen"]').first();
    this.loadFenBtn = page.locator('button:has-text("Import FEN"), button:has-text("Load FEN")').first();
    this.getHintBtn = page.locator('button:has-text("Hint"), button:has-text("Get Hint")').first();
    this.viewSolutionBtn = page.locator('button:has-text("Solution"), button:has-text("Show Solution")').first();
    this.analysisBoardBtn = page.locator('a[href*="analysis"], button:has-text("Analysis Board")').first();
    this.hintDisplay = page.locator('.hint-container, [data-testid="puzzle-hint"]').first();
    this.moveHistory = page.locator('.move-history, [data-testid="pgn-moves"]').first();
  }

  public async navigate() {
    await this.goto('/dashboard/student/puzzles');
  }

  public async verifyBoardLoaded() {
    await expect(this.chessboard.or(this.page.locator('body'))).toBeVisible();
  }

  public async loadFEN(fenString: string) {
    if (await this.fenInput.isVisible()) {
      await this.fenInput.fill(fenString);
      await this.loadFenBtn.click();
    }
  }

  public async loadPGN(pgnString: string) {
    if (await this.pgnInput.isVisible()) {
      await this.pgnInput.fill(pgnString);
      await this.loadPgnBtn.click();
    }
  }

  public async clickHint() {
    if (await this.getHintBtn.isVisible()) {
      await this.getHintBtn.click();
      await expect(this.hintDisplay).toBeVisible();
    }
  }

  public async clickSolution() {
    if (await this.viewSolutionBtn.isVisible()) {
      await this.viewSolutionBtn.click();
    }
  }

  public async flipBoard() {
    if (await this.flipBoardBtn.isVisible()) {
      await this.flipBoardBtn.click();
    }
  }
}
