# Changelog

All notable changes to the Tailtown project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

## [1.6.12] - 2025-12-01

### Added

- **Staging Environment** - Complete staging infrastructure for pre-production testing
  - Staging URL: https://staging.tailtown.canicloud.com
  - Separate database (`tailtown_staging`) with anonymized production data
  - PM2 config: `ecosystem.staging.config.js` (ports 5000, 5003, 5004)
  - Nginx config: `config/nginx/tailtown-staging.conf`
  - GitHub Actions: `.github/workflows/deploy-staging.yml`
  - Documentation: `docs/STAGING-ENVIRONMENT.md`
  - SSL certificate (valid until March 2026)
  - Data anonymization (emails → `@staging.test`, phones → `555-XXXX`)

### Fixed

- **Production Data Cleanup** - Removed duplicate records from Gingr import
  - Deleted 11,860 placeholder customers (`@tailtown.placeholder`)
  - Deduplicated 11,779 customers with same email
  - Deduplicated 18,431 pets with same name+customer
  - Final counts: 11,902 customers, 18,458 pets (was 35,541 / 36,889)

## [1.6.11] - 2025-11-30

### Added

- **API Gateway Implementation** - Centralized API management without Kong/Tyk overhead
  - Per-tenant rate limiting (100 req/s per tenant via Nginx)
  - Per-IP rate limiting (10 req/s fallback)
  - API versioning support (`/api/v1/` routes with rewrite)
  - Request correlation IDs (X-Request-ID, X-Correlation-ID headers)
  - API analytics tracking (Redis-backed, 30-day retention)
  - Enhanced request logging with tenant/user context (structured JSON)
  - Version headers (X-API-Version: v1, X-API-Deprecated: false)
  - Public endpoint rate limiting (booking: 2 req/s, login: 5 req/15min)
  - Metrics API endpoints (`GET /api/metrics`, `GET /api/metrics/global`)
  - Files: `apiGateway.middleware.ts`, `api-metrics.routes.ts`, `config/nginx/tailtown.conf`
  - Documentation: `docs/architecture/API-GATEWAY.md`
  - See: [ROADMAP.md](../ROADMAP.md) item #8

### Changed

- Updated `docs/CURRENT-SYSTEM-ARCHITECTURE.md` with new middleware pipeline
- Updated `docs/API-GATEWAY-DESIGN.md` to reflect implementation
- Updated `docs/INFRASTRUCTURE-IMPROVEMENTS-SUMMARY.md` with deployment details
- Updated `docs/NGINX-ROUTING.md` with API Gateway features
- Updated `docs/README.md` with link to API Gateway documentation

## [1.2.1] - 2025-11-18

### Fixed

- **Customer Service Deployment Issues** - Critical fixes for production service crashes
  - Fixed rate limiter IPv6 validation error (`ERR_ERL_KEY_GEN_IPV6`) by using `req.tenantId` instead of `req.ip`
  - Resolved node-fetch ESM compatibility issue by downgrading to v2.x (CommonJS compatible)
  - Performed manual deployment on production server due to automated deployment failure
  - Service restored from 45+ PM2 restarts to stable "online" status
  - All APIs now responding correctly without 502 errors
  - See: `docs/changelog/2025-11-18-customer-service-deployment-fix.md`

### Changed

- Downgraded node-fetch from v3+ to v2.x for CommonJS compatibility
- Updated rate limiter key generation to use tenant-based keys
- Manual deployment process documented for future emergencies

## [1.2.0] - 2025-11-15

### Added

