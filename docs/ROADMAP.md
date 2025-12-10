# Tailtown Development Roadmap

> **Completed features** → [CHANGELOG.md](changelog/CHANGELOG.md)  
> **Scaling plans (1,000+ tenants)** → [SCALING-PLAN.md](./SCALING-PLAN.md)

---

## 🔴 This Week

### SendGrid/Twilio Integration

- Configure API keys in setup wizard
- Email templates (reservations, invoices)
- SMS templates (reminders, alerts)
- Welcome emails for new staff with password reset

### CardConnect Sign Up

- Payment processor integration
- Merchant account setup flow
- PCI compliance handling

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

### AI Belongings Scanner (OpenCV Microservice)

- Docker-based OpenCV microservice for image classification
- Webcam capture integration at check-in
- Auto-classify pet belongings: leashes, collars, meds, toys, bedding, harnesses
- Generate item descriptions automatically
- Pre-populate belongings list from photo analysis

### Staff Onboarding Wizard

- First-time walkthrough for new staff users
- Interactive tutorial covering:
  - How to create a reservation
  - How to check in a pet
  - How to check out and process payment
- Skip option for experienced users
- Progress tracking per user

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

### Enhanced Security

- Two-factor auth
- SSO
- SOC 2 / HIPAA compliance

---

**Last Updated**: December 9, 2025
