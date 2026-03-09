// Simple test script to check API connectivity
import { reservationApi as api } from './services/api';

// Function to test the resource availability endpoint
export const testResourceAvailability = async () => {
  try {
    console.log('Testing resource availability endpoint...');
    console.log('Reservation API base URL:', process.env.REACT_APP_RESERVATION_API_URL || 'http://localhost:4003');
    
    const response = await api.get('/api/resources/availability', {
      params: {
        resourceType: 'suite',
        date: '2025-08-03',
      }
    });
    
    console.log('API response status:', response.status);
    console.log('API response data:', response.data);
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('API request failed:', error.message);
    console.error('API error response:', error.response?.data);
    console.error('API error status:', error.response?.status);
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
};

// Export a function to run the test
export const runApiTest = () => {
  console.log('Running API test...');
  testResourceAvailability()
    .then(result => {
      console.log('Test result:', result);
    })
    .catch(error => {
      console.error('Test error:', error);
    });
};
