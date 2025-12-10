# Changelog

All notable changes to the Tailtown project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.19] - 2025-12-09

### Added

- **Check-in Workflow Enhancements** - Final polish for check-in process
  - **Quick-add for missing info**: Inline editing for vet, emergency contact, and vaccines in PetSummaryCard
  - **Pet history access**: Collapsible "Previous Visits" section showing last 5 check-ins with notes
  - **Belongings quick-edit**: Edit inventory after check-in completion via dialog on CheckInComplete page
  - **Step validation indicators**: Visual status (complete/error/warning/pending) on stepper steps
  - **Integration links**: Quick links to reservation details and customer account from check-in
  - Files: `frontend/src/components/check-in/PetSummaryCard.tsx`, `frontend/src/pages/check-in/CheckInComplete.tsx`, `frontend/src/pages/check-in/CheckInWorkflow.tsx`

### Changed

- **Documentation Updates** - Updated architecture and quick-start docs
  - Fixed port numbers in SERVICE-ARCHITECTURE.md (Customer Service is 4004, not 3003)
  - Added dev workflow commands to QUICK-START.md (`npm run dev:restart`, etc.)
  - Updated README.md with December 2025 changes and correct folder paths

## [1.6.18] - 2025-12-04

### Added

- **Check-in Workflow Improvements** - Enhanced check-in process for pet boarding

  - **Signature Capture**: Digital signature with canvas-based capture, persists across navigation
  - **Read-only Agreement View**: Shows signed agreement when revisiting completed check-ins
  - **Draft/Resume Capability**: Save partial check-ins to localStorage and server, resume later
  - **Belongings Checklist**: Track items brought (food, meds, toys, bedding) with photo upload support
  - **Medication Schedule**: Capture dosage, frequency, and special instructions at check-in
  - **Tenant ID Resolution**: Fixed subdomain-to-UUID resolution for check-in API calls
  - **Timezone Support**: Date filtering now respects user's local timezone
  - Files: `frontend/src/pages/check-in/CheckInWorkflow.tsx`, `frontend/src/components/check-in/SignatureCapture.tsx`, `frontend/src/components/check-in/BelongingsForm.tsx`, `services/reservation-service/src/controllers/check-in.controller.ts`

- **Multi-Pet Room Reservations** - Multiple pets sharing same room
  - Room capacity validation (`multiPet.controller.ts`)
  - Batch check-in API for multiple pets (`MultiPetCheckIn` component)
  - Billing for shared rooms (`multiPetService.ts` pricing)
  - Kennel card per pet (`PrintKennelCards` generates one card per reservation)

### Fixed

- **Customer Search by Pet Name** - Report Cards and other customer search fields now support searching by pet name

  - Backend: Added pet name to customer search query in `customer-crud.controller.ts`
  - Frontend: Added `filterOptions={(x) => x}` to Autocomplete to disable client-side filtering for server-side search
  - Customer dropdown now shows pet names to help identify customers when searching by pet
  - Files: `services/customer/src/controllers/customer/customer-crud.controller.ts`, `frontend/src/components/reportCards/QuickReportCard.tsx`

- **Customers Page Performance** - Reduced initial load from 1000 to 100 customers

  - Removed duplicate data loading that caused UI flashing
  - Users can search to find specific customers beyond initial 100
  - Files: `frontend/src/pages/customers/Customers.tsx`

- **Production Build Localhost URLs** - Fixed frontend builds including localhost URLs
  - Removed hardcoded localhost fallbacks from source files
  - Updated deploy script to temporarily rename `.env.development` during builds
  - Files: `frontend/src/config/development.ts`, `frontend/src/services/api.ts`, `scripts/deploy-frontend.sh`

## [1.6.18] - 2025-12-04

### Added

- **Tipping System** - Complete tip collection and reporting for staff

  - **Database Schema**: New `Tip` model with `TipType` (GROOMER/GENERAL) and `TipCollectionMethod` (ONLINE/TERMINAL/CASH) enums
  - **API Endpoints**: Full CRUD at `/api/tips` plus reporting endpoints for groomer summaries and tip pool
  - **Staff Checkout UI**: Tip selection step in checkout workflow with 15%, 20%, 25% presets and custom amounts
  - **Online Checkout**: Tip selection integrated into customer booking flow
  - **Tip Reporting Dashboard**: New "Tips" tab in Reports with groomer tips table, general pool breakdown, and CSV export
  - Files: `services/customer/prisma/schema.prisma`, `services/customer/src/controllers/tip.controller.ts`, `frontend/src/components/checkout/TipSelection.tsx`, `frontend/src/pages/reports/TipReports.tsx`

