/**
 * Direct SQL Import for Gingr Reservations
 * Fast import that generates SQL directly instead of using API
 */

import { createWriteStream } from 'fs';
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

  console.log(`Fetching Gingr reservations from ${startDate} to ${endDate}...`);
  
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
  
  console.log(`Loaded ${map.size} customer mappings`);
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
  
  console.log(`Loaded ${map.size} pet mappings`);
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
  
  console.log(`Loaded ${map.size} service mappings`);
  return map;
}

// Get default resource ID
async function getDefaultResourceId() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT id FROM resources WHERE type = 'STANDARD_SUITE' LIMIT 1;"`
  );
  
  return stdout.trim();
}

// Escape SQL strings
function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

// Convert Gingr reservation to SQL INSERT
function reservationToSql(reservation, customerMap, petMap, serviceMap, defaultResourceId) {
  const customerId = customerMap.get(reservation.owner.id);
  const petId = petMap.get(reservation.animal.id);
  const serviceId = serviceMap.get(reservation.reservation_type.id);
  
  if (!customerId || !petId || !serviceId) {
    return null; // Skip if we can't map all IDs
  }
  
  // Determine status
  let status = 'CONFIRMED';
  if (reservation.cancelled_date) {
    status = 'CANCELLED';
  } else if (reservation.check_in_date && !reservation.check_out_date) {
    status = 'CHECKED_IN';
  } else if (reservation.check_out_date) {
    status = 'COMPLETED';
  } else if (reservation.confirmed_date) {
    status = 'CONFIRMED';
  } else {
    status = 'PENDING';
  }
  
  const notes = reservation.notes?.reservation_notes || '';
  const checkInDate = reservation.check_in_date ? `'${reservation.check_in_date}'` : 'NULL';
  const checkOutDate = reservation.check_out_date ? `'${reservation.check_out_date}'` : 'NULL';
  
  return `(
    gen_random_uuid(),
    '${reservation.start_date}',
    '${reservation.end_date}',
    '${status}',
    ${escapeSql(notes)},
    NULL,
    NULL,
    false,
    NULL,
    false,
    ${checkInDate},
    ${checkOutDate},
    false,
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW(),
    '${customerId}',
    '${petId}',
    '${serviceId}',
    '${defaultResourceId}',
    NULL,
    NULL,
    '${TENANT_ID}',
    '${reservation.reservation_id}'
  )`;
}

async function importReservations() {
  try {
    console.log('Starting direct SQL reservation import...\n');

    // Load mappings
    console.log('Loading database mappings...');
    const [customerMap, petMap, serviceMap, defaultResourceId] = await Promise.all([
      getCustomerMap(),
      getPetMap(),
      getServiceMap(),
      getDefaultResourceId()
    ]);
    
    console.log(`Default resource ID: ${defaultResourceId}\n`);

    // Fetch reservations for all of 2025 (and late 2024)
    console.log('Fetching 2025 reservations in batches...\n');
    
    const months = [
      { start: '2024-12-01', end: '2024-12-31', name: 'December 2024' },
      { start: '2025-01-01', end: '2025-01-31', name: 'January 2025' },
      { start: '2025-02-01', end: '2025-02-28', name: 'February 2025' },
      { start: '2025-03-01', end: '2025-03-31', name: 'March 2025' },
      { start: '2025-04-01', end: '2025-04-30', name: 'April 2025' },
      { start: '2025-05-01', end: '2025-05-31', name: 'May 2025' },
      { start: '2025-06-01', end: '2025-06-30', name: 'June 2025' },
      { start: '2025-07-01', end: '2025-07-31', name: 'July 2025' },
      { start: '2025-08-01', end: '2025-08-31', name: 'August 2025' },
      { start: '2025-09-01', end: '2025-09-30', name: 'September 2025' },
      { start: '2025-10-01', end: '2025-10-31', name: 'October 2025' },
      { start: '2025-11-01', end: '2025-11-30', name: 'November 2025' },
      { start: '2025-12-01', end: '2025-12-31', name: 'December 2025' }
    ];
    
    const allReservations = [];
    for (const month of months) {
      console.log(`Fetching ${month.name}...`);
      const monthReservations = await fetchGingrReservations(month.start, month.end);
      console.log(`  Found ${monthReservations.length} reservations`);
      allReservations.push(...monthReservations);
    }
    
    const reservations = allReservations;
    console.log(`\nTotal reservations fetched: ${reservations.length}\n`);

    // Convert to SQL (deduplicate by externalId)
    console.log('Converting reservations to SQL...');
    const sqlValues = [];
    const seenExternalIds = new Set();
    let skipped = 0;
    let duplicates = 0;
    
    for (const reservation of reservations) {
      // Skip duplicates
      if (seenExternalIds.has(reservation.reservation_id)) {
        duplicates++;
        continue;
      }
      
      const sql = reservationToSql(reservation, customerMap, petMap, serviceMap, defaultResourceId);
      if (sql) {
        sqlValues.push(sql);
        seenExternalIds.add(reservation.reservation_id);
      } else {
        skipped++;
      }
    }
    
    console.log(`Converted ${sqlValues.length} reservations (skipped ${skipped} due to missing mappings, ${duplicates} duplicates)\n`);

    if (sqlValues.length === 0) {
      console.log('No reservations to import');
      return;
    }

    // Generate SQL file
    const sqlFile = '/tmp/gingr-reservations-import.sql';
    const sqlContent = `
-- Import Gingr Reservations
-- Generated: ${new Date().toISOString()}

-- Add unique constraint if it doesn't exist
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_tenant_external_unique;
ALTER TABLE reservations ADD CONSTRAINT reservations_tenant_external_unique UNIQUE ("tenantId", "externalId");

-- Import reservations
INSERT INTO reservations (
  id, "startDate", "endDate", status, notes, "staffNotes", "checkInWindow",
  "isRecurring", "recurringPattern", "preChecked", "checkInDate", "checkOutDate",
  "earlyDropOff", "latePickup", "customPickupPerson", "confirmedBy", "cancelReason",
  "cancelDate", "createdAt", "updatedAt", "customerId", "petId", "serviceId",
  "resourceId", "staffAssignedId", "orderNumber", "tenantId", "externalId"
) VALUES
${sqlValues.join(',\n')}
ON CONFLICT ("tenantId", "externalId") DO UPDATE SET
  "startDate" = EXCLUDED."startDate",
  "endDate" = EXCLUDED."endDate",
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  "checkInDate" = EXCLUDED."checkInDate",
  "checkOutDate" = EXCLUDED."checkOutDate",
  "updatedAt" = NOW();
`;

    // Write SQL file
    await new Promise((resolve, reject) => {
      const stream = createWriteStream(sqlFile);
      stream.write(sqlContent);
      stream.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`SQL file generated: ${sqlFile}`);
    console.log('Importing into database...\n');

    // Execute SQL
    const { stdout, stderr } = await execAsync(
      `docker exec -i tailtown-postgres psql -U postgres -d customer < ${sqlFile}`
    );
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.error('Import errors:', stderr);
    }
    
    console.log(stdout);
    console.log('\n✅ Import complete!');
    
    // Verify
    const { stdout: count } = await execAsync(
      `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT COUNT(*) FROM reservations;"`
    );
    
    console.log(`\nTotal reservations in database: ${count.trim()}`);
    
  } catch (error) {
    console.error('Import failed:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    process.exit(1);
  }
}

// Run the import
importReservations();
