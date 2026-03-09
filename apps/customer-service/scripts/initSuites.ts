import { PrismaClient, ResourceType } from '@prisma/client';

// Suite types stored in attributes
// Duplicated from suite.controller.ts for CLI use
enum SuiteType {
  STANDARD = 'STANDARD',
  STANDARD_PLUS = 'STANDARD_PLUS',
  VIP = 'VIP'
}

const prisma = new PrismaClient();

async function main() {
  // Get existing suites to avoid duplicates
  const existingSuites = await prisma.resource.findMany({
    where: {
      type: {
        in: [ResourceType.VIP_SUITE, ResourceType.STANDARD_PLUS_SUITE, ResourceType.STANDARD_SUITE],
      },
    },
    select: {
      name: true,
      type: true,
    }
  });
  
  console.log(`Found ${existingSuites.length} existing suites.`);
  // Default suite counts
  const count = parseInt(process.argv[2] || '168', 10);
  const vipCount = parseInt(process.argv[3] || '1', 10);
  const standardPlusCount = parseInt(process.argv[4] || '25', 10);

  if (count < 1 || vipCount < 0 || standardPlusCount < 0) {
    throw new Error('Invalid counts provided');
  }
  if (vipCount + standardPlusCount > count) {
    throw new Error('Sum of VIP and Standard Plus suites exceeds total count');
  }

  const suites: any[] = [];

  // VIP Suites
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

  // Standard Plus Suites
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

  // Standard Suites
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

  // Filter out suites that already exist
  const existingSuiteNames = new Set(existingSuites.map(suite => suite.name));
  const suitesToCreate = suites.filter(suite => !existingSuiteNames.has(suite.name));
  
  if (suitesToCreate.length === 0) {
    console.log('All suites already exist. No new suites to create.');
    return;
  }
  
  console.log(`Initializing ${suitesToCreate.length} new suites...`);
  
  // Create suites in batches to avoid transaction size limits
  const batchSize = 50;
  for (let i = 0; i < suitesToCreate.length; i += batchSize) {
    const batch = suitesToCreate.slice(i, i + batchSize);
    console.log(`Creating batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(suitesToCreate.length / batchSize)}...`);
    
    await prisma.$transaction(
      batch.map((suite) => prisma.resource.create({ data: suite }))
    );
  }
  
  console.log('Suites initialized successfully.');
  console.log(`Total suites now: ${existingSuites.length + suitesToCreate.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
