import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4004';

const ADMIN_EMAIL = 'admin@tailtown.com';
const ADMIN_PASSWORD = 'admin123';

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page
    .getByLabel('Email Address')
    .or(page.locator('input[name="email"]'))
    .first()
    .fill(ADMIN_EMAIL);
  await page
    .getByLabel('Password')
    .or(page.locator('input[name="password"]'))
    .first()
    .fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

async function selectCustomer(page: Page, customerName: string) {
  await page.click('input[placeholder*="customer" i]');
  await page.fill('input[placeholder*="customer" i]', customerName);
  await page.waitForTimeout(500);
  await page.click(`text=${customerName}`);
}

async function selectPet(page: Page, petName: string) {
  await page.click(`text=${petName}`);
}

test.describe('Critical Path: Boarding Reservation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a complete boarding reservation', async ({ page }) => {
    await page.click('text=Reservations');
    await expect(page).toHaveURL(/.*reservations/);

    await page.click('button:has-text("New Reservation")');

    await selectCustomer(page, 'Test Customer');
    await expect(page.locator('text=Test Customer')).toBeVisible();

    await selectPet(page, 'Buddy');
    await expect(page.locator('text=Buddy')).toBeVisible();

    await page.click('text=Boarding');
    await expect(page.locator('.selected:has-text("Boarding")')).toBeVisible();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await page.fill(
      'input[name="startDate"]',
      tomorrow.toISOString().split('T')[0]
    );
    await page.fill(
      'input[name="endDate"]',
      nextWeek.toISOString().split('T')[0]
    );

    await page.click('button:has-text("Select Suite")');
    await page.click('text=Standard Suite');
    await expect(page.locator('text=Standard Suite')).toBeVisible();

    await page.click('button:has-text("Add Services")');
    await page.click('text=Extra Playtime');
    await page.click('button:has-text("Add")');

    await page.click('button:has-text("Review")');
    await expect(page.locator('text=Review Reservation')).toBeVisible();

    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=Boarding')).toBeVisible();
    await expect(page.locator('text=Standard Suite')).toBeVisible();

    await page.click('button:has-text("Confirm Reservation")');

    await expect(
      page.locator('text=Reservation Created Successfully')
    ).toBeVisible();
    await expect(page.locator('text=Confirmation')).toBeVisible();

    await page.click('text=Reservations');
    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=CONFIRMED')).toBeVisible();
  });

  test('should prevent double-booking of suite', async ({ page }) => {
    await page.goto(`${BASE_URL}/reservations/new`);

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Max');
    await page.click('text=Boarding');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await page.fill(
      'input[name="startDate"]',
      tomorrow.toISOString().split('T')[0]
    );
    await page.fill(
      'input[name="endDate"]',
      nextWeek.toISOString().split('T')[0]
    );

    await page.click('button:has-text("Select Suite")');

    const unavailableSuites = await page.locator('text=Unavailable').count();
    expect(unavailableSuites).toBeGreaterThan(0);
  });
});

test.describe('Critical Path: Daycare Booking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a daycare reservation', async ({ page }) => {
    await page.click('text=Calendar');
    await expect(page).toHaveURL(/.*calendar/);

    const today = new Date();
    await page.click(`[data-date="${today.toISOString().split('T')[0]}"]`);

    await page.click('button:has-text("New Reservation")');

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');

    await page.click('text=Daycare');
    await expect(page.locator('.selected:has-text("Daycare")')).toBeVisible();

    await page.selectOption('select[name="checkInTime"]', '08:00');
    await page.selectOption('select[name="checkOutTime"]', '17:00');

    await page.click('button:has-text("Confirm")');

    await expect(
      page.locator('text=Daycare Reservation Created')
    ).toBeVisible();

    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=Daycare')).toBeVisible();
  });

  test('should purchase and use daycare package', async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.click('text=Test Customer');

    await page.click('button:has-text("Purchase Package")');
    await page.click('text=10-Day Daycare Package');
    await page.click('button:has-text("Purchase")');

    await expect(page.locator('text=10-Day Package')).toBeVisible();
    await expect(page.locator('text=10 remaining')).toBeVisible();

    await page.click('text=Calendar');
    const today = new Date();
    await page.click(`[data-date="${today.toISOString().split('T')[0]}"]`);
    await page.click('button:has-text("New Reservation")');

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');
    await page.click('text=Daycare');

    await expect(page.locator('text=Use Package')).toBeVisible();
    await page.click('input[type="checkbox"][name="usePackage"]');

    await page.click('button:has-text("Confirm")');

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
    await page.click('text=Training');
    await expect(page).toHaveURL(/.*training/);

    await expect(page.locator('text=Available Classes')).toBeVisible();

    await page.click('text=Basic Obedience');
    await expect(page.locator('text=Class Details')).toBeVisible();

    await page.click('button:has-text("Enroll")');

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');

    await expect(page.locator('text=Class Schedule')).toBeVisible();
    await expect(page.locator('text=6 sessions')).toBeVisible();

    await page.click('text=Pay in Full');
    await expect(page.locator('text=Total: $')).toBeVisible();

    await page.click('button:has-text("Confirm Enrollment")');

    await expect(page.locator('text=Enrollment Successful')).toBeVisible();
    await expect(page.locator('text=Class Schedule Sent')).toBeVisible();

    await page.goto(`${BASE_URL}/customers`);
    await page.click('text=Test Customer');
    await page.click('text=Training Classes');
    await expect(page.locator('text=Basic Obedience')).toBeVisible();
    await expect(page.locator('text=Enrolled')).toBeVisible();
  });

  test('should handle full class with waitlist', async ({ page }) => {
    await page.goto(`${BASE_URL}/training`);
    await page.click('text=Advanced Agility');

    await expect(page.locator('text=Class Full')).toBeVisible();

    await expect(
      page.locator('button:has-text("Join Waitlist")')
    ).toBeVisible();

    await page.click('button:has-text("Join Waitlist")');
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Max');
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=Added to Waitlist')).toBeVisible();
    await expect(page.locator('text=You will be notified')).toBeVisible();
  });
});

