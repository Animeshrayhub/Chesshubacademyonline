# Playwright Automation Framework - ChessHubAcademy.online

Welcome to the enterprise-grade Playwright End-to-End (E2E) Test Automation Framework designed for **ChessHubAcademy.online**.

Built with **TypeScript**, **Playwright**, **Page Object Models (POM)**, **Custom Fixtures**, **Axe-core Accessibility Auditing**, **Core Web Vitals Performance SLA Monitors**, and **AI Flakiness & UI Flaw Detection**.

---

## 📁 Framework Directory Structure

```
d:/newchesshub/
├── playwright.config.ts           # Global Configuration (Browsers, Parallelism, Reports, Retries)
├── .env.example                   # Environment variable template
├── .github/workflows/
│   └── playwright.yml             # GitHub Actions CI/CD Pipeline
└── playwright/
    ├── fixtures/                  # Custom Test Fixtures & Role Auth State Injection
    │   ├── index.ts               # Master Fixture Export (extending test with POMs & Helpers)
    │   └── auth.fixture.ts        # Pre-authenticated context fixtures (Admin, Coach, Student)
    ├── pages/                     # Page Object Models (POM)
    │   ├── BasePage.ts            # Base Page class with common elements & navigation
    │   ├── HomePage.ts            # Home page interactions
    │   ├── LoginPage.ts           # Authentication & validation
    │   ├── SignupPage.ts          # Registration form
    │   ├── BookDemoPage.ts        # Demo booking form & validators
    │   ├── AdminDashboardPage.ts  # Admin user management & reports
    │   ├── CoachDashboardPage.ts  # Coach student roster & homework assignment
    │   ├── StudentDashboardPage.ts# Student progress, schedule & certificates
    │   ├── HomeworkPage.ts        # Homework submissions & feedback
    │   ├── PuzzlePage.ts          # Chess board, PGN/FEN loader, hint & solution
    │   ├── TournamentPage.ts      # Tournament pairing, clock & standings
    │   ├── ProfilePage.ts         # User profile editing
    │   └── SettingsPage.ts        # Theme & account settings
    ├── utils/                     # Framework Utilities & AI Helpers
    │   ├── aiHelper.ts            # AI UI health scanner, flaky test recommender, failure logger
    │   ├── perfHelper.ts          # Core Web Vitals & 3s SLA performance validator
    │   ├── a11yHelper.ts          # WCAG 2.1 AA accessibility scanner using @axe-core
    │   ├── dbHelper.ts            # Backend/Supabase API transaction validator
    │   └── logger.ts              # Browser console & network failure collector
    ├── test-data/                 # Static & Dynamic Test Data
    │   ├── users.data.ts          # Roles and credentials
    │   ├── demoForms.data.ts      # Form validation payloads
    │   └── chess.data.ts          # FEN strings, PGN strings, move sequences
    ├── tests/                     # Test Suites (Scalable for 500+ tests)
    │   ├── 01-login.spec.ts
    │   ├── 02-book-demo.spec.ts
    │   ├── 03-student-dashboard.spec.ts
    │   ├── 04-coach-dashboard.spec.ts
    │   ├── 05-admin-dashboard.spec.ts
    │   ├── 06-chess-features.spec.ts
    │   ├── 07-tournaments.spec.ts
    │   ├── 08-payment.spec.ts
    │   ├── 09-responsive.spec.ts
    │   ├── 10-visual.spec.ts
    │   ├── 11-performance.spec.ts
    │   ├── 12-accessibility.spec.ts
    │   ├── 13-seo.spec.ts
    │   └── 14-security.spec.ts
    └── reports/                   # Execution Reports & Artifacts
        ├── html/                  # Interactive HTML Report
        ├── results.json           # Machine-readable JSON output
        └── results.xml            # JUnit XML output for CI reporting
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure **Node.js (v18+)** and **npm** are installed.

### 2. Environment Setup
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

### 3. Install Playwright Browsers
Install browser binaries for Chromium, Firefox, WebKit, and Edge:
```bash
npx playwright install --with-deps
```

### 4. Running Test Commands

| Command | Action |
|---|---|
| `npm run test:e2e` | Run all E2E test suites in headless mode across browsers |
| `npm run test:e2e:ui` | Open Playwright interactive UI Mode runner |
| `npm run test:e2e:headed` | Run tests in headed browser mode |
| `npm run test:e2e:report` | Open the HTML test execution report |
| `npx playwright test playwright/tests/01-login.spec.ts` | Run a specific test file |
| `npx playwright test --project="Desktop Chrome"` | Run tests exclusively on Chrome |
| `npx playwright test --project="iPhone"` | Run tests in mobile emulation mode |

---

## 💡 Best Practices Implemented

1. **Page Object Pattern**: Keeps selectors and page logic isolated in `playwright/pages/`, making tests readable and resistant to DOM changes.
2. **Master Custom Fixture (`fixtures/index.ts`)**: Replaces standard `import { test } from '@playwright/test'` with custom `test` fixture that automatically injects all POM instances and helpers into test parameters.
3. **Artifact Capture Strategy**: Captures traces, screenshots, and videos **only on failure** to maximize CI efficiency and preserve storage.
4. **Performance SLA Threshold**: Automatically measures LCP, FCP, TTI, and Page Load Time. Asserts a hard limit of `< 3000ms`.
5. **AI Helper Engine**:
   - `detectBrokenUI()` detects overlapping cards, broken images, and text cutoffs.
   - `suggestFlakyFix()` inspects trace exceptions to recommend optimal wait strategies.
   - `generateFailureSummary()` formats readable markdown summaries for CI pipeline alerts.
6. **WCAG 2.1 AA Accessibility**: Integrated `@axe-core/playwright` rules checking ARIA labels, contrast, image alt text, and heading hierarchies.
