#!/usr/bin/env node

/**
 * Add Performance Indexes Script
 *
 * This script adds database indexes to improve query performance
 * for frequently accessed fields and common query patterns.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const indexes = [
  // Note: Many indexes already exist in Prisma schema. Only adding missing high-value ones.
  // Column names use camelCase as per Prisma convention
  {
    name: 'idx_pets_external_id_perf',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_pets_external_id_perf" ON "pets"("externalId") WHERE "externalId" IS NOT NULL',
    description:
      'Gingr integration lookups (partial index for non-null values)',
  },
  {
    name: 'idx_customers_external_id_perf',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_customers_external_id_perf" ON "customers"("externalId") WHERE "externalId" IS NOT NULL',
    description:
      'Gingr integration lookups (partial index for non-null values)',
  },
  {
    name: 'idx_staff_specialties_gin',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_staff_specialties_gin" ON "staff" USING GIN("specialties")',
    description:
      'Fast array queries for staff specialties (GROOMING, TRAINING, etc.)',
  },
  {
    name: 'idx_reservations_resource_active',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reservations_resource_active" ON "reservations"("resourceId", "startDate", "endDate") WHERE "status" IN (\'CONFIRMED\', \'CHECKED_IN\')',
    description:
      'Resource availability checks (partial index for active reservations only)',
  },
  {
    name: 'idx_pets_customer_active_perf',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_pets_customer_active_perf" ON "pets"("customerId") WHERE "isActive" = true',
    description: 'Customer active pets lookup (partial index)',
  },
  {
    name: 'idx_customers_active_perf',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_customers_active_perf" ON "customers"("tenantId") WHERE "isActive" = true',
    description: 'Active customers by tenant (partial index)',
  },
  {
    name: 'idx_medical_records_pet_date',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_medical_records_pet_date" ON "medical_records"("petId", "createdAt" DESC)',
    description: 'Pet medical history chronological order',
  },
  {
    name: 'idx_services_category_tenant',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_services_category_tenant" ON "services"("serviceCategory", "tenantId") WHERE "isActive" = true',
    description:
      'Service category filtering (partial index for active services)',
  },
];

async function addIndexes() {
  console.log('\n🔧 Adding Performance Indexes...\n');
  console.log(`Total indexes to create: ${indexes.length}\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const index of indexes) {
    try {
      console.log(`📝 Creating: ${index.name}`);
      console.log(`   Purpose: ${index.description}`);

      await prisma.$executeRawUnsafe(index.sql);

      console.log(`   ✅ Success\n`);
      successCount++;
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`   ⏭️  Already exists\n`);
        skipCount++;
      } else {
        console.log(`   ❌ Error: ${error.message}\n`);
        errorCount++;
      }
    }
  }

  console.log('═'.repeat(60));
  console.log('📊 Summary:');
  console.log(`✅ Created: ${successCount}`);
  console.log(`⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Total: ${indexes.length}`);
  console.log('═'.repeat(60));

  if (successCount > 0 || skipCount > 0) {
    console.log('\n🎉 Performance indexes are in place!');
    console.log('💡 Expected improvements:');
    console.log(
      '   - Faster reservation queries (date ranges, status filtering)'
    );
    console.log('   - Faster customer/pet lookups');
    console.log('   - Faster groomer availability checks');
    console.log('   - Faster dashboard loading');
    console.log('   - Faster Gingr data imports');
  }
}

async function main() {
  try {
    await addIndexes();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
