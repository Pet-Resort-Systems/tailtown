// This script helps bypass the login API call for testing
// Add this to your browser console to test login functionality

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@tailtown.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN'
};

// Store in localStorage
localStorage.setItem('token', mockUser.id);
localStorage.setItem('tokenTimestamp', Date.now().toString());
localStorage.setItem('user', JSON.stringify(mockUser));

// Redirect to dashboard
window.location.href = '/dashboard';

console.log('Login bypass successful! Redirecting to dashboard...');
