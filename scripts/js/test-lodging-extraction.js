/**
 * Test lodging extraction from Gingr data
 * Uses the resource mapper service to test field extraction
 */

// Sample Gingr reservation data structure (based on what we've seen)
const sampleReservation = {
  reservation_id: '6904',
  start_date: '2025-10-24T06:30:00-06:00',
  end_date: '2025-10-24T19:00:00-06:00',

  // Try different possible lodging field structures
  lodging_label: 'A 02', // Most likely based on screenshot
  lodging_id: '123',

  // Or nested
  lodging: {
    label: 'A 02',
    id: '123',
    area: 'A. Indoor',
  },

  animal: {
    id: '18333',
    name: 'Simcoe',
  },
  owner: {
    id: '2555',
    first_name: 'connor',
  },
};

// Simulate the extraction function
function extractGingrLodging(reservation) {
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
    null;

  // Also check nested structures
  if (!lodging && reservation.lodging) {
    return reservation.lodging.label || reservation.lodging.id || null;
  }

  if (!lodging && reservation.room) {
    return reservation.room.label || reservation.room.id || null;
  }

  return lodging;
}

// Simulate normalization
function normalizeLodgingName(gingrLodging) {
  if (!gingrLodging) return '';

  let normalized = gingrLodging
    .replace(/^(Suite|Room|Kennel|Lodging)\s+/i, '')
    .replace(/^[A-Z]\.\s*\w+\s*-\s*/i, '')
    .trim();

  // Remove spaces: "A 02" → "A02"
  normalized = normalized.replace(/^([A-Z])\s+(\d+)$/, '$1$2');

  // Pad numbers: "A2" → "A02"
  const match = normalized.match(/^([A-Z])(\d+)$/);
  if (match) {
    const letter = match[1];
    const number = match[2].padStart(2, '0');
    normalized = `${letter}${number}`;
  }

  return normalized;
}

console.log('='.repeat(80));
console.log('TESTING LODGING EXTRACTION');
console.log('='.repeat(80));

const extracted = extractGingrLodging(sampleReservation);
console.log('\n✅ Extracted lodging:', extracted);

if (extracted) {
  const normalized = normalizeLodgingName(extracted);
  console.log('✅ Normalized name:', normalized);
  console.log('\n📝 This would create/find Tailtown resource:', normalized);
} else {
  console.log('\n❌ No lodging found - need to identify correct field name');
}

console.log('\n' + '='.repeat(80));
console.log('FIELD NAMES TO TRY IN REAL GINGR DATA:');
console.log('='.repeat(80));
console.log('- lodging_label');
console.log('- lodging_id');
console.log('- lodging.label');
console.log('- lodging.id');
console.log('- room_label');
console.log('- kennel_label');
console.log('- suite_label');
