/**
 * Discover Gingr Suites Script
 *
 * This script fetches reservations from Gingr API and extracts all unique
 * lodging/suite names to help you understand what kennels exist in the system.
 *
 * Usage:
 *   node scripts/discover-gingr-suites.js <subdomain> <api-key> [start-date] [end-date]
 *
 * Example:
 *   node scripts/discover-gingr-suites.js mykennel abc123key 2024-01-01 2024-12-31
 */


// Parse command line arguments
const args = process.argv.slice(2);
const subdomain = args[0];
const apiKey = args[1];
const startDate = args[2] || '2024-01-01';
const endDate = args[3] || new Date().toISOString().split('T')[0];

if (!subdomain || !apiKey) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log(
    '  node scripts/discover-gingr-suites.js <subdomain> <api-key> [start-date] [end-date]'
  );
  console.log('\nExample:');
  console.log(
    '  node scripts/discover-gingr-suites.js mykennel abc123key 2024-01-01 2024-12-31'
  );
  console.log('\nArguments:');
  console.log(
    '  subdomain  - Your Gingr subdomain (e.g., "mykennel" from mykennel.gingrapp.com)'
  );
  console.log('  api-key    - Your Gingr API key');
  console.log(
    '  start-date - Start date for reservations (optional, default: 2024-01-01)'
  );
  console.log(
    '  end-date   - End date for reservations (optional, default: today)'
  );
  process.exit(1);
}

const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

/**
 * Make POST request to Gingr (for reservations)
 */
