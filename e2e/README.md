# E2E Tests with Playwright

## Overview

End-to-end tests that simulate real user interactions with the Tailtown application. These tests validate complete user flows from start to finish across the entire application stack.

## Test Suites

### 1. `reservation-flow.spec.ts` (5 tests)

Tests complete reservation workflows:

- ✅ **Create boarding reservation with kennel assignment**

  - Navigate to kennel calendar
  - Select customer and pet
  - Choose boarding service
  - Assign kennel (with availability indicators)
  - Submit and verify on calendar/dashboard

- ✅ **Prevent double-booking same kennel**

  - Attempt to book occupied kennel
  - Verify occupied kennels show red indicator
  - Verify occupied kennels are disabled

- ✅ **Edit existing reservation and change kennel**

  - Open reservation from list
  - Edit kennel assignment
  - Verify current kennel shows as available
  - Save changes

- ✅ **Create grooming reservation without kennel**

  - Select grooming service
  - Verify kennel selector does NOT appear
  - Submit successfully

- ✅ **Multi-pet reservation with kennel assignments**
  - Select multiple pets
  - Verify individual kennel selectors per pet
  - Assign different kennels to each pet
  - Submit successfully

### 2. `check-in-flow.spec.ts` (3 tests)

Tests complete check-in workflows:

- ✅ **Complete full check-in workflow**

  - Navigate from dashboard to check-in
  - Review pet summary with vaccination status
  - Complete questionnaire
  - Add medications (optional)
  - Add belongings with quick-add
  - Sign service agreement with signature capture
  - Review and submit
  - Verify completion

- ✅ **Edit belongings after check-in completion**

  - Navigate to completed check-in
  - Open belongings edit dialog
  - Add/remove items
  - Save changes

- ✅ **Show pet history in check-in workflow**
  - View Previous Visits section
  - Verify history loads on expand

### 3. `checkout-flow.spec.ts` (3 tests)

Tests complete check-out workflows:

- ✅ **Complete full check-out workflow**

  - Find checked-in reservation
  - Verify belongings returned
  - Add checkout notes
  - Complete checkout
  - Verify status change

- ✅ **Handle checkout with unpaid balance**

  - Check for balance due
  - Verify payment warning or proceed

- ✅ **Update reservation status after checkout**
  - Track completed reservation count
  - Perform checkout
  - Verify count increased

### 4. `dashboard-flow.spec.ts` (6 tests)

Tests dashboard functionality:

- ✅ **Display dashboard with key metrics**

  - Verify arrivals/departures sections
  - Verify numeric counts displayed

- ✅ **Navigate to check-in from dashboard**

  - Click check-in action
  - Verify navigation works

- ✅ **Filter dashboard by date**

  - Change date picker
  - Verify data refreshes

- ✅ **Display announcements on dashboard**

  - Check announcements section

- ✅ **Show occupancy information**

  - Verify occupancy/capacity display

- ✅ **Navigate to reservation details from dashboard**
  - Click reservation item
  - Verify details page

### 5. `kennel-management.spec.ts` (10 tests)

Tests kennel board and print functionality:

- ✅ **Display kennel board with all kennels**

  - Verify summary cards (Total, Available, Occupied)
  - Verify kennel cards show alphanumeric IDs (A01, not just 0)
  - Verify status indicators

- ✅ **Filter kennels by type**

  - Apply suite type filter
  - Verify filtered results

- ✅ **Filter kennels by status**

  - Apply status filter (Available/Occupied)
  - Verify filtered results

- ✅ **Search for specific kennel**

  - Use search functionality
  - Verify search results

- ✅ **Refresh kennel board data**

  - Click refresh button
  - Verify data reloads

- ✅ **Navigate to print kennel cards**

  - Navigate to print page
  - Verify page loads

- ✅ **Display full kennel identifiers for printing**

  - Verify "Kennel #A01" format (not "Kennel #3")
  - Verify pet information displays

- ✅ **Filter print cards by date**

  - Change date filter
  - Verify cards update

- ✅ **Trigger print dialog**

  - Click print button
  - Verify print dialog appears

- ✅ **Color-coded availability**
  - Verify green for available
  - Verify different styling for occupied

**Total: 27 E2E tests**

## Setup

### Prerequisites

1. **Node.js and npm installed**
2. **Frontend running on port 3000**
3. **Backend services running**
4. **Database populated with test data**

