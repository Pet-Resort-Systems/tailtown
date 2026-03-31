# Demo Test Data Setup

Use this guide to create reusable demo data for local and development environments with `apps/customer-service/scripts/create-demo-template.ts`.

This workflow creates a tenant with the `demo-template` subdomain that you can inspect directly or clone into fresh test tenants for QA, demos, and onboarding.

## What the script does

The demo template script:

- Creates a `demo-template` tenant.
- Deletes the existing `demo-template` tenant data first if that tenant already exists, then recreates it from scratch.
- Seeds sample customers, pets, staff, and services.

The seeded tenant is intended for local and development usage. Do not use this workflow against production data.

## Prerequisites

Before running the script, complete the setup already covered in [QUICK-START.md](QUICK-START.md):

- Environment files created and updated.
- Local databases created.
- Prisma migrations applied.
- Local development stack running when you want to inspect the seeded tenant in the UI.

The user-facing application in this repo is `apps/frontend`, which runs on `http://localhost:3000` by default unless you override `PORT`.

## Create or refresh the demo template tenant

Run the script from the monorepo root:

```bash
pnpm --filter @tailtown/customer-service exec tsx scripts/create-demo-template.ts
```

What to expect after a successful run:

- Tenant subdomain: `demo-template`
- Customers: `10`
- Pets: `15`
- Staff: `3`
- Services: `9`

The script recreates the tenant each time, so rerunning it is the fastest way to reset the template back to a known state.

## Use the seeded tenant

After seeding, you have three main paths depending on what you need to do.

### 1. Clone `demo-template` from the super admin UI

Use this path when you want to provision a fresh tenant from the template through the application.

1. Make sure you have a super admin account available. If not, create one with the development-only flow in [QUICK-START.md](QUICK-START.md#create-a-super-admin-development-only).
2. Open the `apps/frontend` admin portal at `http://localhost:3000/admin-portal/login`.
3. Sign in with your super admin credentials.
4. Open **Tenant Management**.
5. Choose the clone action for `demo-template`.
6. Create the new tenant you want to use for testing or demos.

Use the UI clone flow for normal tenant provisioning when you want a new tenant created from the template.

### 2. Copy `demo-template` into an existing tenant with the CLI

Use this path when the target tenant already exists and you want to replace its current data with the template data.

Run:

```bash
pnpm --filter @tailtown/customer-service exec tsx scripts/clone-tenant-data.ts <source-subdomain> <target-subdomain>
```

Example:

```bash
pnpm --filter @tailtown/customer-service exec tsx scripts/clone-tenant-data.ts demo-template rainy
```

Important behavior:

- The target tenant must already exist.
- The script clears the target tenant's existing customers, pets, staff, services, resources, and products before copying data.
- In addition to customers, pets, staff, and services, the clone script also copies resources and products when they exist in the source tenant.

Use the CLI flow when you need to repopulate an existing tenant instead of creating a new one.

### 3. Sign in directly to inspect the seeded data

Use this path when you want to validate the demo content itself before cloning it anywhere.

1. Open the staff login page for the seeded tenant:
    - `http://localhost:3000/login?tenant=demo-template`
2. Sign in with one of the seeded staff accounts:
    - `admin@demo-template.com`
    - `manager@demo-template.com`
    - `staff@demo-template.com`
3. Use the shared password:
    - `Demo123!`

The login page stores the tenant context from the `tenant=demo-template` query parameter, so use that URL when testing locally on `apps/frontend`.

## Which path should you use?

- Use the **super admin UI clone flow** when you want the normal application flow for provisioning a new tenant from the template.
- Use the **CLI clone script** when a tenant already exists and its data should be replaced with a copy of `demo-template`.
- Use the **direct staff login flow** when you need to inspect or validate the seeded customers, pets, staff accounts, and services in the template itself.

## Operational next steps

A typical local workflow looks like this:

1. Run
    ```bash
    pnpm --filter @tailtown/customer-service exec tsx scripts/create-demo-template.ts
    ```
2. Verify the seeded tenant by signing in at `http://localhost:3000/login?tenant=demo-template`.
3. Create a fresh demo tenant from `demo-template` in the super admin portal, or replace data in an existing tenant with `clone-tenant-data.ts`.
4. Sign in to the resulting tenant and continue QA, demos, or feature validation with known-good sample data.
