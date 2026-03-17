const axios = require('axios');

// Test the resource availability endpoint
async function testResourceAvailability() {
  try {
    console.log('Testing GET /api/resources/availability endpoint...');
    const response = await axios.get(
      'http://localhost:4004/api/resources/availability',
      {
        params: {
          resourceType: 'suite',
          date: '2025-08-03',
        },
      }
    );

    console.log('Response status:', response.status);
    console.log(
      'Response data:',
      JSON.stringify(response.data).substring(0, 200) + '...'
    );

    return true;
  } catch (error) {
    console.error('Error testing resource availability endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Response data:', error.response?.data);

    return false;
  }
}

// Execute the test
testResourceAvailability();
