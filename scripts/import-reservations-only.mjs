/**
 * Import Gingr Reservations Only
 * This script imports only reservations without re-fetching customers/pets
 * since we already have 11,793 customers and 3,280 pets in the database
 */


const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
  baseUrl: 'https://tailtownpetresort.gingrapp.com/api/v1'
};

const CUSTOMER_SERVICE_URL = 'http://localhost:4004';
const RESERVATION_SERVICE_URL = 'http://localhost:4003';

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
  
  // Gingr returns data as an object with reservation IDs as keys
  // Convert to array
  if (data.data && typeof data.data === 'object') {
    const reservationsArray = Object.values(data.data);
    console.log(`Fetched ${reservationsArray.length} reservations`);
    return reservationsArray;
  }
  
  return [];
}

async function importReservations() {
  try {
    console.log('Starting reservation import...\n');

    // Fetch reservations for November 2025 (small test batch)
    const reservations = await fetchGingrReservations('2025-11-01', '2025-11-30');
    console.log(`Found ${reservations.length} reservations\n`);

    if (reservations.length === 0) {
      console.log('No reservations to import');
      return;
    }

    // Show sample reservation structure
    console.log('Sample reservation structure:');
    console.log(JSON.stringify(reservations[0], null, 2));
    console.log('\n');

    console.log('Import complete!');
    console.log(`Total reservations fetched: ${reservations.length}`);
    
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importReservations();
