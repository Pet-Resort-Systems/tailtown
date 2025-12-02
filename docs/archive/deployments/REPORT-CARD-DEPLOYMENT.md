# Pet Report Card System - Deployment Guide

**Last Updated**: November 15, 2025  
**Version**: 1.2.0  
**Status**: Production Ready

This guide covers deploying the Pet Report Card system to production.

---

## 📋 Prerequisites

- PostgreSQL database access
- Node.js 16+ and npm
- Prisma CLI installed
- Access to production environment variables
- (Optional) SendGrid account for email
- (Optional) Twilio account for SMS
- (Optional) S3/CloudStorage for photo storage

---

## 🚀 Quick Deployment

### 1. Database Migration

```bash
# Navigate to customer service
cd services/customer

# Apply the migration
npx prisma migrate deploy

# Verify migration
npx prisma migrate status

# Regenerate Prisma client
npx prisma generate
```

**Expected Output**:
```
✔ Migration `20251115_add_report_card_system` applied successfully
```

### 2. Restart Backend Service

```bash
# Kill existing process
pkill -f "customer.*service"

# Start service
cd services/customer
npm run dev  # or npm start for production
```

**Verify**:
```bash
# Test API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/report-cards

# Should return: {"success":true,"data":{"reportCards":[],...}}
```

### 3. Frontend Build (Production Only)

```bash
cd frontend
npm run build

# Serve built files
npm run serve
```

---

## 🗄️ Database Schema

### Tables Created

#### `report_cards`
- Primary table for pet report cards
- Stores ratings, activities, notes, delivery status
- Auto-updates `photoCount` via trigger
- Indexes on tenant, pet, customer, date, status

#### `report_card_photos`
- Stores photo URLs and metadata
- Linked to report cards with CASCADE delete
- Supports ordering and captions
- Tracks upload staff and file details

### Enums Created

- `ReportCardServiceType`: BOARDING, DAYCARE, GROOMING, TRAINING, GENERAL
- `ReportCardTemplate`: DAYCARE_DAILY, BOARDING_DAILY, BOARDING_CHECKOUT, etc.
- `ReportCardStatus`: DRAFT, PENDING_REVIEW, APPROVED, SENT, VIEWED, ARCHIVED

### Triggers

- `update_report_cards_updated_at`: Auto-update timestamp on changes
- `update_report_card_photo_count`: Auto-increment/decrement photo count

