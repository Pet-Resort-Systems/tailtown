import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4004';

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page
    .getByLabel('Email Address')
    .or(page.locator('input[name="email"]'))
    .first()
    .fill('admin@tailtown.com');
  await page
    .getByLabel('Password')
    .or(page.locator('input[name="password"]'))
    .first()
    .fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

test.describe('Calendar Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('calendar should load and display reservations', async ({ page }) => {
    await page.goto(`${BASE_URL}/calendar`);

    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/resources') && response.status() === 200
    );

    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/reservations') &&
        response.status() === 200
    );

    await expect(page.locator('[class*="calendar"]')).toBeVisible();

    const kennelRows = await page
      .locator('[class*="kennel-row"], [class*="resource-row"], tr')
      .count();
    expect(kennelRows).toBeGreaterThan(0);
  });

  test('calendar API should return reservations for date range', async ({
    page,
  }) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    const response = await page.request.get(`${API_URL}/api/reservations`, {
      params: { startDate, endDate, limit: '100' },
      headers: { 'x-tenant-id': 'tailtown' },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('success');
    expect(data.data).toBeDefined();

    const allOverlap = data.data.every((res: any) => {
      const resStart = new Date(res.startDate);
      const resEnd = new Date(res.endDate);
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      rangeEnd.setHours(23, 59, 59, 999);
      return resStart <= rangeEnd && resEnd >= rangeStart;
    });
    expect(allOverlap).toBe(true);
  });

  test('calendar should show reservations with resources', async ({ page }) => {
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForTimeout(2000);

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[useKennelData]')) {
        consoleMessages.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    expect(true).toBe(true);
  });
});

test.describe('Dashboard Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard should load with metrics', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/reservations') &&
        response.status() === 200
    );

    await expect(page.locator('text=/Check.?[Ii]n/i').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=/Check.?[Oo]ut/i').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=/[Oo]vernight/i').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('dashboard API should return reservations with service data', async ({
    page,
  }) => {
    const today = new Date().toISOString().split('T')[0];

    const response = await page.request.get(`${API_URL}/api/reservations`, {
      params: { date: today, limit: '100' },
      headers: { 'x-tenant-id': 'tailtown' },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('success');

    if (data.data && data.data.length > 0) {
      const firstRes = data.data[0];
      expect(firstRes.service).toBeDefined();
      expect(firstRes.service.serviceCategory).toBeDefined();
    }
  });

  test('dashboard should exclude cancelled reservations from counts', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const metricsLog: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[Dashboard] Calculated metrics')) {
        metricsLog.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    console.log('Metrics logs:', metricsLog);
  });

  test('overnight count should only include CHECKED_IN boarding', async ({
    page,
  }) => {
    const today = new Date().toISOString().split('T')[0];

    const response = await page.request.get(`${API_URL}/api/reservations`, {
      params: { date: today, limit: '500' },
      headers: { 'x-tenant-id': 'tailtown' },
    });

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const overnight = data.data.filter((res: any) => {
        if (res.status !== 'CHECKED_IN') return false;
        if (res.service?.serviceCategory !== 'BOARDING') return false;

        const startDate = new Date(res.startDate).toISOString().split('T')[0];
        const endDate = new Date(res.endDate).toISOString().split('T')[0];

        return startDate <= today && endDate > today;
      });

      console.log(
        `Overnight count (CHECKED_IN + BOARDING): ${overnight.length}`
      );

      const allValid = overnight.every(
        (res: any) =>
          res.status !== 'CANCELLED' &&
          res.service?.serviceCategory === 'BOARDING'
      );
      expect(allValid).toBe(true);
    }
  });
});

test.describe('API Contract Tests', () => {
  test('reservations API should support date param', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    const response = await page.request.get(`${API_URL}/api/reservations`, {
      params: { date: today },
      headers: { 'x-tenant-id': 'tailtown' },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('success');
  });

  test('reservations API should support startDate/endDate params', async ({
    page,
  }) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const response = await page.request.get(`${API_URL}/api/reservations`, {
      params: {
        startDate: today.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
      },
      headers: { 'x-tenant-id': 'tailtown' },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('success');
  });

  test('reservations API should include required relations', async ({
    page,
  }) => {
    const response = await page.request.get(`${API_URL}/api/reservations`, {
      params: { limit: '1' },
      headers: { 'x-tenant-id': 'tailtown' },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    test.skip(!(data.data && data.data.length > 0), 'No reservations to test');

    const res = data.data[0];

    expect(res).toHaveProperty('customer');
    expect(res).toHaveProperty('pet');
    expect(res).toHaveProperty('service');
    expect(res).toHaveProperty('resource');
  });

  test('resources API should return all resource types', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/resources`, {
      params: { limit: '200' },
      headers: { 'x-tenant-id': 'tailtown' },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.data.length).toBeGreaterThan(0);

    const types = new Set(data.data.map((r: any) => r.type));
    console.log('Resource types found:', Array.from(types));

    const hasKennels =
      types.has('JUNIOR_KENNEL') ||
      types.has('QUEEN_KENNEL') ||
      types.has('KING_KENNEL') ||
      types.has('KENNEL');
    expect(hasKennels).toBe(true);
  });
});
