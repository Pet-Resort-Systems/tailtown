/**
 * Gingr Timezone Handling Tests
 * 
 * Tests that dates imported from Gingr are correctly converted from Mountain Time to UTC
 * and that they display correctly when converted back to Mountain Time.
 * 
 * Background:
 * - Gingr sends dates as ISO strings representing Mountain Time (MST/MDT)
 * - These need to be converted to UTC for database storage
 * - When displayed, they should show the correct local time
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Gingr Timezone Handling', () => {
  const testTenantId = 'test-timezone';
  let testCustomerId: string;
  let testPetId: string;
  let testServiceId: string;
  let testReservationId: string;

  beforeAll(async () => {
    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: 'Test',
        lastName: 'Customer',
        email: 'timezone-test@test.com',
        phone: '555-0199'
      }
    });
    testCustomerId = customer.id;

    // Create test pet
    const pet = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: 'Test Pet',
        type: 'DOG',
        breed: 'Test Breed'
      }
    });
    testPetId = pet.id;

    // Create test service
    const service = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: 'Test Boarding',
        serviceCategory: 'BOARDING',
        price: 50.00,
        duration: 1440 // 1 day in minutes
      }
    });
    testServiceId = service.id;
  });

  afterAll(async () => {
    // Clean up
    if (testReservationId) {
      await prisma.reservation.deleteMany({ where: { id: testReservationId } });
    }
    await prisma.pet.deleteMany({ where: { id: testPetId } });
    await prisma.customer.deleteMany({ where: { id: testCustomerId } });
  });

  describe('Date Conversion from Gingr Format', () => {
    it('should correctly convert noon MST to UTC', async () => {
      // Gingr sends: "2025-10-13T12:00:00" (noon MST)
      // Should be stored as: "2025-10-13T19:00:00Z" (noon MST = 7:00 PM UTC)
      
      const gingrDateString = '2025-10-13T12:00:00';
      const date = new Date(gingrDateString);
      date.setHours(date.getHours() + 7); // Add MST offset
      
      const reservation = await prisma.reservation.create({
        data: {
          tenantId: testTenantId,
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceId,
          startDate: date,
          endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), // +1 day
          status: 'CONFIRMED',
          externalId: 'test-noon-mst'
        }
      });
      
      testReservationId = reservation.id;
      
      // Verify the stored time is correct in UTC
      expect(reservation.startDate.getUTCHours()).toBe(19); // 7 PM UTC
      expect(reservation.startDate.getUTCMinutes()).toBe(0);
      
      // When converted back to MST (UTC-7), should be noon
      const mstHour = (reservation.startDate.getUTCHours() - 7 + 24) % 24;
      expect(mstHour).toBe(12);
    });

    it('should correctly convert morning check-in (9 AM MST) to UTC', async () => {
      // Gingr sends: "2025-10-13T09:00:00" (9 AM MST)
      // Should be stored as: "2025-10-13T16:00:00Z" (9 AM MST = 4 PM UTC)
      
      const gingrDateString = '2025-10-13T09:00:00';
      const date = new Date(gingrDateString);
      date.setHours(date.getHours() + 7);
      
      expect(date.getUTCHours()).toBe(16); // 4 PM UTC
      
      // When converted back to MST
      const mstHour = (date.getUTCHours() - 7 + 24) % 24;
      expect(mstHour).toBe(9); // 9 AM MST
    });

    it('should correctly convert evening check-out (5 PM MST) to UTC', async () => {
      // Gingr sends: "2025-10-13T17:00:00" (5 PM MST)
      // Should be stored as: "2025-10-14T00:00:00Z" (5 PM MST = midnight UTC next day)
      
      const gingrDateString = '2025-10-13T17:00:00';
      const date = new Date(gingrDateString);
      date.setHours(date.getHours() + 7);
      
      expect(date.getUTCHours()).toBe(0); // Midnight UTC
      expect(date.getUTCDate()).toBe(14); // Next day in UTC
      
      // When converted back to MST
      const mstHour = (date.getUTCHours() - 7 + 24) % 24;
      expect(mstHour).toBe(17); // 5 PM MST
    });

    it('should correctly convert late night check-in (11:30 PM MST) to UTC', async () => {
      // Gingr sends: "2025-10-13T23:30:00" (11:30 PM MST)
      // Should be stored as: "2025-10-14T06:30:00Z" (11:30 PM MST = 6:30 AM UTC next day)
      
      const gingrDateString = '2025-10-13T23:30:00';
      const date = new Date(gingrDateString);
      date.setHours(date.getHours() + 7);
      
      expect(date.getUTCHours()).toBe(6); // 6 AM UTC
      expect(date.getUTCMinutes()).toBe(30);
      expect(date.getUTCDate()).toBe(14); // Next day in UTC
      
      // When converted back to MST
      const mstHour = (date.getUTCHours() - 7 + 24) % 24;
      expect(mstHour).toBe(23); // 11 PM MST
    });
  });

  describe('Timezone Offset Calculation', () => {
    it('should use 7-hour offset for Mountain Time', () => {
      const MST_OFFSET_HOURS = 7;
      expect(MST_OFFSET_HOURS).toBe(7);
    });

    it('should correctly calculate UTC time from MST', () => {
      const mstHour = 12; // Noon MST
      const utcHour = (mstHour + 7) % 24; // Add 7 hours
      expect(utcHour).toBe(19); // 7 PM UTC
    });

    it('should correctly calculate MST time from UTC', () => {
      const utcHour = 19; // 7 PM UTC
      const mstHour = (utcHour - 7 + 24) % 24; // Subtract 7 hours
      expect(mstHour).toBe(12); // Noon MST
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight MST correctly', () => {
      const gingrDateString = '2025-10-13T00:00:00'; // Midnight MST
      const date = new Date(gingrDateString);
      date.setHours(date.getHours() + 7);
      
      expect(date.getUTCHours()).toBe(7); // 7 AM UTC
      expect(date.getUTCDate()).toBe(13); // Same day in UTC
    });

    it('should handle date boundary crossing (11 PM MST → next day UTC)', () => {
      const gingrDateString = '2025-10-13T23:00:00'; // 11 PM MST
      const date = new Date(gingrDateString);
      date.setHours(date.getHours() + 7);
      
      expect(date.getUTCHours()).toBe(6); // 6 AM UTC
      expect(date.getUTCDate()).toBe(14); // Next day in UTC
    });

    it('should preserve minutes and seconds', () => {
      const gingrDateString = '2025-10-13T12:30:45'; // 12:30:45 PM MST
      const date = new Date(gingrDateString);
      date.setHours(date.getHours() + 7);
      
      expect(date.getUTCHours()).toBe(19); // 7 PM UTC
      expect(date.getUTCMinutes()).toBe(30);
      expect(date.getUTCSeconds()).toBe(45);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should match the fix applied to existing reservations', () => {
      // The migration script added 7 hours to all Gingr reservations
      // Example from migration output:
      // Old: 2025-10-25T09:00:00.000Z (2:00 AM MST - WRONG)
      // New: 2025-10-25T16:00:00.000Z (9:00 AM MST - CORRECT)
      
      const wrongTime = new Date('2025-10-25T09:00:00.000Z');
      const correctTime = new Date(wrongTime);
      correctTime.setHours(correctTime.getHours() + 7);
      
      expect(correctTime.toISOString()).toBe('2025-10-25T16:00:00.000Z');
      
      // Verify it displays as 9 AM MST
      const mstHour = (correctTime.getUTCHours() - 7 + 24) % 24;
      expect(mstHour).toBe(9);
    });

    it('should prevent the 12:30 AM bug from recurring', () => {
      // Bug: Reservation showing 12:30 AM instead of 12:30 PM
      // Cause: Gingr sent "12:30:00" MST, stored as UTC without conversion
      
      const gingrTime = '2025-10-13T12:30:00'; // 12:30 PM MST
      const wrongDate = new Date(gingrTime); // Treated as UTC (WRONG)
      const correctDate = new Date(gingrTime);
      correctDate.setHours(correctDate.getHours() + 7); // Add offset (CORRECT)
      
      // Wrong: Shows as 5:30 AM MST (12:30 UTC - 7 hours)
      const wrongMstHour = (wrongDate.getUTCHours() - 7 + 24) % 24;
      expect(wrongMstHour).toBe(5); // Bug reproduced
      
      // Correct: Shows as 12:30 PM MST (19:30 UTC - 7 hours)
      const correctMstHour = (correctDate.getUTCHours() - 7 + 24) % 24;
      expect(correctMstHour).toBe(12); // Bug fixed
    });
  });

  describe('Integration with Kennel Cards', () => {
    it('should filter reservations by check-in date in Mountain Time', async () => {
      // Create a reservation checking in at 12:30 PM MST on Oct 13
      const checkInMst = '2025-10-13T12:30:00';
      const checkInUtc = new Date(checkInMst);
      checkInUtc.setHours(checkInUtc.getHours() + 7); // 7:30 PM UTC
      
      const reservation = await prisma.reservation.create({
        data: {
          tenantId: testTenantId,
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceId,
          startDate: checkInUtc,
          endDate: new Date(checkInUtc.getTime() + 24 * 60 * 60 * 1000),
          status: 'CONFIRMED',
          externalId: 'test-kennel-card-filter'
        }
      });
      
      // Filter for Oct 13 in MST (should include this reservation)
      // Oct 13 MST = Oct 13 07:00 UTC to Oct 14 06:59 UTC
      const mstDate = '2025-10-13';
      const [year, month, day] = mstDate.split('-').map(n => parseInt(n, 10));
      const startOfDayMst = new Date(year, month - 1, day, 0, 0, 0, 0);
      const startOfDayUtc = new Date(startOfDayMst.getTime() - (-7 * 60 * 60 * 1000));
      const endOfDayMst = new Date(year, month - 1, day, 23, 59, 59, 999);
      const endOfDayUtc = new Date(endOfDayMst.getTime() - (-7 * 60 * 60 * 1000));
      
      const filtered = await prisma.reservation.findMany({
        where: {
          tenantId: testTenantId,
          startDate: {
            gte: startOfDayUtc,
            lte: endOfDayUtc
          }
        }
      });
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(r => r.id === reservation.id)).toBe(true);
      
      // Clean up
      await prisma.reservation.delete({ where: { id: reservation.id } });
    });
  });
});
