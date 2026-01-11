# Tailtown Development Roadmap

> **Completed features** → [CHANGELOG.md](changelog/CHANGELOG.md)  
> **Scaling plans (1,000+ tenants)** → [SCALING-PLAN.md](./SCALING-PLAN.md)

---

## ✅ Pre-Beta Complete (January 2026)

All pre-beta checklist items completed. See [changelog/2026-01-11-pre-beta-complete.md](changelog/2026-01-11-pre-beta-complete.md) for details.

---

## 📅 This Week

### CardConnect Sign Up Flow

- [ ] Payment processor merchant account setup
- [ ] Self-service onboarding for new merchants
- [ ] PCI compliance documentation

---

## 🟠 This Month

### Test Coverage (Target: 70%+)

- Currently at ~30% with 1,100+ tests
- [ ] Integration tests for controllers
- [ ] Payment processing tests
- [ ] Reservation flow tests

### Loyalty & Coupons Testing

- [ ] Verify coupon creation and redemption
- [ ] Test loyalty points accumulation
- [ ] Validate discount calculations

---

## 🟡 This Quarter

### Message Queue

Background job processing:

- [ ] Non-blocking email/SMS
- [ ] Report generation
- [ ] Retry failed jobs

### Blue-Green Deployment

Zero-downtime deploys:

- [ ] Two environments
- [ ] Traffic switching
- [ ] Auto rollback

---

## 📋 Future Features

### AI Belongings Scanner (OpenCV Microservice)

- [ ] Docker-based OpenCV microservice for image classification
- [ ] Webcam capture integration at check-in
- [ ] Auto-classify pet belongings
- [ ] Pre-populate belongings list from photo analysis

### Tenant Onboarding

- [ ] Self-service signup
- [ ] Automated provisioning
- [ ] Onboarding wizard

### Billing & Subscriptions

- [ ] CardConnect integration
- [ ] Subscription plans
- [ ] Usage-based billing

### Multi-Timezone Support

- [ ] Tenant timezone config
- [ ] DST handling
- [ ] Local time display

### Advanced Reporting

- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] PDF/Excel export

### Native Mobile Apps

- [ ] iOS/Android (React Native)
- [ ] Push notifications
- [ ] Offline mode

### Third-Party Integrations

- [ ] QuickBooks
- [ ] Zapier webhooks

### Enhanced Security

- [ ] Two-factor auth
- [ ] SSO
- [ ] SOC 2 / HIPAA compliance

---

**Last Updated**: January 11, 2026
