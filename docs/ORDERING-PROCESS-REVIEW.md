# Ordering Process Review

> **Created**: November 25, 2025  
> **Purpose**: Audit current booking/reservation flow and identify improvements

---

## 📊 Executive Summary

### Current State

The system has **two separate booking flows**:

1. **Staff-side ReservationForm** - Full-featured, used by staff in admin panel
2. **Customer BookingPortal** - Multi-step wizard at `/book` (partially implemented)

### Key Findings

- ✅ Customer booking portal structure exists with 6-step wizard
- ⚠️ Customer authentication is **simulated** (no real login API)
- ⚠️ No password field in customer records
- ⚠️ Booking portal may not be fully functional end-to-end
- ✅ Staff reservation form is comprehensive

---

## 🔍 Staff-Side Reservation Flow

### Location

`frontend/src/components/reservations/ReservationForm.tsx`

### Current Flow

1. **Customer Selection** - Autocomplete search
2. **Pet Selection** - Filtered by customer, supports multi-pet
3. **Service Selection** - Filtered by category (optional)
4. **Date/Time Selection** - Start and end dates with time pickers
5. **Suite/Resource Assignment** - Manual or auto-assigned
6. **Add-ons** - Optional add-on services dialog
7. **Groomer Selection** - For grooming services
8. **Notes** - Staff notes field
9. **Submit** - Creates reservation via API

### Strengths

- ✅ Comprehensive form with all fields
- ✅ Customer search with autocomplete
- ✅ Multi-pet support with suite assignments
- ✅ Add-on services integration
- ✅ Groomer/staff assignment
- ✅ Shopping cart integration
- ✅ Responsive design (mobile/tablet)

### Pain Points Identified

- ❓ No real-time availability check before submission
- ❓ Price calculation not visible during form entry
- ❓ Suite assignment happens after service selection (could be confusing)
- ❓ No deposit/payment integration in form

---

## 🌐 Customer Booking Portal

### Location

`frontend/src/pages/booking/BookingPortal.tsx`

### Route

`/book` - Public route, no staff auth required

### Current Steps (6-step wizard)

1. **Service Selection** (`ServiceSelection.tsx`) - Card-based service picker
2. **Date/Time Selection** (`DateTimeSelection.tsx`) - Calendar picker
3. **Pet Selection** (`PetSelection.tsx`) - Select from customer's pets
4. **Add-ons** (`AddOnsSelection.tsx`) - Optional add-on services
5. **Customer Info** (`CustomerInfo.tsx`) - Contact details
6. **Review & Pay** (`ReviewBooking.tsx`) - Summary and payment

### Features

- ✅ Mobile-first responsive design
- ✅ SEO meta tags (Helmet)
- ✅ Embeddable widget support (`?embedded=true`)
- ✅ Customer authentication context
- ✅ Multi-step progress indicator
- ✅ Pre-fill from URL params (`?serviceId=xxx`)

### Critical Issues

#### 1. Authentication is Simulated

```typescript
// CustomerAuthContext.tsx line 57-74
const login = async (email: string, password: string) => {
  // TODO(auth): Implement actual customer login API endpoint
  // Current: Simulated login via customer search
  const response = await customerService.searchCustomers(email, 1, 1);
  // Just finds customer by email - NO PASSWORD VERIFICATION
};
```

**Impact**: Anyone can "login" as any customer by knowing their email.

#### 2. No Customer Password Field

The `Customer` model in Prisma doesn't have a password field:

- No `password` or `passwordHash` column
- No customer authentication endpoint in backend

#### 3. Signup Not Implemented

```typescript
const signup = async (customerData: any) => {
  // TODO: Implement customer signup
  throw new Error("Signup not implemented");
};
```

#### 4. Payment Integration Missing

The `ReviewBooking.tsx` step exists but actual payment processing is not connected.

---

## 🏗️ Backend Reservation API

### Location

`services/reservation-service/src/controllers/reservation/create-reservation.controller.ts`

### Required Fields

- `customerId` - Customer ID
- `petId` - Pet ID
- `startDate` - Start date/time
- `endDate` - End date/time
- `serviceId` or `serviceType` - Service identifier

