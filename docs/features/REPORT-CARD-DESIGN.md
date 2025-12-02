# Pet Report Card System - Design Document

## Overview
Automated pet report card system that allows staff to quickly create and send photo-rich updates to pet parents via SMS and email. Supports individual and bulk report card generation with mobile photo capture.

## Business Requirements

### Core Features
1. **Quick Report Creation**: Staff can create reports in under 2 minutes
2. **Photo Upload**: Support multiple photos per report (mobile camera integration)
3. **Bulk Generation**: Create reports for multiple pets at once
4. **Multi-Channel Delivery**: SMS + Email with photos
5. **Templates**: Pre-defined templates for different services (boarding, daycare, grooming)
6. **Customer Portal**: Parents can view all historical reports
7. **Automated Scheduling**: Optional daily/check-out reports

### User Stories

**Staff Member**:
- "I want to take a photo of a dog playing and quickly send it to the owner"
- "I need to create 20 report cards at the end of the day for all daycare dogs"
- "I want to use my phone to take photos and create reports on the go"

**Pet Parent**:
- "I want to receive text updates with photos of my dog throughout the day"
- "I want to see all past reports in one place"
- "I want to save and share photos of my pet"

## Data Model

### ReportCard
```prisma
model ReportCard {
  id                String              @id @default(uuid())
  tenantId          String
  
  // Relationships
  petId             String
  pet               Pet                 @relation(fields: [petId], references: [id])
  customerId        String
  customer          Customer            @relation(fields: [customerId], references: [id])
  reservationId     String?
  reservation       Reservation?        @relation(fields: [reservationId], references: [id])
  createdByStaffId  String
  createdByStaff    Staff               @relation(fields: [createdByStaffId], references: [id])
  
  // Report Details
  reportDate        DateTime            @default(now())
  serviceType       ReportCardServiceType
  templateType      ReportCardTemplate?
  
  // Content
  title             String?             // e.g., "Great Day at Daycare!"
  summary           String?             // Brief summary
  
  // Activity Ratings (1-5 scale)
  moodRating        Int?                // How was their mood?
  energyRating      Int?                // Energy level
  appetiteRating    Int?                // Did they eat well?
  socialRating      Int?                // How did they socialize?
  
  // Activity Details
  activities        String[]            // ["Played fetch", "Nap time", "Group play"]
  mealsEaten        String[]            // ["Breakfast - All", "Lunch - Half"]
  bathroomBreaks    Int?                // Number of potty breaks
  medicationGiven   Boolean             @default(false)
  medicationNotes   String?
  
  // Behavioral Notes
  behaviorNotes     String?             // Free-form notes
  highlights        String[]            // ["Made a new friend!", "Learned sit command"]
  concerns          String[]            // ["Seemed tired", "Didn't eat lunch"]
  
  // Photos
  photos            ReportCardPhoto[]
  photoCount        Int                 @default(0)
  
  // Delivery
  status            ReportCardStatus    @default(DRAFT)
  sentAt            DateTime?
  sentViaEmail      Boolean             @default(false)
  sentViaSMS        Boolean             @default(false)
  emailDeliveredAt  DateTime?
  smsDeliveredAt    DateTime?
  viewedAt          DateTime?
  viewCount         Int                 @default(0)
  
  // Metadata
  isTemplate        Boolean             @default(false)
  tags              String[]
  notes             String?             // Internal staff notes
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@index([tenantId, reportDate])
  @@index([petId, reportDate])
  @@index([customerId, reportDate])
  @@index([reservationId])
  @@index([status])
  @@index([createdByStaffId])
  @@map("report_cards")
}

model ReportCardPhoto {
  id              String        @id @default(uuid())
  reportCardId    String
  reportCard      ReportCard    @relation(fields: [reportCardId], references: [id], onDelete: Cascade)
  
  // Photo Details
  url             String        // S3/storage URL
  thumbnailUrl    String?       // Optimized thumbnail
  caption         String?
  order           Int           @default(0)
  
  // Metadata
  uploadedByStaffId String?
  uploadedByStaff   Staff?      @relation(fields: [uploadedByStaffId], references: [id])
  fileSize        Int?          // Bytes
  width           Int?
  height          Int?
  mimeType        String?
  
  createdAt       DateTime      @default(now())
  
  @@index([reportCardId, order])
  @@map("report_card_photos")
}

enum ReportCardServiceType {
  BOARDING
  DAYCARE
  GROOMING
  TRAINING
  GENERAL
}

enum ReportCardTemplate {
  DAYCARE_DAILY
  BOARDING_DAILY
  BOARDING_CHECKOUT
  GROOMING_COMPLETE
  TRAINING_SESSION
  CUSTOM
}

enum ReportCardStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  SENT
  VIEWED
  ARCHIVED
}
```