test.describe('Critical Path: Grooming Appointment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should book a grooming appointment', async ({ page }) => {
    await page.click('text=Calendar');
    await page.click('text=Grooming');
    await expect(page).toHaveURL(/.*grooming/);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`);
    await page.click('text=10:00 AM');

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');

    await page.click('text=Full Groom');
    await page.click('text=Nail Trim');
    await page.click('text=Teeth Brushing');

    await page.click('button:has-text("Select Groomer")');
    await page.click('text=Sarah Johnson');

    await expect(page.locator('text=Appointment Summary')).toBeVisible();
    await expect(page.locator('text=Full Groom')).toBeVisible();
    await expect(page.locator('text=Nail Trim')).toBeVisible();
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();

    await page.click('button:has-text("Confirm Appointment")');

    await expect(page.locator('text=Appointment Booked')).toBeVisible();
    await expect(page.locator('text=Confirmation sent')).toBeVisible();

    await page.goto(`${BASE_URL}/calendar/grooming`);
    await expect(page.locator('text=Buddy')).toBeVisible();
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();
  });

  test('should prevent double-booking groomer', async ({ page }) => {
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

    await page.goto(`${BASE_URL}/calendar/grooming`);
    await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`);
    await page.click('text=10:00 AM');

    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Max');
    await page.click('text=Bath Only');
    await page.click('button:has-text("Select Groomer")');

    const sarahAvailable = await page
      .locator('text=Sarah Johnson:not(.unavailable)')
      .count();
    expect(sarahAvailable).toBe(0);
  });
});

test.describe('Critical Path: Check-In and Check-Out', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should check-in pet for boarding', async ({ page }) => {
    await page.goto(`${BASE_URL}/reservations`);

    await page.click('text=CONFIRMED');

    await page.click('button:has-text("Check In")');

    await expect(page.locator('text=Check-In')).toBeVisible();
    await page.fill('textarea[name="notes"]', 'Pet is in good health');
    await page.click('input[type="checkbox"][name="vaccinationsVerified"]');
    await page.click(
      'input[type="checkbox"][name="emergencyContactVerified"]'
    );

    await page.click('button:has-text("Complete Check-In")');

    await expect(page.locator('text=CHECKED_IN')).toBeVisible();
    await expect(page.locator('text=Check-In Successful')).toBeVisible();
  });

  test('should check-out pet and process payment', async ({ page }) => {
    await page.goto(`${BASE_URL}/reservations`);
    await page.click('text=CHECKED_IN');

    await page.click('button:has-text("Check Out")');

    await expect(page.locator('text=Check-Out Summary')).toBeVisible();
    await expect(page.locator('text=Boarding')).toBeVisible();
    await expect(page.locator('text=Total:')).toBeVisible();

    await page.click('button:has-text("Add Charges")');
    await page.click('text=Extra Playtime');
    await page.click('button:has-text("Add")');

    await page.click('button:has-text("Process Payment")');
    await page.selectOption('select[name="paymentMethod"]', 'CREDIT_CARD');
    await page.click('button:has-text("Complete Payment")');

    await expect(page.locator('text=Check-Out Complete')).toBeVisible();
    await expect(page.locator('text=COMPLETED')).toBeVisible();
  });
});

test.describe('Critical Path: Multi-Service Booking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should book grooming during boarding stay', async ({ page }) => {
    await page.goto(`${BASE_URL}/reservations/new`);
    await selectCustomer(page, 'Test Customer');
    await selectPet(page, 'Buddy');
    await page.click('text=Boarding');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await page.fill(
      'input[name="startDate"]',
      tomorrow.toISOString().split('T')[0]
    );
    await page.fill(
      'input[name="endDate"]',
      nextWeek.toISOString().split('T')[0]
    );
    await page.click('button:has-text("Select Suite")');
    await page.click('text=Standard Suite');
    await page.click('button:has-text("Confirm Reservation")');

    await page.click('button:has-text("Add Services")');
    await page.click('text=Grooming');

    const midStay = new Date(tomorrow);
    midStay.setDate(midStay.getDate() + 3);
    await page.click(`[data-date="${midStay.toISOString().split('T')[0]}"]`);
    await page.click('text=Full Groom');
    await page.click('button:has-text("Add to Reservation")');

    await expect(page.locator('text=Boarding')).toBeVisible();
    await expect(page.locator('text=Grooming')).toBeVisible();
    await expect(page.locator('text=During Stay')).toBeVisible();
  });
});
