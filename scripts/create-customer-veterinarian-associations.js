#!/usr/bin/env node

/**
 * Create Customer-Veterinarian Associations Script
 *
 * Creates customer-veterinarian relationships based on:
 * 1. Existing pet-veterinarian associations
 * 2. Most common veterinarian per customer
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createCustomerVeterinarianAssociations() {
  console.log('👥 Creating Customer-Veterinarian Associations');
  console.log('═══════════════════════════════════════════════════');

  try {
    // First, let's add veterinarianId to customers table if not exists
    try {
      await prisma.$executeRaw`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS "veterinarianId" TEXT
      `;
      console.log('✅ Added veterinarianId column to customers table');
    } catch (error) {
      console.log('ℹ️ veterinarianId column already exists');
    }

    // Create index for performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS customers_veterinarian_id_idx 
      ON customers("veterinarianId")
    `;

    // Get customers with pets that have veterinarian associations
    const customersWithPetVets = await prisma.$queryRaw`
      SELECT DISTINCT 
        c.id as customer_id,
        c."firstName",
        c."lastName",
        p."veterinarianId",
        v.name as vet_name,
        COUNT(*) as pet_count
      FROM customers c
      JOIN pets p ON c.id = p."customerId"
      JOIN veterinarians v ON p."veterinarianId" = v.id::text
      WHERE p."veterinarianId" IS NOT NULL
        AND c."isActive" = true
        AND p."isActive" = true
      GROUP BY c.id, c."firstName", c."lastName", p."veterinarianId", v.name
      ORDER BY pet_count DESC
    `;

    console.log(
      `Found ${customersWithPetVets.length} customers with pets that have veterinarian associations`
    );

    let updatedCount = 0;

    for (const customer of customersWithPetVets) {
      // Update customer with their pets' veterinarian
      await prisma.$executeRaw`
        UPDATE customers
        SET "veterinarianId" = ${customer.veterinarianId},
            "updatedAt" = NOW()
        WHERE id = ${customer.customer_id}
      `;

      console.log(
        `✅ Updated: ${customer.firstName} ${customer.lastName} → ${customer.vet_name} (${customer.pet_count} pets)`
      );
      updatedCount++;
    }

    console.log('\n📊 Results Summary:');
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`✅ Customers updated: ${updatedCount}`);

    // Now let's update all pets for these customers to use the same veterinarian
    if (updatedCount > 0) {
      const petsUpdated = await prisma.$executeRaw`
        UPDATE pets p
        SET "veterinarianId" = c."veterinarianId",
            "updatedAt" = NOW()
        FROM customers c
        WHERE p."customerId" = c.id
          AND c."veterinarianId" IS NOT NULL
          AND p."veterinarianId" IS NULL
      `;

      console.log(`✅ Pets automatically updated: ${petsUpdated}`);
    }

    // Show final statistics
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN c."veterinarianId" IS NOT NULL THEN 1 END) as customers_with_vet,
        COUNT(CASE WHEN p."veterinarianId" IS NOT NULL THEN 1 END) as pets_with_vet,
        COUNT(*) as total_customers,
        COUNT(p.*) as total_pets
      FROM customers c
      LEFT JOIN pets p ON c.id = p."customerId"
      WHERE c."isActive" = true
    `;

    console.log('\n📈 Final Statistics:');
    console.log(`═══════════════════════════════════════════════════`);
    console.log(
      `Customers with veterinarian: ${stats[0].customers_with_vet} / ${stats[0].total_customers}`
    );
    console.log(
      `Pets with veterinarian: ${stats[0].pets_with_vet} / ${stats[0].total_pets}`
    );
  } catch (error) {
    console.error(
      '❌ Error creating customer-veterinarian associations:',
      error
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createCustomerVeterinarianAssociations().catch(console.error);
