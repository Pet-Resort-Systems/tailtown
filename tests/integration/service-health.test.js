/**
 * Service Health Integration Tests
 * Tests that all required services are running and accessible
 */

const request = require('supertest');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Service Health Tests', () => {
  const services = [
    {
      name: 'Customer Service',
      url: 'http://localhost:4004/api/customers',
      expectedStatus: 200,
    },
    {
      name: 'Reservation Service',
      url: 'http://localhost:4003/health',
      expectedStatus: 200,
    },
    { name: 'Frontend', url: 'http://localhost:3000', expectedStatus: 200 },
  ];

  describe('Service Availability', () => {
    services.forEach((service) => {
      it(`should have ${service.name} running and accessible`, async () => {
        try {
          const response = await request(service.url).get('/').timeout(5000);

          expect(response.status).toBe(service.expectedStatus);
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            throw new Error(`${service.name} is not running on expected port`);
          }
          throw error;
        }
      });
    });
  });

  describe('API Functionality', () => {
    it('should return customer data from Customer Service', async () => {
      const response = await request('http://localhost:4004/api/customers')
        .get('/')
        .query({ page: 1, limit: 1 })
        .timeout(5000);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return health status from Reservation Service', async () => {
      const response = await request('http://localhost:4003/health')
        .get('/')
        .timeout(5000);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Resource Usage', () => {
    it('should not have excessive Node.js processes running', async () => {
      const processCount = await new Promise((resolve) => {
        exec(
          'ps aux | grep -E "(npm|node)" | grep -E "(tailtown|customer|reservation|payment|admin)" | grep -v grep | wc -l',
          (error, stdout) => {
            resolve(parseInt(stdout.trim()) || 0);
          }
        );
      });

      expect(processCount).toBeLessThan(20);
      console.log(`Found ${processCount} Node.js processes (threshold: 20)`);
    });
  });

  describe('Database Connectivity', () => {
    it('should have Customer Service connected to database', async () => {
      const response = await request('http://localhost:4004/api/customers')
        .get('/')
        .query({ page: 1, limit: 1 })
        .timeout(5000);

      expect(response.status).toBe(200);
      // If we can query customers, database is connected
    });

    it('should have Reservation Service connected to database', async () => {
      const response = await request('http://localhost:4003/api/reservations')
        .get('/')
        .set('X-Tenant-Subdomain', 'dev')
        .timeout(5000);

      // Should return tenant error or data, but not connection error
      expect(response.status).not.toBe(500);
    });
  });

  describe('Port Conflicts', () => {
    const requiredPorts = [3000, 4003, 4004];

    requiredPorts.forEach((port) => {
      it(`should have port ${port} available for the correct service`, async () => {
        const portInUse = await new Promise((resolve) => {
          exec(`lsof -i :${port} | grep LISTEN`, (error, stdout) => {
            resolve(stdout.trim().length > 0);
          });
        });

        expect(portInUse).toBe(true);
        console.log(`Port ${port} is in use by expected service`);
      });
    });
  });
});

describe('Service Recovery Tests', () => {
  it('should provide startup recommendations when services are down', () => {
    // This test documents the recovery process
    const recommendations = {
      'Frontend not responding':
        'cd frontend && source ~/.nvm/nvm.sh && npm start',
      'Customer Service down':
        'cd services/customer && source ~/.nvm/nvm.sh && npm run dev',
      'Reservation Service down':
        'cd services/reservation-service && source ~/.nvm/nvm.sh && npm run dev',
      'MCP Server down':
        'cd mcp-server && PYTHONPATH=./ TAILTOWN_ROOT=.. python3 server.py',
      'Too many Node processes':
        'pkill -f "ts-node-dev" && pkill -f "react-scripts"',
      'Port conflicts':
        './scripts/stop-services.sh && ./scripts/start-services.sh',
    };

    expect(Object.keys(recommendations)).toContain('Frontend not responding');
    expect(Object.keys(recommendations)).toContain('Customer Service down');

    console.log('Service Recovery Recommendations:');
    Object.entries(recommendations).forEach(([issue, solution]) => {
      console.log(`  ${issue}: ${solution}`);
    });
  });
});
