/**
 * Sync Gingr Reservations
 * 
 * This script syncs reservations from Gingr to our database:
 * - Updates existing reservations (by externalId)
 * - Adds new reservations
 * - Assigns suites intelligently to avoid overlaps
 * - Preserves existing suite assignments when possible
 */

import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
  baseUrl: 'https://tailtownpetresort.gingrapp.com/api/v1'
};

const TENANT_ID = 'dev';

// Fetch reservations from Gingr
async function fetchGingrReservations(startDate, endDate) {
  const formData = new URLSearchParams();
  formData.append('key', GINGR_CONFIG.apiKey);
  formData.append('start_date', startDate);
  formData.append('end_date', endDate);

  console.log(`📥 Fetching Gingr reservations from ${startDate} to ${endDate}...`);
  
  const response = await fetch(`${GINGR_CONFIG.baseUrl}/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Gingr API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.data && typeof data.data === 'object') {
    return Object.values(data.data);
  }
  
  return [];
}

// Get existing reservation external IDs
async function getExistingReservationIds() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT \\"externalId\\" FROM reservations WHERE \\"externalId\\" IS NOT NULL;"`
  );
  
  const ids = new Set();
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    const id = line.trim();
    if (id) {
      ids.add(id);
    }
  }
  
  console.log(`📊 Found ${ids.size} existing reservations in database`);
  return ids;
}

// Get customer ID by Gingr owner ID
async function getCustomerMap() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT \\"externalId\\", id FROM customers WHERE \\"externalId\\" IS NOT NULL;"`
  );
  
  const map = new Map();
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    const [externalId, id] = line.trim().split('|').map(s => s.trim());
    if (externalId && id) {
      map.set(externalId, id);
    }
  }
  
  console.log(`📊 Loaded ${map.size} customer mappings`);
  return map;
}

// Get pet ID by Gingr animal ID
async function getPetMap() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT \\"externalId\\", id FROM pets WHERE \\"externalId\\" IS NOT NULL;"`
  );
  
  const map = new Map();
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    const [externalId, id] = line.trim().split('|').map(s => s.trim());
    if (externalId && id) {
      map.set(externalId, id);
    }
  }
  
  console.log(`📊 Loaded ${map.size} pet mappings`);
  return map;
}

// Get service ID by Gingr reservation type ID
async function getServiceMap() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT \\"externalId\\", id FROM services WHERE \\"externalId\\" IS NOT NULL;"`
  );
  
  const map = new Map();
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    const [externalId, id] = line.trim().split('|').map(s => s.trim());
    if (externalId && id) {
      map.set(externalId, id);
    }
  }
  
  console.log(`📊 Loaded ${map.size} service mappings`);
  return map;
}

// Get all available resources
async function getResourceList() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT id, name FROM resources WHERE type IN ('STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE') AND name ~ '^[A-D]' ORDER BY name;"`
  );
  
  const resources = [];
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    const [id, name] = line.trim().split('|').map(s => s.trim());
    if (id && name) {
      resources.push({ id, name });
    }
  }
  
  console.log(`📊 Loaded ${resources.length} available resources`);
  return resources;
}

// Find available resource for a reservation (avoiding overlaps)
async function findAvailableResource(startDate, endDate, resources) {
  for (const resource of resources) {
    // Check if this resource has any overlapping reservations
    const { stdout } = await execAsync(
      `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT COUNT(*) FROM reservations WHERE \\"resourceId\\" = '${resource.id}' AND status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING') AND \\"startDate\\" < '${endDate}' AND \\"endDate\\" > '${startDate}';"`
    );
    
    const count = parseInt(stdout.trim());
    if (count === 0) {
      return resource.id;
    }
  }
  
  // If no resource available, return first one (shouldn't happen with enough resources)
  console.warn(`⚠️  No available resource found for ${startDate} to ${endDate}, using first resource`);
  return resources[0]?.id;
}

// Escape SQL strings
function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

// Determine reservation status
function determineStatus(reservation) {
  if (reservation.cancelled_date) {
    return 'CANCELLED';
  } else if (reservation.check_in_date && !reservation.check_out_date) {
    return 'CHECKED_IN';
  } else if (reservation.check_out_date) {
    return 'COMPLETED';
  } else if (reservation.confirmed_date) {
    return 'CONFIRMED';
  } else {
    return 'PENDING';
  }
}

