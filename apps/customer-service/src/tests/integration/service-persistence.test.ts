/**
 * Integration tests for service persistence
 * 
 * These tests verify that services are correctly persisted to the database
 * and can be retrieved afterward. They prevent regressions of the issues
 * discovered in November 2025.
 */

import { PrismaClient, ServiceCategory } from '@prisma/client';
import request from 'supertest';
import app from '../../index';

const prisma = new PrismaClient();

describe('Service Persistence Integration Tests', () => {
  const testTenantId = 'test-tenant-' + Date.now();
  const createdServiceIds: string[] = [];

  afterAll(async () => {
    // Clean up test data
    await prisma.service.deleteMany({
      where: {
        tenantId: testTenantId
      }
    });
    await prisma.$disconnect();
  });

  describe('Service Creation and Retrieval', () => {
    it('should persist a GROOMING service and retrieve it from the database', async () => {
      // Create a service via API
      const serviceData = {
        name: 'Test Grooming Service',
        description: 'Test description',
        duration: 60,
        price: 50,
        serviceCategory: 'GROOMING' as ServiceCategory,
        isActive: true,
        requiresStaff: false,
        taxable: true
      };

      const createResponse = await request(app)
        .post('/api/services')
        .set('x-tenant-id', testTenantId)
        .send(serviceData)
        .expect(201);

      expect(createResponse.body.status).toBe('success');
      expect(createResponse.body.data).toHaveProperty('id');
      
      const serviceId = createResponse.body.data.id;
      createdServiceIds.push(serviceId);

      // Verify it exists in the database directly
      const dbService = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      expect(dbService).not.toBeNull();
      expect(dbService?.name).toBe(serviceData.name);
      expect(dbService?.serviceCategory).toBe('GROOMING');
      expect(dbService?.tenantId).toBe(testTenantId);
    });

    it('should retrieve the service via API after creation', async () => {
      // Create a service
      const serviceData = {
        name: 'Test Retrieval Service',
        description: 'Test description',
        duration: 90,
        price: 75,
        serviceCategory: 'GROOMING' as ServiceCategory,
        isActive: true,
        requiresStaff: true,
        taxable: true
      };

      const createResponse = await request(app)
        .post('/api/services')
        .set('x-tenant-id', testTenantId)
        .send(serviceData)
        .expect(201);

      const serviceId = createResponse.body.data.id;
      createdServiceIds.push(serviceId);

      // Retrieve it via API
      const getResponse = await request(app)
        .get(`/api/services/${serviceId}`)
        .set('x-tenant-id', testTenantId)
        .expect(200);

      expect(getResponse.body.data.id).toBe(serviceId);
      expect(getResponse.body.data.name).toBe(serviceData.name);
      expect(getResponse.body.data.serviceCategory).toBe('GROOMING');
    });

    it('should include tenantId in created services', async () => {
      const serviceData = {
        name: 'Test Tenant Service',
        description: 'Test description',
        duration: 60,
        price: 50,
        serviceCategory: 'GROOMING' as ServiceCategory,
        isActive: true,
        requiresStaff: false,
        taxable: true
      };

      const createResponse = await request(app)
        .post('/api/services')
        .set('x-tenant-id', testTenantId)
        .send(serviceData)
        .expect(201);

      const serviceId = createResponse.body.data.id;
      createdServiceIds.push(serviceId);

      // Verify tenantId is set in database
      const dbService = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      expect(dbService?.tenantId).toBe(testTenantId);
      expect(dbService?.tenantId).not.toBeNull();
      expect(dbService?.tenantId).not.toBeUndefined();
    });

    it('should have updatedAt and createdAt timestamps', async () => {
      const serviceData = {
        name: 'Test Timestamp Service',
        description: 'Test description',
        duration: 60,
        price: 50,
        serviceCategory: 'GROOMING' as ServiceCategory,
        isActive: true,
        requiresStaff: false,
        taxable: true
      };

      const createResponse = await request(app)
        .post('/api/services')
        .set('x-tenant-id', testTenantId)
        .send(serviceData)
        .expect(201);

      const serviceId = createResponse.body.data.id;
      createdServiceIds.push(serviceId);

      // Verify timestamps exist in database
      const dbService = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      expect(dbService?.createdAt).toBeInstanceOf(Date);
      expect(dbService?.updatedAt).toBeInstanceOf(Date);
      expect(dbService?.createdAt).not.toBeNull();
      expect(dbService?.updatedAt).not.toBeNull();
    });
  });

  describe('Service Filtering and Pagination', () => {
    beforeAll(async () => {
      // Create multiple services of different categories
      const categories: ServiceCategory[] = ['GROOMING', 'BOARDING', 'DAYCARE', 'TRAINING'];
      
      for (const category of categories) {
        for (let i = 0; i < 5; i++) {
          const service = await prisma.service.create({
            data: {
              tenantId: testTenantId,
              name: `Test ${category} Service ${i + 1}`,
              description: `Test ${category} description`,
              duration: 60,
              price: 50 + i * 10,
              serviceCategory: category,
              isActive: true,
              requiresStaff: false,
              taxable: true
            }
          });
          createdServiceIds.push(service.id);
        }
      }
    });

    it('should return all services when limit is high enough', async () => {
      const response = await request(app)
        .get('/api/services')
        .query({ limit: 100 })
        .set('x-tenant-id', testTenantId)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(20); // At least 20 services (5 per category * 4 categories)
    });

    it('should filter services by GROOMING category', async () => {
      const response = await request(app)
        .get('/api/services')
        .query({ category: 'GROOMING', limit: 100 })
        .set('x-tenant-id', testTenantId)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(5);
      
      // Verify all returned services are GROOMING
      response.body.data.forEach((service: any) => {
        expect(service.serviceCategory).toBe('GROOMING');
      });
    });

    it('should not miss services due to pagination', async () => {
      // Get all services with high limit
      const allResponse = await request(app)
        .get('/api/services')
        .query({ limit: 100 })
        .set('x-tenant-id', testTenantId)
        .expect(200);

      const allServiceIds = allResponse.body.data.map((s: any) => s.id);

      // Get services with default limit (10)
      const limitedResponse = await request(app)
        .get('/api/services')
        .query({ limit: 10 })
        .set('x-tenant-id', testTenantId)
        .expect(200);

      const limitedServiceIds = limitedResponse.body.data.map((s: any) => s.id);

      // Verify that limited response is a subset of all services
      expect(limitedServiceIds.length).toBeLessThanOrEqual(10);
      limitedServiceIds.forEach((id: string) => {
        expect(allServiceIds).toContain(id);
      });

      // Verify we're not missing services
      expect(allServiceIds.length).toBeGreaterThan(limitedServiceIds.length);
    });

    it('should return GROOMING services even when they are not in the first 10', async () => {
      // This test ensures that category filtering works regardless of pagination
      const response = await request(app)
        .get('/api/services')
        .query({ category: 'GROOMING', limit: 100 })
        .set('x-tenant-id', testTenantId)
        .expect(200);

      const groomingServices = response.body.data.filter(
        (s: any) => s.serviceCategory === 'GROOMING'
      );

      expect(groomingServices.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Tenant Isolation', () => {
    const otherTenantId = 'other-tenant-' + Date.now();
    let otherTenantServiceId: string;

    beforeAll(async () => {
      // Create a service for another tenant
      const service = await prisma.service.create({
        data: {
          tenantId: otherTenantId,
          name: 'Other Tenant Service',
          description: 'Should not be visible to test tenant',
          duration: 60,
          price: 50,
          serviceCategory: 'GROOMING',
          isActive: true,
          requiresStaff: false,
          taxable: true
        }
      });
      otherTenantServiceId = service.id;
    });

    afterAll(async () => {
      await prisma.service.delete({
        where: { id: otherTenantServiceId }
      });
    });

    it('should not return services from other tenants', async () => {
      const response = await request(app)
        .get('/api/services')
        .query({ limit: 100 })
        .set('x-tenant-id', testTenantId)
        .expect(200);

      const serviceIds = response.body.data.map((s: any) => s.id);
      expect(serviceIds).not.toContain(otherTenantServiceId);
    });

    it('should not allow retrieving services from other tenants', async () => {
      await request(app)
        .get(`/api/services/${otherTenantServiceId}`)
        .set('x-tenant-id', testTenantId)
        .expect(404);
    });
  });

  describe('Database Schema Validation', () => {
    it('should have tenantId column in services table', async () => {
      const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'tenantId'
      `;

      expect(result.length).toBe(1);
      expect(result[0].column_name).toBe('tenantId');
    });

    it('should have default value for updatedAt column', async () => {
      const result = await prisma.$queryRaw<Array<{ column_default: string }>>`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'updatedAt'
      `;

      expect(result.length).toBe(1);
      expect(result[0].column_default).toContain('CURRENT_TIMESTAMP');
    });

    it('should have default value for createdAt column', async () => {
      const result = await prisma.$queryRaw<Array<{ column_default: string }>>`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'createdAt'
      `;

      expect(result.length).toBe(1);
      expect(result[0].column_default).toContain('CURRENT_TIMESTAMP');
    });
  });
});
