#!/usr/bin/env node

/**
 * Bulk Customer-Veterinarian Association Script
 *
 * Automatically associates customers with veterinarians based on:
 * 1. Their pets' existing veterinarian assignments
 * 2. Most common veterinarian per customer
 * 3. Historical vetName/vetPhone data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function bulkAssociateCustomersToVeterinarians() {
  console.log('🔗 Bulk Customer-Veterinarian Association');
  console.log('═══════════════════════════════════════════════════');

  try {
    // First, ensure veterinarianId column exists
    try {
      await prisma.$executeRaw`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS "veterinarianId" TEXT
      `;
      console.log('✅ veterinarianId column verified');
    } catch (error) {
      console.log('ℹ️ veterinarianId column already exists');
    }

    // Create index for performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS customers_veterinarian_id_idx 
      ON customers("veterinarianId")
    `;

    // Step 1: Get all customers with pets that have veterinarianId
    console.log(
      '\n📊 Step 1: Finding customers with pets that have veterinarians...'
    );

    const customersWithPetVets = await prisma.$queryRaw`
      SELECT DISTINCT 
        c.id as customer_id,
        c."firstName",
        c."lastName",
        p."veterinarianId",
        v.name as vet_name,
        v.phone as vet_phone,
        COUNT(*) as pet_count,
        MAX(p."updatedAt") as last_pet_update
      FROM customers c
      JOIN pets p ON c.id = p."customerId"
      JOIN veterinarians v ON p."veterinarianId"::text = v.id::text
      WHERE p."veterinarianId" IS NOT NULL
        AND c."isActive" = true
        AND p."isActive" = true
      GROUP BY c.id, c."firstName", c."lastName", p."veterinarianId", v.name, v.phone
      ORDER BY pet_count DESC, last_pet_update DESC
    `;

    console.log(
      `Found ${customersWithPetVets.length} customers with pets that have veterinarians`
    );

    // Step 2: Get customers with pets that have legacy vetName/vetPhone
    console.log(
      '\n📊 Step 2: Finding customers with pets that have legacy vet data...'
    );

    const customersWithLegacyVets = await prisma.$queryRaw`
      SELECT DISTINCT 
        c.id as customer_id,
        c."firstName",
        c."lastName",
        p."vetName",
        p."vetPhone",
        COUNT(*) as pet_count
      FROM customers c
      JOIN pets p ON c.id = p."customerId"
      WHERE p."vetName" IS NOT NULL 
        AND p."vetName" != ''
        AND c."isActive" = true
        AND p."isActive" = true
        AND (c."veterinarianId" IS NULL OR p."veterinarianId" IS NULL)
      GROUP BY c.id, c."firstName", c."lastName\", p."vetName\", p."vetPhone\"
      ORDER BY pet_count DESC
    `;

    console.log(
      `Found ${customersWithLegacyVets.length} customers with pets that have legacy vet data`
    );

    let totalUpdated = 0;

    // Step 3: Update customers with veterinarianId from their pets
    console.log(
      '\n🔄 Step 3: Updating customers with veterinarianId from pets...'
    );

    for (const customer of customersWithPetVets) {
      await prisma.$executeRaw`
        UPDATE customers
        SET "veterinarianId" = ${customer.veterinarianId},
            "updatedAt" = NOW()
        WHERE id = ${customer.customer_id}
      `;

      console.log(
        `✅ Updated: ${customer.firstName} ${customer.lastName} → ${customer.vet_name} (${customer.pet_count} pets)`
      );
      totalUpdated++;
    }

    // Step 4: Try to match legacy vet names to actual veterinarians
    console.log('\n🔄 Step 4: Matching legacy vet names to veterinarians...');

    for (const customer of customersWithLegacyVets) {
      // Try exact match first
      let vetMatch = await prisma.$queryRaw`
        SELECT id, name, phone
        FROM veterinarians
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${customer.vetName}))
          AND "isActive" = true
        LIMIT 1
      `;

      // If no exact match, try fuzzy matching
      if (!vetMatch || vetMatch.length === 0) {
        vetMatch = await prisma.$queryRaw`
          SELECT id, name, phone,
            similarity(LOWER(name), LOWER(${customer.vetName})) as similarity_score
          FROM veterinarians
          WHERE "isActive" = true
            AND similarity(LOWER(name), LOWER(${customer.vetName})) > 0.3
          ORDER BY similarity_score DESC, name ASC
          LIMIT 1
        `;
      }

      if (vetMatch && vetMatch.length > 0) {
        const vet = vetMatch[0];

        await prisma.$executeRaw`
          UPDATE customers
          SET "veterinarianId" = ${vet.id},
              "updatedAt" = NOW()
          WHERE id = ${customer.customer_id}
        `;

        console.log(
          `✅ Matched: ${customer.firstName} ${customer.lastName} → ${vet.name} (from "${customer.vetName}")`
        );
        totalUpdated++;

        // Also update the pets to use the veterinarianId
        await prisma.$executeRaw`
          UPDATE pets
          SET "veterinarianId" = ${vet.id},
              "updatedAt" = NOW()
          WHERE "customerId" = ${customer.customer_id}
            AND "vetName" = ${customer.vetName}
            AND "veterinarianId" IS NULL
        `;
      } else {
        console.log(
          `❌ No match: ${customer.firstName} ${customer.lastName} → "${customer.vetName}"`
        );
      }
    }

    // Step 5: Update all pets for customers with veterinarians
    console.log(
      '\n🔄 Step 5: Updating all pets for customers with veterinarians...'
    );

    const petsUpdated = await prisma.$executeRaw`
      UPDATE pets p
      SET "veterinarianId" = c."veterinarianId",
          "updatedAt" = NOW()
      FROM customers c
      WHERE p."customerId" = c.id
        AND c."veterinarianId" IS NOT NULL
        AND p."veterinarianId" IS NULL
    `;

    console.log(`✅ Updated ${petsUpdated} pets with customer's veterinarian`);

    // Final statistics
    const finalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN c."veterinarianId" IS NOT NULL THEN 1 END) as customers_with_vet,
        COUNT(CASE WHEN p."veterinarianId" IS NOT NULL THEN 1 END) as pets_with_vet,
        COUNT(*) as total_customers,
        COUNT(p.*) as total_pets
      FROM customers c
      LEFT JOIN pets p ON c.id = p."customerId"
      WHERE c."isActive" = true
    `;

    console.log('\n📈 Final Results:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Customers updated: ${totalUpdated}`);
    console.log(`✅ Pets automatically updated: ${petsUpdated}`);
    console.log(
      `📊 Customers with veterinarian: ${finalStats[0].customers_with_vet} / ${finalStats[0].total_customers}`
    );
    console.log(
      `📊 Pets with veterinarian: ${finalStats[0].pets_with_vet} / ${finalStats[0].total_pets}`
    );
    console.log(
      `📈 Customer coverage: ${((finalStats[0].customers_with_vet / finalStats[0].total_customers) * 100).toFixed(2)}%`
    );
    console.log(
      `📈 Pet coverage: ${((finalStats[0].pets_with_vet / finalStats[0].total_pets) * 100).toFixed(2)}%`
    );
  } catch (error) {
    console.error('❌ Error in bulk association:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
bulkAssociateCustomersToVeterinarians().catch(console.error);
