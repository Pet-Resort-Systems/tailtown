import { PrismaClient, ResourceType } from '@prisma/client';

// Suite types stored in attributes (duplicated from suite.controller.ts for test use)
enum SuiteType {
  STANDARD = 'STANDARD',
  STANDARD_PLUS = 'STANDARD_PLUS',
  VIP = 'VIP'
}

const prisma = new PrismaClient();

describe('Suite Initialization', () => {
  beforeAll(async () => {
    // Clean up suites before test
    await prisma.resource.deleteMany({
      where: {
        type: {
          in: [ResourceType.VIP_SUITE, ResourceType.STANDARD_PLUS_SUITE, ResourceType.STANDARD_SUITE],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create the correct number and types of suites', async () => {
    const count = 10;
    const vipCount = 2;
    const standardPlusCount = 3;

    const suites: any[] = [];
    for (let i = 1; i <= vipCount; i++) {
      suites.push({
        name: `VIP Suite ${i}`,
        type: ResourceType.VIP_SUITE,
        description: 'Premium suite with extra amenities and dedicated care',
        capacity: 1,
        isActive: true,
        attributes: {
          suiteType: SuiteType.VIP,
          suiteNumber: i,
          lastCleaned: null,
          maintenanceStatus: 'AVAILABLE',
          amenities: ['Premium Bedding', 'Dedicated Play Time', 'Webcam', 'Spa Treatment'],
          size: 'Extra Large',
          location: 'Premium Wing',
        },
      });
    }
    for (let i = vipCount + 1; i <= vipCount + standardPlusCount; i++) {
      suites.push({
        name: `Standard Plus Suite ${i}`,
        type: ResourceType.STANDARD_PLUS_SUITE,
        description: 'Enhanced suite with additional comfort features',
        capacity: 1,
        isActive: true,
        attributes: {
          suiteType: SuiteType.STANDARD_PLUS,
          suiteNumber: i,
          lastCleaned: null,
          maintenanceStatus: 'AVAILABLE',
          amenities: ['Enhanced Bedding', 'Extra Play Time', 'Treats'],
          size: 'Large',
          location: 'East Wing',
        },
      });
    }
    for (let i = vipCount + standardPlusCount + 1; i <= count; i++) {
      suites.push({
        name: `Standard Suite ${i}`,
        type: ResourceType.STANDARD_SUITE,
        description: 'Comfortable standard accommodation',
        capacity: 1,
        isActive: true,
        attributes: {
          suiteType: SuiteType.STANDARD,
          suiteNumber: i,
          lastCleaned: null,
          maintenanceStatus: 'AVAILABLE',
          amenities: ['Comfortable Bedding', 'Regular Play Time'],
          size: 'Standard',
          location: 'Main Building',
        },
      });
    }
    await prisma.$transaction(
      suites.map((suite) => prisma.resource.create({ data: suite }))
    );

    // Validate counts
    const vip = await prisma.resource.count({ where: { type: ResourceType.VIP_SUITE } });
    const plus = await prisma.resource.count({ where: { type: ResourceType.STANDARD_PLUS_SUITE } });
    const standard = await prisma.resource.count({ where: { type: ResourceType.STANDARD_SUITE } });
    expect(vip).toBe(vipCount);
    expect(plus).toBe(standardPlusCount);
    expect(standard).toBe(count - vipCount - standardPlusCount);
  });
});
