/**
 * Sync Gingr Reservations - Production Version
 * 
 * This version works in both local and production (Digital Ocean) environments.
 * Uses environment variables for configuration and connects directly to PostgreSQL.
 */

import pg from 'pg';
const { Pool } = pg;

// Configuration from environment variables
const GINGR_CONFIG = {
  subdomain: process.env.GINGR_SUBDOMAIN || 'tailtownpetresort',
  apiKey: process.env.GINGR_API_KEY || 'c84c09ecfacdf23a495505d2ae1df533',
  baseUrl: process.env.GINGR_BASE_URL || 'https://tailtownpetresort.gingrapp.com/api/v1'
};

const TENANT_ID = process.env.TENANT_ID || 'dev';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/customer',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
  const result = await pool.query(
    'SELECT "externalId" FROM reservations WHERE "externalId" IS NOT NULL'
  );
  
  const ids = new Set(result.rows.map(row => row.externalId));
  console.log(`📊 Found ${ids.size} existing reservations in database`);
  return ids;
}

// Get customer mappings
async function getCustomerMap() {
  const result = await pool.query(
    'SELECT "externalId", id FROM customers WHERE "externalId" IS NOT NULL'
  );
  
  const map = new Map(result.rows.map(row => [row.externalId, row.id]));
  console.log(`📊 Loaded ${map.size} customer mappings`);
  return map;
}

// Get pet mappings
async function getPetMap() {
  const result = await pool.query(
    'SELECT "externalId", id FROM pets WHERE "externalId" IS NOT NULL'
  );
  
  const map = new Map(result.rows.map(row => [row.externalId, row.id]));
  console.log(`📊 Loaded ${map.size} pet mappings`);
  return map;
}

// Get service mappings
async function getServiceMap() {
  const result = await pool.query(
    'SELECT "externalId", id FROM services WHERE "externalId" IS NOT NULL'
  );
  
  const map = new Map(result.rows.map(row => [row.externalId, row.id]));
  console.log(`📊 Loaded ${map.size} service mappings`);
  return map;
}

// Get all available resources
async function getResourceList() {
  const result = await pool.query(
    `SELECT id, name FROM resources 
     WHERE type IN ('STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE') 
     AND name ~ '^[A-D]' 
     ORDER BY name`
  );
  
  console.log(`📊 Loaded ${result.rows.length} available resources`);
  return result.rows;
}

// Find available resource for a reservation
async function findAvailableResource(startDate, endDate, resources) {
  for (const resource of resources) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM reservations 
       WHERE "resourceId" = $1 
       AND status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
       AND "startDate" < $2 
       AND "endDate" > $3`,
      [resource.id, endDate, startDate]
    );
    
    if (parseInt(result.rows[0].count) === 0) {
      return resource.id;
    }
  }
  
  console.warn(`⚠️  No available resource found for ${startDate} to ${endDate}, using first resource`);
  return resources[0]?.id;
}

// Determine reservation status
function determineStatus(reservation) {
  if (reservation.cancelled_date) return 'CANCELLED';
  if (reservation.check_in_date && !reservation.check_out_date) return 'CHECKED_IN';
  if (reservation.check_out_date) return 'COMPLETED';
  if (reservation.confirmed_date) return 'CONFIRMED';
  return 'PENDING';
}

async function syncReservations() {
  try {
    console.log('🔄 Starting Gingr reservation sync...\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // Get date range
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Load mappings
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
        const notes = reservation.notes?.reservation_notes || null;
        const checkInDate = reservation.check_in_date || null;
        const checkOutDate = reservation.check_out_date || null;

        await pool.query(
          `UPDATE reservations SET
            "startDate" = $1,
            "endDate" = $2,
            status = $3,
            notes = $4,
            "checkInDate" = $5,
            "checkOutDate" = $6,
            "customerId" = $7,
            "petId" = $8,
            "serviceId" = $9,
            "updatedAt" = NOW()
          WHERE "externalId" = $10`,
          [
            reservation.start_date,
            reservation.end_date,
            status,
            notes,
            checkInDate,
            checkOutDate,
            customerId,
            petId,
            serviceId,
            reservation.reservation_id
          ]
        );
      }
      
      console.log(`✅ Updated ${existingReservations.length} reservations\n`);
    }

    // Insert new reservations
    if (newReservations.length > 0) {
      console.log(`➕ Adding ${newReservations.length} new reservations...`);
      
      let addedCount = 0;
      for (const reservation of newReservations) {
        const customerId = customerMap.get(reservation.owner.id);
        const petId = petMap.get(reservation.animal.id);
        const serviceId = serviceMap.get(reservation.reservation_type.id);
        const status = determineStatus(reservation);
        const notes = reservation.notes?.reservation_notes || null;
        const checkInDate = reservation.check_in_date || null;
        const checkOutDate = reservation.check_out_date || null;

        // Find available resource
        const resourceId = await findAvailableResource(
          reservation.start_date,
          reservation.end_date,
          resources
        );

        await pool.query(
          `INSERT INTO reservations (
            "startDate", "endDate", status, notes,
            "checkInDate", "checkOutDate",
            "createdAt", "updatedAt", "customerId", "petId", "serviceId",
            "resourceId", "tenantId", "externalId"
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7, $8, $9, $10, $11, $12)`,
          [
            reservation.start_date,
            reservation.end_date,
            status,
            notes,
            checkInDate,
            checkOutDate,
            customerId,
            petId,
            serviceId,
            resourceId,
            TENANT_ID,
            reservation.reservation_id
          ]
        );
        
        addedCount++;
        
        if (addedCount % 10 === 0) {
          process.stdout.write(`   Added ${addedCount}/${newReservations.length}...\r`);
        }
      }
      
      console.log(`✅ Added ${addedCount} new reservations\n`);
    }

    // Validate no overlaps
    console.log('🔍 Validating no overlaps...');
    const overlapResult = await pool.query(
      `SELECT COUNT(*) as count FROM reservations r1 
       JOIN reservations r2 ON r1."resourceId" = r2."resourceId" AND r1.id < r2.id 
       WHERE r1.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
       AND r2.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
       AND r1."startDate" < r2."endDate"
       AND r1."endDate" > r2."startDate"`
    );
    
    const overlapCount = parseInt(overlapResult.rows[0].count);
    
    if (overlapCount > 0) {
      console.log(`⚠️  Warning: ${overlapCount} overlaps detected. Run fix-overlapping-reservations.sql to resolve.\n`);
    } else {
      console.log(`✅ No overlaps detected!\n`);
    }

    console.log('✅ Sync complete!');
    
  } catch (error) {
    console.error('❌ Error syncing reservations:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the sync
syncReservations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
