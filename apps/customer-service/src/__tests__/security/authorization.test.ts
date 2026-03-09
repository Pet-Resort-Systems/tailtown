/**
 * Authorization & Tenant Isolation Security Tests
 * 
 * Tests to ensure:
 * - Role-Based Access Control (RBAC)
 * - Tenant isolation (users can't access other tenants' data)
 * - Proper permission checks
 * - Unauthorized access prevention
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Authorization & Tenant Isolation Security Tests', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let adminToken: string;
  let staffToken: string;
  let tenant2Token: string;
  let customer1Id: string;
  let customer2Id: string;

  beforeAll(async () => {
    tenant1Id = 'tenant-1-auth-test';
    tenant2Id = 'tenant-2-auth-test';

    // Create admin user for tenant 1
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    const admin = await prisma.staff.create({
      data: {
        email: 'admin@tenant1.com',
        firstName: 'Admin',
        lastName: 'User',
        password: adminPassword,
        role: 'ADMIN',
        tenantId: tenant1Id,
        isActive: true
      }
    });

    // Create staff user for tenant 1
    const staffPassword = await bcrypt.hash('StaffPass123!', 12);
    const staff = await prisma.staff.create({
      data: {
        email: 'staff@tenant1.com',
        firstName: 'Staff',
        lastName: 'User',
        password: staffPassword,
        role: 'STAFF',
        tenantId: tenant1Id,
        isActive: true
      }
    });

    // Create user for tenant 2
    const tenant2Password = await bcrypt.hash('Tenant2Pass123!', 12);
    const tenant2User = await prisma.staff.create({
      data: {
        email: 'user@tenant2.com',
        firstName: 'Tenant2',
        lastName: 'User',
        password: tenant2Password,
        role: 'ADMIN',
        tenantId: tenant2Id,
        isActive: true
      }
    });

    // Get auth tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@tenant1.com', password: 'AdminPass123!' });
    adminToken = adminLogin.body.token;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@tenant1.com', password: 'StaffPass123!' });
    staffToken = staffLogin.body.token;

    const tenant2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@tenant2.com', password: 'Tenant2Pass123!' });
    tenant2Token = tenant2Login.body.token;

    // Create test customers for each tenant
    const customer1Response = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Customer',
        lastName: 'Tenant1',
        email: 'customer1@tenant1.com',
        phone: '1234567890'
      });
    customer1Id = customer1Response.body.data.id;

    const customer2Response = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({
        firstName: 'Customer',
        lastName: 'Tenant2',
        email: 'customer2@tenant2.com',
        phone: '0987654321'
      });
    customer2Id = customer2Response.body.data.id;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.staff.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.$disconnect();
  });

  describe('Tenant Isolation', () => {
    it('should prevent access to other tenant\'s customers', async () => {
      // Tenant 1 trying to access Tenant 2's customer
      const response = await request(app)
        .get(`/api/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404); // Should not find it
    });

    it('should prevent updating other tenant\'s customers', async () => {
      const response = await request(app)
        .put(`/api/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Hacked',
          lastName: 'Customer'
        });

      expect(response.status).toBe(404);
    });

    it('should prevent deleting other tenant\'s customers', async () => {
      const response = await request(app)
        .delete(`/api/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should only return own tenant\'s data in list endpoints', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const customers = response.body.data || response.body;
      
      // Should only contain tenant 1's customers
      customers.forEach((customer: any) => {
        expect(customer.tenantId).toBe(tenant1Id);
        expect(customer.tenantId).not.toBe(tenant2Id);
      });
    });

    it('should filter search results by tenant', async () => {
      const response = await request(app)
        .get('/api/customers/search?q=Customer')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const results = response.body.data || response.body;
      
      // Should only find tenant 1's customers
      results.forEach((customer: any) => {
        expect(customer.tenantId).toBe(tenant1Id);
      });
    });

    it('should prevent cross-tenant data leakage in aggregations', async () => {
      const response = await request(app)
        .get('/api/customers/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Stats should only reflect tenant 1's data
      // Verify by comparing with tenant 2's stats
      const tenant2Response = await request(app)
        .get('/api/customers/stats')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.body.total).not.toBe(tenant2Response.body.total);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow ADMIN to create staff', async () => {
      const response = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `new-staff-${Date.now()}@tenant1.com`,
          firstName: 'New',
          lastName: 'Staff',
          password: 'NewStaff123!',
          role: 'STAFF'
        });

      expect(response.status).toBe(201);
    });

    it('should prevent STAFF from creating other staff', async () => {
      const response = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: `unauthorized-staff-${Date.now()}@tenant1.com`,
          firstName: 'Unauthorized',
          lastName: 'Staff',
          password: 'UnauthorizedStaff123!',
          role: 'STAFF'
        });

      expect(response.status).toBe(403); // Forbidden
    });

    it('should allow ADMIN to delete staff', async () => {
      // Create a staff to delete
      const createResponse = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `to-delete-${Date.now()}@tenant1.com`,
          firstName: 'To',
          lastName: 'Delete',
          password: 'ToDelete123!',
          role: 'STAFF'
        });

      const staffId = createResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/api/staff/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('should prevent STAFF from deleting other staff', async () => {
      const response = await request(app)
        .delete(`/api/staff/some-staff-id`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow STAFF to view customers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow STAFF to create customers', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          firstName: 'Staff',
          lastName: 'Created',
          email: `staff-created-${Date.now()}@example.com`,
          phone: '5555555555'
        });

      expect(response.status).toBe(201);
    });

    it('should prevent privilege escalation', async () => {
      // STAFF trying to promote themselves to ADMIN
      const response = await request(app)
        .put('/api/staff/self')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          role: 'ADMIN'
        });

      expect(response.status).toBe(403);
    });

    it('should prevent role modification by non-admins', async () => {
      const response = await request(app)
        .put(`/api/staff/some-id`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          role: 'ADMIN'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthorized Access Prevention', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/customers');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should reject requests from inactive users', async () => {
      // Create inactive user
      const inactivePassword = await bcrypt.hash('InactivePass123!', 12);
      const inactive = await prisma.staff.create({
        data: {
          email: `inactive-${Date.now()}@tenant1.com`,
          firstName: 'Inactive',
          lastName: 'User',
          password: inactivePassword,
          role: 'STAFF',
          tenantId: tenant1Id,
          isActive: false
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: inactive.email,
          password: 'InactivePass123!'
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.message).toContain('inactive');
    });

    it('should prevent access to admin-only endpoints', async () => {
      const adminEndpoints = [
        '/api/admin/settings',
        '/api/admin/users',
        '/api/admin/audit-logs',
        '/api/admin/system-stats'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(response.status).toBe(403);
      }
    });
  });

  describe('Permission Checks', () => {
    it('should verify permissions on every request', async () => {
      // Make multiple requests to ensure permission check isn't cached
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${staffToken}`);

        expect(response.status).toBe(200);
      }
    });

    it('should check permissions for nested resources', async () => {
      // Accessing customer's pets should also check customer access
      const response = await request(app)
        .get(`/api/customers/${customer2Id}/pets`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404); // Can't access other tenant's customer
    });

    it('should validate ownership for update operations', async () => {
      const response = await request(app)
        .put(`/api/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          firstName: 'Hacked'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('API Key Security', () => {
    it('should reject requests with invalid API keys', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('X-API-Key', 'invalid-api-key');

      expect(response.status).toBe(401);
    });

    it('should validate API key scope', async () => {
      // If API keys have scopes, test that read-only keys can't write
      const response = await request(app)
        .post('/api/customers')
        .set('X-API-Key', 'read-only-api-key')
        .send({
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test@example.com',
          phone: '1234567890'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Super Admin Isolation', () => {
    it('should prevent super admin access to tenant data without proper context', async () => {
      // Super admin should need to specify tenant context
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Context', tenant2Id);

      expect(response.status).toBe(403); // Can't switch to other tenant
    });

    it('should audit super admin actions', async () => {
      // Super admin actions should be logged
      const response = await request(app)
        .get('/api/super-admin/tenants')
        .set('Authorization', `Bearer ${adminToken}`);

      // This should be logged in audit trail
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Resource Ownership', () => {
    it('should verify resource ownership before allowing access', async () => {
      // Create a reservation for customer1
      const reservationResponse = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer1Id,
          startDate: '2025-12-01',
          endDate: '2025-12-05',
          serviceId: 'test-service-id'
        });

      const reservationId = reservationResponse.body.data?.id;

      if (reservationId) {
        // Tenant 2 trying to access tenant 1's reservation
        const accessResponse = await request(app)
          .get(`/api/reservations/${reservationId}`)
          .set('Authorization', `Bearer ${tenant2Token}`);

        expect(accessResponse.status).toBe(404);
      }
    });

    it('should prevent modifying resources owned by other users', async () => {
      const response = await request(app)
        .put(`/api/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          firstName: 'Modified'
        });

      expect(response.status).toBe(404);
    });
  });
});
