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

### ~~Check-in Process~~ ✅

#### Pet Information at a Glance

- ~~Pet summary card - Show photo, icons, vet info, vaccine status, and alerts in one view~~ ✅
- ~~Vaccination expiration warnings - Highlight expired or soon-to-expire vaccines~~ ✅
- ~~Special handling notes - Prominently display aggression, medical, and behavior flags~~ ✅

#### Streamlined Data Entry

- ~~Pre-populated forms - Auto-fill from customer/pet records~~ ✅
- Quick-add for missing info - Inline editing for vet, emergency contact, vaccines
- ~~Signature capture - Digital waivers and consent forms~~ ✅

#### Inventory & Belongings (per-visit)

- ~~Belongings checklist - Track items brought (food, meds, toys, bedding)~~ ✅
- ~~Photo documentation - Snap photos of belongings at check-in~~ ✅
- ~~Medication schedule - Capture dosage, frequency, and special instructions~~ ✅

#### Workflow Continuity

- ~~Draft/resume capability - Save partial check-ins and return to finish~~ ✅
- ~~Check-in status indicator - Show what's complete vs pending~~ ✅
- ~~Required fields validation - Block completion until critical info is captured~~ ✅

#### Auto-populated from Pet Profile (saved across visits)

- ~~Play group assignment - Based on pet's ideal play group~~ ✅
- ~~Feeding schedule - Confirm or update feeding preferences~~ ✅
- ~~Special handling instructions - Medical, behavior, and care notes~~ ✅

#### Integration Points

- ~~Kennel suite already assigned from reservation~~ ✅
- ~~Link to reservation details and customer account~~ ✅
- Quick access to pet history and previous visit notes

### test on line booking process

- E2E tests for on line booking process

###

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

### Enhanced Security

- Two-factor auth
- SSO
- SOC 2 / HIPAA compliance

---

**Last Updated**: December 9, 2025
