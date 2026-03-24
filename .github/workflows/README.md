# GitHub Actions CI/CD Workflows

This directory contains automated workflows for continuous integration and deployment.

## Workflows

### 1. Test Suite (`test.yml`)
**Triggers**: Push to `development` or `main`, Pull Requests

**What it does**:
- Runs on Node.js 24.x
- Sets up PostgreSQL database
- Installs dependencies
- Runs linting
- Executes all tests (apps/frontend, customer service, reservation service)
- Generates coverage reports
- Uploads coverage to Codecov

**Duration**: ~5-8 minutes

### 2. Deploy to Production (`deploy.yml`)
**Triggers**: Push to `main` branch, Manual dispatch

**What it does**:
- Builds apps/frontend with production environment variables
- Builds backend services
- Creates deployment package
- Deploys to Digital Ocean server (129.212.178.244)
- Backs up current deployment
- Restarts services with PM2
- Verifies deployment health

**Duration**: ~3-5 minutes

**Required Secrets**:
- `DEPLOY_SSH_KEY` - SSH private key for server access

### 3. Auto-Merge PRs (`auto-merge.yml`) ⭐ FULLY AUTOMATED
**Triggers**: PR opened, updated, labeled, or checks complete

**What it does**:
- **Automatically merges ALL PRs** when checks pass (no labels needed!)
- Respects `do-not-merge` label and draft status
- Uses squash merge and deletes branch after merge
- Blocks external contributor PRs (security)

**Duration**: Instant (after checks complete)

**How to use**:
- ✨ **Do nothing!** All PRs auto-merge when checks pass
- To prevent: Add `do-not-merge` label or mark as draft
- Works for: `feat/*`, `fix/*`, `docs/*`, `chore/*`, any branch!

See [Auto-Merge Guide](../../docs/AUTO-MERGE-GUIDE.md) for details.

### 4. Pull Request Checks (`pr-checks.yml`)
**Triggers**: Pull Request opened, synchronized, or reopened

**What it does**:
- **Code Quality**: Checks for console.logs, TODOs, large files, runs linting
- **Quick Tests**: Runs fast unit tests only
- **Build Verification**: Ensures all services build successfully
- **PR Summary**: Generates summary of all checks

**Duration**: ~3-5 minutes

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your repository settings → Secrets and variables → Actions

Add the following secrets:

```
DEPLOY_SSH_KEY
```

To generate the SSH key:
```bash
# On your local machine
cat ~/ttkey

# Copy the entire private key content and add it as a secret
```

### 2. Enable Actions

1. Go to repository Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Set workflow permissions to "Read and write permissions"

### 3. Branch Protection (Optional but Recommended)

Go to Settings → Branches → Add rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Select: `Code Quality Checks`, `Quick Test Suite`, `Build Verification`
- ✅ Require branches to be up to date before merging

## Workflow Behavior

### On Every Push to Development
```
1. Run all tests
2. Generate coverage
3. Report results
```

### On Pull Request
```
1. Run code quality checks
2. Run quick tests
3. Verify builds
4. Generate PR summary
```

For pull requests opened by Dependabot, the heavy application test/build jobs are skipped and replaced by lightweight shortcut jobs. Human-authored workflow changes still run the full PR validation flow.

### On Push to Main
```
1. Run all tests
2. Build application
3. Deploy to production
4. Verify deployment
```

### Manual Deployment
```
1. Go to Actions tab
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"
```

## Monitoring Workflows

### View Workflow Runs
1. Go to the "Actions" tab in your repository
2. Click on a workflow to see its runs
3. Click on a specific run to see details

### Check Logs
1. Open a workflow run
2. Click on a job (e.g., "Run Tests")
3. Expand steps to see detailed logs

### Download Artifacts
Some workflows generate artifacts (coverage reports, build files):
1. Open a workflow run
2. Scroll to "Artifacts" section
3. Download available artifacts

## Troubleshooting

### Tests Failing in CI but Pass Locally
- Check Node.js version (CI uses 24.x)
- Verify environment variables
- Check database connection settings

### Deployment Failing
- Verify `DEPLOY_SSH_KEY` secret is set correctly
- Check server is accessible
- Verify PM2 is running on server
- Check server disk space

### Build Failing
- Check for TypeScript errors
- Verify all dependencies are in package.json
- Check for environment-specific code

## Best Practices

### Before Pushing
```bash
# Run tests locally
pnpm run test:quick

# Check environment
pnpm run env:status

# Verify builds
cd apps/frontend && pnpm run build
cd ../customer-service && pnpm run build
cd ../reservation-service && pnpm run build
```

### Creating Pull Requests
1. Ensure all local tests pass
2. Run `pnpm run test:changed` to test your changes
3. Create PR with descriptive title and description
4. Wait for CI checks to pass
5. Address any failures before requesting review

### Merging to Main
1. Ensure PR checks pass
2. Get code review approval
3. Merge PR
4. Monitor deployment workflow
5. Verify production deployment

## Workflow Files

```
.github/workflows/
├── test.yml          # Main test suite
├── deploy.yml        # Production deployment
├── pr-checks.yml     # Pull request validation
└── README.md         # This file
```

## Environment Variables

### Test Workflow
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to 'test'

### Deploy Workflow
- `REACT_APP_TENANT_ID`: Tenant identifier
- `REACT_APP_API_URL`: Customer service URL
- `REACT_APP_RESERVATION_API_URL`: Reservation service URL
- `SSH_PRIVATE_KEY`: Server SSH key (secret)
- `SERVER_HOST`: Production server IP
- `SERVER_USER`: SSH user (root)

## Notifications

### Success
- ✅ Green checkmark on commit/PR
- Deployment notification in workflow logs

### Failure
- ❌ Red X on commit/PR
- Email notification (if enabled in GitHub settings)
- Detailed error logs in workflow run

## Maintenance

### Updating Workflows
1. Edit workflow files in `.github/workflows/`
2. Test changes on a feature branch first
3. Monitor first run carefully
4. Update this README if behavior changes

### Updating Node.js Version
1. Update `node-version` in all workflow files
2. Test locally with new version
3. Update in workflows
4. Monitor CI runs

### Updating Dependencies
1. Update package.json files
2. Run `pnpm install --frozen-lockfile` locally to verify
3. Push changes
4. CI will use new dependencies automatically

## Cost Considerations

GitHub Actions minutes:
- Public repositories: Unlimited
- Private repositories: 2,000 minutes/month (free tier)

Each workflow run uses:
- Test Suite: ~5-8 minutes
- Deploy: ~3-5 minutes
- PR Checks: ~3-5 minutes

Estimated monthly usage:
- ~50 pushes × 8 min = 400 minutes
- ~20 PRs × 5 min = 100 minutes
- ~10 deploys × 5 min = 50 minutes
- **Total**: ~550 minutes/month

## Support

For issues with workflows:
1. Check workflow logs in Actions tab
2. Review this README
3. Check GitHub Actions documentation
4. Review service logs on production server

---

**Last Updated**: November 3, 2025
