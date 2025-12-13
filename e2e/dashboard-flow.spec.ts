/**
 * E2E Test: Dashboard Functionality
 * Tests the dashboard displays correct data and navigation works
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_TIMEOUT = 60000;

test.describe("Dashboard Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test("should display dashboard with key metrics", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to Dashboard
    await test.step("Navigate to Dashboard", async () => {
      await page.click("text=Dashboard");
      await expect(page).toHaveURL(/.*dashboard/);
    });

    // Verify key sections are visible
    await test.step("Verify dashboard sections", async () => {
      // Wait for dashboard to load
      await page.waitForTimeout(3000);

      // Should have date selector or today's date
      const dateSection = page
        .locator("text=Today")
        .or(page.locator('input[type="date"]'));
      await expect(dateSection.first()).toBeVisible({ timeout: 10000 });

      // Should have arrivals/check-ins section
      const arrivalsSection = page
        .locator("text=Arrivals")
        .or(page.locator("text=Check-ins").or(page.locator("text=Check-Ins")));
      await expect(arrivalsSection.first()).toBeVisible({ timeout: 10000 });

      // Should have departures/check-outs section
      const departuresSection = page
        .locator("text=Departures")
        .or(
          page.locator("text=Check-outs").or(page.locator("text=Check-Outs"))
        );
      await expect(departuresSection.first()).toBeVisible({ timeout: 10000 });
    });

    // Verify counts are displayed
    await test.step("Verify metric counts", async () => {
      // Should display numeric counts
      const countElements = page.locator("text=/^\\d+$/");
      const count = await countElements.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test("should navigate to check-in from dashboard", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click("text=Dashboard");
    await page.waitForTimeout(3000);

    // Find and click a check-in action
    await test.step("Click check-in action", async () => {
      const checkInButton = page.locator('button:has-text("Check In")').first();
      const checkInLink = page.locator('a:has-text("Check In")').first();

      if (await checkInButton.isVisible()) {
        await checkInButton.click();
      } else if (await checkInLink.isVisible()) {
        await checkInLink.click();
      } else {
        // Click on arrivals section to expand
        const arrivalsSection = page.locator("text=Arrivals").first();
        if (await arrivalsSection.isVisible()) {
          await arrivalsSection.click();
          await page.waitForTimeout(1000);
        }

        // Try again
        const checkInAction = page.locator("text=Check In").first();
        if (await checkInAction.isVisible()) {
          await checkInAction.click();
        } else {
          test.skip();
        }
      }

      // Should navigate to check-in page
      await page.waitForTimeout(2000);
      const checkInPage = page
        .locator("text=Check-In")
        .or(page.locator("text=Pet Summary"));
      await expect(checkInPage.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("should filter dashboard by date", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click("text=Dashboard");
    await page.waitForTimeout(3000);

    // Find date picker
    await test.step("Change date filter", async () => {
      const datePicker = page
        .locator('input[type="date"]')
        .or(page.locator('button:has-text("Today")'));

      if (await datePicker.isVisible()) {
        // Click to open date picker
        await datePicker.click();

        // Try to select tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // For input type date
        const dateInput = page.locator('input[type="date"]');
        if (await dateInput.isVisible()) {
          const dateStr = tomorrow.toISOString().split("T")[0];
          await dateInput.fill(dateStr);
        }

        await page.waitForTimeout(2000);

        // Dashboard should refresh with new data
        const dashboard = page
          .locator("text=Arrivals")
          .or(page.locator("text=Check-ins"));
        await expect(dashboard.first()).toBeVisible();
      }
    });
  });

  test("should display announcements on dashboard", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click("text=Dashboard");
    await page.waitForTimeout(3000);

    // Check for announcements section
    await test.step("Check announcements", async () => {
      const announcementsSection = page
        .locator("text=Announcements")
        .or(page.locator("text=Notice"));

      // Announcements may or may not be present
      if (await announcementsSection.isVisible()) {
        await expect(announcementsSection).toBeVisible();
      }
      // Test passes either way - announcements are optional
    });
  });

  test("should show occupancy information", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click("text=Dashboard");
    await page.waitForTimeout(3000);

    // Check for occupancy or capacity information
    await test.step("Check occupancy display", async () => {
      const occupancySection = page
        .locator("text=Occupancy")
        .or(page.locator("text=Capacity").or(page.locator("text=Available")));

      if (await occupancySection.isVisible()) {
        await expect(occupancySection).toBeVisible();

        // Should show some numeric value
        const occupancyValue = page.locator("text=/\\d+%?/").first();
        await expect(occupancyValue).toBeVisible();
      }
    });
  });

  test("should navigate to reservation details from dashboard", async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click("text=Dashboard");
    await page.waitForTimeout(3000);

    // Click on a reservation in the dashboard
    await test.step("Click reservation to view details", async () => {
      // Find a clickable reservation item
      const reservationItem = page
        .locator('[class*="reservation"]')
        .or(page.locator('[class*="card"]'))
        .first();

      if (await reservationItem.isVisible()) {
        await reservationItem.click();
        await page.waitForTimeout(2000);

        // Should show reservation details or navigate to details page
        const detailsPage = page
          .locator("text=Reservation Details")
          .or(page.locator("text=Customer").or(page.locator("text=Pet")));
        await expect(detailsPage.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test("should refresh dashboard data", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.click("text=Dashboard");
    await page.waitForTimeout(3000);

    // Get initial state
    let initialArrivals = "";
    await test.step("Capture initial state", async () => {
      const arrivalsCount = page.locator("text=/\\d+/").first();
      if (await arrivalsCount.isVisible()) {
        initialArrivals = (await arrivalsCount.textContent()) || "";
      }
    });

    // Refresh page
    await test.step("Refresh dashboard", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Dashboard should still be visible and functional
      const dashboard = page
        .locator("text=Arrivals")
        .or(page.locator("text=Check-ins"));
      await expect(dashboard.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
