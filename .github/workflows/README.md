# GitHub Actions CI/CD Workflows

> **🚧 March 27, 2026**: Migration to Dokploy in progress. Most GitHub Actions workflows are temporarily archived in `.github/workflows-disabled/`. See [DOKPLOY-MIGRATION.md](../../docs/DOKPLOY-MIGRATION.md) for the current transition plan.

This directory now contains only the workflows that remain active during the Dokploy transition.

## Active Workflows

### 1. Test Suite (`test.yml`)

**Triggers**: Push to `development` or `main`, Pull Requests

**What it does**:

- Runs on Node.js 24.x
- Sets up PostgreSQL database
- Installs dependencies
- Runs linting
- Executes build/tests for canonical `apps/frontend` (Vite) plus `apps/customer-service` and `apps/reservation-service`; legacy frontend apps are excluded from required CI
- Generates coverage reports
- Uploads coverage to Codecov

**Duration**: ~5-8 minutes

### 2. Pull Request Checks (`pr-checks.yml`)

**Triggers**: Pull Request opened, synchronized, or reopened

**What it does**:

- **Code Quality**: Checks for console.logs, TODOs, large files, and runs linting
- **Quick Tests**: Runs fast validation against the monorepo
- **Build Verification**: Ensures the primary applications still build
- **PR Summary**: Produces a concise status summary for reviewers

**Duration**: ~3-5 minutes

### 3. Auto-Label PRs (`auto-label.yml`)

**Triggers**: Pull Request opened, synchronized, or reopened

**What it does**:

- Applies labels automatically using `.github/labeler.yml`
- Keeps pull request categorization lightweight during the migration

**Duration**: ~1 minute

## Archived Workflows

The following workflows are intentionally paused and stored in `.github/workflows-disabled/` until they are reviewed one by one:

- `auto-merge.yml`
- `build-test.yml`
- `ci.yml`
- `deploy.yml`
- `deploy-production.yml`
- `deploy-staging.yml`
- `frontend-tests.yml`
- `pre-deployment-tests.yml`
- `tenant-isolation-tests.yml`
- `test-coverage.yml`
- `test-gate.yml`

## Workflow Behavior

### On Every Push to Development or Main

```
1. Run the core test suite
2. Generate coverage where applicable
3. Report results in GitHub Actions
```

### On Pull Request

```
1. Run code quality checks
2. Run quick tests
3. Verify builds
4. Generate a PR summary
5. Apply labels automatically
```

For pull requests opened by Dependabot, the heavy application test and build jobs are skipped and replaced by lightweight shortcut jobs where configured.

## Setup Instructions

### 1. Enable Actions

1.  Go to repository Settings → Actions → General
2.  Enable "Allow all actions and reusable workflows"
3.  Set workflow permissions to "Read and write permissions"

### 2. Branch Protection (Optional but Recommended)

Go to Settings → Branches → Add rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
    - Select: `Code Quality Checks`, `Quick Test Suite`, `Build Verification`
- ✅ Require branches to be up to date before merging

## Monitoring Workflows

### View Workflow Runs

1.  Go to the "Actions" tab in your repository
2.  Click on a workflow to see its runs
3.  Click on a specific run to see details

### Check Logs

1.  Open a workflow run
2.  Click on a job such as "Run Tests"
3.  Expand steps to see detailed logs

## Troubleshooting

### Tests Failing in CI but Pass Locally

- Check Node.js version (CI uses 24.x)
- Verify environment variables
- Check database connection settings

### Build Failing

- Check for TypeScript errors
- Verify all dependencies are in `package.json`
- Check for environment-specific code

### Need a Paused Workflow Again

- Move the workflow back into `.github/workflows/`
- Re-enable it in GitHub Actions if it was also disabled in the UI
- Update [DOKPLOY-MIGRATION.md](../../docs/DOKPLOY-MIGRATION.md) to reflect the change

## Best Practices

### Before Pushing

```bash
pnpm run test:quick
pnpm run env:status
```

### Creating Pull Requests

1.  Ensure local tests pass
2.  Run `pnpm run test:changed` when relevant
3.  Create a descriptive PR
4.  Wait for CI checks to pass
5.  Address any failures before requesting review

## Workflow Files

```
.github/workflows/
├── auto-label.yml    # Automatic PR labeling
├── pr-checks.yml     # Pull request validation
├── test.yml          # Core test suite
└── README.md         # This file

.github/workflows-disabled/
└── ...               # Temporarily archived workflows
```

## Environment Variables

### Test and PR Workflows

- `DATABASE_URL`: PostgreSQL connection string used in CI jobs
- `NODE_ENV`: Set to `test` where needed
- `CI`: Enabled for automated runs where applicable

## Support

For issues with workflows:

1.  Check workflow logs in the Actions tab
2.  Review this README
3.  Review [DOKPLOY-MIGRATION.md](../../docs/DOKPLOY-MIGRATION.md)
4.  Check GitHub Actions documentation

---

**Last Updated**: March 27, 2026
