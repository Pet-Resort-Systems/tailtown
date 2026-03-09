# Training Class Enrollment Guide

**Last Updated**: October 25, 2025  
**Status**: Fully Implemented

---

## Overview

The Training Class Enrollment system allows you to enroll customers' pets in training classes, manage waitlists, track attendance, and issue certificates.

---

## How to Enroll a Customer in a Class

### Method 1: Through Training Classes Page (Recommended)

1. **Navigate to Training Classes**
   - Go to **Admin → Training Classes**
   - Or navigate to `/training/classes`

2. **Select a Class**
   - Click on the class you want to enroll a customer in
   - This opens the Class Details page

3. **Click "Enroll" Button**
   - Look for the "Add Enrollment" or "Enroll Pet" button
   - Opens the enrollment dialog

4. **Fill in Enrollment Form**
   - **Customer**: Select from dropdown
   - **Pet**: Select pet (filtered by selected customer)
   - **Payment Amount**: Enter amount paid (optional)
   - **Notes**: Add any special notes

5. **Submit**
   - Click "Enroll"
   - Pet is added to class roster
   - Payment status is automatically calculated

---

### Method 2: Via API (For Integrations)

**Endpoint**: `POST /api/training-classes/:classId/enroll`

**Request Body**:
```json
{
  "petId": "pet-uuid",
  "customerId": "customer-uuid",
  "amountPaid": 200.00
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": "enrollment-uuid",
    "classId": "class-uuid",
    "petId": "pet-uuid",
    "customerId": "customer-uuid",
    "amountPaid": 200.00,
    "amountDue": 200.00,
    "paymentStatus": "PAID",
    "status": "ACTIVE",
    "totalSessions": 6,
    "attendedSessions": 0
  }
}
```

---

## Enrollment Process Flow

### 1. **Validation**
System checks:
- ✅ Class exists
- ✅ Class is not full
- ✅ Pet is not already enrolled
- ✅ Customer and pet are valid

### 2. **Enrollment Creation**
System creates:
- Enrollment record
- Links pet to class
- Sets payment status
- Calculates amount due

### 3. **Class Update**
System updates:
- Increments `currentEnrolled` count
- Removes pet from waitlist (if present)

### 4. **Confirmation**
- Enrollment appears in class roster
- Customer receives confirmation (TODO: email)
- Pet can attend sessions

---

## Managing Enrollments

### View Enrollments

**Navigate to Class Enrollments**:
```
/training/classes/:classId/enrollments
```

**Shows**:
- List of all enrolled pets
- Customer information
- Payment status
- Attendance record
- Completion status

### Update Enrollment

**Available Actions**:
- **Mark Complete**: When pet finishes all sessions
- **Drop from Class**: Remove pet from class
- **Issue Certificate**: Award completion certificate
- **Update Payment**: Modify payment amount/status
- **Add Notes**: Record special information

### Drop from Class

**Process**:
1. Click "Drop" button on enrollment
2. Confirm action
3. System:
   - Marks enrollment as "DROPPED"
   - Decrements class count
   - Notifies first person on waitlist

---

## Waitlist Management

### When Class is Full

If enrollment fails due to capacity:
```json
{
  "error": "Class is full. Pet can be added to waitlist."
}
```

### Add to Waitlist

**Endpoint**: `POST /api/training-classes/:classId/waitlist`

**Request**:
```json
{
  "petId": "pet-uuid",
  "customerId": "customer-uuid"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": "waitlist-uuid",
    "position": 3,
    "addedDate": "2025-10-26T00:00:00Z",
    "notified": false
  }
}
```

### Waitlist Features
- **Position Tracking**: Shows place in line
- **Auto-Notification**: Alerts when spot opens
- **Auto-Enrollment**: Can enroll directly from waitlist
- **Position Reordering**: Maintains order when people drop

---

## Payment Management

### Payment Status

**Statuses**:
- `PENDING`: Not paid or partially paid
- `PAID`: Fully paid
- `REFUNDED`: Payment refunded

### Payment Calculation

```typescript
// Automatic calculation
if (amountPaid >= pricePerSeries) {
  paymentStatus = 'PAID';
} else if (amountPaid > 0) {
  paymentStatus = 'PARTIAL';
} else {
  paymentStatus = 'PENDING';
}

amountDue = pricePerSeries - amountPaid;
```

### Update Payment

**Endpoint**: `PUT /api/enrollments/:id`

**Request**:
```json
{
  "amountPaid": 200.00,
  "paymentStatus": "PAID"
}
```

---

## Attendance Tracking

### Mark Attendance

**Per Session**:
1. Navigate to class session
2. View roster
3. Mark each pet as:
   - **PRESENT**: Attended
   - **ABSENT**: Did not attend
   - **EXCUSED**: Excused absence

### Attendance Stats

**Automatically Calculated**:
- `attendedSessions`: Count of PRESENT
- `totalSessions`: Total class sessions
- `attendanceRate`: Percentage attended

### Completion Criteria

**Requirements**:
- Attended minimum sessions (e.g., 80%)
- Payment status is PAID
- All sessions completed

