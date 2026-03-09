/**
 * Realistic Kennel Seeder Script
 * 
 * Creates kennels with proper room naming: A01, A02, B01, B02, etc.
 * Matches typical pet resort layout with multiple rooms
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRealisticKennels() {
  console.log('Starting realistic kennel seeding...');
  console.log('Deleting existing resources...');
  
  // Delete all existing resources first
  await prisma.resource.deleteMany({});
  
  // Define room layout
  // Room A: Standard Suites (40 kennels)
  // Room B: Standard Suites (40 kennels)
  // Room C: Standard Plus Suites (25 kennels)
  // Room D: Standard Suites (40 kennels)
  // Room T: Standard Plus Suites (8 kennels) - Training/Therapy room
  // VIP Suites: 2 special suites
  // Bathing Stations: 1
  
  const rooms = [
    { letter: 'A', type: 'STANDARD_SUITE', count: 40 },
    { letter: 'B', type: 'STANDARD_SUITE', count: 40 },
    { letter: 'C', type: 'STANDARD_PLUS_SUITE', count: 25 },
    { letter: 'D', type: 'STANDARD_SUITE', count: 40 },
    { letter: 'T', type: 'STANDARD_PLUS_SUITE', count: 8 }
  ];
  
  let totalCreated = 0;
  
  try {
    // Create kennels for each room
    for (const room of rooms) {
      console.log(`Creating ${room.count} kennels in Room ${room.letter} (${room.type})...`);
      
      for (let i = 1; i <= room.count; i++) {
        const kennelNumber = i.toString().padStart(2, '0'); // 01, 02, 03, etc.
        const name = `${room.letter}${kennelNumber}`;
        
        await prisma.resource.create({
          data: {
            name,
            type: room.type as any,
            description: `${room.type.replace('_', ' ')} in Room ${room.letter}`,
            capacity: 1,
            isActive: true,
            tenantId: 'dev'
          }
        });
        
        totalCreated++;
      }
    }
    
    // Create VIP Suites
    console.log('Creating 2 VIP Suites...');
    for (let i = 1; i <= 2; i++) {
      await prisma.resource.create({
        data: {
          name: `VIP-${i}`,
          type: 'VIP_SUITE',
          description: 'Premium VIP Suite with extra amenities',
          capacity: 1,
          isActive: true,
          tenantId: 'dev'
        }
      });
      totalCreated++;
    }
    
    // Create Bathing Station
    console.log('Creating 1 Bathing Station...');
    await prisma.resource.create({
      data: {
        name: 'BATH-1',
        type: 'BATHING_STATION',
        description: 'Professional bathing and grooming station',
        capacity: 1,
        isActive: true,
        tenantId: 'dev'
      }
    });
    totalCreated++;
    
    // Verify the count
    const finalCount = await prisma.resource.count();
    console.log(`\n✅ Successfully created ${finalCount} resources!`);
    
    // Show breakdown by type
    const byType = await prisma.resource.groupBy({
      by: ['type'],
      _count: true
    });
    
    console.log('\nBreakdown by type:');
    byType.forEach(item => {
      console.log(`  ${item.type}: ${item._count} kennels`);
    });
    
    // Show sample kennels from each room
    console.log('\nSample kennels:');
    const samples = await prisma.resource.findMany({
      where: {
        name: {
          in: ['A01', 'A40', 'B01', 'C01', 'D01', 'T01', 'VIP-1', 'BATH-1']
        }
      },
      orderBy: { name: 'asc' }
    });
    
    samples.forEach(kennel => {
      console.log(`  ${kennel.name} - ${kennel.type}`);
    });
    
  } catch (error) {
    console.error('Error seeding kennels:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedRealisticKennels()
  .then(() => console.log('\n🎉 Kennel seeding complete!'))
  .catch(e => {
    console.error('Error during kennel seeding:', e);
    process.exit(1);
  });
