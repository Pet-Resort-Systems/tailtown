/**
 * Add externalId columns to track records from external systems (Gingr, etc.)
 * 
 * This script adds externalId columns to customers, pets, services, reservations, and invoices
 * without losing any existing data. This enables migration tracking and duplicate prevention.
 * 
 * Usage: node prisma/migrations/add_external_id_fields.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding externalId columns for migration tracking...');
  
  try {
    // Add externalId columns to all relevant tables
    console.log('Adding externalId to customers...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS "externalId" TEXT;
    `);
    
    console.log('Adding externalId to pets...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS "externalId" TEXT;
    `);
    
    console.log('Adding externalId to services...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS "externalId" TEXT;
    `);
    
    console.log('Adding externalId to reservations...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS "externalId" TEXT;
    `);
    
    console.log('Adding externalId to invoices...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "externalId" TEXT;
    `);
    
    // Create indexes for performance
    console.log('Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "customers_external_id_idx" ON customers("externalId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "pets_external_id_idx" ON pets("externalId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "services_external_id_idx" ON services("externalId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "reservations_external_id_idx" ON reservations("externalId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "invoices_external_id_idx" ON invoices("externalId");
    `);
    
    console.log('✅ Successfully added externalId columns and indexes');
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
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
