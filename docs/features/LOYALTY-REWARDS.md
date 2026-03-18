# Loyalty Rewards System

## Overview

The Loyalty Rewards System is a comprehensive, multi-tenant configurable loyalty program that allows pet resorts to reward and retain customers through points, tiers, and redemptions.

## Features

### ✅ Implemented Features

1. **Multi-Tenant Configuration**
   - Per-tenant enable/disable
   - Custom program names
   - Configurable earning rates
   - Flexible redemption options
   - Point expiration rules

2. **Point Earning System** (8 Types)
   - Dollars spent (default: 1pt/$1)
   - Visit/check-in bonuses
   - Referral rewards
   - Birthday bonuses
   - Anniversary bonuses
   - Review rewards
   - Social media shares
   - Service-specific bonuses

3. **Tier-Based Membership** (5 Levels)
   - Bronze (0+ pts, 1.0x multiplier)
   - Silver (1,000+ pts, 1.25x, 5% off)
   - Gold (2,500+ pts, 1.5x, 10% off)
   - Platinum (5,000+ pts, 1.75x, 15% off)
   - Diamond (10,000+ pts, 2.0x, 20% off)

4. **Redemption Options** (5 Types)
   - Percentage discounts
   - Fixed dollar discounts
   - Free services
   - Free add-ons
   - Suite upgrades

5. **Admin Configuration UI**
   - General settings
   - Earning rules management
   - Tier configuration
   - Redemption options management

6. **Customer Dashboard**
   - Points balance
   - Current tier with progress
   - Tier benefits
   - Redemption options
   - Point history

---

## Architecture

### Components

```
apps/frontend/src/
├── types/
│   └── loyalty.ts                    # Type definitions
├── services/
│   └── loyaltyService.ts             # Business logic & API
├── pages/
│   └── admin/
│       └── LoyaltyProgram.tsx        # Admin configuration
└── components/
    └── loyalty/
        └── CustomerLoyaltyDashboard.tsx  # Customer view
```

### Data Models

#### LoyaltyConfig

```typescript
interface LoyaltyConfig {
  id: string;
  tenantId: string;
  isEnabled: boolean;
  programName: string;
  earningRules: PointEarningRule[];
  tiersEnabled: boolean;
  tiers: LoyaltyTier[];
  pointsExpireEnabled: boolean;
  pointsExpireDays?: number;
  redemptionOptions: RedemptionOption[];
  minimumPointsToRedeem: number;
  showPointsOnReceipts: boolean;
  showTierOnProfile: boolean;
}
```

#### CustomerLoyalty

```typescript
interface CustomerLoyalty {
  id: string;
  customerId: string;
  tenantId: string;
  totalPointsEarned: number;
  currentPoints: number;
  lifetimePoints: number;
  currentTier: TierLevel;
  pointsToNextTier: number;
  memberSince: Date;
  totalVisits: number;
  totalSpent: number;
  referralCount: number;
}
```

---

## Usage

### Admin Configuration

#### 1. Enable/Disable Program

```typescript
await loyaltyService.toggleProgram(true);
```

#### 2. Configure Program Settings

```typescript
await loyaltyService.updateConfig({
  programName: 'Happy Tails Rewards',
  minimumPointsToRedeem: 100,
  pointsExpireEnabled: true,
  pointsExpireDays: 365
});
```

#### 3. Create Earning Rule

```typescript
await loyaltyService.createEarningRule({
  type: 'DOLLARS_SPENT',
  pointsPerDollar: 1,
  isActive: true
});
```

#### 4. Create Redemption Option

```typescript
await loyaltyService.createRedemptionOption({
  type: 'DISCOUNT_FIXED',
  name: '$10 Off',
  description: 'Get $10 off your next visit',
  pointsCost: 1000,
  discountAmount: 10,
  isActive: true
});
```

### Customer Operations

#### 1. View Loyalty Account