## Features Breakdown

### 1. Quick Photo Capture (Mobile-First)

**Mobile Interface**:
```
┌─────────────────────────┐
│  Create Report Card     │
├─────────────────────────┤
│                         │
│  [Select Pet ▼]         │
│   Max (Boarding)        │
│                         │
│  📷 Take Photo          │
│  📁 Upload from Gallery │
│                         │
│  [Photo Preview Grid]   │
│  ┌───┐ ┌───┐ ┌───┐     │
│  │ 📷│ │ 📷│ │ + │     │
│  └───┘ └───┘ └───┘     │
│                         │
│  Quick Notes:           │
│  ┌─────────────────┐   │
│  │ Had a great day!│   │
│  │ Played with...  │   │
│  └─────────────────┘   │
│                         │
│  Mood: 😊 😊 😊 😊 😐  │
│  Energy: ⚡⚡⚡⚡⚡      │
│                         │
│  [Send Now] [Save Draft]│
└─────────────────────────┘
```

### 2. Bulk Report Card Generation

**Desktop Interface**:
```
┌──────────────────────────────────────┐
│  Bulk Report Cards - Today's Daycare │
├──────────────────────────────────────┤
│                                      │
│  Select All (15 dogs) ☑              │
│                                      │
│  ☑ Max (Golden Retriever)           │
│     Photos: 3 | Template: Daycare   │
│  ☑ Bella (Labrador)                 │
│     Photos: 2 | Template: Daycare   │
│  ☑ Charlie (Poodle)                 │
│     Photos: 4 | Template: Daycare   │
│                                      │
│  [Apply Template to All]            │
│  [Upload Photos in Bulk]            │
│  [Preview All] [Send All]           │
└──────────────────────────────────────┘
```

### 3. Report Card Templates

**Daycare Daily Template**:
```
🐾 [Pet Name]'s Day at Tailtown

Today was a [mood emoji] day!

Activities:
✓ Morning playtime with friends
✓ Lunch (ate everything!)
✓ Afternoon nap
✓ Evening play session

Mood: ⭐⭐⭐⭐⭐
Energy: ⚡⚡⚡⚡
Appetite: 🍖🍖🍖🍖🍖

[Photo Gallery - 3 photos]

Notes: [Pet Name] had a wonderful day and made 
new friends! They especially loved playing fetch.

- Staff Name
```

**Boarding Check-out Template**:
```
🏠 [Pet Name]'s Stay Summary

Dates: [Check-in] - [Check-out]

Overall Experience: ⭐⭐⭐⭐⭐

Highlights:
• Made friends with 3 other dogs
• Learned a new trick!
• Ate all meals
• Slept well every night

Daily Ratings:
Day 1: 😊😊😊😊😊
Day 2: 😊😊😊😊😊
Day 3: 😊😊😊😊😊

[Photo Gallery - 8 photos]

We loved having [Pet Name] stay with us!
Looking forward to next time.
```

### 4. SMS Delivery

**SMS Format** (with link to full report):
```
📸 Max's Report Card is ready!

Great day at daycare! 5/5 mood ⭐
3 new photos 📷

View full report & photos:
https://tailtown.com/reports/abc123

Reply STOP to unsubscribe
```

### 5. Email Delivery

**Email Template**:
```html
Subject: 🐾 Max's Report Card - [Date]

[Header with logo]

Hi [Parent Name]!

Max had a wonderful day at Tailtown Daycare!

[Large featured photo]

Quick Summary:
Mood: ⭐⭐⭐⭐⭐
Energy: ⚡⚡⚡⚡
Appetite: 🍖🍖🍖🍖🍖

Activities Today:
• Morning playtime with friends
• Lunch (ate everything!)
• Afternoon nap
• Evening play session

[Photo Gallery Grid - 3 photos]

Staff Notes:
"Max had a blast playing with his friends today! 
He especially loved the new ball we got."

[View Full Report Button]

- Sarah, Daycare Staff
```

## API Endpoints

### Report Card Management

