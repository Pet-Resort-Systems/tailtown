/**
 * Staff Schedule Overlap Prevention Tests
 * 
 * Tests the overlap detection logic for staff scheduling to ensure
 * employees cannot be double-booked for the same time period.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to detect overlapping schedules (copied from controller for testing)
const hasScheduleConflict = async (
  tenantId: string | undefined,
  staffId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<boolean> => {
  // Normalize to the calendar day for date-based filtering
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const where: any = {
    staffId,
    date: {
      gte: startOfDay,
      lte: endOfDay
    },
    // Time overlap: existing.endTime > new.startTime AND existing.startTime < new.endTime
    endTime: {
      gt: startTime
    },
    startTime: {
      lt: endTime
    }
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  if (excludeScheduleId) {
    where.id = { not: excludeScheduleId };
  }

  const conflict = await prisma.staffSchedule.findFirst({ where });
  return !!conflict;
};

describe('Staff Schedule Overlap Prevention', () => {
  let testStaffId: string;
  let testTenantId: string;
  let testScheduleId: string;
  const testDate = new Date('2025-12-01');

  beforeAll(async () => {
    // Create a test tenant
    const tenant = await prisma.tenant.create({
      data: {
        subdomain: 'test-schedule-overlap',
        businessName: 'Test Schedule Business',
        contactName: 'Test Contact',
        contactEmail: 'test@example.com',
        status: 'ACTIVE',
        isActive: true,
      }
    });
    testTenantId = tenant.id;

    // Create a test staff member
    const staff = await prisma.staff.create({
      data: {
        tenantId: testTenantId,
        email: 'test-schedule@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Staff',
        role: 'STAFF',
        position: 'Kennel Attendant',
        isActive: true,
      }
    });
    testStaffId = staff.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.staffSchedule.deleteMany({
      where: { staffId: testStaffId }
    });
    await prisma.staff.delete({
      where: { 
        tenantId_email: {
          tenantId: testTenantId,
          email: 'test-schedule@example.com'
        }
      }
    });
    await prisma.tenant.delete({
      where: { id: testTenantId }
    });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up schedules after each test
    await prisma.staffSchedule.deleteMany({
      where: { staffId: testStaffId }
    });
  });

  describe('hasScheduleConflict - Basic Overlap Detection', () => {
    it('should detect exact time overlap', async () => {
      // Create a schedule from 9:00 to 17:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create another schedule with exact same times
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '09:00',
        '17:00'
      );

      expect(conflict).toBe(true);
    });

    it('should detect partial overlap at start', async () => {
      // Create a schedule from 9:00 to 17:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 8:00 to 10:00 (overlaps start)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '08:00',
        '10:00'
      );

      expect(conflict).toBe(true);
    });

    it('should detect partial overlap at end', async () => {
      // Create a schedule from 9:00 to 17:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 16:00 to 18:00 (overlaps end)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '16:00',
        '18:00'
      );

      expect(conflict).toBe(true);
    });

    it('should detect complete overlap (new schedule contains existing)', async () => {
      // Create a schedule from 10:00 to 14:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '10:00',
          endTime: '14:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 9:00 to 17:00 (completely contains existing)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '09:00',
        '17:00'
      );

      expect(conflict).toBe(true);
    });

    it('should detect complete overlap (existing contains new)', async () => {
      // Create a schedule from 9:00 to 17:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 10:00 to 14:00 (completely within existing)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '10:00',
        '14:00'
      );

      expect(conflict).toBe(true);
    });
  });

  describe('hasScheduleConflict - Non-Overlapping Schedules', () => {
    it('should allow back-to-back schedules (end time = start time)', async () => {
      // Create a schedule from 9:00 to 13:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '13:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 13:00 to 17:00 (starts when previous ends)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '13:00',
        '17:00'
      );

      expect(conflict).toBe(false);
    });

    it('should allow schedule before existing schedule', async () => {
      // Create a schedule from 13:00 to 17:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '13:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 9:00 to 12:00 (before existing)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '09:00',
        '12:00'
      );

      expect(conflict).toBe(false);
    });

    it('should allow schedule after existing schedule', async () => {
      // Create a schedule from 9:00 to 13:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '13:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 14:00 to 17:00 (after existing)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '14:00',
        '17:00'
      );

      expect(conflict).toBe(false);
    });

    it('should allow schedule on different day', async () => {
      // Create a schedule on Dec 1
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule on Dec 2 with same times
      const differentDate = new Date('2025-12-02');
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        differentDate,
        '09:00',
        '17:00'
      );

      expect(conflict).toBe(false);
    });
  });

  describe('hasScheduleConflict - Update Exclusion', () => {
    it('should exclude current schedule when updating', async () => {
      // Create a schedule
      const schedule = await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to update the same schedule (should not conflict with itself)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '09:00',
        '17:00',
        schedule.id // Exclude this schedule
      );

      expect(conflict).toBe(false);
    });

    it('should detect conflict with other schedules when updating', async () => {
      // Create two schedules
      const schedule1 = await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '13:00',
          status: 'SCHEDULED'
        }
      });

      const schedule2 = await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '14:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to update schedule2 to overlap with schedule1
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '12:00',
        '15:00',
        schedule2.id // Exclude schedule2 being updated
      );

      expect(conflict).toBe(true);
    });
  });

  describe('hasScheduleConflict - Multi-Tenant Isolation', () => {
    let otherTenantId: string;
    let otherStaffId: string;

    beforeAll(async () => {
      // Create another tenant
      const tenant = await prisma.tenant.create({
        data: {
          subdomain: 'other-tenant-schedule',
          businessName: 'Other Tenant',
          contactName: 'Other Contact',
          contactEmail: 'other@example.com',
          status: 'ACTIVE',
          isActive: true,
        }
      });
      otherTenantId = tenant.id;

      // Create staff for other tenant
      const staff = await prisma.staff.create({
        data: {
          tenantId: otherTenantId,
          email: 'other-schedule@example.com',
          password: 'hashedpassword',
          firstName: 'Other',
          lastName: 'Staff',
          role: 'STAFF',
          position: 'Kennel Attendant',
          isActive: true,
        }
      });
      otherStaffId = staff.id;
    });

    afterAll(async () => {
      await prisma.staffSchedule.deleteMany({
        where: { staffId: otherStaffId }
      });
      await prisma.staff.delete({
        where: { 
          tenantId_email: {
            tenantId: otherTenantId,
            email: 'other-schedule@example.com'
          }
        }
      });
      await prisma.tenant.delete({
        where: { id: otherTenantId }
      });
    });

    it('should not detect conflict across different tenants', async () => {
      // Create schedule for tenant 1
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule for tenant 2 with same times (should be allowed)
      const conflict = await hasScheduleConflict(
        otherTenantId,
        otherStaffId,
        testDate,
        '09:00',
        '17:00'
      );

      expect(conflict).toBe(false);
    });

    it('should detect conflict within same tenant', async () => {
      // Create schedule for tenant 2
      await prisma.staffSchedule.create({
        data: {
          tenantId: otherTenantId,
          staffId: otherStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create another schedule for same tenant/staff (should conflict)
      const conflict = await hasScheduleConflict(
        otherTenantId,
        otherStaffId,
        testDate,
        '10:00',
        '14:00'
      );

      expect(conflict).toBe(true);
    });
  });

  describe('hasScheduleConflict - Edge Cases', () => {
    it('should handle schedules with same start time but different end times', async () => {
      // Create a schedule from 9:00 to 13:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '09:00',
          endTime: '13:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 9:00 to 17:00 (same start, different end)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '09:00',
        '17:00'
      );

      expect(conflict).toBe(true);
    });

    it('should handle schedules with different start times but same end time', async () => {
      // Create a schedule from 13:00 to 17:00
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '13:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create schedule from 9:00 to 17:00 (different start, same end)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '09:00',
        '17:00'
      );

      expect(conflict).toBe(true);
    });

    it('should handle very short schedules (1 hour)', async () => {
      // Create a 1-hour schedule
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '12:00',
          endTime: '13:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create overlapping 1-hour schedule
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '12:30',
        '13:30'
      );

      expect(conflict).toBe(true);
    });

    it('should allow multiple non-overlapping schedules on same day', async () => {
      // Create morning schedule
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '08:00',
          endTime: '12:00',
          status: 'SCHEDULED'
        }
      });

      // Create afternoon schedule
      await prisma.staffSchedule.create({
        data: {
          tenantId: testTenantId,
          staffId: testStaffId,
          date: testDate,
          startTime: '13:00',
          endTime: '17:00',
          status: 'SCHEDULED'
        }
      });

      // Try to create evening schedule (should be allowed)
      const conflict = await hasScheduleConflict(
        testTenantId,
        testStaffId,
        testDate,
        '18:00',
        '22:00'
      );

      expect(conflict).toBe(false);
    });
  });
});
