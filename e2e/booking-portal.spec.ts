import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TENANT_ID = process.env.TENANT_ID || 'dev';

const TEST_CUSTOMER = {
  email: 'test@example.com',
  password: 'anypassword',
};

async function customerLogin(page: Page) {
  await page.goto(`${BASE_URL}/book`);

  await page.evaluate((tenantId) => {
    localStorage.setItem('tailtown_tenant_id', tenantId);
  }, TENANT_ID);

  await page.reload();

  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', TEST_CUSTOMER.email);
  await page.fill('input[type="password"]', TEST_CUSTOMER.password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Select Service', { timeout: 15000 });
}

test.describe('Booking Portal - Authentication UI', () => {
  test('should display login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('text=Create Account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error for non-existent customer', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);

    await page.evaluate((tenantId) => {
      localStorage.setItem('tailtown_tenant_id', tenantId);
    }, TENANT_ID);
    await page.reload();

    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'anypassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test('should show signup form', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await page.click('text=Create Account');
    await expect(page.locator('label:has-text("First Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Last Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Phone")')).toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page.locator('text=Forgot password')).toBeVisible();
  });
});

test.describe('Booking Portal - Login Flow', () => {
  test('should login successfully with existing customer email', async ({
    page,
  }) => {
    await customerLogin(page);
    await expect(page.getByText('Select Service')).toBeVisible();
  });

  test('should display service categories after login', async ({ page }) => {
    await customerLogin(page);
    await expect(
      page.locator('text=/boarding|daycare|grooming/i').first()
    ).toBeVisible();
  });
});

test.describe('Booking Portal - Service Selection', () => {
  test('should show service selection page after login', async ({ page }) => {
    await customerLogin(page);
    await expect(
      page.getByText('What service would you like to book?')
    ).toBeVisible();
    await expect(page.getByText('Step 1 of 6')).toBeVisible();
  });
});

test.describe('Booking Portal - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be usable on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    const body = page.locator('body');
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('should show mobile-friendly form', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);

    const form = page.locator('form');
    await expect(form).toBeVisible();

    const emailInput = page.locator('input[type="email"]');
    const box = await emailInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
  });
});

test.describe('Booking Portal - Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });
});