```
POST   /api/report-cards                    - Create report card
GET    /api/report-cards                    - List report cards (staff)
GET    /api/report-cards/:id                - Get single report card
PATCH  /api/report-cards/:id                - Update report card
DELETE /api/report-cards/:id                - Delete report card
POST   /api/report-cards/:id/send           - Send report card
POST   /api/report-cards/bulk               - Bulk create report cards
POST   /api/report-cards/bulk/send          - Bulk send report cards

GET    /api/customers/:customerId/report-cards  - Customer's reports
GET    /api/pets/:petId/report-cards            - Pet's reports
GET    /api/reservations/:id/report-cards       - Reservation reports
```

### Photo Management

```
POST   /api/report-cards/:id/photos         - Upload photo
DELETE /api/report-cards/:id/photos/:photoId - Delete photo
PATCH  /api/report-cards/:id/photos/:photoId - Update photo (caption, order)
POST   /api/report-cards/photos/bulk        - Bulk upload photos
```

### Templates

```
GET    /api/report-card-templates           - List templates
POST   /api/report-card-templates           - Create template
GET    /api/report-card-templates/:id       - Get template
PATCH  /api/report-card-templates/:id       - Update template
```

### Public Access (Customer View)

```
GET    /api/public/report-cards/:token      - View report card (public link)
POST   /api/public/report-cards/:token/view - Track view
```

## Mobile Photo Capture Flow

### Staff Mobile App Flow

1. **Quick Access**:
   - Home screen widget: "Create Report Card"
   - Bottom nav: "Reports" tab
   - From reservation: "Create Report" button

2. **Pet Selection**:
   - Search by name
   - Filter by current reservations
   - Recent pets list
   - Scan QR code on kennel

3. **Photo Capture**:
   - Native camera integration
   - Multiple photo capture
   - Instant preview
   - Edit/delete before upload
   - Auto-compress for faster upload

4. **Quick Form**:
   - Pre-filled template
   - Emoji ratings (tap to select)
   - Voice-to-text for notes
   - Auto-save drafts

5. **Send**:
   - Preview before send
   - Choose delivery method (SMS/Email/Both)
   - Schedule for later
   - Send immediately

## Bulk Generation Workflow

### End-of-Day Bulk Reports

1. **Select Pets**:
   ```
   Today's Daycare (15 dogs)
   ☑ Select All
   
   Filter: [ ] Has photos only
           [ ] Missing reports
           [ ] Needs review
   ```

2. **Apply Template**:
   ```
   Template: [Daycare Daily ▼]
   
   Auto-fill:
   ☑ Use default ratings (4/5)
   ☑ Include standard activities
   ☑ Add closing message
   ```

3. **Bulk Photo Assignment**:
   ```
   Drag photos to pets:
   
   Unassigned Photos (24):
   [📷][📷][📷][📷][📷]...
   
   Max: [📷][📷][📷]
   Bella: [📷][📷]
   Charlie: [📷][📷][📷][📷]
   ```

4. **Review & Send**:
   ```
   Ready to send: 15 reports
   Total photos: 45
   
   Delivery:
   ☑ Email (15)
   ☑ SMS (12)
   
   [Preview All] [Send All]
   ```

## Photo Storage & Optimization

### Upload Process

1. **Client-side**:
   - Compress to max 2MB per photo
   - Generate thumbnail (300x300)
   - Add EXIF data (timestamp, device)

2. **Server-side**:
   - Upload to S3/CloudStorage
   - Generate multiple sizes:
     - Thumbnail: 300x300
     - Medium: 800x800
     - Large: 1200x1200
     - Original: Stored separately
   - Extract metadata
   - Virus scan

3. **CDN Delivery**:
   - Serve via CDN
   - Lazy loading
   - Progressive JPEG
   - WebP format support

### Storage Structure

```
/report-cards/
  /{tenantId}/
    /{reportCardId}/
      /original/
        photo-1.jpg
        photo-2.jpg
      /large/
        photo-1.jpg
        photo-2.jpg
      /medium/
        photo-1.jpg
        photo-2.jpg
      /thumbnails/
        photo-1.jpg
        photo-2.jpg
```

## Notification Strategy

### SMS Notifications

**Immediate** (within 5 minutes):
- Photo uploaded
- Report card sent

**Format**:
- Max 160 characters
- Include pet name
- Link to full report
- Emoji for engagement

**Provider**: Twilio
- MMS support for photos
- Delivery tracking
- Opt-out handling

### Email Notifications

**Immediate**:
- Full report with photos
- Rich HTML template
- Responsive design
- Download photos option

