// Script to create the reservation_errors table directly using Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createReservationErrorsTable() {
  try {
    console.log('Checking if reservation_errors table exists...');
    
    // Check if the table already exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'reservation_errors'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('Table reservation_errors already exists. Skipping creation.');
      return;
    }
    
    console.log('Creating reservation_errors table...');
    
    // Create the reservation_errors table
    await prisma.$executeRaw`
      CREATE TABLE "reservation_errors" (
        "id" TEXT NOT NULL,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "message" TEXT NOT NULL,
        "error_type" TEXT NOT NULL,
        "error_category" TEXT NOT NULL,
        "status_code" INTEGER NOT NULL,
        "context" JSONB,
        "stack" TEXT,
        "is_resolved" BOOLEAN NOT NULL DEFAULT false,
        "resolved_at" TIMESTAMP(3),
        "resolved_by" TEXT,
        "resolution" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "reservation_errors_pkey" PRIMARY KEY ("id")
      );
    `;
    
    console.log('Creating indexes on reservation_errors table...');
    
    // Create indexes for better query performance
    await prisma.$executeRaw`CREATE INDEX "reservation_errors_timestamp_idx" ON "reservation_errors" ("timestamp");`;
    await prisma.$executeRaw`CREATE INDEX "reservation_errors_error_category_idx" ON "reservation_errors" ("error_category");`;
    await prisma.$executeRaw`CREATE INDEX "reservation_errors_is_resolved_idx" ON "reservation_errors" ("is_resolved");`;
    
    console.log('Reservation errors table and indexes created successfully!');
  } catch (error) {
    console.error('Failed to create reservation_errors table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
createReservationErrorsTable();
