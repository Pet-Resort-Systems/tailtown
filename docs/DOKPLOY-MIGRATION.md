# Dokploy Migration Notice

## HTTPS setup for the new domain (`petresortsystems.com`)

Dokploy's in-built security features will handle HTTPS configuration for the new domain using Let's Encrypt certificates. See [Domains | Dokploy](https://docs.dokploy.com/docs/core/domains#add-domain)

## 🚧 Temporary Workflow Changes

**Date**: March 27, 2026  
**Purpose**: Stardardize migration strategy with Dokploy - temporarily disabling deployment workflows
**Status**: In Progress

### Workflow Pause Strategy

Workflows are paused by moving them out of `.github/workflows/` into `.github/workflows-disabled/`.

This is temporary and intentional. GitHub Actions only discovers workflows from `.github/workflows/*.yml` and `.github/workflows/*.yaml`, so renaming a file to `_disabled_*.yml` is not enough to stop it from being recognized.

The archived workflows will be reviewed individually and either:

- kept active in GitHub Actions
- replaced by Dokploy-native deployment automation
- removed if no longer relevant

### Archived Workflows

The following workflows have been temporarily archived during the Dokploy migration:

#### Deployment Workflows

- [`deploy.yml`](../.github/workflows-disabled/deploy.yml) - Main production deployment
- [`deploy-production.yml`](../.github/workflows-disabled/deploy-production.yml) - Production deployment variant
- [`deploy-staging.yml`](../.github/workflows-disabled/deploy-staging.yml) - Staging deployment

#### Deployment Gatekeepers

- [`test-gate.yml`](../.github/workflows-disabled/test-gate.yml) - Deployment gatekeeper checks
- [`pre-deployment-tests.yml`](../.github/workflows-disabled/pre-deployment-tests.yml) - Pre-deployment testing
- [`ci.yml`](../.github/workflows-disabled/ci.yml) - Legacy CI workflow

#### Non-Essential Automation

- [`auto-merge.yml`](../.github/workflows-disabled/auto-merge.yml) - Automated PR merging
- [`build-test.yml`](../.github/workflows-disabled/build-test.yml) - Additional build verification
- [`frontend-tests.yml`](../.github/workflows-disabled/frontend-tests.yml) - Frontend-specific testing
- [`tenant-isolation-tests.yml`](../.github/workflows-disabled/tenant-isolation-tests.yml) - Multi-tenant regression testing
- [`test-coverage.yml`](../.github/workflows-disabled/test-coverage.yml) - Coverage reporting and E2E coverage

### Active Workflows

The following workflows remain active for development continuity:

#### Essential Workflows

- [`test.yml`](../.github/workflows/test.yml) - Core test suite (runs on push to development/main and PRs)
- [`pr-checks.yml`](../.github/workflows/pr-checks.yml) - Pull request validation and code quality checks
- [`auto-label.yml`](../.github/workflows/auto-label.yml) - Automatic issue/PR labeling

### Migration Strategy

1. **Phase 1**: Pause non-essential GitHub Actions workflows
2. **Phase 2**: Set up Dokploy configuration
3. **Phase 3**: Test Dokploy deployments
4. **Phase 4**: Review archived workflows one by one
5. **Phase 5**: Restore only the workflows that are still relevant

### Rollback Plan

If rollback is needed:

```bash
# Restore a workflow to GitHub Actions discovery
mv .github/workflows-disabled/deploy.yml .github/workflows/deploy.yml

# Example: restore one archived test workflow
mv .github/workflows-disabled/test-coverage.yml .github/workflows/test-coverage.yml
```

If a workflow was also disabled in the GitHub Actions UI, re-enable it there after restoring the file.

### Next Steps

- [ ] Configure Dokploy project
- [ ] Set up deployment pipelines in Dokploy
- [ ] Test staging deployments
- [ ] Migrate production deployments
- [ ] Review archived workflows individually
- [ ] Remove obsolete workflows permanently

### Contact

For questions about this migration:

- Check this document first
- Review Dokploy documentation
- Reach out to [@daguttt](https://twitter.com/daguttt)

---

**Last Updated**: March 27, 2026  
**Next Review**: Upon Dokploy setup completion