**Provider**: SendGrid
- Template management
- Open/click tracking
- Bounce handling
- Unsubscribe management

## Customer Portal

### Report Card History

```
┌────────────────────────────────┐
│  Max's Report Cards            │
├────────────────────────────────┤
│                                │
│  [Filter: All ▼] [Search]     │
│                                │
│  ┌──────────────────────────┐ │
│  │ Nov 15, 2025             │ │
│  │ Daycare Daily            │ │
│  │ [📷][📷][📷]            │ │
│  │ Mood: ⭐⭐⭐⭐⭐        │ │
│  │ "Great day playing!"     │ │
│  │ [View Full Report]       │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │ Nov 14, 2025             │ │
│  │ Daycare Daily            │ │
│  │ [📷][📷]                │ │
│  │ Mood: ⭐⭐⭐⭐          │ │
│  │ [View Full Report]       │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

### Full Report View

```
┌────────────────────────────────┐
│  🐾 Max's Report Card          │
│  November 15, 2025             │
├────────────────────────────────┤
│                                │
│  [Photo Gallery - Swipeable]   │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │      [Large Photo]       │ │
│  │                          │ │
│  └──────────────────────────┘ │
│  ● ○ ○                        │
│                                │
│  Overall: ⭐⭐⭐⭐⭐          │
│                                │
│  Mood: 😊😊😊😊😊            │
│  Energy: ⚡⚡⚡⚡              │
│  Appetite: 🍖🍖🍖🍖🍖        │
│  Social: 👥👥👥👥👥          │
│                                │
│  Activities:                   │
│  • Morning playtime            │
│  • Lunch (ate everything!)     │
│  • Afternoon nap               │
│                                │
│  Staff Notes:                  │
│  "Max had a wonderful day..."  │
│                                │
│  [Download Photos]             │
│  [Share Report]                │
└────────────────────────────────┘
```

## Analytics & Insights

### Staff Dashboard

```
Report Card Metrics:
- Reports sent today: 45
- Average time to create: 3 min
- Photos uploaded: 156
- Customer views: 89%
- Response rate: 23%
```

### Customer Insights

```
Max's Trends:
- Average mood: 4.8/5 ⭐
- Most active: Mornings
- Favorite activity: Fetch
- Total reports: 47
- Total photos: 142
```

## Implementation Phases

### Phase 1: Core Functionality (Week 1-2)
- [ ] Database schema & migration
- [ ] Basic CRUD API
- [ ] Photo upload (single)
- [ ] Simple report creation form
- [ ] Email delivery

### Phase 2: Mobile Experience (Week 3-4)
- [ ] Mobile-optimized UI
- [ ] Camera integration
- [ ] Quick create flow
- [ ] SMS delivery
- [ ] Photo optimization

### Phase 3: Bulk & Templates (Week 5-6)
- [ ] Bulk report generation
- [ ] Template system
- [ ] Bulk photo upload
- [ ] Staff efficiency tools

### Phase 4: Customer Portal (Week 7-8)
- [ ] Public report viewing
- [ ] Customer dashboard
- [ ] Report history
- [ ] Photo downloads
- [ ] Sharing features

### Phase 5: Advanced Features (Week 9-10)
- [ ] Scheduled reports
- [ ] Analytics dashboard
- [ ] Automated insights
- [ ] Video support
- [ ] Voice notes

## Success Metrics

### Operational
- Average report creation time < 3 minutes
- 90%+ of pets get daily reports
- 95%+ delivery success rate
- < 5% customer complaints

### Engagement
- 80%+ email open rate
- 60%+ SMS click rate
- 50%+ report views within 24 hours
- 20%+ customer responses

### Business Impact
- Increased customer satisfaction
- Higher rebooking rates
- Positive reviews mentioning reports
- Competitive differentiation

## Technical Considerations

### Performance
- Image optimization pipeline
- CDN for photo delivery
- Async processing for bulk operations
- Queue system for notifications

### Security
- Secure photo storage (S3 with encryption)
- Public link tokens (expiring)
- Customer data privacy
- Staff permissions

### Scalability
- Handle 1000+ reports/day
- Support 10,000+ photos/day
- Bulk operations for 100+ pets
- Real-time photo uploads

## Future Enhancements

- Video clips support
- Live streaming from kennels
- Automated photo recognition (tag pets)
- AI-generated report summaries
- Integration with kennel cameras
- Parent response/reactions
- Photo contests/galleries
- Printed report cards (mail)
- Mobile app push notifications
- Voice-recorded messages from staff
