# CI/CD Setup Documentation

## Overview

Tailtown uses GitHub Actions for automated testing and continuous integration. Tests run automatically on every push and pull request to ensure code quality and prevent regressions.

## Workflows

### 1. Frontend Tests (`frontend-tests.yml`)

**Triggers:**

- Push to `main`, `sept25-stable`, or `develop` branches
- Pull requests to these branches
- Only runs when frontend files change

**What it does:**

1. Sets up Node.js 24.x environment
2. Installs dependencies with `pnpm install --frozen-lockfile`
3. Runs timezone handling tests
4. Runs dashboard-calendar sync tests
5. Runs all tests with coverage reporting
6. Uploads coverage to Codecov (optional)
7. Comments test results on pull requests

**Duration:** ~2-3 minutes

### 2. Continuous Integration (`ci.yml`)

**Triggers:**

- Push to `main`, `sept25-stable`, or `develop` branches
- All pull requests

**What it does:**

#### Frontend Job:

1. TypeScript type checking
2. Timezone handling tests
3. Dashboard-calendar sync tests
4. All unit tests with coverage
5. Production build verification
6. Build size reporting

#### Backend Job:

1. TypeScript type checking for each service
2. Prisma schema validation
3. Dependency installation verification

**Duration:** ~3-5 minutes

## Test Coverage

### Critical Tests

- **Timezone Handling** (9 tests)
    - Date extraction from UTC timestamps
    - Midnight crossing edge cases
    - DST transitions
    - Cross-timezone consistency

- **Dashboard-Calendar Sync** (9 tests)
    - IN/OUT/OVERNIGHT count accuracy
    - Calendar occupancy matching
    - Edge case validation

### Coverage Reports

Coverage reports are generated and can be viewed in:

- GitHub Actions artifacts
- Codecov dashboard (if configured)
- Local: `frontend/coverage/lcov-report/index.html`

## Status Badges

The README displays real-time status badges:

```markdown
![CI Status](https://github.com/moosecreates/tailtown/workflows/Continuous%20Integration/badge.svg)
![Frontend Tests](https://github.com/moosecreates/tailtown/workflows/Frontend%20Tests/badge.svg)
```

- 🟢 Green = All tests passing
- 🔴 Red = Tests failing
- 🟡 Yellow = Tests running

## Viewing Test Results

### In GitHub:

1. Go to the repository on GitHub
2. Click "Actions" tab
3. Select a workflow run
4. View detailed logs and test results

### Locally:

```bash
pnpm --dir apps/frontend test                     # Legacy frontend unit/component tests
pnpm --dir apps/frontend test -- --coverage       # Legacy frontend coverage
pnpm --dir apps/frontend test -- --watch          # Legacy frontend watch mode
pnpm run test:e2e                                 # Isolated Playwright suite targeting apps/frontend
```

## Handling Test Failures

### When Tests Fail in CI:

1. **Check the logs:**
    - Click on the failed workflow in GitHub Actions
    - Expand the failed step to see error details

2. **Common failures:**
    - **Timezone tests fail**: Check if Date object usage is correct
    - **Sync tests fail**: Verify dashboard and calendar use same logic
    - **Build fails**: Check for TypeScript errors or missing dependencies

3. **Fix locally:**
    ```bash
    pnpm --dir apps/frontend test  # Reproduce frontend-unit failures
    pnpm run test:e2e              # Reproduce E2E failures against apps/frontend
    # Fix the issue
    pnpm --dir apps/frontend test
    git commit -m "Fix: ..."
    git push                    # Re-trigger CI
    ```

## Required Checks for Merging

### Pull Request Requirements:

- ✅ All frontend tests must pass
- ✅ TypeScript must compile without errors
- ✅ Build must complete successfully
- ✅ No critical timezone bugs introduced

### Branch Protection Rules (Recommended):

```yaml
# In GitHub Settings > Branches > Branch protection rules
- Require status checks to pass before merging
  - frontend-tests
  - ci / frontend-tests
  - ci / backend-health-check
- Require branches to be up to date before merging
```

## Skipping CI (Emergency Only)

To skip CI on a commit (use sparingly):

```bash
git commit -m "docs: Update README [skip ci]"
```

## Local Pre-commit Testing

### Option 1: Manual

```bash
# Before committing
pnpm --dir apps/frontend test
```

### Option 2: Husky (Automated)

Install Husky to run tests automatically:

```bash
pnpm add -Dw husky
pnpm exec husky install
pnpm exec husky add .husky/pre-commit "pnpm --dir apps/frontend test"
```

## Troubleshooting

### "Tests passed locally but fail in CI"

**Possible causes:**

1. **Timezone differences**: CI runs in UTC, local may be different
    - Solution: Tests should work in any timezone
    - Check: Date object usage, not string splitting

2. **Node version mismatch**: CI uses Node 24.x
    - Solution: Use same version locally with nvm

    ```bash
    nvm use 24
    ```

3. **Dependency issues**: CI uses `pnpm install --frozen-lockfile`
    - Solution: Delete `node_modules` and run `pnpm install --frozen-lockfile` locally

### "CI is taking too long"

**Optimizations:**

1. Use `pnpm install --frozen-lockfile` instead of ad-hoc installs
2. Cache node_modules between runs (already configured)
3. Run only changed tests (requires configuration)
4. Parallelize test suites (future enhancement)

### "Coverage upload fails"

This is non-critical. The workflow continues even if Codecov upload fails.
To fix:

1. Add `CODECOV_TOKEN` to GitHub Secrets
2. Or remove the coverage upload step

## Future Enhancements

For a comprehensive list of planned testing improvements and CI/CD enhancements, refer to the centralized roadmap:

**[Testing Future Enhancements](../testing/FUTURE-ENHANCEMENTS.md)**

This document includes detailed plans for:

- CI/CD pipeline improvements
- Parallel test execution
- Automated deployment to staging
- Security and dependency scanning
- Monitoring and notification systems

## Configuration Files

### `.github/workflows/frontend-tests.yml`

Focused on frontend testing with detailed test reporting.

### `.github/workflows/ci.yml`

Comprehensive CI including frontend, backend, and build verification.

### `package.json` and `e2e/package.json`

Root and isolated E2E script configuration:

```json
{
    "scripts": {
        "test:e2e": "turbo run e2e --filter=@tailtown/e2e",
        "test:e2e:ui": "turbo run e2e:ui --filter=@tailtown/e2e"
    }
}
```

## Monitoring

### GitHub Actions Usage:

- Free tier: 2,000 minutes/month for private repos
- Public repos: Unlimited
- Current usage: ~5 minutes per push (frontend + backend)

### Notifications:

- Email notifications for failed workflows (default)
- Can configure Slack/Discord webhooks
- GitHub mobile app shows status

## Best Practices

1. **Write tests first**: TDD approach prevents CI failures
2. **Run tests locally**: Before pushing to avoid CI failures
3. **Keep tests fast**: Target <5 minutes total CI time
4. **Fix failures immediately**: Don't let broken tests accumulate
5. **Monitor coverage**: Aim for >80% code coverage
6. **Review CI logs**: Even when passing, check for warnings

## Support

For CI/CD issues:

1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Check `e2e/README.md` for isolated Playwright details and `apps/frontend` as the app under test
4. Review `docs/development/TIMEZONE-FIX-SUMMARY.md` for timezone issues

## Related Documentation

- [E2E README](../../e2e/README.md)
- [Timezone Fix Summary](./TIMEZONE-FIX-SUMMARY.md)
- [Error Handling Guide](./error-handling.md)
- [Form Guidelines](./FormGuidelines.md)