- **Calendar View Improvements** - Better date navigation

  - Week view now starts with current date on far left (instead of Sunday)
  - Shows 7 days forward from today
  - Files: `frontend/src/components/calendar/KennelCalendar.tsx`, `frontend/src/components/calendar/SpecializedCalendar.tsx`, `frontend/src/components/calendar/base/BaseCalendar.tsx`

- **Permanent Account Discounts** - Assign permanent coupons to customer accounts

  - Link coupons (military, senior, first responder, etc.) to customer accounts
  - Discounts auto-apply at checkout
  - New `PermanentDiscountSelector` component in customer profile
  - API endpoints for managing permanent coupons
  - Files: `frontend/src/components/customers/PermanentDiscountSelector.tsx`, `services/customer/src/controllers/customer/customer-extras.controller.ts`

- **Staff Commission System** - Configure commission rates for groomers, trainers, etc.

  - Percentage or flat-amount commission types
  - Link commissions to specific services
  - Commission calculation at checkout
  - Commission reporting by staff with date range filtering
  - New "Commissions" tab in staff settings
  - Files: `frontend/src/components/staff/CommissionSettings.tsx`, `services/customer/src/controllers/commission.controller.ts`

- **Standing Reservations** - Create recurring reservation templates

  - Support for DAILY, WEEKLY, BIWEEKLY, MONTHLY frequencies
  - Select specific days of week or day of month
  - Generate reservations ahead of time (configurable days)
  - Skip individual instances with reason tracking
  - Auto-confirm option for generated reservations
  - New "Standing Reservations" tab in customer profile
  - Files: `frontend/src/components/reservations/StandingReservations.tsx`, `services/customer/src/controllers/standing-reservation.controller.ts`

