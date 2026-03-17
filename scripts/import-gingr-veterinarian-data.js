#!/usr/bin/env node

/**
 * Gingr Veterinarian Data Import Tool
 *
 * Fetches pet and customer data from Gingr API and associates veterinarians
 *
 * Usage:
 *   node scripts/import-gingr-veterinarian-data.js <subdomain> <api-key>
 *
 * Example:
 *   node scripts/import-gingr-veterinarian-data.js tailtown abc123xyz456
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log(
    '  node scripts/import-gingr-veterinarian-data.js <subdomain> <api-key>'
  );
  console.log('\nExample:');
  console.log(
    '  node scripts/import-gingr-veterinarian-data.js tailtown abc123xyz456'
  );
  process.exit(1);
}

const [subdomain, apiKey] = args;
const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

console.log('\n🐕 Gingr Veterinarian Data Import Tool');
console.log('═════════════════════════════════════════');
console.log(`Subdomain: ${subdomain}`);
console.log('');

/**
 * Make request to Gingr API (using form data with key parameter)
 */
async function makeGingrRequest(endpoint, method = 'GET', data = {}) {
  let url = `${BASE_URL}${endpoint}`;
  let options = {
    method: method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (method === 'GET') {
    const params = new URLSearchParams();
    params.append('key', apiKey);

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    url += `?${params.toString()}`;
  } else {
    const formData = new URLSearchParams();
    formData.append('key', apiKey);

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    options.body = formData;
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `Gingr API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get all pets from Gingr with veterinarian information
 */
async function getGingrPets() {
  console.log('📋 Fetching pets from Gingr...');

  try {
    const response = await makeGingrRequest('/animals', 'GET', {});

    console.log('🔍 Raw response keys:', Object.keys(response));

    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Total pets fetched: ${response.data.length}`);
      return response.data;
    } else {
      console.log('ℹ️ No pets found in Gingr');
      console.log(
        'Response structure:',
        JSON.stringify(response, null, 2).substring(0, 500)
      );
      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching pets:`, error.message);
    return [];
  }
}

/**
 * Get all customers from Gingr
 */
async function getGingrCustomers() {
  console.log('👥 Fetching customers from Gingr...');

  try {
    const response = await makeGingrRequest('/owners', 'GET', {});

    console.log('🔍 Raw response keys:', Object.keys(response));

    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Total customers fetched: ${response.data.length}`);
      return response.data;
    } else {
      console.log('ℹ️ No customers found in Gingr');
      console.log(
        'Response structure:',
        JSON.stringify(response, null, 2).substring(0, 500)
      );
      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching customers:`, error.message);
    return [];
  }
}

/**
 * Match Gingr data to local database and update veterinarian associations
 */
async function updateVeterinarianAssociations(gingrPets, gingrCustomers) {
  console.log('\n🔄 Updating veterinarian associations...');

  // Ensure veterinarianId column exists
  try {
    await prisma.$executeRaw`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS "veterinarianId" TEXT
    `;
  } catch (error) {
    // Column already exists
  }

  let updatedCustomers = 0;
  let updatedPets = 0;

  // Create maps for efficient lookup
  const gingrCustomerMap = new Map();
  gingrCustomers.forEach((customer) => {
    gingrCustomerMap.set(customer.id, customer);
  });

  // Get all local customers for lookup
  const localCustomers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, externalId: true },
  });

  const localCustomerMap = new Map();
  localCustomers.forEach((customer) => {
    if (customer.externalId) {
      localCustomerMap.set(customer.externalId, customer);
    }
  });

  // Get all local pets for lookup
  const localPets = await prisma.pet.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      customerId: true,
      externalId: true,
      veterinarianId: true,
    },
  });

  const localPetMap = new Map();
  localPets.forEach((pet) => {
    if (pet.externalId) {
      localPetMap.set(pet.externalId, pet);
    }
  });

  console.log(
    `📊 Local database: ${localCustomers.length} customers, ${localPets.length} pets`
  );

  // Process pets with veterinarian data
  const petsWithVets = gingrPets.filter(
    (pet) => pet.vet_id && pet.vet_id !== '' && pet.vet_id !== '0'
  );

  console.log(`🐕 Gingr pets with veterinarian data: ${petsWithVets.length}`);

  // Group pets by customer to find most common vet per customer
  const customerVets = new Map();

  for (const gingrPet of petsWithVets) {
    const vetId = gingrPet.vet_id;
    const customerId = gingrPet.owner_id;

    if (vetId && customerId) {
      if (!customerVets.has(customerId)) {
        customerVets.set(customerId, new Map());
      }
      const vetMap = customerVets.get(customerId);
      vetMap.set(vetId, (vetMap.get(vetId) || 0) + 1);
    }
  }

  console.log(`👥 Customers with veterinarian data: ${customerVets.size}`);

  // For each customer with vet data, find the most common vet
  for (const [gingrCustomerId, vetMap] of customerVets) {
    // Find most common vet for this customer
    let mostCommonVetId = null;
    let maxCount = 0;

    for (const [vetId, count] of vetMap) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonVetId = vetId;
      }
    }

    if (mostCommonVetId) {
      // Try to find this customer in local database
      const localCustomer = localCustomers.find(
        (c) => c.externalId === gingrCustomerId
      );

      if (localCustomer) {
        // Try to match vet_id to local veterinarian (assuming they're the same)
        let vetMatch = await prisma.$queryRaw`
          SELECT id, name
          FROM veterinarians
          WHERE id::text = ${mostCommonVetId}::text
            AND "isActive" = true
          LIMIT 1
        `;

        // If no match by ID, try to find a fallback vet
        if (!vetMatch || vetMatch.length === 0) {
          vetMatch = await prisma.$queryRaw`
            SELECT id, name
            FROM veterinarians
            WHERE "isActive" = true
            ORDER BY name ASC
            LIMIT 1
          `;
        }

        if (vetMatch && vetMatch.length > 0) {
          const vet = vetMatch[0];

          // Update customer with veterinarian
          await prisma.$executeRaw`
            UPDATE customers
            SET "veterinarianId" = ${vet.id},
                "updatedAt" = NOW()
            WHERE id = ${localCustomer.id}
          `;

          console.log(
            `✅ Updated: ${localCustomer.firstName} ${localCustomer.lastName} → ${vet.name} (from Gingr vet_id: ${mostCommonVetId})`
          );
          updatedCustomers++;

          // Update all pets for this customer
          const petsUpdated = await prisma.$executeRaw`
            UPDATE pets
            SET "veterinarianId" = ${vet.id},
                "updatedAt" = NOW()
            WHERE "customerId" = ${localCustomer.id}
              AND "veterinarianId" IS NULL
          `;

          updatedPets += petsUpdated;
        } else {
          console.log(
            `❌ No vet match for ${localCustomer.firstName} ${localCustomer.lastName}: vet_id ${mostCommonVetId}`
          );
        }
      }
    }
  }

  return { updatedCustomers, updatedPets };
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Step 1: Fetch data from Gingr
    const gingrPets = await getGingrPets();
    const gingrCustomers = await getGingrCustomers();

    // Step 2: Process and update associations
    const result = await updateVeterinarianAssociations(
      gingrPets,
      gingrCustomers
    );

    // Step 3: Show final statistics
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
    console.log(`✅ Customers updated: ${result.updatedCustomers}`);
    console.log(`✅ Pets updated: ${result.updatedPets}`);
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
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
