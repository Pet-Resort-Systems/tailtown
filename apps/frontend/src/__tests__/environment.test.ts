/**
 * Environment Configuration Tests
 * 
 * These tests ensure that the application is configured correctly
 * for the target environment (development vs production).
 */

describe('Environment Configuration', () => {
  it('should have NODE_ENV defined', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should use production API URL in production builds', () => {
    // Skip test if not in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    
    // In production, we should NOT be using localhost
    const apiUrl = process.env.REACT_APP_API_URL;
    
    if (!apiUrl) {
      return; // Skip if no API URL is set
    }
    
    expect(apiUrl).not.toContain('localhost');
    expect(apiUrl).toMatch(/^https?:\/\//); // Should start with http:// or https://
  });

  it('should have required environment variables in production', () => {
    // Skip test if not in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    
    // These should be defined in production
    expect(
      process.env.REACT_APP_API_URL || 
      process.env.REACT_APP_CUSTOMER_SERVICE_URL
    ).toBeDefined();
  });

  it('should not expose sensitive data in environment variables', () => {
    // Check that no environment variables contain sensitive keywords
    const sensitiveKeywords = ['password', 'secret', 'key', 'token'];
    const envVars = Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'));
    
    const violations: string[] = [];
    
    envVars.forEach(key => {
      const lowerKey = key.toLowerCase();
      sensitiveKeywords.forEach(keyword => {
        if (lowerKey.includes(keyword)) {
          violations.push(`${key} contains sensitive keyword: ${keyword}`);
        }
      });
    });
    
    expect(violations).toEqual([]);
  });
});