- **Picky Eater Reporting** - Track feeding patterns for pets during stays

  - Flag pets as picky eaters (auto-flags after 3+ low ratings)
  - Meal tracking with 0-4 rating scale (0=didn't eat, 4=ate all)
  - MealTime enum: BREAKFAST, LUNCH, DINNER, SNACK
  - Mobile-friendly FeedingTracker component with emoji ratings
  - Feeding reports with stats (average rating, low rating count)
  - Auto-detects meal time based on current hour
  - Files: `frontend/src/components/care-tracking/FeedingTracker.tsx`, `services/customer/src/controllers/care-tracking.controller.ts`

- **Medication Tracking During Stay** - Log medication administration with staff sign-off

  - PetMedication model for medication schedules (dosage, frequency, timing)
  - MedicationLog model for administration tracking
  - Staff sign-off on each dose with timestamp
  - Skip medication with required reason
  - Mobile-friendly MedicationTracker component
  - Medication reports with administered/missed/pending stats
  - Special instructions and "give with food" flags
  - Files: `frontend/src/components/care-tracking/MedicationTracker.tsx`, `services/customer/src/controllers/care-tracking.controller.ts`

- **Care Tracking Page** - Combined mobile interface at `/mobile/care-tracking`

  - Tabbed interface for Feeding and Medications
  - Lists all checked-in pets needing care
  - Added to Pet Reports section in main app
  - Files: `frontend/src/pages/care-tracking/CareTrackingPage.tsx`

- **Automated Repeating Schedules for Staff** - Create recurring schedule templates
  - ScheduleTemplate model with WEEKLY, BIWEEKLY, MONTHLY, CUSTOM rotation types
  - ScheduleTemplateEntry model for defining days/times in rotation
  - BusinessHoliday model for holiday exception handling
  - Auto-generate schedules X days ahead (configurable)
  - Skip holidays and approved time off automatically
  - Bi-weekly and custom rotation patterns (Week A/Week B)
  - New "Schedule Templates" tab in staff settings
  - Generate schedules on-demand or for all active templates
  - Files: `frontend/src/components/staff/ScheduleTemplates.tsx`, `services/customer/src/controllers/staff/schedule-template.controller.ts`

## [1.6.17] - 2025-12-03

### Fixed

- **Production Customer Service 500 Errors** - Resolved critical issue preventing customers from loading

  - **Root Cause**: Prisma version mismatch - `npm install` upgraded Prisma to v7.x which has breaking changes
  - **Secondary Issue**: `staging-customer-service` was running on same port (4004) as production, intercepting requests
  - **Solution**:
    - Pinned `prisma` and `@prisma/client` to version `4.16.2` in both customer-service and reservation-service
    - Stopped staging-customer-service to free port 4004
    - Clean reinstall with `npm ci --legacy-peer-deps`
  - Files: `services/customer/package.json`, `services/reservation-service/package.json`

- **Console Warning Spam** - Eliminated unnecessary console errors
  - Removed `/api/tenants/me` API call from ServiceAgreements page (used cached data instead)
  - Added auth token check before making authenticated API calls
  - Added `minHeight` to Recharts `ResponsiveContainer` components to prevent dimension errors
  - Files: `frontend/src/services/tenantService.ts`, `frontend/src/pages/settings/ServiceAgreements.tsx`, `frontend/src/pages/analytics/AnalyticsDashboard.tsx`, `frontend/src/pages/analytics/CustomerValueReport.tsx`

### Technical Notes

- **Prisma Version Lock**: Both services now use Prisma 4.16.2. Do NOT upgrade to v5+ without migration planning.
- **Port Allocation**: Production customer-service uses port 4004. Staging should use a different port.

## [1.6.16] - 2025-12-03

### Added

- **Service Agreement System** - Complete digital service agreement workflow
  - **Customizable Templates**: Create and edit service agreement templates with rich text editor
  - **Custom Questions**: Add questions to templates with multiple types (Text, Long Text, Number, Currency, Yes/No)
  - **Merge Fields**: Dynamic placeholders like `[Business Name]` auto-replaced with tenant data
  - **Digital Signature Capture**: Canvas-based signature capture on any device
  - **On-the-fly Signing**: "Sign Agreement" button on customer profile for immediate signing
  - **Agreement History**: View all signed agreements per customer in their profile's Agreements tab
  - **Question Responses**: Capture and display customer responses to custom questions
  - **Template Versioning**: Track template versions and changes over time
  - **Auto-default Template**: Single template automatically set as default
  - Files: `frontend/src/components/agreements/`, `frontend/src/pages/settings/ServiceAgreements.tsx`, `services/reservation-service/src/controllers/service-agreement.controller.ts`

## [1.6.15] - 2025-12-02

### Fixed

- **Grooming Calendar Reservation Display** - Fixed grooming reservations not appearing on calendar

  - **Root Cause 1**: Reservations created without `tenantId` caused invoice creation to fail with FK constraint error
  - **Root Cause 2**: Backend only had PUT route for updates, but frontend used PATCH
  - **Root Cause 3**: Calendar filtered by single date (today), missing future reservations
  - **Solution**:
    - Added `tenantId` from `req.tenantId` to reservation creation in `reservation-crud.controller.ts`
    - Added PATCH route alongside PUT in `reservation.routes.ts`
    - Removed single-date filter from `SpecializedCalendar.tsx` to show all upcoming reservations
  - Files: `services/customer/src/controllers/reservation/reservation-crud.controller.ts`, `services/customer/src/routes/reservation.routes.ts`, `frontend/src/components/calendar/SpecializedCalendar.tsx`

- **Grooming Reservation Duration** - Grooming appointments now default to 2-hour duration on same day
  - End date/time automatically calculated as start time + 2 hours
  - Prevents overnight grooming reservations

## [1.6.14] - 2025-12-01

### Added

- **Setup Wizard for New Tenants** - Complete onboarding wizard for new facilities

  - 11-step wizard: Business Info, Rooms/Kennels, Services, Pricing, Operating Hours, Staff, Payment, Notifications, Branding, Policies, Review
  - Backend API: `POST /api/onboarding/complete` creates tenant with all resources
  - Creates tenant, rooms/kennels, services, and staff in one transaction
  - Progress saved to localStorage (survives browser refresh)
  - Mobile responsive with Material-UI Stepper
  - CardConnect payment integration (Stripe excluded per requirements)
  - SendGrid/Twilio notification configuration
  - Files: `frontend/src/pages/setup-wizard/`, `services/customer/src/controllers/onboarding.controller.ts`

- **Login Tenant Parameter** - Login page accepts `?tenant=subdomain` for wizard redirect
  - Sets tenant ID in localStorage automatically
  - Shows welcome message for new tenants

## [1.6.13] - 2025-12-01

### Fixed

- **Dashboard Overnight Count** - Fixed overnight count showing 0

  - Added `serviceCategory` to API response for service data
  - Dashboard now correctly identifies BOARDING reservations for overnight count
  - Added `customerId`, `petId`, `serviceId`, `resourceId` to reservation detail response

- **Gingr Timezone Handling** - Fixed times displaying incorrectly (e.g., 6:30 AM showing as 11:30 PM)
  - Root cause: Gingr stores local time but API returns with `Z` suffix (interpreted as UTC)
  - Added `parseGingrDate()` utility to treat API dates as local time
  - Updated `ReservationForm` to use new date parser
  - Added comprehensive tests for timezone edge cases
  - Files: `frontend/src/utils/dateUtils.ts`, `frontend/src/utils/__tests__/dateUtils.test.ts`

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
