# Tailtown Development Roadmap

> **Completed features** → [CHANGELOG.md](changelog/CHANGELOG.md)  
> **Scaling plans (1,000+ tenants)** → [SCALING-PLAN.md](./SCALING-PLAN.md)

---

## 🔴 This Week

### Fix Multi-Pet Room Reservations

Multiple pets sharing same room:

- Room capacity validation
- Check-in for multiple pets
- Billing for shared rooms
- Kennel card per pet

### SendGrid/Twilio Integration

- Configure API keys in setup wizard
- Email templates (reservations, invoices)
- SMS templates (reminders, alerts)
- Welcome emails for new staff with password reset

### CardConnect Sign Up

- Payment processor integration
- Merchant account setup flow
- PCI compliance handling

### Financial Import from Gingr

- Import historical financial data
- Transaction history migration
- Balance reconciliation

### ~~Editable Service Agreement with Signature~~ ✅ COMPLETED

- ~~Customizable service agreement templates~~
- ~~Digital signature capture~~
- ~~Agreement versioning and storage~~
- ~~Customer acknowledgment tracking~~
- ~~Custom questions with multiple types (Text, Currency, Yes/No, etc.)~~
- ~~Merge fields for dynamic content ([Business Name], etc.)~~
- ~~On-the-fly signing from customer profile~~

### ~~Tips System~~ ✅ IN PROGRESS

- ~~Database schema with Tip model (GROOMER/GENERAL types)~~
- ~~API endpoints for CRUD and reporting~~
- ~~Staff checkout UI with tip selection (groomer + general)~~
- Online checkout tip integration
- Tip reporting dashboard for payroll

### Calendar View Improvements

- Start calendar with current date on far left
- Better date navigation

### Outstanding Invoice Report

- List all unpaid/overdue invoices
- Filter by date range, customer, amount
- Export to CSV/PDF

### Medication Tracking During Stay

- Log medication administration times
- Staff sign-off on each dose
- Alerts for missed medications
- Medication history per stay

### Permanent Account Discounts

- Military discount
- Senior discount
- Multi-pet discount
- Custom discount types per account
- Auto-apply on invoices

### Standing Reservations

- Recurring reservation templates
- Weekly/bi-weekly/monthly patterns
- Auto-generate future reservations
- Easy modification of series

### Commission Splitting for Groomers

- Configurable commission rates per groomer
- Commission calculation on services
- Commission reporting and payouts

### Picky Eater Reporting

- Flag pets as picky eaters
- Feeding notes and preferences
- Meal tracking and alerts
- Reports for staff awareness

### Automated Repeating Schedules for Staff

- Recurring schedule templates
- Auto-generate weekly schedules
- Schedule rotation patterns
- Holiday/exception handling

---

## 🟠 This Month

### Test Coverage (Target: 70%+)

- Currently at ~30% with 1,100+ tests
- Need integration tests that exercise actual controller code
- Payment processing integration tests
- Reservation flow integration tests

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

### Notification System Audit

- Email/SMS delivery testing
- Notification preferences
- Delivery tracking

---

## 📋 Future Features

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
- Mailchimp
- Zapier webhooks

### White-Label

- Custom domains
- Branding customization
- Custom email templates

### Enhanced Security

- Two-factor auth
- SSO
- SOC 2 / HIPAA compliance

---

**Last Updated**: December 1, 2025
