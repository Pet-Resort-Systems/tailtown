# Flexible Deposit Rules System

## Overview

The Flexible Deposit Rules System is a comprehensive, multi-tenant configurable deposit management solution that allows pet resorts to define custom deposit requirements based on various conditions such as cost, dates, services, and customer types.

## Features

### ✅ Implemented Features

1. **Multi-Tenant Configuration**
   - Per-tenant enable/disable
   - Custom deposit rules
   - Priority-based rule matching
   - Default deposit settings
   - Partial payment options

2. **Deposit Rule Types** (8 Types)
   - Cost threshold-based deposits
   - Service type-based deposits
   - Advance booking deposits
   - Holiday/peak season deposits
   - Day-of-week deposits
   - Duration-based deposits
   - First-time customer deposits
   - Custom rules

3. **Deposit Amount Types** (3 Types)
   - Percentage of total cost
   - Fixed dollar amount
   - Full payment required

4. **Refund Policies** (4 Types)
   - Fully refundable
   - Partially refundable
   - Non-refundable
   - Tiered refund (based on cancellation timing)

5. **Admin Configuration UI**
   - Deposit rules management
   - Priority ordering
   - General settings
   - Form validation

6. **Customer Display**
   - Automatic deposit calculation
   - Clear amount breakdown
   - Refund policy explanation
   - Due date display

---

## Architecture

### Components

```
apps/frontend/src/
├── types/
│   └── deposit.ts                    # Type definitions
├── services/
│   └── depositService.ts             # Business logic & API
├── pages/
│   └── admin/
│       └── DepositRules.tsx          # Admin configuration
└── components/
    └── deposits/
        └── DepositInfo.tsx           # Customer display
```

### Data Models

#### DepositConfig

```typescript
interface DepositConfig {
  id: string;
  tenantId: string;
  isEnabled: boolean;
  rules: DepositRule[];
  defaultDepositRequired: boolean;
  defaultDepositAmount?: number;
  defaultDepositType?: DepositAmountType;
  allowPartialPayments: boolean;
  minimumPartialPaymentAmount?: number;
  sendDepositReminders: boolean;
  reminderDaysBefore?: number[];
}
```

#### DepositRule

```typescript
interface DepositRule {
  id: string;
  name: string;
  description: string;
  type: DepositRuleType;
  isActive: boolean;
  priority: number;
  conditions: DepositRuleConditions;
  depositAmountType: DepositAmountType;
  depositPercentage?: number;
  depositFixedAmount?: number;
  refundPolicy: RefundPolicyType;
  refundTiers?: RefundTier[];
  depositDueDays?: number;
}
```

---

## Usage

### Admin Configuration

#### 1. Enable/Disable System

```typescript
await depositService.toggleSystem(true);
```

#### 2. Create Deposit Rule

```typescript
await depositService.createRule({
  name: 'High-Value Reservation',
  description: 'Require 50% deposit for reservations over $500',
  type: 'COST_THRESHOLD',
  priority: 1,
  conditions: {
    minCost: 500
  },
  depositAmountType: 'PERCENTAGE',
  depositPercentage: 50,
  refundPolicy: 'TIERED_REFUND',
  refundTiers: [
    { daysBeforeStart: 14, refundPercentage: 100, description: '100% refund if 14+ days' },
    { daysBeforeStart: 7, refundPercentage: 50, description: '50% refund if 7-13 days' },
    { daysBeforeStart: 0, refundPercentage: 0, description: 'No refund if <7 days' }
  ],
  depositDueDays: 3,
  isActive: true
});
```

### Customer Operations

#### 1. Calculate Deposit

```typescript
const calculation = await depositService.calculateDeposit({
  totalCost: 750,
  startDate: '2025-12-15',
  endDate: '2025-12-20',
  serviceId: 'boarding-deluxe'
});

console.log(calculation);
// {
//   depositRequired: true,
//   depositAmount: 375,
//   depositPercentage: 50,
//   matchedRuleName: 'High-Value Reservation',
//   refundPolicy: 'TIERED_REFUND',
//   explanation: 'High-Value Reservation: 50% deposit ($375.00) due 3 days before arrival'
// }
```

#### 2. Calculate Refund

```typescript
const refundAmount = depositService.calculateRefundAmount(
  500,                    // Deposit amount
  'TIERED_REFUND',       // Refund policy
  refundTiers,           // Refund tiers
  '2025-12-15',          // Reservation start date
  '2025-12-01'           // Cancellation date (14 days before)
);

console.log(refundAmount); // 500 (100% refund)
```

---

## Deposit Rule Types

### 1. COST_THRESHOLD

**Purpose**: Require deposits based on total reservation cost

**Configuration:**
```typescript
{
  type: 'COST_THRESHOLD',
  conditions: {
    minCost: 500,      // Minimum cost to trigger
    maxCost: 2000      // Maximum cost (optional)
  }
}
```

**Use Cases:**
- High-value reservations
- Premium services
- Extended stays

**Example:**
- Reservations over $500 require 50% deposit
- Reservations over $1000 require full payment

---

### 2. SERVICE_TYPE