- **Pet Report Card System** - Photo-rich report cards for pet parents
  - Mobile-first creation interface with native camera integration
  - Activity ratings (mood, energy, appetite, social) with emoji display (😢 to 😄)
  - Multiple photo upload with captions, ordering, and auto-compression
  - Bulk report card generation for multiple pets at once
  - Email/SMS delivery with tracking and view analytics
  - 14 REST API endpoints (CRUD, photos, bulk operations, send)
  - 37+ automated tests (unit + integration + E2E)
  - Mobile app integration at `/mobile/report-cards` with bottom nav tab
  - Database: 2 tables (`report_cards`, `report_card_photos`), 3 enums, auto-update triggers
  - Backend: 850 lines (controller + routes)
  - Frontend: 3 UI components (1,300+ lines)
    - `QuickReportCard` - Mobile-first creation form
    - `BulkReportCardDashboard` - Staff bulk operations
    - `ReportCardViewer` - Customer-facing display
  - Templates: Daycare Daily, Boarding Daily, Boarding Checkout, Grooming Complete, Training Session
  - <3 minute report creation workflow
  - Photo count auto-tracking with database triggers
  - View count and delivery status tracking
  - Staff attribution and tenant isolation
  - See: `docs/REPORT-CARD-DESIGN.md`, `docs/REPORT-CARD-DEPLOYMENT.md`

### Changed

- Version bump from 1.1.0 to 1.2.0
- Updated mobile bottom navigation to 5 tabs (added Reports tab with camera icon)
- Updated ROADMAP.md with report card completion status
- Updated SYSTEM-FEATURES-OVERVIEW.md with report card section
- Updated README.md with report card documentation links

## [1.1.0] - 2025-11-14

### Added

- **Mobile Web App MVP** - Progressive Web App for staff mobile access

  - Mobile dashboard with stats, schedule, and tasks
  - Checklists page with task management and progress tracking
  - Team chat with channel list and messaging interface
  - My Schedule page with day/week views and date navigation
  - Bottom navigation with 5 tabs and real-time badge counts
  - Device detection hook (`useDevice`) for responsive behavior
  - Mobile-specific layouts (MobileHeader, BottomNav, MobileLayout)
  - Mobile service API with 5 methods (dashboard, schedule, tasks, stats, messages)
  - 400+ lines of mobile-optimized CSS
  - Material-UI mobile theme with touch-friendly components
  - 20 files created, ~2,500+ lines of production-ready code
  - Routes: `/mobile/dashboard`, `/mobile/checklists`, `/mobile/chat`, `/mobile/schedule`, `/mobile/profile`
  - See: `docs/changelog/2025-11-14-mobile-web-app-mvp.md`

- **Internal Communications Database Schema** - Slack-like team communication
  - 13 new Prisma models for comprehensive messaging system
  - CommunicationChannel (public, private, announcement types)
  - ChannelMember with roles and notification preferences
  - DirectMessageConversation (1-on-1 and group DMs)
  - ChannelMessage and DirectMessage with threading support
  - MessageReaction (emoji reactions)
  - MessageMention (@username, @channel, @here)
  - MessageAttachment (file uploads)
  - MessageReadReceipt (read tracking)
  - PinnedMessage (important announcements)
  - TypingIndicator (real-time typing status)
  - CommunicationNotificationPreference (per-user settings)
  - Optimized indexes for performance
  - Ready for backend implementation

### Changed

- Version bump from 1.0.0 to 1.1.0
- Updated ROADMAP.md with mobile app completion status
- Updated README.md with mobile app announcement

## [1.0.0] - 2025-11-08

### Added - Infrastructure & Performance

- **Load Testing & Performance** (Nov 8, 2025)

  - k6 load testing with 200 concurrent users
  - 198,819 requests processed successfully
  - P95 response time: 2.2ms - 3.1ms (excellent)
  - Throughput: 737-947 req/s
  - Multi-tenant isolation validated
  - Connection pool stress tested

- **Microservice Architecture & Performance** (Nov 7, 2025)

  - Service-to-service HTTP communication with retry logic
  - Exponential backoff (3 attempts: 1s, 2s, 4s)
  - Redis caching infrastructure (10-50x performance improvement)
  - Sentry error tracking configured
  - Auto-merge GitHub Actions workflow
  - Nginx with HTTPS health endpoints

- **Security Hardening & Testing** (Nov 7, 2025)

  - 380+ comprehensive security tests passing
  - OWASP Top 10 coverage complete
  - Rate limiting (5 attempts/15 min)
  - Account lockout after 5 failed attempts
  - Short-lived access tokens (8 hours)
  - Automatic token rotation with refresh tokens
  - Enhanced security headers (COEP/COOP/CORP)
  - Input validation with Zod
  - Security score: 95/100 (up from 40/100)

