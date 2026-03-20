/**
 * Find lodging/kennel field in Gingr API response
 */

const fetch = require('node-fetch');

const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
};

async function findLodgingField() {
  const baseUrl = `https://${GINGR_CONFIG.subdomain}.gingrapp.com/api/v1`;

  try {
    console.log('Fetching Gingr reservations...\n');

    const response = await fetch(`${baseUrl}/reservations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GINGR_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: '2025-10-24',
        end_date: '2025-10-26',
      }),
    });

    const reservations = await response.json();

    if (reservations.Error) {
      console.error('Error:', reservations.Error);
      return;
    }

    // Get first reservation
    const firstKey = Object.keys(reservations)[0];
    const sample = reservations[firstKey];

    console.log('='.repeat(80));
    console.log('SEARCHING FOR LODGING/KENNEL FIELDS');
    console.log('='.repeat(80));

    // Look for lodging-related fields
    const lodgingFields = [];

    function searchObject(obj, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const lowerKey = key.toLowerCase();

        // Check if key contains lodging/kennel/room/suite/area related terms
        if (
          lowerKey.includes('lodg') ||
          lowerKey.includes('kennel') ||
          lowerKey.includes('room') ||
          lowerKey.includes('suite') ||
          lowerKey.includes('area') ||
          lowerKey.includes('location') ||
          lowerKey.includes('resource')
        ) {
          lodgingFields.push({
            field: fullKey,
            value: value,
            type: typeof value,
          });
        }

        // Recursively search nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          searchObject(value, fullKey);
        }
      }
    }

    searchObject(sample);

    if (lodgingFields.length > 0) {
      console.log('\n✅ FOUND LODGING-RELATED FIELDS:\n');
      lodgingFields.forEach((field) => {
        console.log(`  ${field.field}:`);
        console.log(`    Value: ${JSON.stringify(field.value)}`);
        console.log(`    Type: ${field.type}\n`);
      });
    } else {
      console.log('\n❌ NO LODGING FIELDS FOUND\n');
      console.log('All fields in reservation:');
      console.log(Object.keys(sample).join(', '));
    }

    console.log('\n' + '='.repeat(80));
    console.log('FULL SAMPLE RESERVATION');
    console.log('='.repeat(80));
    console.log(JSON.stringify(sample, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findLodgingField();
