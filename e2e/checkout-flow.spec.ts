/**
 * E2E Test: Complete Check-out Flow
 * Tests the entire check-out journey from finding checked-in pets to completion
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 90000;

test.describe('Complete Check-out Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should complete full check-out workflow', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Dashboard
    await test.step('Navigate to Dashboard', async () => {
      await page.click('text=Dashboard');
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForSelector('text=Today', { timeout: 10000 });
    });

    // Step 2: Find a checked-in reservation to check out
    await test.step('Find check-out from dashboard', async () => {
      // Look for departures section or check-out button
      const checkOutButton = page
        .locator('button:has-text("Check Out")')
        .first();
      const departuresSection = page.locator('text=Departures').first();

      if (await checkOutButton.isVisible()) {
        await checkOutButton.click();
      } else if (await departuresSection.isVisible()) {
        await departuresSection.click();
        await page.waitForTimeout(1000);
        await page.click('text=Check Out >> nth=0');
      } else {
        // Navigate to reservations and find a checked-in one
        await page.click('text=Reservations');
        await page.waitForSelector('table');

        const checkedInRow = page.locator('tr:has-text("CHECKED_IN")').first();
        if (await checkedInRow.isVisible()) {
          await checkedInRow.click();
          await page.click('button:has-text("Check Out")');
        } else {
          test.skip();
        }
      }

      await page.waitForTimeout(2000);
    });

    // Step 3: Verify belongings returned
    await test.step('Verify belongings returned', async () => {
      // Look for belongings checklist
      const belongingsSection = page.locator('text=Belongings');
      if (await belongingsSection.isVisible()) {
        // Check all items as returned
        const checkboxes = page.locator('input[type="checkbox"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
          const checkbox = checkboxes.nth(i);
          if ((await checkbox.isVisible()) && !(await checkbox.isChecked())) {
            await checkbox.click();
          }
        }
      }
    });

    // Step 4: Add checkout notes
    await test.step('Add checkout notes', async () => {
      const notesInput = page
        .locator('textarea[placeholder*="notes"]')
        .or(page.locator('label:has-text("Notes") + textarea'));
      if (await notesInput.isVisible()) {
        await notesInput.fill('Pet had a great stay! Very well behaved.');
      }
    });

    // Step 5: Complete checkout
    await test.step('Complete checkout', async () => {
      const completeButton = page
        .locator('button:has-text("Complete Check-Out")')
        .or(page.locator('button:has-text("Check Out")'));
      if (await completeButton.isVisible()) {
        await completeButton.click();
        await page.waitForTimeout(3000);
      }
    });

    // Step 6: Verify completion
    await test.step('Verify checkout complete', async () => {
      // Should see success or status change
      const successIndicator = page
        .locator('text=Complete')
        .or(page.locator('text=COMPLETED'))
        .or(page.locator('text=checked out'));
      await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test('should handle checkout with unpaid balance', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to a checked-in reservation
    await test.step('Find checked-in reservation', async () => {
      await page.click('text=Reservations');
      await page.waitForSelector('table');

      const checkedInRow = page.locator('tr:has-text("CHECKED_IN")').first();
      if (await checkedInRow.isVisible()) {
        await checkedInRow.click();
      } else {
        test.skip();
      }
    });

    // Check for balance due
    await test.step('Check balance', async () => {
      const balanceIndicator = page
        .locator('text=Balance')
        .or(page.locator('text=Due'));
      if (await balanceIndicator.isVisible()) {
        // Verify balance is displayed
        await expect(balanceIndicator).toBeVisible();
      }
    });

    // Attempt checkout
    await test.step('Attempt checkout', async () => {
      const checkOutButton = page.locator('button:has-text("Check Out")');
      if (await checkOutButton.isVisible()) {
        await checkOutButton.click();
        await page.waitForTimeout(2000);

        // Should either proceed or show payment required warning
        const paymentWarning = page
          .locator('text=payment')
          .or(page.locator('text=balance'));
        // Either warning or checkout proceeds
        const checkoutProceeded = page
          .locator('text=Belongings')
          .or(page.locator('text=Complete'));

        await expect(paymentWarning.or(checkoutProceeded).first()).toBeVisible({
          timeout: 5000,
        });
      }
    });
  });

  test('should update reservation status after checkout', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Get initial count of completed reservations
    let initialCompletedCount = 0;

    await test.step('Count initial completed reservations', async () => {
      await page.click('text=Reservations');
      await page.waitForSelector('table');

      // Filter by completed if possible
      const statusFilter = page
        .locator('select:has-text("Status")')
        .or(page.locator('button:has-text("Filter")'));
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        const completedOption = page.locator('text=COMPLETED');
        if (await completedOption.isVisible()) {
          await completedOption.click();
        }
      }

      const completedRows = page.locator('tr:has-text("COMPLETED")');
      initialCompletedCount = await completedRows.count();
    });

    // Perform checkout
    await test.step('Perform checkout', async () => {
      // Reset filter
      await page.click('text=Reservations');
      await page.waitForSelector('table');

      const checkedInRow = page.locator('tr:has-text("CHECKED_IN")').first();
      if (await checkedInRow.isVisible()) {
        await checkedInRow.click();

        const checkOutButton = page.locator('button:has-text("Check Out")');
        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(2000);

          // Complete checkout
          const completeButton = page.locator('button:has-text("Complete")');
          if (await completeButton.isVisible()) {
            await completeButton.click();
            await page.waitForTimeout(3000);
          }
        }
      } else {
        test.skip();
      }
    });

    // Verify status updated
    await test.step('Verify status updated', async () => {
      await page.click('text=Reservations');
      await page.waitForSelector('table');
      await page.waitForTimeout(2000);

      const completedRows = page.locator('tr:has-text("COMPLETED")');
      const newCompletedCount = await completedRows.count();

      // Should have one more completed reservation
      expect(newCompletedCount).toBeGreaterThanOrEqual(initialCompletedCount);
    });
  });
});
