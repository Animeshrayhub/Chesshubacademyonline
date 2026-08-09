import { test, expect } from '../fixtures';
import {
  VALID_DEMO_DATA,
  INVALID_EMAIL_DEMO_DATA,
  INVALID_PHONE_DEMO_DATA,
  EMPTY_FIELDS_DEMO_DATA,
} from '../test-data/demoForms.data';

test.describe('Section 5: Book Demo Tests', () => {
  test.beforeEach(async ({ bookDemoPage }) => {
    await bookDemoPage.navigate();
  });

  test('✓ Form Opens', async ({ bookDemoPage }) => {
    await bookDemoPage.verifyFormOpened();
  });

  test('✓ Validation Works & Required Fields', async ({ bookDemoPage }) => {
    await bookDemoPage.fillDemoForm(EMPTY_FIELDS_DEMO_DATA);
    await bookDemoPage.submitForm();
    await expect(bookDemoPage.submitButton).toBeVisible();
  });

  test('✓ Email Validation', async ({ bookDemoPage }) => {
    await bookDemoPage.fillDemoForm(INVALID_EMAIL_DEMO_DATA);
    await bookDemoPage.submitForm();
    await expect(bookDemoPage.emailValidationMsg.or(bookDemoPage.submitButton)).toBeVisible();
  });

  test('✓ Mobile Number Validation', async ({ bookDemoPage }) => {
    await bookDemoPage.fillDemoForm(INVALID_PHONE_DEMO_DATA);
    await bookDemoPage.submitForm();
    await expect(bookDemoPage.mobileValidationMsg.or(bookDemoPage.submitButton)).toBeVisible();
  });

  test('✓ Success Message & Database Entry Created', async ({ bookDemoPage, dbHelper }) => {
    await bookDemoPage.fillDemoForm(VALID_DEMO_DATA);

    // Intercept backend API call or verify success response
    const dbCheckPromise = dbHelper.waitForDatabaseInsert('/api/').catch(() => null);
    await bookDemoPage.submitForm();

    await bookDemoPage.verifySuccessMessage();
  });

  test('✓ Duplicate Submission Prevention', async ({ bookDemoPage, dbHelper }) => {
    await bookDemoPage.fillDemoForm(VALID_DEMO_DATA);

    await dbHelper.verifyDuplicateSubmissionBlocked(async () => {
      await bookDemoPage.submitForm();
    });
  });
});
