# E2E Tests with Playwright

## Overview

End-to-end tests live in the dedicated `e2e/` pnpm workspace package. This package is the source of truth for Playwright coverage in Tailtown and replaces the old frontend-local Playwright layout.

The suite exercises complete user flows across the application stack and is configured to run against the current app and services defined in `e2e/playwright.config.ts`.

## Workspace Package Layout

The `e2e/` package currently contains:

- `package.json` with the package-local Playwright scripts
- `playwright.config.ts` with browser, reporter, timeout, and `webServer` configuration
- `setup/test-data.ts` for E2E data setup helpers
- Playwright specs for critical paths, booking, dashboard, check-in, checkout, kennel management, and production smoke flows

## Current Spec Files

Current spec files in this isolated package include:

- `booking-portal.spec.ts`
- `calendar-dashboard-critical.spec.ts`
- `check-in-flow.spec.ts`
- `checkout-flow.spec.ts`
- `critical-paths.spec.ts`
- `dashboard-flow.spec.ts`
- `kennel-management.spec.ts`
- `online-booking.spec.ts`
- `production-smoke.spec.ts`
- `production-workflow.spec.ts`
- `reservation-flow.spec.ts`

## Coverage Areas

The isolated `e2e` package currently covers flows such as:

- Reservation creation and edits
- Booking portal and online booking flows
- Calendar and dashboard critical paths
- Check-in and checkout workflows
- Kennel management and print flows
- Production-oriented smoke and workflow checks

## Setup

### Prerequisites

1. **Node.js and pnpm installed**
2. **Workspace dependencies installed from the repo root**
3. **Required services available locally, or allow Playwright `webServer` to start them**
4. **Database populated with the data required by your target scenarios**

Install workspace dependencies from the repo root:

```bash
pnpm install --frozen-lockfile
```

Install Playwright browsers for the isolated package:

```bash
pnpm --dir e2e exec playwright install
```

For CI environments that also need browser system dependencies:

```bash
pnpm --dir e2e exec playwright install --with-deps
```

## Running Tests

Run the isolated suite from the repo root:

```bash
pnpm run test:e2e
```

This suite targets `apps/frontend-vite` as the app under test through `e2e/playwright.config.ts`.

Run package-local Playwright directly:

```bash
pnpm --dir e2e exec playwright test
```

Run a specific spec file:

```bash
pnpm --dir e2e exec playwright test reservation-flow.spec.ts
pnpm --dir e2e exec playwright test critical-paths.spec.ts
```

Open Playwright UI mode:

```bash
pnpm run test:e2e:ui
```

Run in headed mode:

```bash
pnpm run test:e2e:headed
```

Debug interactively:

```bash
pnpm run test:e2e:debug
```

Open the HTML report:

```bash
pnpm run test:e2e:report
```

Run a specific browser project:

```bash
pnpm --dir e2e exec playwright test --project=chromium
pnpm --dir e2e exec playwright test --project=firefox
pnpm --dir e2e exec playwright test --project=webkit
```

## Configuration

### `e2e/playwright.config.ts`

Key settings in the isolated workspace config:

- **Base URL**: `http://localhost:3000` by default
- **Test directory**: the `e2e/` package root
- **Timeout**: 60 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Reporters**: HTML, list, and JUnit
- **Artifacts**: screenshots, videos, and traces on failure or retry
- **Projects**: Chromium, Firefox, WebKit, mobile browsers, Edge, and Chrome

### Managed Services

The isolated config starts the required apps and services through Playwright `webServer` entries:

- `apps/frontend-vite` on `http://localhost:3000`
- `apps/customer-service` on `http://localhost:4004/health`
- `apps/reservation-service` on `http://localhost:4003/health`

### Output Locations

Generated artifacts are written under the `e2e/` package:

- HTML report: `e2e/playwright-report/`
- Test artifacts: `e2e/test-results/`
- JUnit report: `e2e/test-results/junit.xml`

## Test Structure

### Test Organization

```typescript
test.describe('Feature Name', () => {
    test.beforeEach(async ({ page }) => {
        // Setup before each test
    });

    test('should do something', async ({ page }) => {
        await test.step('Step 1', async () => {
            // Test step 1
        });

        await test.step('Step 2', async () => {
            // Test step 2
        });
    });
});
```

### Best Practices

#### DO

- Use `test.step()` for clear test organization
- Wait for elements before interacting
- Use descriptive test names
- Test both success and failure paths
- Verify UI feedback after actions
- Use appropriate timeouts
- Clean up test data if needed

#### DON'T

- Use fixed waits (`waitForTimeout`) unless necessary
- Assume element positions
- Test implementation details
- Share state between tests
- Use production data
- Skip error handling

## Debugging

### Debug Mode

```bash
pnpm run test:e2e:debug
pnpm --dir e2e exec playwright test reservation-flow.spec.ts --debug
```

### Inspect Element

```bash
pnpm --dir e2e exec playwright codegen http://localhost:3000
```

### View Trace

```bash
pnpm --dir e2e exec playwright show-trace trace.zip
```

### Screenshots and Videos

After test failures:

- Screenshots: `e2e/test-results/*/test-failed-*.png`
- Videos: `e2e/test-results/*/video.webm`
- Traces: `e2e/test-results/*/trace.zip`

## CI/CD Integration

E2E runs are wired through the root workspace scripts, which delegate into `@tailtown/e2e`. CI should use the root command surface instead of invoking Playwright from the repo root against a deleted root config.

### GitHub Actions Example

```yaml
- uses: pnpm/action-setup@v5
  with:
      run_install: false

- uses: actions/setup-node@v4
  with:
      node-version: 24.14.0

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Install Playwright browsers
  run: pnpm --dir e2e exec playwright install --with-deps

- name: Run isolated e2e suite
  run: pnpm run test:e2e
```

### Environment Variables

```bash
BASE_URL=http://localhost:3000
CUSTOMER_SERVICE_URL=http://localhost:4004/health
RESERVATION_SERVICE_URL=http://localhost:4003/health
CI=true
```

## Troubleshooting

### Tests Timing Out

Update the timeout in `e2e/playwright.config.ts` if a flow needs a longer budget:

```typescript
timeout: 120000;
```

### Element Not Found

```typescript
await page.waitForSelector('text=Element', { timeout: 10000 });
await page.click('button');
```

### Browser Not Installed

```bash
pnpm --dir e2e exec playwright install --force
```

## Test Data Management

Use `setup/test-data.ts` for E2E-oriented data setup tasks when a scenario needs controlled fixtures:

```bash
pnpm --dir e2e test:data:setup
```

## Performance

### Parallel Execution

```bash
pnpm --dir e2e exec playwright test
pnpm --dir e2e exec playwright test --workers=1
```

### Sharding

```bash
pnpm --dir e2e exec playwright test --shard=1/3
pnpm --dir e2e exec playwright test --shard=2/3
pnpm --dir e2e exec playwright test --shard=3/3
```

## Reporting

### HTML Report

```bash
pnpm run test:e2e:report
```

### JUnit Report

```bash
cat e2e/test-results/junit.xml
```

## Next Steps

For more information on future enhancements and planned improvements, refer to the centralized roadmap:

**[Testing Future Enhancements](../docs/testing/FUTURE-ENHANCEMENTS.md)**

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [`../docs/testing/TESTING.md`](../docs/testing/TESTING.md)
- [`../docs/development/CI-CD-SETUP.md`](../docs/development/CI-CD-SETUP.md)
