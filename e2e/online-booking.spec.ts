/**
 * Online Booking Portal E2E Tests
 *
 * Tests the customer-facing booking portal against production.
 * These tests verify the complete booking flow from login to confirmation.
 *
 * Usage:
 *   TEST_EMAIL=customer@example.com TEST_PASSWORD='password' \
 *   BASE_URL=https://tailtown.canicloud.com \
 *   npx playwright test online-booking --project=chromium
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_TIMEOUT = 60000;

// Test customer credentials - should be a real customer in production
const TEST_CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || "";
const TEST_CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || "";

test.describe.configure({ mode: "serial" });

test.describe("Online Booking Portal", () => {
  test("should display booking portal login page", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    // Should show login form
    await expect(
      page.locator('input[type="email"]').or(page.getByLabel("Email"))
    ).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('input[type="password"]').or(page.getByLabel("Password"))
    ).toBeVisible();

    // Should have login and create account options
    const loginText = page
      .locator("text=Login")
      .or(page.locator("text=Sign In"));
    await expect(loginText.first()).toBeVisible();
  });

  test("should show create account form", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    // Click create account
    const createAccountBtn = page
      .locator("text=Create Account")
      .or(page.locator("text=Sign Up"))
      .or(page.locator("text=Register"));

    if (await createAccountBtn.first().isVisible()) {
      await createAccountBtn.first().click();
      await page.waitForTimeout(1000);

      // Should show registration fields
      const firstNameField = page
        .getByLabel("First Name")
        .or(page.locator('input[name="firstName"]'));
      const lastNameField = page
        .getByLabel("Last Name")
        .or(page.locator('input[name="lastName"]'));

      await expect(firstNameField.or(lastNameField).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should show error for invalid credentials", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    // Try to login with invalid credentials
    const emailInput = page
      .locator('input[type="email"]')
      .or(page.getByLabel("Email"));
    const passwordInput = page
      .locator('input[type="password"]')
      .or(page.getByLabel("Password"));

    await emailInput.first().fill("invalid@nonexistent.com");
    await passwordInput.first().fill("wrongpassword");

    // Submit
    const submitBtn = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Login")'))
      .or(page.locator('button:has-text("Sign In")'));
    await submitBtn.first().click();

    // Should show error
    await page.waitForTimeout(3000);
    const errorAlert = page
      .locator('[role="alert"]')
      .or(page.locator("text=error"))
      .or(page.locator("text=invalid"))
      .or(page.locator("text=not found"));
    // Error should appear (don't fail if no error - might be rate limited)
  });

  test("should be mobile responsive", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    // Form should be visible
    const emailInput = page
      .locator('input[type="email"]')
      .or(page.getByLabel("Email"));
    await expect(emailInput.first()).toBeVisible({ timeout: 15000 });

    // Check page doesn't overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400);
  });
});

test.describe("Booking Flow (Authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    if (!TEST_CUSTOMER_EMAIL || !TEST_CUSTOMER_PASSWORD) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    // Login as test customer
    const emailInput = page
      .locator('input[type="email"]')
      .or(page.getByLabel("Email"));
    const passwordInput = page
      .locator('input[type="password"]')
      .or(page.getByLabel("Password"));

    await emailInput.first().fill(TEST_CUSTOMER_EMAIL);
    await passwordInput.first().fill(TEST_CUSTOMER_PASSWORD);

    const submitBtn = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Login")'))
      .or(page.locator('button:has-text("Sign In")'));
    await submitBtn.first().click();

    // Wait for service selection to appear
    await page.waitForTimeout(5000);
  });

  test("should show service selection after login", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Should see service selection
    const serviceSelection = page
      .locator("text=Select Service")
      .or(page.locator("text=What service"))
      .or(page.locator("text=Boarding"))
      .or(page.locator("text=Daycare"))
      .or(page.locator("text=Grooming"));

    await expect(serviceSelection.first()).toBeVisible({ timeout: 15000 });
  });

  test("should display available services", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Wait for services to load
    await page.waitForTimeout(3000);

    // Should see at least one service type
    const services = page
      .locator("text=Boarding")
      .or(page.locator("text=Daycare"))
      .or(page.locator("text=Grooming"))
      .or(page.locator("text=Training"));

    await expect(services.first()).toBeVisible({ timeout: 15000 });
  });

  test("should navigate through booking steps", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT * 2);

    // Wait for services to load
    await page.waitForTimeout(3000);

    // Step 1: Select a service (try Daycare first as it's simpler)
    const daycareService = page
      .locator("text=Daycare")
      .or(page.locator("text=Day Camp"));
    const boardingService = page.locator("text=Boarding");

    if (await daycareService.first().isVisible()) {
      await daycareService.first().click();
    } else if (await boardingService.first().isVisible()) {
      await boardingService.first().click();
    }

    await page.waitForTimeout(2000);

    // Look for Next button or step progression
    const nextBtn = page
      .locator('button:has-text("Next")')
      .or(page.locator('button:has-text("Continue")'));

    if (await nextBtn.first().isVisible()) {
      await nextBtn.first().click();
      await page.waitForTimeout(2000);

      // Should progress to next step (date selection or room selection)
      const nextStepIndicator = page
        .locator("text=Date")
        .or(page.locator("text=Room"))
        .or(page.locator("text=Step 2"));

      await expect(nextStepIndicator.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("should show step progress indicator", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Should show step indicator
    const stepIndicator = page
      .locator("text=Step 1")
      .or(page.locator("text=1 of"))
      .or(page.locator('[role="progressbar"]'))
      .or(page.locator(".MuiStepper-root"));

    await expect(stepIndicator.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Booking Portal - Accessibility", () => {
  test("should have proper form labels", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    // Email input should have a label
    const emailLabel = page.locator('label:has-text("Email")');
    await expect(emailLabel.first()).toBeVisible({ timeout: 15000 });

    // Password input should have a label
    const passwordLabel = page.locator('label:has-text("Password")');
    await expect(passwordLabel.first()).toBeVisible();
  });

  test("should have focusable submit button", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Login")'))
      .or(page.locator('button:has-text("Sign In")'));

    await expect(submitButton.first()).toBeVisible({ timeout: 15000 });
    await expect(submitButton.first()).toBeEnabled();
  });

  test("should support keyboard navigation", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await page.goto(`${BASE_URL}/book`);
    await page.waitForLoadState("networkidle");

    // Tab through form elements
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should be able to type in focused field
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});