### Optional Fields

- `resourceId` - Specific kennel/suite
- `suiteType` - Type of suite (auto-determined from service)
- `status` - Reservation status
- `price` - Price override
- `deposit` - Deposit amount
- `notes` - Customer notes
- `staffNotes` - Staff notes
- `staffAssignedId` - Groomer/trainer assignment
- `addOnServices` - Array of add-on service IDs

### Features

- ✅ Tenant isolation
- ✅ Conflict detection
- ✅ Auto suite type determination
- ✅ Resource assignment
- ✅ Add-on services support

---

## 📋 Recommended Improvements

### Priority 1: Fix Customer Authentication (CRITICAL)

1. **Add password field to Customer model**

   ```prisma
   model Customer {
     // ... existing fields
     passwordHash  String?
     lastLogin     DateTime?
   }
   ```

2. **Create customer auth endpoints**

   - `POST /api/customers/auth/login` - Email/password login
   - `POST /api/customers/auth/register` - New customer signup
   - `POST /api/customers/auth/forgot-password` - Password reset
   - `POST /api/customers/auth/verify-email` - Email verification

3. **Implement JWT tokens for customers**
   - Separate from staff tokens
   - Shorter expiration for security

### Priority 2: Complete Booking Portal

1. **Test end-to-end flow**

   - Verify each step works
   - Confirm reservation is created in database
   - Check confirmation email (if SendGrid configured)

2. **Add real-time availability**

   - Show available dates/times
   - Prevent double-booking

3. **Price display**
   - Show running total as user progresses
   - Display add-on prices
   - Show any applicable discounts

### Priority 3: Payment Integration

1. **Connect CardConnect** (already configured in settings)

   - Deposit collection
   - Full payment option
   - Saved payment methods

2. **Daycare pass redemption**
   - Check if customer has passes
   - Auto-apply pass for daycare bookings

### Priority 4: Staff Flow Improvements

1. **Real-time availability in form**

   - Show which suites are available for selected dates
   - Visual calendar view

2. **Price preview**

   - Calculate and display price before submission
   - Show breakdown (base + add-ons + taxes)

3. **Quick booking from calendar**
   - Click on calendar slot to pre-fill dates
   - Drag to set duration

---

## 🧪 Testing Checklist

### Customer Portal (`/book`)

- [ ] Can access without staff login
- [ ] Service selection works
- [ ] Date picker shows availability
- [ ] Pet selection shows customer's pets
- [ ] Add-ons can be selected
- [ ] Review shows correct summary
- [ ] Booking is created successfully
- [ ] Confirmation is displayed
- [ ] Email notification sent (if configured)

### Staff Reservation Form

- [ ] Customer search works
- [ ] Pets load for selected customer
- [ ] Services filter by category
- [ ] Date/time pickers work
- [ ] Suite assignment works
- [ ] Add-ons dialog works
- [ ] Groomer selection works (for grooming)
- [ ] Form submits successfully
- [ ] Reservation appears in list

---

## 📁 File Reference

### Frontend - Customer Portal

- `frontend/src/pages/booking/BookingPortal.tsx` - Main portal
- `frontend/src/pages/booking/CustomerAuth.tsx` - Login/signup
- `frontend/src/pages/booking/steps/` - Step components
- `frontend/src/contexts/CustomerAuthContext.tsx` - Auth context

### Frontend - Staff Form

- `frontend/src/components/reservations/ReservationForm.tsx` - Main form
- `frontend/src/components/orders/ReservationCreation.tsx` - Order flow
- `frontend/src/services/reservationService.ts` - API service

### Backend

- `services/reservation-service/src/controllers/reservation/` - Controllers
- `services/reservation-service/src/routes/reservation.routes.ts` - Routes
- `services/customer/src/controllers/` - Customer controllers

---

## 🎯 Next Steps

1. **Immediate**: Test customer booking portal end-to-end
2. **This Week**: Implement customer authentication properly
3. **Next Week**: Complete payment integration
4. **Ongoing**: Gather user feedback on flow improvements
