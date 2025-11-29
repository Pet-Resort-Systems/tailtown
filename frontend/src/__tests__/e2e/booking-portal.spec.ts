/**
 * Booking Portal E2E Tests
 * 
 * Note: Customer login currently requires authentication to search customers,
 * which is a bug (chicken-and-egg problem). Tests that require login are skipped
 * until the customer auth endpoint is properly implemented.
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.REACT_APP_URL || "http://localhost:3000";

test.describe("Booking Portal - Authentication UI", () => {
  test("should display login form", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page.locator("text=Login")).toBeVisible();
    await expect(page.locator("text=Create Account")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should show error for non-existent customer", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await page.fill('input[type="email"]', "nonexistent@example.com");
    await page.fill('input[type="password"]', "anypassword");
    await page.click('button[type="submit"]');
    // Error appears in Alert component (401 or "Customer not found")
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test("should show signup form", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await page.click("text=Create Account");
    await expect(page.locator('label:has-text("First Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Last Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Phone Number")')).toBeVisible();
  });

  test("should have forgot password link", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page.locator("text=Forgot password")).toBeVisible();
  });
});

test.describe("Booking Portal - Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should be usable on mobile", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check page doesn't overflow horizontally
    const body = page.locator("body");
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test("should show mobile-friendly form", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    
    // Form should be visible and properly sized
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Inputs should be full width on mobile
    const emailInput = page.locator('input[type="email"]');
    const box = await emailInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300); // Should be nearly full width
  });
});

test.describe("Booking Portal - Accessibility", () => {
  test("should have proper form labels", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    
    // Email input should have a label
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    
    // Password input should have a label
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test("should have submit button", async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });
});

// These tests are skipped until customer auth is properly implemented
// Currently, the customer search endpoint requires authentication,
// which creates a chicken-and-egg problem for login
test.describe.skip("Booking Portal - Login Flow (requires auth fix)", () => {
  test("should login successfully with existing customer email", async ({ page }) => {
    // TODO: Implement when customer auth endpoint is available
  });

  test("should display service categories after login", async ({ page }) => {
    // TODO: Implement when customer auth endpoint is available
  });

  test("should advance when service selected", async ({ page }) => {
    // TODO: Implement when customer auth endpoint is available
  });
});
