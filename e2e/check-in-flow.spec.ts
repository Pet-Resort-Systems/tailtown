/**
 * E2E Test: Complete Check-in Flow
 * Tests the entire check-in journey from dashboard to completion
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_TIMEOUT = 90000; // 90 seconds for longer flows

test.describe("Complete Check-in Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test("should complete full check-in workflow", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to Dashboard
    await test.step("Navigate to Dashboard", async () => {
      await page.click("text=Dashboard");
      await expect(page).toHaveURL(/.*dashboard/);
      await page.waitForSelector("text=Today", { timeout: 10000 });
    });

    // Step 2: Find a reservation to check in
    await test.step("Find check-in from dashboard", async () => {
      // Look for check-in button or arrivals section
      const checkInButton = page.locator('button:has-text("Check In")').first();
      const arrivalsSection = page.locator("text=Arrivals").first();

      if (await checkInButton.isVisible()) {
        await checkInButton.click();
      } else if (await arrivalsSection.isVisible()) {
        // Click on arrivals section to expand
        await arrivalsSection.click();
        await page.waitForTimeout(1000);
        // Click first check-in link
        await page.click("text=Check In >> nth=0");
      } else {
        // Navigate to reservations and find one
        await page.click("text=Reservations");
        await page.waitForSelector("table");
        await page.click("table tbody tr >> nth=0");
        await page.click('button:has-text("Check In")');
      }

      // Wait for check-in workflow to load
      await page.waitForSelector("text=Check-In", { timeout: 10000 });
    });

    // Step 3: Complete Pet Summary step
    await test.step("Review Pet Summary", async () => {
      // Should see pet information
      await expect(
        page.locator("text=Pet Summary").or(page.locator("text=Step 1"))
      ).toBeVisible();

      // Verify pet card is displayed
      const petCard = page
        .locator('[class*="PetSummaryCard"]')
        .or(page.locator("text=Vaccination"));
      await expect(petCard.first()).toBeVisible();

      // Click Next to proceed
      await page.click('button:has-text("Next")');
    });

    // Step 4: Complete Questionnaire step
    await test.step("Complete Questionnaire", async () => {
      // Wait for questionnaire to load
      await page.waitForTimeout(1000);

      // Fill in any required questions
      const textInputs = page.locator('input[type="text"]');
      const count = await textInputs.count();
      for (let i = 0; i < count; i++) {
        const input = textInputs.nth(i);
        if ((await input.isVisible()) && (await input.isEnabled())) {
          await input.fill("Test answer");
        }
      }

      // Handle yes/no questions
      const yesButtons = page.locator('button:has-text("Yes")');
      const yesCount = await yesButtons.count();
      for (let i = 0; i < yesCount; i++) {
        const btn = yesButtons.nth(i);
        if (await btn.isVisible()) {
          await btn.click();
        }
      }

      // Click Next
      await page.click('button:has-text("Next")');
    });

    // Step 5: Complete Medications step
    await test.step("Add Medications (optional)", async () => {
      await page.waitForTimeout(1000);

      // Check if we're on medications step
      const medsTitle = page.locator("text=Medications");
      if (await medsTitle.isVisible()) {
        // Optionally add a medication
        const addMedButton = page.locator('button:has-text("Add Medication")');
        if (await addMedButton.isVisible()) {
          // Skip adding for now, just proceed
        }

        // Click Next
        await page.click('button:has-text("Next")');
      }
    });

    // Step 6: Complete Belongings step
    await test.step("Add Belongings", async () => {
      await page.waitForTimeout(1000);

      // Check if we're on belongings step
      const belongingsTitle = page.locator("text=Belongings");
      if (await belongingsTitle.isVisible()) {
        // Quick-add a common item
        const collarChip = page.locator("text=Collar").first();
        if (await collarChip.isVisible()) {
          await collarChip.click();
        }

        // Click Next
        await page.click('button:has-text("Next")');
      }
    });

    // Step 7: Complete Service Agreement step
    await test.step("Sign Service Agreement", async () => {
      await page.waitForTimeout(1000);

      // Check if we're on agreement step
      const agreementTitle = page
        .locator("text=Service Agreement")
        .or(page.locator("text=Agreement"));
      if (await agreementTitle.isVisible()) {
        // Fill in customer name
        const nameInput = page
          .locator('input[placeholder*="name"]')
          .or(page.locator('label:has-text("Name") + input'));
        if (await nameInput.isVisible()) {
          await nameInput.fill("Test Customer");
        }

        // Draw signature on canvas
        const signatureCanvas = page.locator("canvas");
        if (await signatureCanvas.isVisible()) {
          const box = await signatureCanvas.boundingBox();
          if (box) {
            // Draw a simple signature
            await page.mouse.move(box.x + 50, box.y + 50);
            await page.mouse.down();
            await page.mouse.move(box.x + 150, box.y + 30);
            await page.mouse.move(box.x + 200, box.y + 70);
            await page.mouse.up();
          }
        }

        // Click Next
        await page.click('button:has-text("Next")');
      }
    });

    // Step 8: Review and Submit
    await test.step("Review and Complete Check-in", async () => {
      await page.waitForTimeout(1000);

      // Should be on review step
      const reviewTitle = page.locator("text=Review");
      if (await reviewTitle.isVisible()) {
        // Verify summary information is displayed
        await expect(
          page.locator("text=Medications").or(page.locator("text=Belongings"))
        ).toBeVisible();
      }

      // Click Complete Check-In button
      const completeButton = page
        .locator('button:has-text("Complete Check-In")')
        .or(page.locator('button:has-text("Submit")'));
      await completeButton.click();

      // Wait for completion
      await page.waitForTimeout(3000);
    });

    // Step 9: Verify completion
    await test.step("Verify Check-in Complete", async () => {
      // Should see success message or completion page
      const successIndicator = page
        .locator("text=Complete")
        .or(page.locator("text=Success"))
        .or(page.locator("text=checked in"));
      await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("should edit belongings after check-in completion", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to a completed check-in
    await test.step("Navigate to completed check-in", async () => {
      await page.click("text=Reservations");
      await page.waitForSelector("table");

      // Find a checked-in reservation
      const checkedInRow = page.locator('tr:has-text("CHECKED_IN")').first();
      if (await checkedInRow.isVisible()) {
        await checkedInRow.click();
      } else {
        // Skip test if no checked-in reservations
        test.skip();
      }
    });

    // Click on View Check-in
    await test.step("View check-in details", async () => {
      const viewCheckInButton = page
        .locator('button:has-text("View Check-In")')
        .or(page.locator('a:has-text("Check-In")'));
      if (await viewCheckInButton.isVisible()) {
        await viewCheckInButton.click();
        await page.waitForTimeout(2000);
      }
    });

    // Edit belongings
    await test.step("Edit belongings", async () => {
      // Find edit button for belongings
      const editButton = page
        .locator('button[aria-label="edit"]')
        .or(page.locator('svg[data-testid="EditIcon"]'))
        .first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // Wait for dialog
        await page.waitForSelector("text=Edit Belongings", { timeout: 5000 });

        // Add a new item
        const toyChip = page.locator("text=Toy").first();
        if (await toyChip.isVisible()) {
          await toyChip.click();
        }

        // Save
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(2000);

        // Verify saved
        await expect(page.locator("text=Toy")).toBeVisible();
      }
    });
  });

  test("should show pet history in check-in workflow", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to a check-in workflow
    await test.step("Navigate to check-in", async () => {
      await page.click("text=Reservations");
      await page.waitForSelector("table");

      // Find a pending reservation
      const pendingRow = page
        .locator('tr:has-text("CONFIRMED")')
        .or(page.locator('tr:has-text("PENDING")'))
        .first();
      if (await pendingRow.isVisible()) {
        await pendingRow.click();
        await page.click('button:has-text("Check In")');
        await page.waitForSelector("text=Check-In", { timeout: 10000 });
      } else {
        test.skip();
      }
    });

    // Expand pet history section
    await test.step("View pet history", async () => {
      // Look for Previous Visits section
      const historySection = page.locator("text=Previous Visits");
      if (await historySection.isVisible()) {
        await historySection.click();
        await page.waitForTimeout(1000);

        // Should show history or "No previous visits"
        const historyContent = page
          .locator("text=No previous visits")
          .or(page.locator("text=COMPLETED"));
        await expect(historyContent.first()).toBeVisible();
      }
    });
  });
});
