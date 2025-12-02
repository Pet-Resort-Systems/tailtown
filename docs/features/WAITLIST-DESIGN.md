# Waitlist Feature Design

## Overview
Automated waitlist system that notifies staff when capacity becomes available due to cancellations or modifications.

## Business Requirements

### Core Features
1. **Add to Waitlist**: When services are fully booked, offer waitlist option
2. **Priority Queue**: First-come, first-served ordering
3. **Automatic Notifications**: Alert staff when spots open up
4. **Multi-Service Support**: Boarding, Daycare, Grooming, Training Classes
5. **Date-Specific**: Waitlist tied to specific dates/times
6. **Customer Communication**: Notify customers of their waitlist position

### Service Types

#### Boarding/Daycare Waitlist
- Date range (check-in to check-out)
- Pet requirements (size, breed restrictions)
- Suite type preferences
- Flexible dates option

#### Grooming Waitlist
- Specific date/time slot
- Groomer preference
- Service type
- Duration estimate

#### Training Class Waitlist
- Specific class/session
- Pet eligibility requirements
- Series vs single session

## Data Model

### Waitlist Entry
```typescript
{
  id: string;
  tenantId: string;
  customerId: string;
  petId: string;
  serviceType: 'BOARDING' | 'DAYCARE' | 'GROOMING' | 'TRAINING';
  
  // Date/Time
  requestedStartDate: Date;
  requestedEndDate?: Date; // For boarding/daycare
  requestedTime?: string; // For grooming
  flexibleDates: boolean;
  dateFlexibilityDays?: number; // ±N days
  
  // Service Details
  serviceId?: string; // Specific service
  resourceId?: string; // Specific suite/room
  groomerId?: string; // Specific groomer
  classId?: string; // Specific training class
  
  // Preferences
  preferences: {
    suiteType?: string[];
    groomerPreference?: string;
    timePreference?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  };
  
  // Status
  status: 'ACTIVE' | 'NOTIFIED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  priority: number; // Auto-calculated based on join time
  position: number; // Current position in queue
  
  // Metadata
  notes?: string;
  customerNotes?: string;
  notificationsSent: number;
  lastNotifiedAt?: Date;
  
  // Conversion
  convertedToReservationId?: string;
  convertedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}
```

### Waitlist Notification
```typescript
{
  id: string;
  waitlistEntryId: string;
  notificationType: 'SPOT_AVAILABLE' | 'POSITION_UPDATE' | 'EXPIRING_SOON';
  recipientType: 'STAFF' | 'CUSTOMER';
  recipientId: string;
  channel: 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: Date;
  readAt?: Date;
  actionTaken?: 'BOOKED' | 'DECLINED' | 'EXPIRED';
  actionTakenAt?: Date;
}
```

## Business Logic

### Adding to Waitlist
1. Check if service is fully booked for requested dates
2. Validate customer and pet eligibility
3. Calculate priority (timestamp-based)
4. Calculate position in queue
5. Send confirmation to customer
6. Notify staff of new waitlist entry

### Spot Becomes Available
**Triggers**:
- Reservation cancelled
- Reservation modified (dates changed)
- New capacity added (suite opened, groomer added)

**Process**:
1. Detect availability change
2. Query active waitlist entries for matching criteria
3. Sort by priority (earliest first)
4. Notify top N entries (configurable, default 3)
5. Set expiration time for response (default 24 hours)
6. Track notification status

### Converting Waitlist to Reservation
1. Staff or customer initiates booking
2. Verify availability still exists
3. Create reservation
4. Mark waitlist entry as CONVERTED
5. Update positions for remaining entries
6. Send confirmation to customer

### Expiration Handling
1. Waitlist entry expires after N days (configurable, default 30)
2. Notification expires after N hours (configurable, default 24)
3. Auto-remove expired entries
4. Notify customer of expiration

## API Endpoints

### Customer-Facing
```
POST   /api/waitlist                          - Add to waitlist
GET    /api/waitlist/my-entries               - Get customer's waitlist entries
DELETE /api/waitlist/:id                      - Remove from waitlist
GET    /api/waitlist/:id/position             - Check position
```

### Staff-Facing
```
GET    /api/waitlist                          - List all waitlist entries (filtered)
GET    /api/waitlist/:id                      - Get specific entry
PATCH  /api/waitlist/:id                      - Update entry
POST   /api/waitlist/:id/notify               - Manually notify customer
POST   /api/waitlist/:id/convert              - Convert to reservation
GET    /api/waitlist/availability-check       - Check for matching availability
POST   /api/waitlist/bulk-notify              - Notify multiple entries
```

### System/Internal
```
POST   /api/waitlist/process-cancellation     - Process when reservation cancelled
POST   /api/waitlist/check-availability       - Check and notify on availability
GET    /api/waitlist/expiring                 - Get expiring entries
POST   /api/waitlist/cleanup-expired          - Remove expired entries
```

## UI Components

### Customer Booking Flow
```
[Select Dates] → [No Availability] → [Join Waitlist Button]
                                    ↓
                            [Waitlist Form]
                            - Flexible dates?
                            - Preferences
                            - Contact method
                                    ↓
                            [Confirmation]
                            - Position in queue
                            - Estimated wait
                            - How to check status
```

