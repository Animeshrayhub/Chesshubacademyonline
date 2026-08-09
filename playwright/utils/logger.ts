import { Page, TestInfo, ConsoleMessage, Response, Request } from '@playwright/test';

export interface ConsoleLogEntry {
  type: string;
  text: string;
  location?: string;
  timestamp: string;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  timestamp: string;
}

export class Logger {
  private consoleLogs: ConsoleLogEntry[] = [];
  private networkFailures: NetworkLogEntry[] = [];

  constructor(private page: Page) {
    this.attachListeners();
  }

  private attachListeners() {
    this.page.on('console', (msg: ConsoleMessage) => {
      this.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location().url ? `${msg.location().url}:${msg.location().lineNumber}` : undefined,
        timestamp: new Date().toISOString(),
      });
    });

    this.page.on('response', (response: Response) => {
      if (response.status() >= 400) {
        this.networkFailures.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    this.page.on('requestfailed', (request: Request) => {
      this.networkFailures.push({
        url: request.url(),
        method: request.method(),
        statusText: request.failure()?.errorText || 'Failed Network Request',
        timestamp: new Date().toISOString(),
      });
    });
  }

  public getConsoleLogs(): ConsoleLogEntry[] {
    return this.consoleLogs;
  }

  public getNetworkFailures(): NetworkLogEntry[] {
    return this.networkFailures;
  }

  public async attachLogsToReport(testInfo: TestInfo): Promise<void> {
    if (this.consoleLogs.length > 0) {
      await testInfo.attach('browser-console-logs.json', {
        body: JSON.stringify(this.consoleLogs, null, 2),
        contentType: 'application/json',
      });
    }

    if (this.networkFailures.length > 0) {
      await testInfo.attach('network-failures.json', {
        body: JSON.stringify(this.networkFailures, null, 2),
        contentType: 'application/json',
      });
    }
  }
}
