# Tailtown Pet Resort Management System

![CI Status](https://github.com/moosecreates/tailtown/workflows/Continuous%20Integration/badge.svg)
![Frontend Tests](https://github.com/moosecreates/tailtown/workflows/Frontend%20Tests/badge.svg)

**Status:** 🟢 **LIVE IN PRODUCTION**  
**Production URL:** https://canicloud.com (multi-tenant subdomains)  
**Version:** 1.6.18  
**Last Updated:** Mon, Mar 16, 2026
**Codebase:** ~260,000 lines of TypeScript

A modern, full-featured SaaS management system for pet resorts, providing comprehensive tools for reservations, customer management, and pet care services.

**🆕 NEW**: Setup Wizard for new tenants! Complete onboarding at `/setup` - creates facility, rooms, services, and staff in one flow.

## 🌐 Access the Application

### For Users & Staff

- **Production (Tailtown):** https://tailtown.canicloud.com
- **Demo Site - Staging (BranGro):** https://brangro.canicloud.com
    - See [Tenant Strategy](docs/features/TENANT-STRATEGY.md).

### For Developers Only

- **Local Development:** http://localhost:3000 (requires setup. See [Quick Start](docs/QUICK-START.md) guide)

---

## 📚 Documentation

See [Documentation Index](/docs/INDEX.md) for complete documentation.

---

## 🎯 Key Features

### Core Functionality

- **Reservation Management** - Boarding, daycare, grooming, training
- **Customer & Pet Management** - Complete profiles with medical records
- **Resource Scheduling** - Kennel/suite availability and assignment
- **Staff Management** - Schedules, roles, and permissions
- **Point of Sale** - Checkout, invoicing, and inventory
- **Reporting** - Financial, operational, and compliance reports

### Advanced Features

- **Multi-Tenant Support** - Isolated data per business
- **Training Classes** - Class management and enrollment
- **Vaccine Compliance** - Automatic requirement checking
- **Email & SMS Notifications** - Automated customer communications
- **Customer Portal** - Online booking and account management
- **Loyalty & Coupons** - Rewards and promotional campaigns
- **🆕 Daycare Passes** - Multi-day pass packages with discounts and expiration tracking

---

## 🏗️ Architecture

### Technology Stack

- **Frontend:** React 18, TypeScript, Material-UI
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with bcrypt, automatic token management
- **Deployment:** PM2 (cluster mode), Nginx, Let's Encrypt SSL. **Migrating to Dokploy. See [DOKPLOY-MIGRATION.md](/docs/DOKPLOY-MIGRATION.md)**
- **Testing:** Jest + Playwright

### Services

- Frontend (Port 3000): React SPA with JWT auth
- Customer Service (Port 4004): Customer, pet, staff, products, announcements
- Reservation Service (Port 4003): Reservations, resources, scheduling

### Multi-Tenant Architecture

- Subdomain-based tenant detection (e.g., brangro.canicloud.com)
- Complete data isolation per tenant
- 13 controllers with proper tenant context
- Middleware-based tenant extraction and validation

For detailed architecture, see [CURRENT-SYSTEM-ARCHITECTURE.md](docs/CURRENT-SYSTEM-ARCHITECTURE.md)

---

## 📊 Production Status

### New Domain (`petresortsystems.com`)

We're migrating to the new domain `petresortsystems.com` which still doesn't have HTTPS configured. The Dokploy migration will handle this. Refer to [DOKPLOY-MIGRATION.md](/docs/DOKPLOY-MIGRATION.md) for details.

However, you can access it via HTTP at http://petresortsystems.com. The same tenant configuration below applies. ⬇️

### Current HTTPS Deployment (November 7, 2025)

**Production Tenant**: Tailtown (https://tailtown.canicloud.com)

- 🔴 **CRITICAL** - Your business, real data
- Real customers, pets, and reservations
- Daily operations and staff usage

**Demo Tenant**: BranGro (https://brangro.canicloud.com)

- 🟡 **DEMO** - Customer demos, mock data
- 20 demo customers, 20 demo pets
- 10 sample reservations, 4 staff accounts
- 6 template POS products

**Dev Tenant**: Dev (http://localhost:3000 - developers only)

- 🟢 **DEVELOPMENT** - Safe to break
- Local testing and experiments

### System Health

- ✅ All services operational
- ✅ Zero critical errors
- ✅ SSL certificate valid (Let's Encrypt)
- ✅ **Daily automated backups** (DigitalOcean)
- ✅ PM2 cluster mode (2 instances per service)
- ✅ Nginx reverse proxy with SSL

For tenant strategy details, see [docs/features/TENANT-STRATEGY.md](docs/features/TENANT-STRATEGY.md)

---

## 📝 License

Proprietary - All rights reserved

---

## 📞 Support

- **Documentation:** [docs/INDEX.md](/docs/INDEX.md)
- **Issues:** GitHub Issues
- **Email:** rob@tailtownpetresort.com

---

## Recent Updates

### March 27, 2026 - Monorepo Migration & Vite Frontend

- **pnpm/Turborepo Workspace**: Reorganized repository into `apps/` and `packages/` with shared TypeScript configs
- **Vite Frontend**: New Vite-based frontend with admin portal integrated under `/admin-portal` route
- **Tooling Migration**: Migrated from npm to pnpm workspace commands across Dockerfiles, GitHub Actions, and scripts
- **Database Updates**: Updated to Prisma 7 adapter-based singleton clients using `@prisma/adapter-pg`
- **Service Runtime**: Migrated backend services from `ts-node` to `tsx` for improved performance

See [CHANGELOG.md](CHANGELOG.md) for complete history.

---

**Built with ❤️ for pet care professionals**
