# Dokploy Migration Notice

## HTTPS setup for the new domain (`petresortsystems.com`)

Dokploy's in-built security features will handle HTTPS configuration for the new domain using Let's Encrypt certificates. See [Domains | Dokploy](https://docs.dokploy.com/docs/core/domains#add-domain)

## 🚧 Temporary Workflow Changes

**Date**: March 27, 2026  
**Purpose**: Stardardize migration strategy with Dokploy - temporarily disabling deployment workflows
**Status**: In Progress

### Disabled Workflows

The following GitHub Actions workflows have been temporarily disabled during the Dokploy migration:

#### Deployment Workflows

- [`_disabled_deploy.yml`](../.github/workflows/_disabled_deploy.yml) - Main production deployment
- [`_disabled_deploy-production.yml`](../.github/workflows/_disabled_deploy-production.yml) - Production deployment variant
- [`_disabled_deploy-staging.yml`](../.github/workflows/_disabled_deploy-staging.yml) - Staging deployment

#### Deployment Gatekeepers

- [`_disabled_test-gate.yml`](../.github/workflows/_disabled_test-gate.yml) - Deployment gatekeeper checks
- [`_disabled_pre-deployment-tests.yml`](../.github/workflows/_disabled_pre-deployment-tests.yml) - Pre-deployment testing

### Active Workflows

The following workflows remain active for development continuity:

#### Essential Workflows

- [`test.yml`](../.github/workflows/test.yml) - Core test suite (runs on push to development/main and PRs)
- [`pr-checks.yml`](../.github/workflows/pr-checks.yml) - Pull request validation and code quality checks
- [`auto-merge.yml`](../.github/workflows/auto-merge.yml) - Automated PR merging when checks pass
- [`auto-label.yml`](../.github/workflows/auto-label.yml) - Automatic issue/PR labeling

#### Optional Workflows (Can be disabled if needed)

- [`build-test.yml`](../.github/workflows/build-test.yml) - Build verification
- [`test-coverage.yml`](../.github/workflows/test-coverage.yml) - Code coverage reporting
- [`tenant-isolation-tests.yml`](../.github/workflows/tenant-isolation-tests.yml) - Multi-tenant specific tests
- [`frontend-tests.yml`](../.github/workflows/frontend-tests.yml) - Frontend-specific testing

### Migration Strategy

1. **Phase 1**: Disable deployment workflows ✅
2. **Phase 2**: Set up Dokploy configuration
3. **Phase 3**: Test Dokploy deployments
4. **Phase 4**: Migrate all deployments to Dokploy
5. **Phase 5**: Review and re-enable necessary workflows

### Rollback Plan

If rollback is needed:

```bash
# Re-enable deployment workflows
cd .github/workflows
mv _disabled_deploy.yml deploy.yml
mv _disabled_deploy-production.yml deploy-production.yml
mv _disabled_deploy-staging.yml deploy-staging.yml
mv _disabled_test-gate.yml test-gate.yml
mv _disabled_pre-deployment-tests.yml pre-deployment-tests.yml
mv _disabled_ci.yml ci.yml
```

### Next Steps

- [ ] Configure Dokploy project
- [ ] Set up deployment pipelines in Dokploy
- [ ] Test staging deployments
- [ ] Migrate production deployments
- [ ] Update documentation
- [ ] Clean up obsolete workflows

### Contact

For questions about this migration:

- Check this document first
- Review Dokploy documentation
- Reach out to [@daguttt](https://twitter.com/daguttt)

---

**Last Updated**: March 27, 2026  
**Next Review**: Upon Dokploy setup completion
