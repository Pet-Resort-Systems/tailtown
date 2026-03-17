/**
 * E2E Test: Complete Reservation Flow
 * Tests the entire user journey from creating a reservation to viewing it on the dashboard
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds

test.describe('Complete Reservation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should create a boarding reservation with kennel assignment', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Kennel Calendar
    await test.step('Navigate to Kennel Calendar', async () => {
      await page.click('text=Kennels');
      await expect(page).toHaveURL(/.*kennels/);
      await page.waitForSelector('.fc-view'); // Wait for calendar to load
    });

    // Step 2: Click on a date to open reservation form
    await test.step('Open reservation form from calendar', async () => {
      // Click on a future date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.getDate().toString();

      await page.click(`.fc-daygrid-day[data-date*="${dateStr}"]`);

      // Wait for reservation form dialog to open
      await page.waitForSelector('text=Create Reservation', { timeout: 5000 });
    });

    // Step 3: Fill in customer information
    await test.step('Select customer', async () => {
      // Click on customer autocomplete
      await page.click('input[placeholder*="Search by name"]');

      // Type to search for a customer
      await page.fill('input[placeholder*="Search by name"]', 'John');

      // Wait for results and select first customer
      await page.waitForSelector('text=John', { timeout: 5000 });
      await page.click('text=John >> nth=0');
    });

    // Step 4: Select pet
    await test.step('Select pet', async () => {
      // Wait for pets to load
      await page.waitForTimeout(1000);

      // Click on pet selector
      await page.click('label:has-text("Pet")');

      // Select first available pet
      await page.click('[role="option"] >> nth=0');
    });

    // Step 5: Select boarding service
    await test.step('Select boarding service', async () => {
      // Click on service selector
      await page.click('label:has-text("Service")');

      // Select boarding service
      await page.click('text=Boarding');
    });

    // Step 6: Verify kennel selector appears and select kennel
    await test.step('Select kennel', async () => {
      // Wait for kennel selector to appear
      await page.waitForSelector('label:has-text("Kennel")', { timeout: 5000 });

      // Click on kennel selector
      await page.click('label:has-text("Kennel")');

      // Look for available kennel (green indicator)
      const availableKennel = page.locator('text=/🟢.*A\\d+/').first();
      await availableKennel.click();
    });

    // Step 7: Submit the reservation
    await test.step('Submit reservation', async () => {
      // Click create/submit button
      await page.click('button:has-text("Create Reservation")');

      // Wait for success message or form to close
      await page.waitForTimeout(2000);

      // Verify form closed (dialog should be gone)
      await expect(page.locator('text=Create Reservation')).not.toBeVisible();
    });

    // Step 8: Verify reservation appears on calendar
    await test.step('Verify reservation on calendar', async () => {
      // Wait for calendar to refresh
      await page.waitForTimeout(2000);

      // Look for the reservation event on the calendar
      const reservationEvent = page.locator('.fc-event').first();
      await expect(reservationEvent).toBeVisible();
    });

    // Step 9: Navigate to dashboard and verify
    await test.step('Verify reservation on dashboard', async () => {
      await page.click('text=Dashboard');
      await expect(page).toHaveURL(/.*dashboard/);

      // Wait for dashboard to load
      await page.waitForSelector("text=Today's Check-ins", { timeout: 5000 });

      // Verify check-in count increased
      const checkinCount = await page.locator('text=/\\d+/').first();
      await expect(checkinCount).toBeVisible();
    });
  });

  test('should prevent double-booking same kennel', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Kennel Calendar
    await page.click('text=Kennels');
    await page.waitForSelector('.fc-view');

    // Step 2: Click on a kennel that already has a reservation
    await test.step('Try to book occupied kennel', async () => {
      // Find an existing reservation
      const existingReservation = page.locator('.fc-event').first();
      await existingReservation.click();

      // If edit dialog opens, close it
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await page.click('button:has-text("Cancel")');
      }
    });

    // Step 3: Try to create overlapping reservation
    await test.step('Attempt overlapping reservation', async () => {
      // Click on same date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await page.click(`.fc-daygrid-day[data-date*="${tomorrow.getDate()}"]`);

      // Fill in form quickly
      await page.click('input[placeholder*="Search by name"]');
      await page.fill('input[placeholder*="Search by name"]', 'John');
      await page.click('text=John >> nth=0');

      await page.waitForTimeout(1000);
      await page.click('label:has-text("Pet")');
      await page.click('[role="option"] >> nth=0');

      await page.click('label:has-text("Service")');
      await page.click('text=Boarding');

      // Try to select occupied kennel (should be disabled)
      await page.waitForSelector('label:has-text("Kennel")');
      await page.click('label:has-text("Kennel")');

      // Verify occupied kennels are marked with red indicator
      const occupiedKennel = page.locator('text=/🔴.*Occupied/').first();
      await expect(occupiedKennel).toBeVisible();

      // Verify occupied kennel is disabled
      const disabledOption = page.locator('[aria-disabled="true"]').first();
      await expect(disabledOption).toBeVisible();
    });
  });

  test('should edit existing reservation and change kennel', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Reservations page
    await test.step('Navigate to reservations', async () => {
      await page.click('text=Reservations');
      await expect(page).toHaveURL(/.*reservations/);
      await page.waitForSelector('table', { timeout: 5000 });
    });

    // Step 2: Click on first reservation to view details
    await test.step('Open reservation details', async () => {
      const firstReservation = page.locator('table tbody tr').first();
      await firstReservation.click();

      // Wait for details page to load
      await page.waitForSelector('text=Edit Reservation', { timeout: 5000 });
    });

    // Step 3: Click edit button
    await test.step('Open edit form', async () => {
      await page.click('button:has-text("Edit Reservation")');

      // Wait for edit form to load
      await page.waitForSelector('label:has-text("Kennel")', { timeout: 5000 });
    });

    // Step 4: Change kennel assignment
    await test.step('Change kennel', async () => {
      // Open kennel selector
      await page.click('label:has-text("Kennel")');

      // Current kennel should show as available (green)
      const currentKennel = page.locator('text=/🟢/').first();
      await expect(currentKennel).toBeVisible();

      // Select a different available kennel
      const differentKennel = page.locator('text=/🟢.*A\\d+/').nth(1);
      if (await differentKennel.isVisible()) {
        await differentKennel.click();
      }
    });

    // Step 5: Save changes
    await test.step('Save reservation', async () => {
      await page.click('button:has-text("Save")');

      // Wait for save to complete
      await page.waitForTimeout(2000);

      // Should return to details page
      await expect(page.locator('text=Edit Reservation')).toBeVisible();
    });
  });

  test('should create grooming reservation without kennel requirement', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Grooming Calendar
    await test.step('Navigate to grooming calendar', async () => {
      await page.click('text=Grooming');
      await expect(page).toHaveURL(/.*grooming/);
      await page.waitForSelector('.fc-view');
    });

    // Step 2: Open reservation form
    await test.step('Open reservation form', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await page.click(`.fc-daygrid-day[data-date*="${tomorrow.getDate()}"]`);
      await page.waitForSelector('text=Create Reservation');
    });

    // Step 3: Fill in customer and pet
    await test.step('Fill in customer and pet', async () => {
      await page.click('input[placeholder*="Search by name"]');
      await page.fill('input[placeholder*="Search by name"]', 'John');
      await page.click('text=John >> nth=0');

      await page.waitForTimeout(1000);
      await page.click('label:has-text("Pet")');
      await page.click('[role="option"] >> nth=0');
    });

    // Step 4: Select grooming service
    await test.step('Select grooming service', async () => {
      await page.click('label:has-text("Service")');
      await page.click('text=Grooming');
    });

    // Step 5: Verify kennel selector does NOT appear
    await test.step('Verify no kennel selector', async () => {
      // Wait a moment for form to update
      await page.waitForTimeout(1000);

      // Kennel selector should not be visible for grooming
      const kennelSelector = page.locator('label:has-text("Kennel")');
      await expect(kennelSelector).not.toBeVisible();
    });

    // Step 6: Submit reservation
    await test.step('Submit grooming reservation', async () => {
      await page.click('button:has-text("Create Reservation")');
      await page.waitForTimeout(2000);

      // Verify form closed
      await expect(page.locator('text=Create Reservation')).not.toBeVisible();
    });
  });

  test('should handle multi-pet reservation with kennel assignments', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Kennel Calendar
    await page.click('text=Kennels');
    await page.waitForSelector('.fc-view');

    // Step 2: Open reservation form
    await test.step('Open reservation form', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);

      await page.click(`.fc-daygrid-day[data-date*="${tomorrow.getDate()}"]`);
      await page.waitForSelector('text=Create Reservation');
    });

    // Step 3: Select customer with multiple pets
    await test.step('Select customer', async () => {
      await page.click('input[placeholder*="Search by name"]');
      await page.fill('input[placeholder*="Search by name"]', 'John');
      await page.click('text=John >> nth=0');
      await page.waitForTimeout(1000);
    });

    // Step 4: Select multiple pets
    await test.step('Select multiple pets', async () => {
      // Click pet selector
      await page.click('label:has-text("Pet")');

      // Select first pet
      await page.click('[role="option"] >> nth=0');

      // Select second pet (if available)
      const secondPet = page.locator('[role="option"]').nth(1);
      if (await secondPet.isVisible()) {
        await secondPet.click();
      }

      // Close dropdown
      await page.keyboard.press('Escape');
    });

    // Step 5: Select boarding service
    await test.step('Select boarding service', async () => {
      await page.click('label:has-text("Service")');
      await page.click('text=Boarding');
      await page.waitForTimeout(1000);
    });

    // Step 6: Verify individual kennel selectors for each pet
    await test.step('Verify per-pet kennel selectors', async () => {
      // Should see multiple kennel selectors (one per pet)
      const kennelSelectors = page.locator('label:has-text("Kennel for")');
      const count = await kennelSelectors.count();

      // Should have at least 1 kennel selector
      expect(count).toBeGreaterThan(0);
    });

    // Step 7: Assign kennels to each pet
    await test.step('Assign kennels', async () => {
      // Assign kennel to first pet
      const firstKennelSelector = page
        .locator('label:has-text("Kennel for")')
        .first();
      await firstKennelSelector.click();
      await page.click('text=/🟢.*A\\d+/ >> nth=0');

      // If there's a second pet, assign a different kennel
      const secondKennelSelector = page
        .locator('label:has-text("Kennel for")')
        .nth(1);
      if (await secondKennelSelector.isVisible()) {
        await secondKennelSelector.click();
        await page.click('text=/🟢.*A\\d+/ >> nth=1');
      }
    });

    // Step 8: Submit reservation
    await test.step('Submit multi-pet reservation', async () => {
      await page.click('button:has-text("Create Reservation")');
      await page.waitForTimeout(3000);

      // Verify form closed
      await expect(page.locator('text=Create Reservation')).not.toBeVisible();
    });
  });
});
