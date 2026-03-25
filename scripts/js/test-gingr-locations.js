
const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
};

async function testGingrLocations() {
  const baseUrl = `https://${GINGR_CONFIG.subdomain}.gingrapp.com/api/v1`;

  try {
    // 1. Fetch locations
    console.log('Fetching Gingr locations...\n');
    const locationsResponse = await fetch(`${baseUrl}/get_locations`, {
      headers: { Authorization: `Bearer ${GINGR_CONFIG.apiKey}` },
    });
    const locations = await locationsResponse.json();
    console.log('Locations:', JSON.stringify(locations, null, 2));

    // 2. Fetch a sample reservation to see if it has location/room data
    console.log('\n\nFetching sample reservations...\n');
    const reservationsResponse = await fetch(`${baseUrl}/reservations`, {
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
    const reservations = await reservationsResponse.json();

    // Get first reservation
    const firstKey = Object.keys(reservations)[0];
    const sampleReservation = reservations[firstKey];

    console.log('Sample reservation fields:');
    console.log(Object.keys(sampleReservation));

    console.log(
      '\n\nSample reservation (looking for location/room/kennel data):'
    );
    console.log(JSON.stringify(sampleReservation, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGingrLocations();