**Purpose**: Require deposits for specific services

**Configuration:**
```typescript
{
  type: 'SERVICE_TYPE',
  conditions: {
    serviceIds: ['grooming-deluxe', 'training-advanced'],
    serviceCategories: ['GROOMING', 'TRAINING']
  }
}
```

**Use Cases:**
- Specialized services
- High-demand services
- Services with materials/prep

**Example:**
- All grooming services require $50 deposit
- Training sessions require 100% prepayment

---

### 3. ADVANCE_BOOKING

**Purpose**: Require deposits based on how far in advance booking is made

**Configuration:**
```typescript
{
  type: 'ADVANCE_BOOKING',
  conditions: {
    minDaysInAdvance: 30,  // Book 30+ days ahead
    maxDaysInAdvance: 90   // Up to 90 days (optional)
  }
}
```

**Use Cases:**
- Early bird bookings
- Long-term planning
- Securing future dates

**Example:**
- Bookings 30+ days in advance require 25% deposit
- Bookings 60+ days in advance get deposit waived

---

### 4. HOLIDAY_PEAK

**Purpose**: Require deposits during holidays and peak seasons

**Configuration:**
```typescript
{
  type: 'HOLIDAY_PEAK',
  conditions: {
    dateRanges: [
      { startDate: '2025-12-20', endDate: '2026-01-05', name: 'Christmas/New Year' },
      { startDate: '2026-07-01', endDate: '2026-07-07', name: 'July 4th Week' }
    ]
  }
}
```

**Use Cases:**
- Holiday periods
- Peak seasons
- High-demand dates

**Example:**
- Christmas week requires full payment
- Summer peak requires 50% deposit

---

### 5. DAY_OF_WEEK

**Purpose**: Require deposits for specific days of the week

**Configuration:**
```typescript
{
  type: 'DAY_OF_WEEK',
  conditions: {
    daysOfWeek: [5, 6]  // Friday (5), Saturday (6)
  }
}
```

**Use Cases:**
- Weekend stays
- Popular check-in days
- High-demand days

**Example:**
- Weekend check-ins require 25% deposit
- Friday arrivals require $100 deposit

---

### 6. DURATION

**Purpose**: Require deposits based on stay length

**Configuration:**
```typescript
{
  type: 'DURATION',
  conditions: {
    minNights: 7,      // 7+ night stays
    maxNights: 30      // Up to 30 nights (optional)
  }
}
```

**Use Cases:**
- Extended stays
- Long-term boarding
- Multi-week reservations

**Example:**
- Stays 7+ nights require $100 deposit
- Stays 14+ nights require 50% deposit

---

### 7. FIRST_TIME_CUSTOMER

**Purpose**: Require deposits for new customers

**Configuration:**
```typescript
{
  type: 'FIRST_TIME_CUSTOMER',
  conditions: {
    firstTimeCustomerOnly: true
  }
}
```

**Use Cases:**
- New customer verification
- Risk mitigation
- Commitment assurance

**Example:**
- First-time customers require 50% deposit
- Returning customers exempt from deposit

---

### 8. CUSTOM

**Purpose**: Custom rules with flexible conditions

**Configuration:**
```typescript
{
  type: 'CUSTOM',
  conditions: {
    customConditions: {
      // Any custom logic
    }
  }
}
```

**Use Cases:**
- Special promotions
- Partner programs
- Unique business rules

---

## Refund Policies

### 1. FULL_REFUND

**Description**: 100% refundable at any time

**Configuration:**
```typescript
{
  refundPolicy: 'FULL_REFUND'
}
```

**Use Cases:**
- Low-risk reservations
- Customer-friendly policies
- Competitive advantage

---

### 2. TIERED_REFUND

**Description**: Refund percentage based on cancellation timing

**Configuration:**
```typescript
{
  refundPolicy: 'TIERED_REFUND',
  refundTiers: [
    { daysBeforeStart: 14, refundPercentage: 100, description: '100% if 14+ days' },
    { daysBeforeStart: 7, refundPercentage: 50, description: '50% if 7-13 days' },
    { daysBeforeStart: 3, refundPercentage: 25, description: '25% if 3-6 days' },
    { daysBeforeStart: 0, refundPercentage: 0, description: 'No refund if <3 days' }
  ]
}
```

**Use Cases:**
- Balanced risk/reward
- Industry standard
- Fair to both parties

**Calculation:**
```typescript
// Cancel 10 days before: 50% refund
// Cancel 5 days before: 25% refund
// Cancel 1 day before: No refund
```

---

### 3. PARTIAL_REFUND

**Description**: Fixed partial refund percentage

**Configuration:**
```typescript
{
  refundPolicy: 'PARTIAL_REFUND'
}
```

**Use Cases:**
- Simple refund policy
- Covers administrative costs
- Predictable refunds

---

### 4. NON_REFUNDABLE

**Description**: No refunds under any circumstances

**Configuration:**
```typescript
{
  refundPolicy: 'NON_REFUNDABLE'
}
```

**Use Cases:**
- High-demand periods
- Special events
- Discounted rates

---

## API Endpoints

### Configuration