### Staff Dashboard
```
[Waitlist Dashboard]
├── Active Waitlist (grouped by service type)
│   ├── Boarding (12 entries)
│   ├── Daycare (5 entries)
│   ├── Grooming (8 entries)
│   └── Training (3 entries)
├── Pending Notifications (3)
├── Recent Conversions (5)
└── Expired/Cancelled (10)

[Waitlist Entry Detail]
├── Customer & Pet Info
├── Requested Dates/Times
├── Preferences
├── Position & Priority
├── Actions
│   ├── Notify Customer
│   ├── Convert to Reservation
│   ├── Update Position
│   └── Cancel Entry
└── History/Notes
```

### Notifications
```
[Staff Notification - Spot Available]
"🎉 Waitlist Alert: Spot available for boarding Oct 24-26
3 customers waiting. Click to notify them."

[Customer Notification - Spot Available]
"Good news! A spot opened up for your requested dates (Oct 24-26).
Book now: [Link] (expires in 24 hours)"

[Customer Notification - Position Update]
"You moved up! You're now #2 on the waitlist for Oct 24-26."
```

## Notification Strategy

### Staff Notifications
- **Immediate**: When spot becomes available
- **Daily Digest**: Summary of waitlist activity
- **Channel**: In-app + Email

### Customer Notifications
- **Immediate**: Spot available (SMS + Email)
- **Weekly**: Position update if moved up
- **Before Expiry**: 48 hours before entry expires
- **Channel**: SMS (preferred) + Email (backup)

## Configuration

### Tenant Settings
```typescript
{
  waitlistEnabled: boolean;
  waitlistExpirationDays: number; // Default 30
  notificationExpirationHours: number; // Default 24
  maxNotificationsPerAvailability: number; // Default 3
  autoNotifyOnCancellation: boolean; // Default true
  customerNotificationChannels: ['SMS', 'EMAIL'];
  staffNotificationChannels: ['IN_APP', 'EMAIL'];
  flexibleDatesEnabled: boolean;
  maxFlexibilityDays: number; // Default 7
}
```

## Priority Algorithm

### Basic Priority (Phase 1)
```
priority = timestamp (earlier = higher priority)
position = rank by priority ascending
```

### Advanced Priority (Phase 2)
```
priority = baseScore + loyaltyBonus + flexibilityBonus

baseScore = timestamp (milliseconds)
loyaltyBonus = customerLifetimeValue * 1000
flexibilityBonus = dateFlexibilityDays * 86400000 (1 day in ms)
```

## Matching Algorithm

### Find Matching Waitlist Entries
```typescript
function findMatchingEntries(
  serviceType: string,
  startDate: Date,
  endDate?: Date,
  resourceId?: string
): WaitlistEntry[] {
  
  // Base criteria
  let entries = waitlist.filter(e => 
    e.status === 'ACTIVE' &&
    e.serviceType === serviceType
  );
  
  // Date matching
  if (flexibleDates) {
    entries = entries.filter(e => {
      const flexDays = e.dateFlexibilityDays || 0;
      const minDate = addDays(e.requestedStartDate, -flexDays);
      const maxDate = addDays(e.requestedStartDate, flexDays);
      return startDate >= minDate && startDate <= maxDate;
    });
  } else {
    entries = entries.filter(e => 
      isSameDay(e.requestedStartDate, startDate)
    );
  }
  
  // Resource matching (if specified)
  if (resourceId && !e.flexibleDates) {
    entries = entries.filter(e => 
      !e.resourceId || e.resourceId === resourceId
    );
  }
  
  // Sort by priority
  return entries.sort((a, b) => a.priority - b.priority);
}
```

## Metrics & Reporting

### KPIs
- Waitlist conversion rate
- Average time on waitlist
- Average position when converted
- Notification response rate
- Expiration rate
- Revenue from waitlist conversions

### Reports
- Waitlist activity by service type
- Peak waitlist periods
- Conversion funnel
- Customer satisfaction (waitlist vs direct booking)

## Implementation Phases

### Phase 1: Core Functionality (Week 1)
- Database schema and migrations
- Basic CRUD API
- Add to waitlist from booking flow
- Staff waitlist dashboard
- Manual notification

### Phase 2: Automation (Week 2)
- Automatic availability detection
- Automatic notifications
- Expiration handling
- Position updates

### Phase 3: Advanced Features (Week 3)
- Flexible dates
- Preference matching
- Priority algorithm
- Customer self-service portal

### Phase 4: Optimization (Week 4)
- Bulk operations
- Advanced reporting
- SMS integration
- Mobile app support

## Success Criteria

1. ✅ Customers can join waitlist when fully booked
2. ✅ Staff notified within 5 minutes of availability
3. ✅ Customers notified within 10 minutes of availability
4. ✅ >50% conversion rate from waitlist to booking
5. ✅ <5% expiration rate
6. ✅ Clear visibility of waitlist status for staff
7. ✅ Automated position updates
8. ✅ Integration with existing booking flow
