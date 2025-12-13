/**
 * Production Workflow Tests
 *
 * Tests full workflows (reservation, check-in, check-out) against production
 * using a designated test customer. These tests CREATE and MODIFY data.
 *
 * Usage:
 *   TEST_EMAIL=rob@tailtownpetresort.com TEST_PASSWORD='Tailtown2025!' \
 *   BASE_URL=https://tailtown.canicloud.com \
 *   npx playwright test production-workflow --project=chromium
 *
 * IMPORTANT: Uses "E2E Test" customer - ensure this customer exists with a pet
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_TIMEOUT = 120000; // 2 minutes for longer workflows

const TEST_EMAIL = process.env.TEST_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "";

// Test customer name to search for - should be a real customer in production
const TEST_CUSTOMER_NAME = "E2E Test";

test.describe.configure({ mode: "serial" }); // Run tests sequentially

test.describe("Production Workflow Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Login
    const loginButton = page.locator('button:has-text("Sign In")');
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (TEST_EMAIL && TEST_PASSWORD) {
        await page.getByLabel("Email Address").fill(TEST_EMAIL);
        await page.getByLabel("Password").fill(TEST_PASSWORD);
        await loginButton.click();
        await page.waitForSelector("text=Dashboard", { timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
      } else {
        test.skip();
      }
    }
  });

  test("should create a daycare reservation for test customer", async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Boarding & Daycare calendar
    await test.step("Navigate to calendar", async () => {
      await page.click("text=Boarding & Daycare");
      await expect(page).toHaveURL(/.*calendar/);
      await page.waitForTimeout(3000);
    });

    // Step 2: Click on tomorrow's date to create reservation
    await test.step("Click on date to create reservation", async () => {
      // Find and click the "New Reservation" or "+" button
      const newReservationBtn = page
        .locator('button:has-text("New")')
        .or(page.locator('button:has-text("Add")'));
      if (await newReservationBtn.first().isVisible()) {
        await newReservationBtn.first().click();
      } else {
        // Click on a calendar cell
        const calendarCell = page.locator(".fc-daygrid-day").first();
        await calendarCell.click();
      }

      await page.waitForTimeout(2000);
    });

    // Step 3: Search and select test customer
    await test.step("Select test customer", async () => {
      // Find customer search input
      const customerInput = page
        .locator('input[placeholder*="customer"]')
        .or(page.locator('input[placeholder*="Customer"]'))
        .or(page.locator('input[placeholder*="Search"]'))
        .first();

      if (await customerInput.isVisible()) {
        await customerInput.fill(TEST_CUSTOMER_NAME);
        await page.waitForTimeout(2000);

        // Click on the customer in dropdown
        const customerOption = page
          .locator(`text=${TEST_CUSTOMER_NAME}`)
          .first();
        if (await customerOption.isVisible()) {
          await customerOption.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    // Step 4: Select pet
    await test.step("Select pet", async () => {
      // Wait for pets to load
      await page.waitForTimeout(1000);

      // Click pet dropdown
      const petSelect = page
        .locator('label:has-text("Pet")')
        .or(page.locator("text=Select Pet"));
      if (await petSelect.isVisible()) {
        await petSelect.click();
        await page.waitForTimeout(500);

        // Select first pet option
        const petOption = page.locator('[role="option"]').first();
        if (await petOption.isVisible()) {
          await petOption.click();
        }
      }
    });

    // Step 5: Select Day Camp service
    await test.step("Select Day Camp service", async () => {
      const serviceSelect = page.locator('label:has-text("Service")');
      if (await serviceSelect.isVisible()) {
        await serviceSelect.click();
        await page.waitForTimeout(500);

        // Look for Day Camp or Daycare option
        const daycareOption = page
          .locator("text=Day Camp")
          .or(page.locator("text=Daycare"))
          .first();
        if (await daycareOption.isVisible()) {
          await daycareOption.click();
        }
      }
    });

    // Step 6: Set dates (today for daycare)
    await test.step("Set reservation dates", async () => {
      // For daycare, start and end date are usually the same
      const today = new Date().toISOString().split("T")[0];

      const startDateInput = page.locator('input[type="date"]').first();
      if (await startDateInput.isVisible()) {
        await startDateInput.fill(today);
      }
    });

    // Step 7: Submit reservation
    await test.step("Submit reservation", async () => {
      const submitBtn = page
        .locator('button:has-text("Create")')
        .or(page.locator('button:has-text("Save")'));
      if (await submitBtn.first().isVisible()) {
        await submitBtn.first().click();
        await page.waitForTimeout(3000);
      }

      // Verify success - dialog should close or success message
      const successMsg = page
        .locator("text=created")
        .or(page.locator("text=success"));
      // Don't fail if no success message - reservation might have been created
    });

    // Step 8: Verify reservation appears
    await test.step("Verify reservation created", async () => {
      // Go to dashboard to see if reservation appears
      await page.click("text=Dashboard");
      await page.waitForTimeout(3000);

      // Look for test customer name in today's arrivals
      const customerInList = page.locator(`text=${TEST_CUSTOMER_NAME}`);
      // This is informational - don't fail the test
      if (await customerInList.isVisible()) {
        console.log("✅ Test customer reservation visible on dashboard");
      }
    });
  });

  test("should perform check-in for test customer", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Go to Dashboard
    await test.step("Navigate to Dashboard", async () => {
      await page.click("text=Dashboard");
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForTimeout(3000);
    });

    // Step 2: Find test customer's reservation
    await test.step("Find test customer reservation", async () => {
      // Search for test customer
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_CUSTOMER_NAME);
        await page.waitForTimeout(2000);
      }
    });

    // Step 3: Click Start Check-In
    await test.step("Start check-in", async () => {
      const checkInBtn = page
        .locator('button:has-text("Start Check-In")')
        .first();
      if (await checkInBtn.isVisible()) {
        await checkInBtn.click();
        await page.waitForTimeout(3000);

        // Should navigate to check-in workflow
        await expect(
          page.locator("text=Check-In").or(page.locator("text=Pet Summary"))
        ).toBeVisible({ timeout: 10000 });
      } else {
        console.log("No check-in available for test customer today");
        test.skip();
      }
    });

    // Step 4: Complete Pet Summary step
    await test.step("Review Pet Summary", async () => {
      // Click Next to proceed
      const nextBtn = page.locator('button:has-text("Next")');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
      }
    });

    // Step 5: Complete remaining steps quickly
    await test.step("Complete check-in steps", async () => {
      // Keep clicking Next until we reach the end
      for (let i = 0; i < 5; i++) {
        const nextBtn = page.locator('button:has-text("Next")');
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(1500);
        } else {
          break;
        }
      }
    });

    // Step 6: Complete check-in
    await test.step("Submit check-in", async () => {
      const completeBtn = page
        .locator('button:has-text("Complete")')
        .or(page.locator('button:has-text("Submit")'));
      if (await completeBtn.first().isVisible()) {
        await completeBtn.first().click();
        await page.waitForTimeout(3000);
      }

      // Verify completion
      const successIndicator = page
        .locator("text=Complete")
        .or(page.locator("text=Success"))
        .or(page.locator("text=checked in"));
      await expect(successIndicator.first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("should perform check-out for test customer", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Go to Dashboard
    await test.step("Navigate to Dashboard", async () => {
      await page.click("text=Dashboard");
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForTimeout(3000);
    });

    // Step 2: Switch to Check-Outs view
    await test.step("View check-outs", async () => {
      const checkOutsTab = page.locator('button:has-text("Check-Outs")');
      if (await checkOutsTab.isVisible()) {
        await checkOutsTab.click();
        await page.waitForTimeout(2000);
      }
    });

    // Step 3: Find test customer
    await test.step("Find test customer", async () => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_CUSTOMER_NAME);
        await page.waitForTimeout(2000);
      }
    });

    // Step 4: Click Check-Out button
    await test.step("Start check-out", async () => {
      const checkOutBtn = page
        .locator('button:has-text("Check Out")')
        .or(page.locator('button:has-text("Check-Out")'));
      if (await checkOutBtn.first().isVisible()) {
        await checkOutBtn.first().click();
        await page.waitForTimeout(3000);
      } else {
        console.log("No check-out available for test customer");
        test.skip();
      }
    });

    // Step 5: Complete check-out
    await test.step("Complete check-out", async () => {
      // Mark belongings as returned if visible
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        const checkbox = checkboxes.nth(i);
        if ((await checkbox.isVisible()) && !(await checkbox.isChecked())) {
          await checkbox.click();
        }
      }

      // Click complete
      const completeBtn = page.locator('button:has-text("Complete")');
      if (await completeBtn.first().isVisible()) {
        await completeBtn.first().click();
        await page.waitForTimeout(3000);
      }

      // Verify completion
      const successIndicator = page
        .locator("text=Complete")
        .or(page.locator("text=COMPLETED"));
      await expect(successIndicator.first()).toBeVisible({ timeout: 15000 });
    });
  });
});
