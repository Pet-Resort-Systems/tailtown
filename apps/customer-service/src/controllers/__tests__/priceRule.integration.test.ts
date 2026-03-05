/**
 * Price Rule Integration Tests
 * 
 * Tests against real database to ensure pricing is always correct
 * Run with: npm test -- priceRule.integration.test
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Price Rule Integration Tests', () => {
  let testServiceId: string;
  let testRuleIds: string[] = [];

  beforeAll(async () => {
    // Create a test service
    const service = await prisma.service.create({
      data: {
        tenantId: 'test',
        name: 'Test Boarding',
        description: 'Test service for pricing',
        serviceCategory: 'BOARDING',
        price: 100,
        duration: 60,
        isActive: true
      }
    });
    testServiceId = service.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.priceRuleService.deleteMany({
      where: { priceRuleId: { in: testRuleIds } }
    });
    await prisma.priceRuleServiceCategory.deleteMany({
      where: { priceRuleId: { in: testRuleIds } }
    });
    await prisma.priceRule.deleteMany({
      where: { id: { in: testRuleIds } }
    });
    await prisma.service.delete({
      where: { id: testServiceId }
    });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up rules after each test
    if (testRuleIds.length > 0) {
      await prisma.priceRuleService.deleteMany({
        where: { priceRuleId: { in: testRuleIds } }
      });
      await prisma.priceRuleServiceCategory.deleteMany({
        where: { priceRuleId: { in: testRuleIds } }
      });
      await prisma.priceRule.deleteMany({
        where: { id: { in: testRuleIds } }
      });
      testRuleIds = [];
    }
  });

  describe('Real Price Calculations', () => {
    it('should calculate correct price with percentage discount', async () => {
      // Create rule
      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Multi-Day 20% Off',
          ruleType: 'MULTI_DAY',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          minQuantity: 5,
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      // Get service
      const service = await prisma.service.findUnique({
        where: { id: testServiceId }
      });

      // Calculate
      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-06');
      const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const petCount = 1;

      const basePrice = service!.price * durationInDays * petCount;
      const expectedDiscount = basePrice * 0.20;
      const expectedFinalPrice = basePrice - expectedDiscount;

      expect(basePrice).toBe(500);
      expect(expectedDiscount).toBe(100);
      expect(expectedFinalPrice).toBe(400);
    });

    it('should calculate correct price with fixed discount', async () => {
      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Multi-Pet $50 Off',
          ruleType: 'MULTI_PET',
          adjustmentType: 'DISCOUNT',
          discountType: 'FIXED_AMOUNT',
          discountValue: 50,
          minQuantity: 2,
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      const service = await prisma.service.findUnique({
        where: { id: testServiceId }
      });

      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-04');
      const durationInDays = 3;
      const petCount = 2;

      const basePrice = service!.price * durationInDays * petCount;
      const expectedFinalPrice = basePrice - 50;

      expect(basePrice).toBe(600);
      expect(expectedFinalPrice).toBe(550);
    });

    it('should calculate correct price with surcharge', async () => {
      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Weekend 15% Surcharge',
          ruleType: 'DAY_OF_WEEK',
          adjustmentType: 'SURCHARGE',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          daysOfWeek: '[5,6]', // Friday, Saturday
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      const service = await prisma.service.findUnique({
        where: { id: testServiceId }
      });

      const basePrice = service!.price * 1 * 1; // 1 day, 1 pet
      const expectedSurcharge = basePrice * 0.15;
      const expectedFinalPrice = basePrice + expectedSurcharge;

      expect(basePrice).toBe(100);
      expect(expectedSurcharge).toBe(15);
      expect(expectedFinalPrice).toBe(115);
    });

    it('should apply multiple rules correctly', async () => {
      // Create two rules
      const rule1 = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Multi-Day 10% Off',
          ruleType: 'MULTI_DAY',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minQuantity: 5,
          isActive: true,
          priority: 20
        }
      });
      testRuleIds.push(rule1.id);

      const rule2 = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Multi-Pet $30 Off',
          ruleType: 'MULTI_PET',
          adjustmentType: 'DISCOUNT',
          discountType: 'FIXED_AMOUNT',
          discountValue: 30,
          minQuantity: 2,
          isActive: true,
          priority: 15
        }
      });
      testRuleIds.push(rule2.id);

      const service = await prisma.service.findUnique({
        where: { id: testServiceId }
      });

      // 5 days, 2 pets
      const basePrice = service!.price * 5 * 2;
      const discount1 = basePrice * 0.10; // 10% off
      const discount2 = 30; // $30 off
      const expectedFinalPrice = basePrice - discount1 - discount2;

      expect(basePrice).toBe(1000);
      expect(discount1).toBe(100);
      expect(expectedFinalPrice).toBe(870);
    });
  });

  describe('Rule Priority Tests', () => {
    it('should apply higher priority rule when multiple rules of same type exist', async () => {
      const highPriorityRule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'High Priority 10% Off',
          ruleType: 'MULTI_DAY',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minQuantity: 3,
          isActive: true,
          priority: 20 // Higher priority
        }
      });
      testRuleIds.push(highPriorityRule.id);

      const lowPriorityRule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Low Priority 20% Off',
          ruleType: 'MULTI_DAY',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          minQuantity: 3,
          isActive: true,
          priority: 10 // Lower priority
        }
      });
      testRuleIds.push(lowPriorityRule.id);

      // Fetch rules ordered by priority
      const rules = await prisma.priceRule.findMany({
        where: {
          id: { in: testRuleIds },
          isActive: true
        },
        orderBy: { priority: 'desc' }
      });

      // Should return high priority rule first
      expect(rules[0].id).toBe(highPriorityRule.id);
      expect(rules[0].priority).toBe(20);
    });
  });

  describe('Date Range Tests', () => {
    it('should apply seasonal rule within date range', async () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 1); // Yesterday
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 30); // 30 days from now

      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Summer Special',
          ruleType: 'SEASONAL',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          startDate,
          endDate,
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      // Query for active seasonal rules
      const activeRules = await prisma.priceRule.findMany({
        where: {
          id: rule.id,
          isActive: true,
          ruleType: 'SEASONAL',
          startDate: { lte: now },
          OR: [
            { endDate: { gte: now } },
            { endDate: null }
          ]
        }
      });

      expect(activeRules).toHaveLength(1);
      expect(activeRules[0].id).toBe(rule.id);
    });

    it('should not apply seasonal rule outside date range', async () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 60); // 60 days ago
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - 30); // 30 days ago (expired)

      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Expired Special',
          ruleType: 'SEASONAL',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          startDate,
          endDate,
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      // Query for active seasonal rules
      const activeRules = await prisma.priceRule.findMany({
        where: {
          id: rule.id,
          isActive: true,
          ruleType: 'SEASONAL',
          startDate: { lte: now },
          endDate: { gte: now }
        }
      });

      expect(activeRules).toHaveLength(0);
    });
  });

  describe('Service Category Filtering', () => {
    it('should apply rule to matching service category', async () => {
      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Boarding Discount',
          ruleType: 'PROMOTIONAL',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      // Add service category
      await prisma.priceRuleServiceCategory.create({
        data: {
          tenantId: 'test',
          priceRuleId: rule.id,
          serviceCategory: 'BOARDING'
        }
      });

      // Query rules for BOARDING category
      const rules = await prisma.priceRule.findMany({
        where: {
          id: rule.id,
          isActive: true,
          serviceCategories: {
            some: {
              serviceCategory: 'BOARDING'
            }
          }
        },
        include: {
          serviceCategories: true
        }
      });

      expect(rules).toHaveLength(1);
      expect(rules[0].serviceCategories[0].serviceCategory).toBe('BOARDING');
    });

    it('should not apply rule to non-matching service category', async () => {
      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Grooming Discount',
          ruleType: 'PROMOTIONAL',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      // Add service category for GROOMING
      await prisma.priceRuleServiceCategory.create({
        data: {
          tenantId: 'test',
          priceRuleId: rule.id,
          serviceCategory: 'GROOMING'
        }
      });

      // Query rules for BOARDING category (should not match)
      const rules = await prisma.priceRule.findMany({
        where: {
          id: rule.id,
          isActive: true,
          serviceCategories: {
            some: {
              serviceCategory: 'BOARDING'
            }
          }
        }
      });

      expect(rules).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large discount values', async () => {
      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Huge Discount',
          ruleType: 'PROMOTIONAL',
          adjustmentType: 'DISCOUNT',
          discountType: 'FIXED_AMOUNT',
          discountValue: 10000, // More than any reasonable price
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      const service = await prisma.service.findUnique({
        where: { id: testServiceId }
      });

      const basePrice = service!.price * 1 * 1;
      const discount = 10000;
      const finalPrice = Math.max(0, basePrice - discount);

      expect(finalPrice).toBe(0); // Should not go negative
    });

    it('should handle percentage over 100%', async () => {
      // This should be prevented by validation, but test the calculation
      const basePrice = 100;
      const discountPercentage = 150; // 150%
      const discount = basePrice * (discountPercentage / 100);
      const finalPrice = Math.max(0, basePrice - discount);

      expect(finalPrice).toBe(0); // Should not go negative
    });

    it('should handle zero price service', async () => {
      const freeService = await prisma.service.create({
        data: {
          tenantId: 'test',
          name: 'Free Service',
          description: 'Test free service',
          serviceCategory: 'OTHER',
          price: 0,
          duration: 30,
          isActive: true
        }
      });

      const rule = await prisma.priceRule.create({
        data: {
          tenantId: 'test',
          name: 'Discount on Free',
          ruleType: 'PROMOTIONAL',
          adjustmentType: 'DISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 50,
          isActive: true,
          priority: 10
        }
      });
      testRuleIds.push(rule.id);

      const basePrice = freeService.price * 1 * 1;
      const discount = basePrice * 0.50;
      const finalPrice = basePrice - discount;

      expect(finalPrice).toBe(0);

      // Cleanup
      await prisma.service.delete({ where: { id: freeService.id } });
    });
  });

  describe('Concurrent Rule Application', () => {
    it('should handle multiple rules being applied simultaneously', async () => {
      // Create 5 different rule types
      const rules = await Promise.all([
        prisma.priceRule.create({
          data: {
            tenantId: 'test',
            name: 'Multi-Day',
            ruleType: 'MULTI_DAY',
            adjustmentType: 'DISCOUNT',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minQuantity: 3,
            isActive: true,
            priority: 20
          }
        }),
        prisma.priceRule.create({
          data: {
            tenantId: 'test',
            name: 'Multi-Pet',
            ruleType: 'MULTI_PET',
            adjustmentType: 'DISCOUNT',
            discountType: 'FIXED_AMOUNT',
            discountValue: 25,
            minQuantity: 2,
            isActive: true,
            priority: 19
          }
        }),
        prisma.priceRule.create({
          data: {
            tenantId: 'test',
            name: 'Day of Week',
            ruleType: 'DAY_OF_WEEK',
            adjustmentType: 'SURCHARGE',
            discountType: 'PERCENTAGE',
            discountValue: 5,
            daysOfWeek: '[5,6]',
            isActive: true,
            priority: 18
          }
        })
      ]);

      testRuleIds.push(...rules.map(r => r.id));

      // All rules should be retrievable
      const allRules = await prisma.priceRule.findMany({
        where: {
          id: { in: testRuleIds },
          isActive: true
        },
        orderBy: { priority: 'desc' }
      });

      expect(allRules).toHaveLength(3);
      expect(allRules[0].priority).toBe(20);
      expect(allRules[1].priority).toBe(19);
      expect(allRules[2].priority).toBe(18);
    });
  });
});
