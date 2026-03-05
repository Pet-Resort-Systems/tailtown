/**
 * Safe migration: Add externalId column to reservations table
 * 
 * This script safely adds the externalId column without losing any data.
 * Uses IF NOT EXISTS to prevent errors if column already exists.
 * 
 * Usage: node add-external-id-to-reservations.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addExternalIdColumn() {
  try {
    console.log('Adding externalId column to reservations table...');
    
    // Add column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS "externalId" TEXT;
    `);
    
    console.log('✅ Column added successfully');
    
    // Create index for performance
    console.log('Creating index on externalId...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "reservations_external_id_idx" 
      ON reservations("externalId");
    `);
    
    console.log('✅ Index created successfully');
    
    // Add comment for documentation
    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN reservations."externalId" IS 
      'ID from external system (Gingr, etc.) for migration tracking and duplicate prevention';
    `);
    
    console.log('✅ Migration complete!');
    console.log('\n📊 Checking existing data...');
    
    // Check if any reservations already have externalId
    const withExternalId = await prisma.reservation.count({
      where: { externalId: { not: null } }
    });
    
    const total = await prisma.reservation.count();
    
    console.log(`Total reservations: ${total}`);
    console.log(`With externalId: ${withExternalId}`);
    console.log(`Without externalId: ${total - withExternalId}`);
    
    if (withExternalId === 0 && total > 0) {
      console.log('\n⚠️  No reservations have externalId set.');
      console.log('You may need to re-run the Gingr migration to populate this field.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addExternalIdColumn();
