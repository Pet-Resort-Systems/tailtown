#!/usr/bin/env node
/**
 * Quick script to check Gingr API counts
 */

const GINGR_CONFIG = {
  subdomain: process.env.GINGR_SUBDOMAIN || 'tailtownpetresort',
  apiKey: process.env.GINGR_API_KEY || 'c84c09ecfacdf23a495505d2ae1df533',
};

async function fetchGingrData(endpoint) {
  const url = `https://${GINGR_CONFIG.subdomain}.gingrapp.com/api/v1/${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GINGR_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Gingr API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function main() {
  console.log('🔍 Querying Gingr API for counts...\n');

  try {
    // Fetch owners (customers)
    console.log('Fetching owners...');
    const owners = await fetchGingrData('owners');
    console.log(
      `✅ Owners (Customers): ${Array.isArray(owners) ? owners.length : 'N/A'}`
    );

    // Fetch animals (pets)
    console.log('Fetching animals...');
    const animals = await fetchGingrData('animals');
    console.log(
      `✅ Animals (Pets): ${Array.isArray(animals) ? animals.length : 'N/A'}`
    );

    // Summary
    console.log('\n📊 GINGR TOTALS:');
    console.log(
      `   Customers: ${Array.isArray(owners) ? owners.length : 'Unknown'}`
    );
    console.log(
      `   Pets: ${Array.isArray(animals) ? animals.length : 'Unknown'}`
    );

    if (Array.isArray(owners) && Array.isArray(animals)) {
      const ratio = (animals.length / owners.length).toFixed(2);
      console.log(`   Pets per Customer: ${ratio}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