```typescript
const loyalty = await loyaltyService.getCustomerLoyalty(customerId);
```

#### 2. Award Points

```typescript
await loyaltyService.awardPoints(
  customerId,
  100,
  'DOLLARS_SPENT',
  'Earned from $100 purchase',
  reservationId
);
```

#### 3. Redeem Points

```typescript
await loyaltyService.redeemPoints(customerId, redemptionOptionId);
```

#### 4. View Point History

```typescript
const transactions = await loyaltyService.getPointTransactions(customerId);
```

---

## Point Earning Types

### 1. DOLLARS_SPENT

**Configuration:**
- `pointsPerDollar`: Points earned per dollar spent

**Default:** 1 point per $1 spent

**Example:**
```typescript
{
  type: 'DOLLARS_SPENT',
  pointsPerDollar: 1,
  isActive: true
}
```

**Business Logic:**
```typescript
points = Math.floor(purchaseAmount * pointsPerDollar * tierMultiplier)
```

### 2. VISIT

**Configuration:**
- `pointsPerVisit`: Points earned per check-in

**Default:** 10 points per visit

**Example:**
```typescript
{
  type: 'VISIT',
  pointsPerVisit: 10,
  isActive: true
}
```

### 3. REFERRAL

**Configuration:**
- `pointsForReferrer`: Points for customer who refers
- `pointsForReferee`: Points for new customer

**Default:** 500 points for referrer, 100 for referee

**Example:**
```typescript
{
  type: 'REFERRAL',
  pointsForReferrer: 500,
  pointsForReferee: 100,
  isActive: true
}
```

### 4. BIRTHDAY

**Configuration:**
- `bonusPoints`: Bonus points on customer's birthday

**Default:** 100 bonus points

**Example:**
```typescript
{
  type: 'BIRTHDAY',
  bonusPoints: 100,
  isActive: true
}
```

### 5. ANNIVERSARY

**Configuration:**
- `bonusPoints`: Bonus points on membership anniversary

**Default:** 200 bonus points

**Example:**
```typescript
{
  type: 'ANNIVERSARY',
  bonusPoints: 200,
  isActive: true
}
```

### 6. REVIEW

**Configuration:**
- `pointsPerReview`: Points for leaving a review

**Default:** 50 points per review (optional)

**Example:**
```typescript
{
  type: 'REVIEW',
  pointsPerReview: 50,
  isActive: false // Optional feature
}
```

### 7. SOCIAL_SHARE

**Configuration:**
- `pointsPerShare`: Points for social media shares

**Example:**
```typescript
{
  type: 'SOCIAL_SHARE',
  pointsPerShare: 25,
  isActive: false // Optional feature
}
```

### 8. SERVICE_SPECIFIC

**Configuration:**
- `serviceId`: Specific service ID
- `pointsForService`: Bonus points for this service

**Example:**
```typescript
{
  type: 'SERVICE_SPECIFIC',
  serviceId: 'grooming-deluxe',
  pointsForService: 50,
  isActive: true
}
```

---

## Tier System

### Tier Levels

| Tier     | Min Points | Multiplier | Discount | Benefits                                                                                         |
| -------- | ---------- | ---------- | -------- | ------------------------------------------------------------------------------------------------ |
| Bronze   | 0          | 1.0x       | 0%       | Earn 1x points, Birthday bonus                                                                   |
| Silver   | 1,000      | 1.25x      | 5%       | Earn 1.25x points, Birthday bonus, 5% off services                                               |
| Gold     | 2,500      | 1.5x       | 10%      | Earn 1.5x points, Birthday bonus, 10% off services, Priority booking                             |
| Platinum | 5,000      | 1.75x      | 15%      | Earn 1.75x points, Birthday bonus, 15% off services, Priority booking, Free upgrades             |
| Diamond  | 10,000     | 2.0x       | 20%      | Earn 2x points, Birthday bonus, 20% off services, Priority booking, Free upgrades, VIP treatment |

