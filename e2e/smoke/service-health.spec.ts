import { test, expect } from '@playwright/test';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const CUSTOMER_SERVICE_BASE_URL = process.env.CUSTOMER_SERVICE_URL
  ? process.env.CUSTOMER_SERVICE_URL.replace(/\/health$/, '')
  : 'http://localhost:4004';
const RESERVATION_SERVICE_BASE_URL = process.env.RESERVATION_SERVICE_URL
  ? process.env.RESERVATION_SERVICE_URL.replace(/\/health$/, '')
  : 'http://localhost:4003';
const TENANT_SUBDOMAIN = process.env.TENANT_SUBDOMAIN || 'dev';

async function runShellCommand(command: string) {
  const { stdout } = await execAsync(command, { shell: '/bin/zsh' });
  return stdout.trim();
}

test.describe.configure({ mode: 'serial' });

test.describe('Service Health Smoke Tests', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Run service smoke checks once in the chromium project'
  );

  const services = [
    {
      name: 'Customer Service',
      url: `${CUSTOMER_SERVICE_BASE_URL}/api/customers?page=1&limit=1`,
      expectedStatus: 200,
    },
    {
      name: 'Reservation Service',
      url: `${RESERVATION_SERVICE_BASE_URL}/health`,
      expectedStatus: 200,
    },
    {
      name: 'Frontend',
      url: FRONTEND_URL,
      expectedStatus: 200,
    },
  ];

  for (const service of services) {
    test(`should have ${service.name} running and accessible`, async ({ request }) => {
      const response = await request.get(service.url, { timeout: 5000 });
      expect(response.status()).toBe(service.expectedStatus);
    });
  }

  test('should return customer data from Customer Service', async ({ request }) => {
    const response = await request.get(
      `${CUSTOMER_SERVICE_BASE_URL}/api/customers?page=1&limit=1`,
      {
        timeout: 5000,
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: 'success' });
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should return health status from Reservation Service', async ({ request }) => {
    const response = await request.get(`${RESERVATION_SERVICE_BASE_URL}/health`, {
      timeout: 5000,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success');
  });

  test('should have backend services connected without database failures', async ({
    request,
  }) => {
    const customerResponse = await request.get(
      `${CUSTOMER_SERVICE_BASE_URL}/api/customers?page=1&limit=1`,
      {
        timeout: 5000,
      }
    );

    expect(customerResponse.status()).toBe(200);

    const reservationResponse = await request.get(
      `${RESERVATION_SERVICE_BASE_URL}/api/reservations`,
      {
        headers: {
          'X-Tenant-Subdomain': TENANT_SUBDOMAIN,
        },
        timeout: 5000,
      }
    );

    expect(reservationResponse.status()).not.toBe(500);
  });

  test('should have required service ports listening', async () => {
    for (const port of [3000, 4003, 4004]) {
      const stdout = await runShellCommand(`lsof -i :${port} | grep LISTEN || true`);
      expect(stdout.length).toBeGreaterThan(0);
    }
  });

  test('should not have excessive Tailtown Node.js processes running', async () => {
    const stdout = await runShellCommand(
      'ps aux | grep -E "(pnpm|node)" | grep -E "(tailtown|customer|reservation|frontend|vite)" | grep -v grep | wc -l'
    );
    const processCount = Number.parseInt(stdout, 10) || 0;

    expect(processCount).toBeLessThan(20);
  });
});
