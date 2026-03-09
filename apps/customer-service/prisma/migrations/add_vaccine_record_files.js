/**
 * Add vaccineRecordFiles column to pets table
 * 
 * This script adds a new JSONB column to store uploaded vaccine record files
 * without losing any existing data.
 * 
 * Usage: node prisma/migrations/add_vaccine_record_files.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding vaccineRecordFiles column to pets table...');
  
  try {
    // Add the column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS "vaccineRecordFiles" JSONB;
    `);
    
    console.log('✅ Successfully added vaccineRecordFiles column');
  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error in migration script:', error);
    process.exit(1);
  });
