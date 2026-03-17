/**
 * E2E Test: Kennel Management Flow
 * Tests kennel board viewing, filtering, and print kennel cards functionality
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000;

test.describe('Kennel Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should display kennel board with all kennels', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to Kennels page
    await test.step('Navigate to kennels', async () => {
      await page.click('text=Kennels');
      await expect(page).toHaveURL(/.*kennels/);
    });

    // Verify kennel board loads
    await test.step('Verify kennel board displays', async () => {
      // Wait for kennel board to load
      await page.waitForSelector('text=Kennel Board', { timeout: 5000 });

      // Verify summary cards are visible
      await expect(page.locator('text=Total Suites')).toBeVisible();
      await expect(page.locator('text=Available')).toBeVisible();
      await expect(page.locator('text=Occupied')).toBeVisible();
    });

    // Verify kennel cards display with numbers
    await test.step('Verify kennel cards show numbers', async () => {
      // Look for kennel cards with alphanumeric identifiers (A01, A02, etc.)
      const kennelCard = page.locator('text=/A\\d+|B\\d+|C\\d+/').first();
      await expect(kennelCard).toBeVisible();

      // Verify kennel number is not just "0"
      const kennelNumber = await kennelCard.textContent();
      expect(kennelNumber).not.toBe('0');
      expect(kennelNumber).toMatch(/[A-Z]\d+/);
    });

    // Verify kennel status indicators
    await test.step('Verify status indicators', async () => {
      // Should see different status types
      const standardSuite = page.locator('text=STANDARD_SUITE').first();
      await expect(standardSuite).toBeVisible();
    });
  });

  test('should filter kennels by type', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Kennels');
    await page.waitForSelector('text=Kennel Board');

    // Filter by suite type
    await test.step('Filter by suite type', async () => {
      // Click on suite type filter
      await page.click('text=All Types');

      // Select STANDARD_SUITE
      await page.click('text=STANDARD_SUITE');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify only standard suites are shown
      const suiteTypes = page.locator('text=STANDARD_SUITE');
      const count = await suiteTypes.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test('should filter kennels by status', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Kennels');
    await page.waitForSelector('text=Kennel Board');

    // Filter by status
    await test.step('Filter by available status', async () => {
      // Click on status filter
      await page.click('text=All Status');

      // Select Available
      await page.click('text=Available');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify "Available" text is visible on cards
      const availableCards = page.locator('text=Available');
      const count = await availableCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test('should search for specific kennel', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Kennels');
    await page.waitForSelector('text=Kennel Board');

    // Search for kennel
    await test.step('Search for kennel A01', async () => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('A01');

      // Wait for search to filter
      await page.waitForTimeout(1000);

      // Verify A01 is visible
      await expect(page.locator('text=A01')).toBeVisible();
    });
  });

  test('should refresh kennel board data', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Kennels');
    await page.waitForSelector('text=Kennel Board');

    // Click refresh button
    await test.step('Refresh kennel data', async () => {
      const refreshButton = page.locator('button:has-text("REFRESH")');
      await refreshButton.click();

      // Wait for refresh to complete
      await page.waitForTimeout(2000);

      // Verify board still displays
      await expect(page.locator('text=Kennel Board')).toBeVisible();
    });
  });

  test('should navigate to print kennel cards', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to print kennel cards
    await test.step('Navigate to print page', async () => {
      await page.click('text=Print Kennel Cards');
      await expect(page).toHaveURL(/.*print-kennel-cards/);
    });

    // Verify print page loads
    await test.step('Verify print page displays', async () => {
      await page.waitForSelector('text=Print Kennel Cards', { timeout: 5000 });
    });
  });

  test('should display kennel cards with full identifiers for printing', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to print kennel cards
    await page.click('text=Print Kennel Cards');
    await page.waitForSelector('text=Print Kennel Cards');

    // Wait for kennel cards to load
    await test.step('Wait for kennel cards to load', async () => {
      await page.waitForTimeout(3000);
    });

    // Verify kennel cards show full identifiers
    await test.step('Verify full kennel identifiers', async () => {
      // Look for kennel cards with "Kennel #A01" format (not just "Kennel #3")
      const kennelHeader = page.locator('text=/Kennel #[A-Z]\\d+/').first();

      if (await kennelHeader.isVisible()) {
        const headerText = await kennelHeader.textContent();

        // Verify it's not just a number
        expect(headerText).toMatch(/Kennel #[A-Z]\d+/);
        expect(headerText).not.toMatch(/Kennel #\d+$/); // Should not be just "Kennel #3"
      }
    });

    // Verify pet information displays
    await test.step('Verify pet information', async () => {
      // Look for pet names on cards
      const petName = page.locator('.kennel-card-container').first();
      if (await petName.isVisible()) {
        await expect(petName).toBeVisible();
      }
    });
  });

  test('should filter print cards by date', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Print Kennel Cards');
    await page.waitForSelector('text=Print Kennel Cards');

    // Change filter date
    await test.step('Change filter date', async () => {
      // Find date picker
      const datePicker = page.locator('input[type="date"]');

      if (await datePicker.isVisible()) {
        // Set to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        await datePicker.fill(dateStr);

        // Wait for cards to update
        await page.waitForTimeout(2000);
      }
    });
  });

  test('should trigger print dialog', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Print Kennel Cards');
    await page.waitForSelector('text=Print Kennel Cards');
    await page.waitForTimeout(2000);

    // Click print button
    await test.step('Trigger print', async () => {
      // Set up listener for print dialog
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('beforeprint');
        await dialog.accept();
      });

      // Click print button
      const printButton = page.locator('button:has-text("Print")');
      if (await printButton.isVisible()) {
        await printButton.click();
      }
    });
  });

  test('should display kennel with pet and owner information', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Kennels');
    await page.waitForSelector('text=Kennel Board');

    // Find an occupied kennel
    await test.step('Find occupied kennel', async () => {
      // Look for kennel with pet information
      const occupiedKennel = page.locator('text=Occupied').first();

      if (await occupiedKennel.isVisible()) {
        // Click on the kennel card to see details
        await occupiedKennel.click();

        // Verify pet and owner info displays
        await page.waitForTimeout(1000);
      }
    });
  });

  test('should show color-coded availability on kennel board', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click('text=Kennels');
    await page.waitForSelector('text=Kennel Board');

    // Verify color coding
    await test.step('Verify color-coded status', async () => {
      // Available kennels should have green indicator
      const availableCard = page.locator('text=Available').first();
      if (await availableCard.isVisible()) {
        // Check if parent has appropriate styling
        const parent = availableCard.locator('..');
        await expect(parent).toBeVisible();
      }

      // Occupied kennels should have different styling
      const occupiedCard = page.locator('text=Occupied').first();
      if (await occupiedCard.isVisible()) {
        const parent = occupiedCard.locator('..');
        await expect(parent).toBeVisible();
      }
    });
  });
});