### Install Playwright

```bash
# Install Playwright and browsers
npm install --save-dev @playwright/test
npx playwright install
```

### Install Browsers

```bash
# Install all browsers
npx playwright install

# Or install specific browsers
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

## Running Tests

### Run All E2E Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test reservation-flow
npx playwright test kennel-management
```

### Run in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Tests

```bash
npx playwright test --debug
```

### Generate Test Report

```bash
npx playwright show-report
```

## Configuration

### `playwright.config.ts`

Key settings:

- **Base URL**: `http://localhost:3000`
- **Timeout**: 60 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Parallel**: Yes (except on CI)
- **Screenshots**: On failure
- **Videos**: On failure
- **Trace**: On first retry

### Browsers Tested

- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit (Desktop Safari)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)
- ✅ Microsoft Edge
- ✅ Google Chrome

## Test Structure

### Test Organization

```typescript
test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test("should do something", async ({ page }) => {
    await test.step("Step 1", async () => {
      // Test step 1
    });

    await test.step("Step 2", async () => {
      // Test step 2
    });
  });
});
```

### Best Practices

#### ✅ DO

- Use `test.step()` for clear test organization
- Wait for elements before interacting
- Use descriptive test names
- Test both success and failure paths
- Verify UI feedback after actions
- Use appropriate timeouts
- Clean up test data if needed

#### ❌ DON'T

- Use fixed waits (`waitForTimeout`) unless necessary
- Assume element positions
- Test implementation details
- Share state between tests
- Use production data
- Skip error handling

## Debugging

### Debug Mode

```bash
# Run with debugger
npx playwright test --debug

# Debug specific test
npx playwright test reservation-flow --debug
```

### Inspect Element

```bash
# Open Playwright Inspector
npx playwright codegen http://localhost:3000
```

### View Trace

```bash
# View trace for failed test
npx playwright show-trace trace.zip
```

### Screenshots and Videos

After test failures:

- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`
- Traces: `test-results/*/trace.zip`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables

```bash
# Set base URL
BASE_URL=http://localhost:3000

# Enable CI mode
CI=true

# Set specific browser
BROWSER=chromium
```

## Troubleshooting

### Tests Timing Out

```bash
# Increase timeout in playwright.config.ts
timeout: 120000 // 2 minutes
```

### Element Not Found

```typescript
// Use proper waits
await page.waitForSelector("text=Element", { timeout: 10000 });

// Or use auto-waiting actions
await page.click("button"); // Automatically waits
```

### Flaky Tests

```typescript
// Add retries
test.describe.configure({ retries: 2 });

// Or use better selectors
await page.locator('[data-testid="submit"]').click();
```

### Browser Not Installed

```bash
# Reinstall browsers
npx playwright install --force
```

## Test Data Management

### Using Existing Data

Tests use existing data in the database:

- Customers
- Pets
- Services
- Resources (kennels)

### Creating Test Data

If needed, create test data before running:

```typescript
test.beforeAll(async () => {
  // Create test customer, pets, etc.
});

test.afterAll(async () => {
  // Clean up test data
});
```

## Performance

### Parallel Execution

```bash
# Run tests in parallel (default)
npx playwright test

# Run sequentially
npx playwright test --workers=1
```

### Sharding

```bash
# Split tests across machines
npx playwright test --shard=1/3
npx playwright test --shard=2/3
npx playwright test --shard=3/3
```

## Reporting

### HTML Report

```bash
# Generate and open HTML report
npx playwright show-report
```

### JUnit Report

```bash
# Generate JUnit XML
npx playwright test --reporter=junit
```

### Custom Reporter

```typescript
// In playwright.config.ts
reporter: [
  ["html"],
  ["json", { outputFile: "test-results.json" }],
  ["junit", { outputFile: "junit.xml" }],
];
```

## Next Steps

- [ ] Add more E2E test scenarios
- [ ] Add visual regression tests
- [ ] Add API mocking for isolated tests
- [ ] Add performance testing
- [ ] Integrate with CI/CD pipeline
- [ ] Add accessibility tests
- [ ] Add mobile-specific tests

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Integration Tests](../services/reservation-service/src/tests/integration/README.md)
- [Unit Tests](../services/reservation-service/src/tests/README.md)
- [Frontend Tests](../frontend/src/components/reservations/__tests__/README.md)
