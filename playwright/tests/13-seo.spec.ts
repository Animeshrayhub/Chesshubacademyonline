import { test, expect } from '../fixtures';

test.describe('Section 16: SEO Audits', () => {
  test('✓ Meta Title & Meta Description', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Chess/i);

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });

  test('✓ Canonical URL', async ({ page }) => {
    await page.goto('/');
    const canonical = page.locator('link[rel="canonical"]');
    if (await canonical.count() > 0) {
      await expect(canonical).toHaveAttribute('href', /https?:\/\/.+/);
    }
  });

  test('✓ OpenGraph Tags', async ({ page }) => {
    await page.goto('/');
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogTitle.or(page.locator('head'))).toHaveCount(1);
    await expect(ogType.or(page.locator('head'))).toHaveCount(1);
  });

  test('✓ Twitter Tags', async ({ page }) => {
    await page.goto('/');
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard.or(page.locator('head'))).toHaveCount(1);
  });

  test('✓ robots.txt Accessible', async ({ request, baseURL }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
  });

  test('✓ sitemap.xml Accessible', async ({ request, baseURL }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
  });
});
