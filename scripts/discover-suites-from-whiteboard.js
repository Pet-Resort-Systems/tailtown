#!/usr/bin/env node

/**
 * Discover Suites from Gingr Digital Whiteboard
 *
 * The /back_of_house endpoint has run_name (suite) information
 * that the regular /reservations endpoint doesn't have.
 *
 * Usage:
 *   node scripts/discover-suites-from-whiteboard.js <subdomain> <api-key> <days-back>
 *
 * Example:
 *   node scripts/discover-suites-from-whiteboard.js tailtownpetresort abc123 90
 */


// Parse arguments
const [subdomain, apiKey, daysBack = 90] = process.argv.slice(2);

if (!subdomain || !apiKey) {
  console.error(
    'Usage: node discover-suites-from-whiteboard.js <subdomain> <api-key> [days-back]'
  );
  process.exit(1);
}

const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

async function fetchWhiteboardForDate(date) {
  const url = `${BASE_URL}/back_of_house?key=${apiKey}&location_id=1&full_day=true&date=${date}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      return [];
    }

    const suites = new Set();
    for (const section of ['checking_in', 'checking_out']) {
      for (const item of data.data[section] || []) {
        if (item.run_name) {
          // Normalize: remove extra spaces, trim
          const suite = item.run_name.replace(/\s+/g, ' ').trim();
          suites.add(suite);
        }
      }
    }

    return Array.from(suites);
  } catch (error) {
    console.error(`Error fetching ${date}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🏨 Discovering Suites from Gingr Digital Whiteboard');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Subdomain: ${subdomain}`);
  console.log(`Looking back: ${daysBack} days`);
  console.log('');

  const allSuites = new Set();
  const today = new Date();

  console.log('📅 Scanning dates...');

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    process.stdout.write(`  ${dateStr}...`);

    const suites = await fetchWhiteboardForDate(dateStr);

    suites.forEach((s) => allSuites.add(s));

    console.log(` ✅ ${suites.length} suites`);

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log('');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total Unique Suites Found: ${allSuites.size}`);
  console.log('');

  // Group by prefix
  const grouped = {};
  for (const suite of allSuites) {
    const prefix = suite.split(' ')[0];
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(suite);
  }

  console.log('🏨 SUITES BY AREA:');
  console.log('─────────────────────────────────────────────────');

  for (const [prefix, suites] of Object.entries(grouped).sort()) {
    console.log(`\n${prefix} Area (${suites.length} suites):`);
    suites.sort().forEach((s) => console.log(`  ${s}`));
  }

  console.log('');
  console.log('✅ Discovery complete!');
  console.log('');
  console.log(
    'To create these suites in Tailtown, edit scripts/create-suites-from-list.js'
  );
  console.log('and add these suite names to the SUITES array.');
}

main().catch(console.error);