### Tier Calculation

```typescript
const tier = loyaltyService.calculateTier(currentPoints, tiers);
```

### Points to Next Tier

```typescript
const pointsNeeded = loyaltyService.calculatePointsToNextTier(currentPoints, tiers);
```

---

## Redemption Options

### 1. DISCOUNT_PERCENTAGE

**Configuration:**
- `discountPercentage`: Percentage off total

**Example:**
```typescript
{
  type: 'DISCOUNT_PERCENTAGE',
  name: '10% Off',
  description: 'Get 10% off your entire purchase',
  pointsCost: 750,
  discountPercentage: 10,
  isActive: true
}
```

### 2. DISCOUNT_FIXED

**Configuration:**
- `discountAmount`: Fixed dollar amount off

**Example:**
```typescript
{
  type: 'DISCOUNT_FIXED',
  name: '$10 Off',
  description: 'Get $10 off your next visit',
  pointsCost: 1000,
  discountAmount: 10,
  isActive: true
}
```

### 3. FREE_SERVICE

**Configuration:**
- `serviceId`: Service to redeem

**Example:**
```typescript
{
  type: 'FREE_SERVICE',
  name: 'Free Nail Trim',
  description: 'Get a free nail trim service',
  pointsCost: 500,
  serviceId: 'nail-trim',
  isActive: true
}
```

### 4. FREE_ADDON

**Configuration:**
- `addonId`: Add-on to redeem

**Example:**
```typescript
{
  type: 'FREE_ADDON',
  name: 'Free Treat',
  description: 'Get a free treat for your pet',
  pointsCost: 250,
  addonId: 'premium-treat',
  isActive: true
}
```

### 5. UPGRADE

**Configuration:**
- `fromSuiteType`: Original suite type
- `toSuiteType`: Upgraded suite type

**Example:**
```typescript
{
  type: 'UPGRADE',
  name: 'Suite Upgrade',
  description: 'Upgrade from Standard to Deluxe suite',
  pointsCost: 1500,
  fromSuiteType: 'STANDARD',
  toSuiteType: 'DELUXE',
  isActive: true
}
```

---

## API Endpoints

### Configuration

```
GET    /api/loyalty/config
PUT    /api/loyalty/config
PATCH  /api/loyalty/config/toggle
```

### Earning Rules

```
GET    /api/loyalty/earning-rules
POST   /api/loyalty/earning-rules
PUT    /api/loyalty/earning-rules/:id
DELETE /api/loyalty/earning-rules/:id
```

### Tiers

```
GET    /api/loyalty/tiers
PUT    /api/loyalty/tiers/:level
```

### Redemption Options

```
GET    /api/loyalty/redemption-options
POST   /api/loyalty/redemption-options
PUT    /api/loyalty/redemption-options/:id
DELETE /api/loyalty/redemption-options/:id
```

### Customer Loyalty

```
GET    /api/loyalty/customers/:customerId
GET    /api/loyalty/customers
POST   /api/loyalty/customers/:customerId/award
POST   /api/loyalty/customers/:customerId/adjust
GET    /api/loyalty/customers/:customerId/transactions
POST   /api/loyalty/customers/:customerId/redeem
GET    /api/loyalty/customers/:customerId/redemptions
```

### Redemptions

```
POST   /api/loyalty/redemptions/:id/apply
POST   /api/loyalty/redemptions/:id/cancel
```

### Analytics

```
GET    /api/loyalty/stats
GET    /api/loyalty/activity
```

---

## Testing

### Unit Tests

Run tests:
```bash
pnpm test -- loyaltyService.test
```

**Test Coverage (31 passing tests):**
- ✅ Points calculation (3 tests)
- ✅ Tier calculation (6 tests)
- ✅ Points to next tier (2 tests)
- ✅ Points formatting (1 test)
- ✅ Tier colors (1 test)
- ✅ Tier display names (1 test)
- ✅ Redemption eligibility (3 tests)
- ✅ Redemption value calculation (4 tests)
- ✅ Earning rule validation (6 tests)
- ✅ Redemption option validation (5 tests)