- **Historical Revenue Import** (Nov 7, 2025)

  - Imported $623.2K in historical revenue data
  - 6,133 service bookings imported
  - 1,157 active customers
  - Sales dashboard updated with accurate financial data
  - Revenue analytics and reporting operational

- **Documentation Cleanup** (Nov 5, 2025)

  - Archived 21 outdated documents to `docs/archive/`
  - Created master documentation index (DOCUMENTATION-INDEX.md)
  - Rewrote README.md (1451 lines → 200 lines, 86% reduction)
  - Comprehensive API documentation (docs/api/API-OVERVIEW.md)
  - Organized by audience (developers, ops, product)

- **Multi-tenant Bug Fixes** (Nov 5, 2025)

  - Fixed critical tenant context bug in products API
  - Fixed login API URL hardcoded to localhost
  - Fixed profile photo not included in user session
  - Fixed login form label overlap on refresh
  - Fixed announcement count persistence after modal close
  - Added 5 template POS products for BranGro tenant
  - Profile picture display in header avatar
  - 8 frontend deployments, 2 backend deployments

- **PM2 Process Management** (Nov 4, 2025)

  - Auto-restart on crashes
  - Load balancing with 2 instances per service
  - Auto-start on server reboot
  - Centralized logging

- **Responsive Layout Improvements** (Nov 4, 2025)

  - Flexible layouts without fixed breakpoints
  - Calendar header controls adapt to available space
  - Dashboard date controls wrap gracefully
  - No overlap at any screen size

- **Announcement System** (Nov 1, 2025)

  - Staff notifications with priority levels
  - Read/unread tracking
  - Priority badges

- **Contextual Help System** (Nov 1, 2025)

  - Tooltips throughout UI
  - Knowledge base with search
  - Context-sensitive help

- **Service Management Tools** (Nov 1, 2025)

  - Automated health monitoring script
  - One-command service startup/shutdown scripts
  - Service hang detection and recovery
  - MCP RAG server management and testing suite
  - Comprehensive service health integration tests

- Veterinarian Management & Auto-Fill System with Gingr API integration
- Enhanced pet list display with customer last names
- Compact table design with configurable page sizes (25, 50, 100, 200 pets per page)
- Automatic veterinarian population for 14,125+ customers (75% coverage)
- Bulk veterinarian association import from Gingr API data
- Documentation for calendar components
- Analytics dashboard with service revenue breakdown
- Customer value reporting with transaction history
- Backend API endpoints for analytics data retrieval
- Time period filtering for all analytics reports

### Fixed

- Fixed grooming and training calendar functionality
- Resolved `context.cmdFormatter is not a function` error in FullCalendar
- Improved service deletion handling to automatically deactivate services with active reservations
- Fixed UI issues when attempting to delete services with historical data
- Simplified service management UI by removing redundant deactivation controls

## [0.9.0] - 2025-10-31

### Added - Grooming & Calendar

- **Grooming Calendar with Staff Filtering** (Oct 31, 2025)
  - Groomer filter dropdown (filter by individual or "All Groomers")
  - Smart calendar filtering (assigned appointments show only for specific groomer)
  - Required groomer assignment with validation
  - Backend support for staffAssignedId field
  - UI polish (fixed dropdown width, removed page layout shift)
  - Unassigned appointments labeled and visible to all

## [0.8.0] - 2025-10-30

### Added - Security

- **Security Audit** (Oct 30, 2025)
  - Code review completed
  - Authentication bypass removed
  - Rate limiting implemented
  - Password strength validation enforced
  - Password reset tokens secured
  - Zero critical security issues
  - Zero high-priority security issues
  - Access control reviewed and secured
  - EXCELLENT security posture achieved

## [0.7.0] - 2025-10-26

### Added - Data Migration

- **Gingr Data Migration** (Oct 26, 2025)
  - 11,785 customers imported with complete profiles
  - 18,390 pets imported with medical info and icons
  - 35 services imported with pricing
  - 1,199 October reservations imported
  - Pet icons mapped from Gingr flags (VIP, medications, allergies, behavioral)
  - Customer-pet-service relationships preserved
  - Check-in/check-out tracking
  - Status management (CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED)
  - 99.8% success rate (31,473 of 31,543 records)
  - Zero data loss from existing Tailtown data
  - Idempotent design (safe to re-run)