async function gingrPostRequest(endpoint, data = {}) {
  const formData = new URLSearchParams();
  formData.append('key', apiKey);

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(
      `Gingr API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Format date for Gingr API (YYYY-MM-DD)
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Fetch reservations in 30-day chunks (Gingr API limitation)
 */
async function fetchAllReservations(start, end) {
  const allReservations = [];
  let currentStart = new Date(start);
  const endDate = new Date(end);

  console.log(`\n📅 Fetching reservations from ${start} to ${end}...`);

  while (currentStart < endDate) {
    // Calculate end of current chunk (30 days max)
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 29);

    // Don't go past the requested end date
    const chunkEnd = currentEnd > endDate ? endDate : currentEnd;

    const startStr = formatDate(currentStart);
    const endStr = formatDate(chunkEnd);

    process.stdout.write(`  Fetching ${startStr} to ${endStr}... `);

    try {
      const response = await gingrPostRequest('/reservations', {
        start_date: startStr,
        end_date: endStr,
      });

      // Gingr returns reservations as an object with reservation IDs as keys
      const reservationsObj = response.data || response || {};
      const chunk = Object.values(reservationsObj);

      allReservations.push(...chunk);
      console.log(`✅ ${chunk.length} reservations`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Move to next chunk
    currentStart = new Date(chunkEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  console.log(`\n✅ Total reservations fetched: ${allReservations.length}\n`);
  return allReservations;
}

/**
 * Extract lodging from reservation
 */
function extractLodging(reservation) {
  // Try multiple possible field names
  const lodging =
    reservation.lodging_label ||
    reservation.lodging_id ||
    reservation.lodging ||
    reservation.room_label ||
    reservation.room_id ||
    reservation.room ||
    reservation.kennel_label ||
    reservation.kennel_id ||
    reservation.kennel ||
    reservation.suite_label ||
    reservation.suite_id ||
    reservation.suite ||
    reservation.area ||
    reservation.location ||
    null;

  // Also check nested structures
  if (!lodging && reservation.lodging) {
    return (
      reservation.lodging.label ||
      reservation.lodging.id ||
      reservation.lodging.name ||
      null
    );
  }

  if (!lodging && reservation.room) {
    return (
      reservation.room.label ||
      reservation.room.id ||
      reservation.room.name ||
      null
    );
  }

  if (!lodging && reservation.area) {
    return (
      reservation.area.label ||
      reservation.area.id ||
      reservation.area.name ||
      null
    );
  }

  return lodging;
}

/**
 * Normalize lodging name
 */
function normalizeLodgingName(gingrLodging) {
  if (!gingrLodging) return null;

  // Remove common prefixes and extra spaces
  let normalized = gingrLodging
    .replace(/^(Suite|Room|Kennel|Lodging)\s+/i, '')
    .replace(/^[A-Z]\.\s*\w+\s*-\s*/i, '') // Remove "A. Indoor - "
    .trim();

  // Remove spaces between letter and number: "A 02" → "A02"
  normalized = normalized.replace(/^([A-Z])\s+(\d+)$/, '$1$2');

  // Ensure two-digit format: "A2" → "A02"
  const match = normalized.match(/^([A-Z])(\d+)$/);
  if (match) {
    const letter = match[1];
    const number = match[2].padStart(2, '0');
    normalized = `${letter}${number}`;
  }

  return normalized;
}

/**
 * Main function
 */
async function main() {
  console.log('🏨 Gingr Suite Discovery Tool');
  console.log('═══════════════════════════════');
  console.log(`Subdomain: ${subdomain}`);
  console.log(`Date Range: ${startDate} to ${endDate}`);

  try {
    // Fetch all reservations
    const reservations = await fetchAllReservations(startDate, endDate);

    if (reservations.length === 0) {
      console.log('⚠️  No reservations found in the specified date range.');
      console.log(
        'Try expanding the date range or check your API credentials.'
      );
      return;
    }

    // Extract unique lodging names
    const lodgingMap = new Map(); // Original → Normalized
    const lodgingCounts = new Map(); // Normalized → Count

    reservations.forEach((reservation) => {
      const original = extractLodging(reservation);
      if (original) {
        const normalized = normalizeLodgingName(original);
        if (normalized) {
          lodgingMap.set(original, normalized);
          lodgingCounts.set(
            normalized,
            (lodgingCounts.get(normalized) || 0) + 1
          );
        }
      }
    });

    // Display results
    console.log('📊 SUITE DISCOVERY RESULTS');
    console.log('═══════════════════════════════\n');

    console.log(`Total Reservations: ${reservations.length}`);
    console.log(
      `Reservations with Lodging: ${Array.from(lodgingMap.keys()).length}`
    );
    console.log(`Unique Suites Found: ${lodgingCounts.size}\n`);

    if (lodgingCounts.size === 0) {
      console.log('⚠️  No lodging information found in reservations.');
      console.log('\nPossible reasons:');
      console.log('  1. Lodging field name is different in your Gingr system');
      console.log("  2. Reservations don't have lodging assigned");
      console.log('  3. Need to check a different date range');
      console.log('\nRaw reservation sample:');
      console.log(JSON.stringify(reservations[0], null, 2));
      return;
    }

    // Sort suites alphabetically
    const sortedSuites = Array.from(lodgingCounts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    console.log('🏨 NORMALIZED SUITE NAMES:');
    console.log('─────────────────────────────');
    sortedSuites.forEach(([suite, count]) => {
      console.log(`  ${suite.padEnd(10)} (used in ${count} reservations)`);
    });

    console.log('\n📝 ORIGINAL GINGR NAMES:');
    console.log('─────────────────────────────');
    const uniqueOriginals = new Set(lodgingMap.keys());
    Array.from(uniqueOriginals)
      .sort()
      .forEach((original) => {
        const normalized = lodgingMap.get(original);
        console.log(`  "${original}" → ${normalized}`);
      });

    // Generate SQL for creating resources
    console.log('\n💾 SQL TO CREATE RESOURCES:');
    console.log('─────────────────────────────');
    console.log('-- Copy and paste this into your database:\n');

    sortedSuites.forEach(([suite]) => {
      const type = suite.startsWith('V')
        ? 'VIP_SUITE'
        : suite.includes('+')
          ? 'STANDARD_PLUS_SUITE'
          : 'STANDARD_SUITE';

      console.log(
        `INSERT INTO resources (id, name, type, capacity, "isActive", "tenantId", "createdAt", "updatedAt")`
      );
      console.log(
        `VALUES (gen_random_uuid(), '${suite}', '${type}', 1, true, 'dev', NOW(), NOW());`
      );
    });

    // Generate JavaScript array
    console.log('\n📋 JAVASCRIPT ARRAY:');
    console.log('─────────────────────────────');
    console.log('const suites = [');
    sortedSuites.forEach(([suite]) => {
      console.log(`  '${suite}',`);
    });
    console.log('];');

    console.log('\n✅ Discovery complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
main();
