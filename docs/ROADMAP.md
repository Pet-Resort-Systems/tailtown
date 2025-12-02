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

---

## 🟠 This Month

### Test Coverage (Target: 70%+)

- Payment processing tests
- Currently at 50% with 822 tests

### Loyalty/Coupons Testing

- Coupon validation
- Discount calculations
- Usage limits

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
