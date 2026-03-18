/**
 * Inspect actual Gingr reservation structure to find lodging field
 */

const fetch = require('node-fetch');

const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
};

async function inspectReservation() {
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

    // Get first reservation
    const firstKey = Object.keys(reservations)[0];
    const sample = reservations[firstKey];

    console.log('='.repeat(80));
    console.log('FULL RESERVATION STRUCTURE');
    console.log('='.repeat(80));
    console.log(JSON.stringify(sample, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('ALL TOP-LEVEL FIELDS');
    console.log('='.repeat(80));
    Object.keys(sample).forEach((key) => {
      const value = sample[key];
      const type = typeof value;
      const preview =
        type === 'object'
          ? JSON.stringify(value).substring(0, 50) + '...'
          : value;
      console.log(`${key}: ${type} = ${preview}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('SEARCHING FOR LODGING/KENNEL/ROOM FIELDS');
    console.log('='.repeat(80));

    function searchFields(obj, prefix = '') {
      const found = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const lowerKey = key.toLowerCase();

        if (
          lowerKey.includes('lodg') ||
          lowerKey.includes('kennel') ||
          lowerKey.includes('room') ||
          lowerKey.includes('suite') ||
          lowerKey.includes('area') ||
          lowerKey.includes('location') ||
          lowerKey.includes('resource') ||
          lowerKey.includes('space') ||
          lowerKey.includes('run') ||
          lowerKey.includes('cage')
        ) {
          found.push({ field: fullKey, value, type: typeof value });
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          found.push(...searchFields(value, fullKey));
        }
      }
      return found;
    }

    const lodgingFields = searchFields(sample);

    if (lodgingFields.length > 0) {
      console.log('✅ FOUND POTENTIAL LODGING FIELDS:\n');
      lodgingFields.forEach((f) => {
        console.log(`  ${f.field}:`);
        console.log(`    Value: ${JSON.stringify(f.value)}`);
        console.log(`    Type: ${f.type}\n`);
      });
    } else {
      console.log('❌ NO LODGING FIELDS FOUND');
      console.log(
        '\nThis means Gingr might not expose lodging assignments via API.'
      );
      console.log('Recommendations:');
      console.log('1. Contact Gingr support to ask about lodging/kennel field');
      console.log('2. Check Gingr admin panel for export options');
      console.log('3. Use auto-assignment script as workaround');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

inspectReservation();
