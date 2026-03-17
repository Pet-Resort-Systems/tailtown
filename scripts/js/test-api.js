const axios = require('axios');

// Test direct API calls to both endpoints
async function testApiEndpoints() {
  try {
    console.log('Testing /api/staff/schedules endpoint...');
    const apiResponse = await axios.get(
      'http://localhost:3002/api/staff/schedules?startDate=2025-04-27&endDate=2025-05-03'
    );
    console.log('API response status:', apiResponse.status);
    console.log(
      'API response data:',
      JSON.stringify(apiResponse.data, null, 2)
    );
  } catch (apiError) {
    console.error('Error with /api/staff/schedules:', apiError.message);
    if (apiError.response) {
      console.error('Status:', apiError.response.status);
      console.error('Data:', JSON.stringify(apiError.response.data, null, 2));
    }
  }

  try {
    console.log('\nTesting /staff/schedules endpoint...');
    const directResponse = await axios.get(
      'http://localhost:3002/staff/schedules?startDate=2025-04-27&endDate=2025-05-03'
    );
    console.log('Direct response status:', directResponse.status);
    console.log(
      'Direct response data:',
      JSON.stringify(directResponse.data, null, 2)
    );
  } catch (directError) {
    console.error('Error with /staff/schedules:', directError.message);
    if (directError.response) {
      console.error('Status:', directError.response.status);
      console.error(
        'Data:',
        JSON.stringify(directError.response.data, null, 2)
      );
    }
  }
}

testApiEndpoints();