```
GET    /api/deposits/config
PUT    /api/deposits/config
PATCH  /api/deposits/config/toggle
```

### Deposit Rules

```
GET    /api/deposits/rules
POST   /api/deposits/rules
PUT    /api/deposits/rules/:id
DELETE /api/deposits/rules/:id
POST   /api/deposits/rules/reorder
```

### Calculations

```
POST   /api/deposits/calculate
```

### Payments

```
GET    /api/deposits/payments/:reservationId
POST   /api/deposits/payments/:reservationId/pay
POST   /api/deposits/payments/:reservationId/refund
```

### Analytics

```
GET    /api/deposits/stats
GET    /api/deposits/upcoming
GET    /api/deposits/overdue
```

---

## Testing

### Unit Tests

Run tests:
```bash
pnpm test -- depositService.test
```

**Test Coverage (25 passing tests):**
- ✅ Rule condition evaluation (4 tests)
- ✅ Deposit amount calculation (4 tests)
- ✅ Refund amount calculation (5 tests)
- ✅ Formatting (2 tests)
- ✅ Validation (5 tests)
- ✅ Helper functions (5 tests)

---

## Multi-Tenant Customization

### What Tenants Can Customize

**System Settings:**
- ✅ Enable/disable entire system
- ✅ Default deposit requirements
- ✅ Partial payment options
- ✅ Reminder settings

**Deposit Rules:**
- ✅ Create unlimited rules
- ✅ Set rule priorities
- ✅ Configure conditions
- ✅ Set deposit amounts
- ✅ Define refund policies
- ✅ Enable/disable rules

**Refund Policies:**
- ✅ Choose policy type
- ✅ Configure refund tiers
- ✅ Set refund percentages
- ✅ Define timing thresholds

---

## Best Practices

### For Administrators

1. **Start Simple**
   - Enable 2-3 basic rules
   - Use industry-standard refund tiers
   - Test with real scenarios

2. **Priority Ordering**
   - Most specific rules first
   - General rules last
   - Test rule matching

3. **Clear Communication**
   - Use descriptive rule names
   - Write clear descriptions
   - Explain refund policies

4. **Monitor Performance**
   - Track deposit collection rates
   - Review refund requests
   - Adjust rules as needed

5. **Balance Risk**
   - Don't over-require deposits
   - Be fair with refund policies
   - Consider customer experience

### For Developers

1. **Always Validate**
2. **Handle Edge Cases**
3. **Test Thoroughly**
4. **Log Calculations**
5. **Document Rules**

---

## Examples

### Example 1: High-Value Reservation

**Scenario:**
- Reservation cost: $750
- Start date: 2025-12-15
- Rule: 50% deposit for $500+

**Calculation:**
```typescript
depositAmount = $750 * 50% = $375
dueDate = 2025-12-15 - 3 days = 2025-12-12
```

**Result:**
- Deposit required: $375
- Due by: 2025-12-12
- Refund policy: Tiered

---

### Example 2: Holiday Booking

**Scenario:**
- Reservation cost: $400
- Start date: 2025-12-25 (Christmas)
- Rule: Full payment for holidays

**Calculation:**
```typescript
depositAmount = $400 (full payment)
dueDate = 2025-12-25 - 7 days = 2025-12-18
```

**Result:**
- Deposit required: $400 (full)
- Due by: 2025-12-18
- Refund policy: Tiered (30/14 days)

---

### Example 3: Weekend Stay

**Scenario:**
- Reservation cost: $300
- Start date: 2025-11-01 (Friday)
- Rule: 25% deposit for weekends

**Calculation:**
```typescript
depositAmount = $300 * 25% = $75
dueDate = 2025-11-01 - 2 days = 2025-10-30
```

**Result:**
- Deposit required: $75
- Due by: 2025-10-30
- Refund policy: Tiered (7/3 days)

---

### Example 4: Refund Calculation

**Scenario:**
- Deposit paid: $500
- Reservation start: 2025-12-15
- Cancellation date: 2025-12-05 (10 days before)
- Refund tiers: 14+ days (100%), 7-13 days (50%), <7 days (0%)

**Calculation:**
```typescript
daysBeforeStart = 10 days
matchedTier = 7-13 days tier (50%)
refundAmount = $500 * 50% = $250
```

**Result:**
- Refund amount: $250
- Forfeited: $250

---

## Future Enhancements

### Potential Features

1. **Advanced Rules**
   - Combine multiple conditions (AND/OR logic)
   - Time-of-day rules
   - Weather-based rules

2. **Payment Plans**
   - Installment payments
   - Automatic payment schedules
   - Payment reminders

3. **Integration**
   - Payment gateway integration
   - Accounting system sync
   - Email/SMS notifications

4. **Analytics**
   - Deposit collection reports
   - Refund trend analysis
   - Rule effectiveness metrics

5. **Automation**
   - Auto-apply deposits to invoices
   - Auto-process refunds
   - Auto-send reminders

---

**Last Updated:** October 25, 2025
**Version:** 1.0.0
**Status:** Frontend Complete, Backend Pending
**Test Coverage:** 25 passing tests
