import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./src/__tests__/e2e",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ["html"],
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.REACT_APP_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",

    /* Maximum time each action can take */
    actionTimeout: 10000,

    /* Maximum time for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: "npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "cd ../services/customer && npm run dev",
      url: "http://localhost:4004/health",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "cd ../services/reservation-service && npm run dev",
      url: "http://localhost:4003/health",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
