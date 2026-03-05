/**
 * Critical Path E2E Tests
 * Tests the most important user workflows for each service type
 * 
 * These tests ensure that core business operations work end-to-end:
 * 1. Boarding Reservation
 * 2. Daycare Booking
 * 3. Training Class Enrollment
 * 4. Grooming Appointment
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.REACT_APP_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4004';

// Test credentials
const ADMIN_EMAIL = 'admin@tailtown.com';
const ADMIN_PASSWORD = 'admin123';

// Helper function to login
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

// Helper function to select a customer
async function selectCustomer(page: Page, customerName: string) {
  await page.click('input[placeholder*="customer" i]');
  await page.fill('input[placeholder*="customer" i]', customerName);
  await page.waitForTimeout(500); // Wait for autocomplete
  await page.click(`text=${customerName}`);
}

// Helper function to select a pet
async function selectPet(page: Page, petName: string) {
  await page.click(`text=${petName}`);
}

test.describe('Critical Path: Boarding Reservation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a complete boarding reservation', async ({ page }) => {
    // Step 1: Navigate to reservations
    await page.click('text=Reservations');
    await expect(page).toHaveURL(/.*reservations/);

    // Step 2: Click "New Reservation"
    await page.click('button:has-text("New Reservation")');

    // Step 3: Select customer
    await selectCustomer(page, 'Test Customer');
    await expect(page.locator('text=Test Customer')).toBeVisible();

    // Step 4: Select pet
    await selectPet(page, 'Buddy');
    await expect(page.locator('text=Buddy')).toBeVisible();

    // Step 5: Select service (Boarding)
    await page.click('text=Boarding');
    await expect(page.locator('.selected:has-text("Boarding")')).toBeVisible();

    // Step 6: Select dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await page.fill('input[name="startDate"]', tomorrow.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', nextWeek.toISOString().split('T')[0]);

    // Step 7: Select suite
    await page.click('button:has-text("Select Suite")');
    await page.click('text=Standard Suite'); // Select first available
    await expect(page.locator('text=Standard Suite')).toBeVisible();

    // Step 8: Add optional services
    await page.click('button:has-text("Add Services")');
    await page.click('text=Extra Playtime');
    await page.click('button:has-text("Add")');

    // Step 9: Review and confirm
    await page.click('button:has-text("Review")');
    await expect(page.locator('text=Review Reservation')).toBeVisible();
    
    // Verify details
    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=Boarding')).toBeVisible();
    await expect(page.locator('text=Standard Suite')).toBeVisible();

    // Step 10: Confirm reservation
    await page.click('button:has-text("Confirm Reservation")');

    // Step 11: Verify success
    await expect(page.locator('text=Reservation Created Successfully')).toBeVisible();
    await expect(page.locator('text=Confirmation')).toBeVisible();

    // Step 12: Verify reservation appears in list
    await page.click('text=Reservations');
    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=CONFIRMED')).toBeVisible();
  });

  test('should prevent double-booking of suite', async ({ page }) => {
    // Try to book the same suite for overlapping dates
    await page.goto(`${BASE_URL}/reservations/new`);
    
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Max');
    await page.click('text=Boarding');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await page.fill('input[name="startDate"]', tomorrow.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', nextWeek.toISOString().split('T')[0]);

    // Try to select the same suite that's already booked
    await page.click('button:has-text("Select Suite")');
    
    // Should show suite as unavailable or not in list
    const unavailableSuites = await page.locator('text=Unavailable').count();
    expect(unavailableSuites).toBeGreaterThan(0);
  });
});

test.describe('Critical Path: Daycare Booking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a daycare reservation', async ({ page }) => {
    // Step 1: Navigate to calendar
    await page.click('text=Calendar');
    await expect(page).toHaveURL(/.*calendar/);

    // Step 2: Click on today's date
    const today = new Date();
    await page.click(`[data-date="${today.toISOString().split('T')[0]}"]`);

    // Step 3: Select "New Reservation"
    await page.click('button:has-text("New Reservation")');

    // Step 4: Select customer and pet
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');

    // Step 5: Select Daycare service
    await page.click('text=Daycare');
    await expect(page.locator('.selected:has-text("Daycare")')).toBeVisible();

    // Step 6: Select time
    await page.selectOption('select[name="checkInTime"]', '08:00');
    await page.selectOption('select[name="checkOutTime"]', '17:00');

    // Step 7: Confirm
    await page.click('button:has-text("Confirm")');

    // Step 8: Verify success
    await expect(page.locator('text=Daycare Reservation Created')).toBeVisible();

    // Step 9: Verify appears on calendar
    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=Daycare')).toBeVisible();
  });

  test('should purchase and use daycare package', async ({ page }) => {
    // Step 1: Navigate to customer details
    await page.goto(`${BASE_URL}/customers`);
    await page.click('text=Test Customer');

    // Step 2: Purchase package
    await page.click('button:has-text("Purchase Package")');
    await page.click('text=10-Day Daycare Package');
    await page.click('button:has-text("Purchase")');

    // Step 3: Verify package appears
    await expect(page.locator('text=10-Day Package')).toBeVisible();
    await expect(page.locator('text=10 remaining')).toBeVisible();

    // Step 4: Use package for daycare
    await page.click('text=Calendar');
    const today = new Date();
    await page.click(`[data-date="${today.toISOString().split('T')[0]}"]`);
    await page.click('button:has-text("New Reservation")');
    
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');
    await page.click('text=Daycare');
    
    // Should show option to use package
    await expect(page.locator('text=Use Package')).toBeVisible();
    await page.click('input[type="checkbox"][name="usePackage"]');
    
    await page.click('button:has-text("Confirm")');

    // Step 5: Verify package balance decreased
    await page.goto(`${BASE_URL}/customers`);
    await page.click('text=Test Customer');
    await expect(page.locator('text=9 remaining')).toBeVisible();
  });
});

test.describe('Critical Path: Training Class Enrollment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should enroll pet in training class', async ({ page }) => {
    // Step 1: Navigate to training classes
    await page.click('text=Training');
    await expect(page).toHaveURL(/.*training/);

    // Step 2: View available classes
    await expect(page.locator('text=Available Classes')).toBeVisible();

    // Step 3: Select a class
    await page.click('text=Basic Obedience');
    await expect(page.locator('text=Class Details')).toBeVisible();

    // Step 4: Click "Enroll"
    await page.click('button:has-text("Enroll")');

    // Step 5: Select customer and pet
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');

    // Step 6: Review class schedule
    await expect(page.locator('text=Class Schedule')).toBeVisible();
    await expect(page.locator('text=6 sessions')).toBeVisible();

    // Step 7: Select payment option
    await page.click('text=Pay in Full');
    await expect(page.locator('text=Total: $')).toBeVisible();

    // Step 8: Confirm enrollment
    await page.click('button:has-text("Confirm Enrollment")');

    // Step 9: Verify success
    await expect(page.locator('text=Enrollment Successful')).toBeVisible();
    await expect(page.locator('text=Class Schedule Sent')).toBeVisible();

    // Step 10: Verify enrollment appears in customer's classes
    await page.goto(`${BASE_URL}/customers`);
    await page.click('text=Test Customer');
    await page.click('text=Training Classes');
    await expect(page.locator('text=Basic Obedience')).toBeVisible();
    await expect(page.locator('text=Enrolled')).toBeVisible();
  });

  test('should handle full class with waitlist', async ({ page }) => {
    // Navigate to a full class
    await page.goto(`${BASE_URL}/training`);
    await page.click('text=Advanced Agility'); // Assume this is full

    // Should show "Class Full" message
    await expect(page.locator('text=Class Full')).toBeVisible();

    // Should show "Join Waitlist" option
    await expect(page.locator('button:has-text("Join Waitlist")')).toBeVisible();

    // Join waitlist
    await page.click('button:has-text("Join Waitlist")');
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Max');
    await page.click('button:has-text("Confirm")');

    // Verify added to waitlist
    await expect(page.locator('text=Added to Waitlist')).toBeVisible();
    await expect(page.locator('text=You will be notified')).toBeVisible();
  });
});

test.describe('Critical Path: Grooming Appointment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should book a grooming appointment', async ({ page }) => {
    // Step 1: Navigate to grooming calendar
    await page.click('text=Calendar');
    await page.click('text=Grooming');
    await expect(page).toHaveURL(/.*grooming/);

    // Step 2: Select date and time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`);
    await page.click('text=10:00 AM'); // Select time slot

    // Step 3: Select customer and pet
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');

    // Step 4: Select grooming services
    await page.click('text=Full Groom');
    await page.click('text=Nail Trim');
    await page.click('text=Teeth Brushing');

    // Step 5: Select groomer (or auto-assign)
    await page.click('button:has-text("Select Groomer")');
    await page.click('text=Sarah Johnson'); // Select available groomer

    // Step 6: Review appointment
    await expect(page.locator('text=Appointment Summary')).toBeVisible();
    await expect(page.locator('text=Full Groom')).toBeVisible();
    await expect(page.locator('text=Nail Trim')).toBeVisible();
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();

    // Step 7: Confirm appointment
    await page.click('button:has-text("Confirm Appointment")');

    // Step 8: Verify success
    await expect(page.locator('text=Appointment Booked')).toBeVisible();
    await expect(page.locator('text=Confirmation sent')).toBeVisible();

    // Step 9: Verify appointment appears on calendar
    await page.goto(`${BASE_URL}/calendar/grooming`);
    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();
  });

  test('should prevent double-booking groomer', async ({ page }) => {
    // Book first appointment
    await page.goto(`${BASE_URL}/calendar/grooming`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`);
    await page.click('text=10:00 AM');

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');
    await page.click('text=Full Groom');
    await page.click('button:has-text("Select Groomer")');
    await page.click('text=Sarah Johnson');
    await page.click('button:has-text("Confirm Appointment")');

    // Try to book second appointment at same time
    await page.goto(`${BASE_URL}/calendar/grooming`);
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`);
    await page.click('text=10:00 AM');

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Max');
    await page.click('text=Bath Only');
    await page.click('button:has-text("Select Groomer")');

    // Sarah Johnson should not be available or show as unavailable
    const sarahAvailable = await page.locator('text=Sarah Johnson:not(.unavailable)').count();
    expect(sarahAvailable).toBe(0);
  });
});

test.describe('Critical Path: Check-In and Check-Out', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should check-in pet for boarding', async ({ page }) => {
    // Assume we have a reservation for today
    await page.goto(`${BASE_URL}/reservations`);
    
    // Find reservation with status CONFIRMED
    await page.click('text=CONFIRMED');
    
    // Click check-in button
    await page.click('button:has-text("Check In")');

    // Complete check-in form
    await expect(page.locator('text=Check-In')).toBeVisible();
    await page.fill('textarea[name="notes"]', 'Pet is in good health');
    await page.click('input[type="checkbox"][name="vaccinationsVerified"]');
    await page.click('input[type="checkbox"][name="emergencyContactVerified"]');

    // Confirm check-in
    await page.click('button:has-text("Complete Check-In")');

    // Verify status changed
    await expect(page.locator('text=CHECKED_IN')).toBeVisible();
    await expect(page.locator('text=Check-In Successful')).toBeVisible();
  });

  test('should check-out pet and process payment', async ({ page }) => {
    // Find checked-in reservation
    await page.goto(`${BASE_URL}/reservations`);
    await page.click('text=CHECKED_IN');

    // Click check-out button
    await page.click('button:has-text("Check Out")');

    // Review charges
    await expect(page.locator('text=Check-Out Summary')).toBeVisible();
    await expect(page.locator('text=Boarding')).toBeVisible();
    await expect(page.locator('text=Total:')).toBeVisible();

    // Add any additional charges
    await page.click('button:has-text("Add Charges")');
    await page.click('text=Extra Playtime');
    await page.click('button:has-text("Add")');

    // Process payment
    await page.click('button:has-text("Process Payment")');
    await page.selectOption('select[name="paymentMethod"]', 'CREDIT_CARD');
    await page.click('button:has-text("Complete Payment")');

    // Verify check-out complete
    await expect(page.locator('text=Check-Out Complete')).toBeVisible();
    await expect(page.locator('text=COMPLETED')).toBeVisible();
  });
});

test.describe('Critical Path: Multi-Service Booking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should book grooming during boarding stay', async ({ page }) => {
    // Step 1: Create boarding reservation
    await page.goto(`${BASE_URL}/reservations/new`);
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');
    await page.click('text=Boarding');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await page.fill('input[name="startDate"]', tomorrow.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', nextWeek.toISOString().split('T')[0]);
    await page.click('button:has-text("Select Suite")');
    await page.click('text=Standard Suite');
    await page.click('button:has-text("Confirm Reservation")');

    // Step 2: Add grooming during stay
    await page.click('button:has-text("Add Services")');
    await page.click('text=Grooming');
    
    // Select date during boarding stay
    const midStay = new Date(tomorrow);
    midStay.setDate(midStay.getDate() + 3);
    await page.click(`[data-date="${midStay.toISOString().split('T')[0]}"]`);
    await page.click('text=Full Groom');
    await page.click('button:has-text("Add to Reservation")');

    // Step 3: Verify both services appear
    await expect(page.locator('text=Boarding')).toBeVisible();
    await expect(page.locator('text=Grooming')).toBeVisible();
    await expect(page.locator('text=During Stay')).toBeVisible();
  });
});