## [0.6.0] - 2025-10-25

### Added - POS & Reporting

- **POS Checkout Integration**

  - Enhanced add-ons dialog with product tabs
  - Stock validation (prevents over-selling)
  - Automatic inventory deduction on payment
  - Invoice line items for products
  - Complete audit trail

- **Comprehensive Reporting System**
  - 23 API endpoints
  - 5 Report UI pages
  - Sales reports (daily, weekly, monthly, YTD)
  - Tax reports (monthly, quarterly, annual)
  - Financial reports (revenue, P&L, outstanding, refunds)
  - Customer reports (acquisition, retention, lifetime value)
  - Operational reports (staff, resources, capacity)
  - PDF and CSV export functionality
  - 35+ unit tests for financial accuracy

### Added - Scheduling & Classes

- **Groomer Assignment System**

  - Real-time availability checking
  - Conflict detection and prevention
  - Working hours validation
  - Time off integration
  - Auto-assign functionality
  - GroomerSelector component
  - 30+ availability logic tests

- **Training Class Management**
  - Training class creation with validation
  - Instructor assignment
  - Automatic session generation
  - Multi-day scheduling (Mon/Wed/Fri, etc.)
  - Enrollment system with payment tracking
  - Capacity management
  - Waitlist integration
  - Enrollment button and dialog UI
  - Customer/pet selection workflow
  - 65+ unit tests (sessions, enrollment, validation)

### Added - Icons & Configuration

- **Custom Icon System**
  - 25 icons in 5 categories
  - Customer behavior icons (VIP, New, Regular, Inactive)
  - Account status icons (Payment Issue, Prepaid, Auto-Pay, Cash Only)
  - Communication preference icons (No Email, No SMS, No Calls, Email Preferred)
  - Service icons (Grooming/Boarding/Daycare Only, Full Service, Training)
  - Flag icons (Special Instructions, Allergies, Medication, Senior Pet, etc.)
  - Multi-select interface with category tabs
  - Custom notes per icon
  - Icon badges display in Details and List pages
  - Icon filtering and search (filter by multiple icons, real-time)
  - Custom icon upload system (full CRUD with file storage)
  - 5 backend API endpoints with multer file handling
  - Multi-tenancy support and image validation

### Added - Advanced Features

- **Customer Self-Service Suite** (9 features)

  - Customer web booking portal
  - Customer reservation management (40+ tests)
  - Real-time availability checking (35+ tests)
  - Dynamic pricing system (73+ tests)
  - Coupon system (30+ tests)
  - Timezone-safe date handling (28+ tests)
  - Loyalty rewards system (31+ tests)
  - Flexible deposit rules (25+ tests)
  - Multi-pet suite bookings (34+ tests)

- **Vaccine Requirement Management**

  - Admin API to manage required vaccines (8 endpoints)
  - Multi-tenant support for vaccine policies
  - Different policies per pet type and service type
  - Vaccine expiration tracking and compliance checking
  - Automatic compliance validation
  - Default vaccine requirements for dogs and cats
  - Full stack implementation with 100% coverage

- **Area-Specific Checklists**
  - Multi-tenant isolation
  - 7 item types
  - Checklist templates

### Added - Testing

- **Comprehensive Test Suite**
  - 200+ new test cases added
  - 470+ total automated tests
  - Enrollment controller tests (40+ tests)
  - Reports controller tests (35+ tests)
  - Groomer availability tests (30+ tests)
  - Pagination tests (25+ tests)
  - Session generation tests (25+ tests)
  - 100% endpoint coverage

### Fixed

- Suite capacity limited to 1 (added multi-pet suite support with validation)
- Added feeding schedule to kennel cards with weekly dates

## [0.1.0] - 2025-04-29

### Added

- Initial version of Tailtown pet care management system
- Boarding and daycare calendar with grid view
- Grooming and training calendar views
- Reservation management system
- Customer and pet profiles
- Invoice generation and management
- Order entry system
