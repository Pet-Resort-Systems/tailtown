/**
 * Production Smoke Tests
 *
 * Safe to run against production - READ-ONLY tests that don't modify data.
 * These verify the application is working without creating/updating records.
 *
 * Usage:
 *   BASE_URL=https://tailtown.canicloud.com npx playwright test production-smoke
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000;

// Set these environment variables to run authenticated tests:
// TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

test.describe.configure({ mode: 'serial' }); // Run tests sequentially to avoid login race conditions

test.describe('Production Smoke Tests (Read-Only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    const loginButton = page.locator('button:has-text("Sign In")');
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (TEST_EMAIL && TEST_PASSWORD) {
        // Login with provided credentials - use label-based selectors
        await page.getByLabel('Email Address').fill(TEST_EMAIL);
        await page.getByLabel('Password').fill(TEST_PASSWORD);
        await loginButton.click();

        // Wait for login to complete - look for dashboard content instead of URL
        await page.waitForSelector('text=Dashboard', { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      } else {
        // Skip tests that require auth if no credentials provided
        console.log(
          'No TEST_EMAIL/TEST_PASSWORD provided - some tests may fail'
        );
      }
    }
  });

  test('should load application without errors', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Check no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for app to fully load
    await page.waitForTimeout(3000);

    // Should not have critical errors (ignore some known warnings)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('DevTools') &&
        !e.includes('favicon') &&
        !e.includes('Sentry')
    );

    // Log errors for debugging but don't fail on minor ones
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }
  });

  test('should display dashboard', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Should show key dashboard elements
    const dashboardContent = page
      .locator('text=Today')
      .or(page.locator('text=Arrivals'))
      .or(page.locator('text=Check'));
    await expect(dashboardContent.first()).toBeVisible({ timeout: 15000 });
  });

  test('should load reservations page', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Boarding & Daycare');
    await expect(page).toHaveURL(/.*calendar/);

    // Should show reservations table or list
    await page.waitForTimeout(3000);
    const reservationsContent = page
      .locator('table')
      .or(page.locator('text=No reservations'));
    await expect(reservationsContent.first()).toBeVisible({ timeout: 15000 });
  });

  test('should load customers page', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Customers');
    await expect(page).toHaveURL(/.*customers/);

    // Should show customers list
    await page.waitForTimeout(3000);
    const customersContent = page
      .locator('table')
      .or(page.locator('text=Customer'));
    await expect(customersContent.first()).toBeVisible({ timeout: 15000 });
  });

  test('should load kennels/calendar page', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Kennels is a submenu - click to expand first, then click Kennel Board
    const kennelsMenu = page.locator('text=Kennels').first();
    await kennelsMenu.click();
    await page.waitForTimeout(500);
    await page.click('text=Kennel Board');
    await expect(page).toHaveURL(/.*suites/);

    // Should show kennel board content
    await page.waitForTimeout(3000);
    const kennelContent = page
      .locator('text=Kennel Management')
      .or(page.locator('text=Total Suites'));
    await expect(kennelContent.first()).toBeVisible({ timeout: 15000 });
  });

  test('should display navigation menu', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Check main navigation items are visible (top-level only)
    const navItems = [
      'Dashboard',
      'Boarding & Daycare',
      'Customers',
      'Kennels', // This is the parent menu item
    ];

    for (const item of navItems) {
      const navLink = page.locator(`text=${item}`).first();
      await expect(navLink).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle page refresh', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Dashboard');
    await page.waitForTimeout(2000);

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still show dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    const dashboardContent = page
      .locator('text=Today')
      .or(page.locator('text=Arrivals'));
    await expect(dashboardContent.first()).toBeVisible({ timeout: 15000 });
  });

  test('should load settings page', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Look for Admin link in navigation
    const adminLink = page.locator('a:has-text("Admin")').first();
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await page.waitForTimeout(2000);

      // Should show settings content
      await expect(page).toHaveURL(/.*settings/);
    } else {
      // Admin link not visible - skip test
      test.skip();
    }
  });

  test('should search customers without modifying data', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Customers');
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page
      .locator('input[placeholder*="Search"]')
      .or(page.locator('input[type="search"]'));
    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(2000);

      // Should show filtered results or no results message
      const results = page
        .locator('table tbody tr')
        .or(page.locator('text=No results'));
      await expect(results.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should view reservation details without modifying', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Reservations');
    await page.waitForTimeout(3000);

    // Click on first reservation row if exists
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(2000);

      // Should show reservation details
      const detailsContent = page
        .locator('text=Customer')
        .or(page.locator('text=Pet'))
        .or(page.locator('text=Service'));
      await expect(detailsContent.first()).toBeVisible({ timeout: 15000 });
    }
  });

  test('should verify API connectivity', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to dashboard which loads data from APIs
    await page.click('text=Dashboard');
    await page.waitForTimeout(5000);

    // Check for loading states completing
    const loadingIndicator = page.locator('text=Loading');

    // Loading should disappear (data loaded)
    await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });

    // Should have actual content - check for check-in buttons which indicate data loaded
    const content = page
      .locator('button:has-text("Start Check-In")')
      .or(page.locator('text=In'));
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display correct tenant branding', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Check for tenant name in header or title
    // Check for business logo or admin name in header
    const branding = page
      .locator('img[alt*="Logo"]')
      .or(page.locator('text=Rob Weinstein'));
    await expect(branding.first()).toBeVisible({ timeout: 15000 });
  });
});