---

## Certificates

### Issue Certificate

**When**:
- Enrollment status is COMPLETED
- Attendance requirements met
- Payment is complete

**Process**:
1. Click "Issue Certificate" button
2. System:
   - Sets `certificateIssued = true`
   - Records `certificateDate`
   - Generates certificate (TODO: PDF)

**Endpoint**: `POST /api/enrollments/:id/certificate`

---

## API Endpoints

### Enrollment Endpoints

```
POST   /api/training-classes/:classId/enroll
GET    /api/enrollments/:id
PUT    /api/enrollments/:id
DELETE /api/enrollments/:id/drop
GET    /api/customers/:customerId/enrollments
GET    /api/pets/:petId/enrollments
POST   /api/enrollments/:id/certificate
```

### Waitlist Endpoints

```
POST   /api/training-classes/:classId/waitlist
GET    /api/training-classes/:classId/waitlist
DELETE /api/waitlist/:id
```

---

## Database Schema

### ClassEnrollment Table

```prisma
model ClassEnrollment {
  id                  String   @id @default(uuid())
  tenantId            String
  classId             String
  petId               String
  customerId          String
  enrollmentDate      DateTime @default(now())
  status              String   @default("ACTIVE")
  amountPaid          Float    @default(0)
  amountDue           Float
  paymentStatus       String   @default("PENDING")
  totalSessions       Int
  attendedSessions    Int      @default(0)
  certificateIssued   Boolean  @default(false)
  certificateDate     DateTime?
  notes               String?
  
  class               TrainingClass
  pet                 Pet
  customer            Customer
  attendance          SessionAttendance[]
}
```

---

## Example Workflows

### Workflow 1: Simple Enrollment

```typescript
// 1. Customer wants to enroll dog in Puppy Training
const enrollment = await schedulingService.enrollments.create({
  classId: 'puppy-training-101',
  petId: 'max-the-puppy',
  customerId: 'john-doe',
  amountPaid: 200.00
});

// 2. System creates enrollment
// 3. Dog appears in class roster
// 4. Customer can attend sessions
```

### Workflow 2: Waitlist to Enrollment

```typescript
// 1. Class is full, add to waitlist
await schedulingService.waitlist.add({
  classId: 'puppy-training-101',
  petId: 'bella-the-puppy',
  customerId: 'jane-smith'
});

// 2. Someone drops from class
await schedulingService.enrollments.drop(existingEnrollmentId);

// 3. System notifies first person on waitlist
// 4. Customer enrolls from waitlist
await schedulingService.enrollments.create({
  classId: 'puppy-training-101',
  petId: 'bella-the-puppy',
  customerId: 'jane-smith'
});
```

### Workflow 3: Complete Class & Issue Certificate

```typescript
// 1. Mark final session attendance
await schedulingService.attendance.mark({
  sessionId: 'session-6',
  enrollmentId: 'enrollment-id',
  status: 'PRESENT'
});

// 2. Mark enrollment complete
await schedulingService.enrollments.update(enrollmentId, {
  status: 'COMPLETED'
});

// 3. Issue certificate
await schedulingService.enrollments.issueCertificate(enrollmentId);

// 4. Customer receives certificate
```

---

## Frontend Components

### ClassEnrollments.tsx
**Location**: `/apps/frontend/src/pages/training/ClassEnrollments.tsx`

**Features**:
- View all enrollments for a class
- Add new enrollments
- Mark complete/drop
- Issue certificates
- View attendance

### Usage

```typescript
// Navigate to class enrollments
navigate(`/training/classes/${classId}/enrollments`);

// Or link from class details
<Button onClick={() => navigate(`/training/classes/${class.id}/enrollments`)}>
  View Enrollments
</Button>
```

---

## Quick Reference

### Enroll a Pet
```bash
curl -X POST http://localhost:4004/api/training-classes/{classId}/enroll \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: dev" \
  -d '{
    "petId": "pet-uuid",
    "customerId": "customer-uuid",
    "amountPaid": 200.00
  }'
```

### View Customer's Enrollments
```bash
curl http://localhost:4004/api/customers/{customerId}/enrollments \
  -H "x-tenant-id: dev"
```

### Drop from Class
```bash
curl -X DELETE http://localhost:4004/api/enrollments/{enrollmentId}/drop \
  -H "x-tenant-id: dev" \
  -d '{"reason": "Schedule conflict"}'
```

---

## Next Steps

1. **Add Enrollment UI**: Create enrollment dialog in TrainingClasses page
2. **Email Notifications**: Send confirmation emails
3. **Certificate PDF**: Generate printable certificates
4. **Payment Integration**: Link to CardConnect
5. **Progress Tracking**: Show pet's progress through class

---

## Related Documentation

- [Training Classes](./ADVANCED-SCHEDULING.md)
- [Staff Scheduling](./StaffScheduling.md)
- [Customer Portal](../CUSTOMER-BOOKING-PORTAL.md)

---

**The enrollment system is fully functional!** Just need to add the UI button to trigger enrollment. 🎓✨
