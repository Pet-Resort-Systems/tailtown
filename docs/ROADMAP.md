# Tailtown Development Roadmap

> **Completed features** → [CHANGELOG.md](changelog/CHANGELOG.md)  
> **Scaling plans (1,000+ tenants)** → [SCALING-PLAN.md](./SCALING-PLAN.md)

---

## ✅ Recently Completed (January 2026)

### Card-on-File / Saved Payment Methods

- ✅ `CustomerPaymentMethod` database model for tokenized cards
- ✅ Backend CRUD API endpoints (`/api/customers/:id/payment-methods`)
- ✅ Charge saved cards via `/api/payments/charge-token`
- ✅ Frontend service and `SavedPaymentMethods` React component
- ✅ Updated deploy workflow to use `prisma db push` for schema sync

### Marketing System Enhancements

- ✅ Marketing Analytics page with real data (customer reach, template counts)
- ✅ Email Marketing page connected to real templates and customer data
- ✅ 8 Email templates (Welcome, Confirmation, Reminder, Thank You, Newsletter, Holiday, Vaccination, Promo)
- ✅ 8 SMS templates (Welcome, Confirmed, Reminder, Pickup Ready, Thank You, Vaccination, Holiday, Offer)
- ✅ Template seeding endpoint: `POST /api/message-templates/seed`

### SendGrid/Twilio Integration ✅

- ✅ Email service with SendGrid (global env config)
- ✅ SMS service with Twilio (global env config)
- ✅ Staff welcome email template with password setup link
- ✅ Setup wizard UI for API keys (informational - uses global env vars)

### Settings & Dashboard

- ✅ Products count displays real data in Settings page

---

## 🚨 PRE-BETA CHECKLIST (Top Priority)

> Must complete before live testing at dog resort

### Data Safety & Recovery

- [x] Database backup strategy (automated daily backups) ✅ `scripts/backup-now.sh`
- [ ] Point-in-time recovery capability
- [x] Data export (customers, pets, reservations to CSV/JSON) ✅ `reportService.ts`

### Monitoring & Reliability

- [x] Error logging/alerting (Sentry or similar) ✅ `utils/sentry.ts`
- [ ] Uptime monitoring
- [x] Offline checkout handling ✅ `useOnlineStatus` hook, cash payments work offline

### Payment Operations

- [x] Refund transaction flow ✅ `POST /api/payments/refund`
- [x] Void/cancel payment flow ✅ `POST /api/payments/void`
- [x] End-of-day reconciliation report ✅ `/reports/reconciliation`
- [x] Integrate saved cards into checkout flow ✅ `FinalPayment.tsx`

### Booking Integrity

- [x] Overbooking prevention (verify kennel conflicts) ✅ `AvailabilityChecker`
- [x] Vaccination expiration alerts ✅ `vaccineUtils.ts`
- [x] Double-booking detection ✅ Existing tests

### Printing & Receipts

- [x] Receipt printing after payment ✅ `labelPrintService.ts`
- [ ] Daily reports printing

### Important for Operations

- [ ] Waitlist management (notify when spot opens)
- [ ] Emergency contact per pet
- [ ] Feeding instructions per pet (visible to staff)
- [ ] Medication administration logging
- [ ] Incident/injury reporting
- [ ] Daily staff handoff notes

### Nice-to-Have

- [ ] Bulk check-in (multiple pets, same owner)
- [ ] Customer self-service portal
- [ ] Automated vaccination reminder emails
- [ ] Revenue forecasting from future bookings

---

## �� This Week

### CardConnect Sign Up Flow

- Payment processor merchant account setup
- Self-service onboarding for new merchants
- PCI compliance documentation

### Checkout Integration

- Integrate saved cards into checkout flow
- "Save card for future use" checkbox
- Default card selection

---

## 🟠 This Month

### Test Coverage (Target: 70%+)

- Currently at ~30% with 1,100+ tests
- Integration tests for controllers
- Payment processing tests
- Reservation flow tests

### Loyalty & Coupons Testing

- Verify coupon creation and redemption
- Test loyalty points accumulation
- Validate discount calculations

---

## 🟡 This Quarter

### Message Queue

Background job processing:

- Non-blocking email/SMS
- Report generation
- Retry failed jobs

### Blue-Green Deployment

Zero-downtime deploys:

- Two environments
- Traffic switching
- Auto rollback

### Reservation Performance

- Database indexes
- Redis caching for availability
- Target: <200ms response

---

## 📋 Future Features

### AI Belongings Scanner (OpenCV Microservice)

**Phase 1 - COMPLETED (Dec 2025):**

- ✅ Quick-add buttons for common items (Collar, Leash, Toy, Bedding, Food, Bowl, Medication, Treats)
- ✅ Color quick-select chips (10 common colors)
- ✅ "Use Previous" button to load belongings from pet's last visit
- ✅ Bulk photo upload for all belongings
- ✅ Photo documentation per item

**Phase 2 - Future:**

- Docker-based OpenCV microservice for image classification
- Webcam capture integration at check-in
- Auto-classify pet belongings: leashes, collars, meds, toys, bedding, harnesses
- Generate item descriptions automatically
- Pre-populate belongings list from photo analysis

### Staff Onboarding Wizard ✅ COMPLETED (Dec 2025)

- ✅ First-time walkthrough for new staff users
- ✅ Interactive tutorial covering:
  - How to navigate the Dashboard
  - How to create a reservation
  - How to check in a pet
  - How to check out and process payment
- ✅ Skip option for experienced users
- ✅ Progress tracking per user (localStorage)
- ✅ Auto-triggers on first login

### Tenant Onboarding

- Self-service signup
- Automated provisioning
- Onboarding wizard

### Billing & Subscriptions

- /Card Connect
- Subscription plans
- Usage-based billing

### Multi-Timezone Support

- Tenant timezone config
- DST handling
- Local time display

### Advanced Reporting

- Custom report builder
- Scheduled reports
- PDF/Excel export

### Native Mobile Apps

- iOS/Android (React Native)
- Push notifications
- Offline mode

### Third-Party Integrations

- QuickBooks

- Zapier webhooks

### Enhanced Security

- Two-factor auth
- SSO
- SOC 2 / HIPAA compliance

---

**Last Updated**: January 10, 2026