---

## Multi-Tenant Customization

### What Tenants Can Customize

**Program Settings:**
- ✅ Enable/disable entire program
- ✅ Program name
- ✅ Minimum points to redeem
- ✅ Point expiration (enable/disable, days)
- ✅ Display options (receipts, profiles)

**Earning Rules:**
- ✅ Points per dollar (default: 1)
- ✅ Points per visit (default: 10)
- ✅ Referral bonuses (default: 500/100)
- ✅ Birthday bonus (default: 100)
- ✅ Anniversary bonus (default: 200)
- ✅ Enable/disable any earning type

**Tier System:**
- ✅ Enable/disable tiers
- ✅ Tier names
- ✅ Points thresholds
- ✅ Multipliers
- ✅ Discount percentages
- ✅ Benefits lists

**Redemption Options:**
- ✅ Create custom redemptions
- ✅ Set point costs
- ✅ Configure discount amounts
- ✅ Set restrictions
- ✅ Enable/disable options

---

## Best Practices

### For Administrators

1. **Start Simple**
   - Enable basic earning (dollars spent, visits)
   - Use default tier thresholds
   - Offer simple redemptions ($5, $10, $25 off)

2. **Monitor Performance**
   - Track redemption rates
   - Monitor tier distribution
   - Adjust point values as needed

3. **Communicate Value**
   - Show points on receipts
   - Display tier on profiles
   - Promote redemption options

4. **Balance Generosity**
   - Don't make points too easy or too hard to earn
   - Ensure redemptions provide real value
   - Consider profit margins

5. **Test Before Launch**
   - Calculate point costs
   - Verify tier thresholds
   - Test redemption flow

### For Developers

1. **Always Use Service Layer**
2. **Validate All Inputs**
3. **Handle Edge Cases** (zero points, max tier)
4. **Log All Transactions**
5. **Test Thoroughly**

---

## Examples

### Example 1: Basic Purchase

**Scenario:**
- Customer spends $100
- Bronze tier (1.0x multiplier)
- 1 point per dollar rule

**Calculation:**
```typescript
points = Math.floor(100 * 1 * 1.0) = 100 points
```

### Example 2: Purchase with Tier Bonus

**Scenario:**
- Customer spends $100
- Gold tier (1.5x multiplier)
- 1 point per dollar rule

**Calculation:**
```typescript
points = Math.floor(100 * 1 * 1.5) = 150 points
```

### Example 3: Redemption

**Scenario:**
- Customer has 1,200 points
- Redeems "$10 Off" (1,000 points)

**Result:**
- Points deducted: 1,000
- Remaining points: 200
- Discount applied: $10

### Example 4: Tier Progression

**Scenario:**
- Customer starts with 2,400 points (Silver tier)
- Earns 200 points from purchase
- New total: 2,600 points

**Result:**
- Tier upgraded from Silver to Gold
- New multiplier: 1.5x (was 1.25x)
- New discount: 10% (was 5%)

---

## Future Enhancements

### Potential Features

1. **Advanced Analytics**
   - Customer lifetime value by tier
   - Redemption rate analysis
   - ROI tracking

2. **Automated Marketing**
   - Birthday emails with bonus points
   - Tier upgrade notifications
   - Expiration reminders

3. **Gamification**
   - Challenges and achievements
   - Bonus point events
   - Leaderboards

4. **Integration**
   - Email marketing platforms
   - SMS notifications
   - Mobile app

5. **Advanced Redemptions**
   - Charity donations
   - Gift cards
   - Partner rewards

---

**Last Updated:** October 25, 2025
**Version:** 1.0.0
**Status:** Frontend Complete, Backend Pending
**Test Coverage:** 31 passing tests