---

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Optional: Email delivery (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME="Your Pet Resort"

# Optional: SMS delivery (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Optional: Photo storage (S3)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Optional: CDN for photos
CDN_URL=https://cdn.yourdomain.com
```

### SendGrid Setup (Optional)

1. **Create Account**: https://sendgrid.com
2. **Create API Key**: Settings → API Keys → Create API Key
3. **Verify Sender**: Settings → Sender Authentication
4. **Create Template** (optional):
   - Template ID for report card emails
   - Include dynamic fields: `{{petName}}`, `{{reportUrl}}`, `{{photoCount}}`

5. **Update Controller**:
```typescript
// In reportCard.controller.ts, replace TODO with:
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const msg = {
  to: reportCard.customer.email,
  from: process.env.SENDGRID_FROM_EMAIL!,
  subject: `${reportCard.pet.name}'s Report Card`,
  html: `<h1>${reportCard.pet.name} had a great day!</h1>...`
};

await sgMail.send(msg);
```

### Twilio Setup (Optional)

1. **Create Account**: https://twilio.com
2. **Purchase Phone Number**: Phone Numbers → Buy a Number
3. **Get Credentials**: Console → Account Info
4. **Update Controller**:
```typescript
// In reportCard.controller.ts, replace TODO with:
import twilio from 'twilio';
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

await client.messages.create({
  body: `${reportCard.pet.name}'s report card is ready! View it here: ${reportUrl}`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: reportCard.customer.phone
});
```

### S3 Photo Storage (Optional)

1. **Create S3 Bucket**: AWS Console → S3 → Create Bucket
2. **Set CORS Policy**:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": []
  }
]
```

3. **Update Upload Function**:
```typescript
// In reportCardService.ts
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

async uploadFile(file: File): Promise<{ url: string; thumbnailUrl?: string }> {
  const key = `report-cards/${Date.now()}-${file.name}`;
  
  await s3.upload({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: file,
    ContentType: file.type,
    ACL: 'public-read'
  }).promise();
  
  return {
    url: `${process.env.CDN_URL}/${key}`,
    thumbnailUrl: `${process.env.CDN_URL}/${key}` // Add thumbnail generation
  };
}
```

---

## ✅ Testing Checklist

### Backend API Tests

```bash
cd services/customer
npm test -- reportCard

# Expected: All tests passing
# ✓ 15+ controller tests
# ✓ 10+ integration tests
```

### Frontend Service Tests

```bash
cd frontend
npm test -- reportCardService

# Expected: All tests passing
# ✓ 12+ service tests
```

### Manual Testing

- [ ] **Create Report Card**
  ```bash
  curl -X POST http://localhost:3001/api/report-cards \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "petId": "pet-123",
      "customerId": "customer-123",
      "serviceType": "DAYCARE",
      "moodRating": 5,
      "energyRating": 4,
      "summary": "Had a great day!"
    }'
  ```

- [ ] **Upload Photo**
  ```bash
  curl -X POST http://localhost:3001/api/report-cards/REPORT_ID/photos \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "url": "https://example.com/photo.jpg",
      "caption": "Playing fetch!"
    }'
  ```

- [ ] **Send Report Card**
  ```bash
  curl -X POST http://localhost:3001/api/report-cards/REPORT_ID/send \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"sendEmail": true, "sendSMS": true}'
  ```

- [ ] **Mobile App**: Navigate to `/mobile/report-cards`
- [ ] **Photo Upload**: Test camera integration
- [ ] **Bulk Create**: Create multiple reports at once
- [ ] **View Tracking**: Verify view count increments

---

## 📊 Monitoring

### Key Metrics to Track

```sql
-- Total reports created today
SELECT COUNT(*) FROM report_cards 
WHERE "reportDate" >= CURRENT_DATE;

-- Reports by status
SELECT status, COUNT(*) 
FROM report_cards 
GROUP BY status;

-- Average photos per report
SELECT AVG("photoCount") FROM report_cards;

-- Most active staff
SELECT "createdByStaffId", COUNT(*) as reports_created
FROM report_cards
GROUP BY "createdByStaffId"
ORDER BY reports_created DESC
LIMIT 10;

-- Delivery success rate
SELECT 
  COUNT(*) FILTER (WHERE "sentViaEmail" = true) as email_sent,
  COUNT(*) FILTER (WHERE "sentViaSMS" = true) as sms_sent,
  COUNT(*) as total
FROM report_cards
WHERE status = 'SENT';
```

### Performance Monitoring

- Monitor API response times (target: <200ms)
- Track photo upload times
- Monitor database query performance
- Watch for failed email/SMS deliveries

---

## 🐛 Troubleshooting

### Migration Fails

**Error**: `relation "report_cards" already exists`

**Solution**:
```bash
# Check migration status
npx prisma migrate status

# If migration is marked as failed
npx prisma migrate resolve --rolled-back 20251115_add_report_card_system

# Re-run migration
npx prisma migrate deploy
```

### Prisma Client Errors

**Error**: `Property 'reportCard' does not exist on type 'PrismaClient'`

**Solution**:
```bash
# Regenerate Prisma client
cd services/customer
npx prisma generate

# Restart TypeScript server in your IDE
```

### Photos Not Uploading

**Check**:
1. File size limits (default: 10MB)
2. CORS configuration
3. S3 bucket permissions
4. Network connectivity

**Debug**:
```javascript
// Add logging in reportCardService.ts
console.log('Uploading file:', file.name, file.size, file.type);
```

### Email/SMS Not Sending

**Check**:
1. Environment variables are set
2. SendGrid/Twilio credentials are valid
3. Sender email is verified
4. Phone number format is correct (+1XXXXXXXXXX)

**Debug**:
```javascript
// Check console logs in reportCard.controller.ts
console.log('[EMAIL] Sending to:', customer.email);
console.log('[SMS] Sending to:', customer.phone);
```

### Mobile Camera Not Working

**Check**:
1. HTTPS is enabled (camera requires secure context)
2. Browser permissions granted
3. Device has camera
4. `capture="environment"` attribute is present

---

## 🔄 Rollback Plan

If issues arise, rollback the migration:

```bash
# 1. Backup data (if any reports created)
pg_dump -t report_cards -t report_card_photos > backup.sql

# 2. Drop tables
psql -d customer -c "DROP TABLE IF EXISTS report_card_photos CASCADE;"
psql -d customer -c "DROP TABLE IF EXISTS report_cards CASCADE;"

# 3. Drop enums
psql -d customer -c "DROP TYPE IF EXISTS \"ReportCardServiceType\" CASCADE;"
psql -d customer -c "DROP TYPE IF EXISTS \"ReportCardTemplate\" CASCADE;"
psql -d customer -c "DROP TYPE IF EXISTS \"ReportCardStatus\" CASCADE;"

# 4. Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20251115_add_report_card_system

# 5. Restart service
```

---

## 📚 Additional Resources

- [REPORT-CARD-DESIGN.md](./REPORT-CARD-DESIGN.md) - Full design specification
- [ROADMAP.md](./ROADMAP.md) - Feature roadmap and status
- [TWILIO-SENDGRID-SETUP.md](./TWILIO-SENDGRID-SETUP.md) - Communication setup guide

---

## ✅ Post-Deployment Checklist

- [ ] Database migration applied successfully
- [ ] Prisma client regenerated
- [ ] Backend service restarted
- [ ] API endpoints responding
- [ ] Frontend built and deployed
- [ ] Mobile app accessible
- [ ] Tests passing
- [ ] Environment variables configured
- [ ] SendGrid/Twilio tested (if applicable)
- [ ] S3 storage tested (if applicable)
- [ ] Monitoring dashboards updated
- [ ] Team trained on new feature
- [ ] Documentation shared with staff

---

**Deployment Complete!** 🎉

The Pet Report Card system is now live and ready to delight customers with beautiful updates about their pets.

For support, see troubleshooting section above or contact the development team.