async function syncReservations() {
  try {
    console.log('🔄 Starting Gingr reservation sync...\n');

    // Get date range (last 30 days to next 90 days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Load mappings and existing data
    console.log('📊 Loading database mappings...');
    const [customerMap, petMap, serviceMap, resources, existingIds] = await Promise.all([
      getCustomerMap(),
      getPetMap(),
      getServiceMap(),
      getResourceList(),
      getExistingReservationIds()
    ]);
    
    console.log();

    // Fetch Gingr reservations
    const gingrReservations = await fetchGingrReservations(startDateStr, endDateStr);
    console.log(`📥 Fetched ${gingrReservations.length} reservations from Gingr\n`);

    // Categorize reservations
    const newReservations = [];
    const existingReservations = [];
    const skippedReservations = [];

    for (const reservation of gingrReservations) {
      const customerId = customerMap.get(reservation.owner.id);
      const petId = petMap.get(reservation.animal.id);
      const serviceId = serviceMap.get(reservation.reservation_type.id);
      
      if (!customerId || !petId || !serviceId) {
        skippedReservations.push({
          id: reservation.reservation_id,
          reason: `Missing mapping (customer: ${!!customerId}, pet: ${!!petId}, service: ${!!serviceId})`
        });
        continue;
      }

      if (existingIds.has(reservation.reservation_id)) {
        existingReservations.push(reservation);
      } else {
        newReservations.push(reservation);
      }
    }

    console.log(`📊 Sync Summary:`);
    console.log(`   New reservations: ${newReservations.length}`);
    console.log(`   Existing reservations to update: ${existingReservations.length}`);
    console.log(`   Skipped (missing mappings): ${skippedReservations.length}\n`);

    if (skippedReservations.length > 0) {
      console.log(`⚠️  Skipped reservations:`);
      skippedReservations.slice(0, 5).forEach(s => {
        console.log(`   - ${s.id}: ${s.reason}`);
      });
      if (skippedReservations.length > 5) {
        console.log(`   ... and ${skippedReservations.length - 5} more`);
      }
      console.log();
    }

    // Update existing reservations
    if (existingReservations.length > 0) {
      console.log(`🔄 Updating ${existingReservations.length} existing reservations...`);
      
      for (const reservation of existingReservations) {
        const customerId = customerMap.get(reservation.owner.id);
        const petId = petMap.get(reservation.animal.id);
        const serviceId = serviceMap.get(reservation.reservation_type.id);
        const status = determineStatus(reservation);
        const notes = reservation.notes?.reservation_notes || '';
        const checkInDate = reservation.check_in_date || null;
        const checkOutDate = reservation.check_out_date || null;

        const updateSql = `
          UPDATE reservations SET
            "startDate" = '${reservation.start_date}',
            "endDate" = '${reservation.end_date}',
            status = '${status}',
            notes = ${escapeSql(notes)},
            "checkInDate" = ${checkInDate ? `'${checkInDate}'` : 'NULL'},
            "checkOutDate" = ${checkOutDate ? `'${checkOutDate}'` : 'NULL'},
            "customerId" = '${customerId}',
            "petId" = '${petId}',
            "serviceId" = '${serviceId}',
            "updatedAt" = NOW()
          WHERE "externalId" = '${reservation.reservation_id}';
        `;

        await execAsync(
          `docker exec tailtown-postgres psql -U postgres -d customer -c "${updateSql.replace(/"/g, '\\"')}"`
        );
      }
      
      console.log(`✅ Updated ${existingReservations.length} reservations\n`);
    }

    // Insert new reservations with smart resource assignment
    if (newReservations.length > 0) {
      console.log(`➕ Adding ${newReservations.length} new reservations...`);
      
      let addedCount = 0;
      for (const reservation of newReservations) {
        const customerId = customerMap.get(reservation.owner.id);
        const petId = petMap.get(reservation.animal.id);
        const serviceId = serviceMap.get(reservation.reservation_type.id);
        const status = determineStatus(reservation);
        const notes = reservation.notes?.reservation_notes || '';
        const checkInDate = reservation.check_in_date || null;
        const checkOutDate = reservation.check_out_date || null;

        // Find available resource
        const resourceId = await findAvailableResource(
          reservation.start_date,
          reservation.end_date,
          resources
        );

        const insertSql = `
          INSERT INTO reservations (
            id, "startDate", "endDate", status, notes,
            "checkInWindow", "customPickupPerson", "earlyDropOff", "latePickup",
            "preChecked", "checkInDate", "checkOutDate", "isRecurring",
            "createdAt", "updatedAt", "customerId", "petId", "serviceId",
            "resourceId", "tenantId", "externalId"
          ) VALUES (
            gen_random_uuid(),
            '${reservation.start_date}',
            '${reservation.end_date}',
            '${status}',
            ${escapeSql(notes)},
            NULL, NULL, false, false, false,
            ${checkInDate ? `'${checkInDate}'` : 'NULL'},
            ${checkOutDate ? `'${checkOutDate}'` : 'NULL'},
            false,
            NOW(), NOW(),
            '${customerId}',
            '${petId}',
            '${serviceId}',
            '${resourceId}',
            '${TENANT_ID}',
            '${reservation.reservation_id}'
          );
        `;

        await execAsync(
          `docker exec tailtown-postgres psql -U postgres -d customer -c "${insertSql.replace(/"/g, '\\"')}"`
        );
        
        addedCount++;
        
        // Progress indicator
        if (addedCount % 10 === 0) {
          process.stdout.write(`   Added ${addedCount}/${newReservations.length}...\r`);
        }
      }
      
      console.log(`✅ Added ${addedCount} new reservations\n`);
    }

    // Validate no overlaps
    console.log('🔍 Validating no overlaps...');
    const { stdout } = await execAsync(
      `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT COUNT(*) FROM reservations r1 JOIN reservations r2 ON r1.\\"resourceId\\" = r2.\\"resourceId\\" AND r1.id < r2.id WHERE r1.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING') AND r2.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING') AND r1.\\"startDate\\" < r2.\\"endDate\\" AND r1.\\"endDate\\" > r2.\\"startDate\\";"`
    );
    
    const overlapCount = parseInt(stdout.trim());
    
    if (overlapCount > 0) {
      console.log(`⚠️  Warning: ${overlapCount} overlaps detected. Run fix-overlapping-reservations.sql to resolve.\n`);
    } else {
      console.log(`✅ No overlaps detected!\n`);
    }

    console.log('✅ Sync complete!');
    
  } catch (error) {
    console.error('❌ Error syncing reservations:', error);
    process.exit(1);
  }
}

// Run the sync
syncReservations();
