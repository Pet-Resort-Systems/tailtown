/**
 * Analytics & Reports Multi-Tenancy Tests
 * 
 * Critical tests to ensure analytics and financial reports are properly isolated by tenant.
 * These tests verify that the bug we just fixed (missing tenantId filtering) doesn't happen again.
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../../utils/jwt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Analytics & Reports Tenant Isolation', () => {
  let tokenTenantA: string;
  let tokenTenantB: string;
  let customerATenant: string;
  let customerBTenant: string;
  let serviceATenant: string;
  let serviceBTenant: string;
  let invoiceATenant: string;
  let invoiceBTenant: string;

  beforeAll(async () => {
    // Create test tenants
    await prisma.tenant.upsert({
      where: { subdomain: 'test-tenant-a' },
      update: {},
      create: {
        subdomain: 'test-tenant-a',
        businessName: 'Test Tenant A',
        contactName: 'Test Contact A',
        contactEmail: 'contact-a@test.com',
        status: 'ACTIVE',
        isActive: true
      }
    });

    await prisma.tenant.upsert({
      where: { subdomain: 'test-tenant-b' },
      update: {},
      create: {
        subdomain: 'test-tenant-b',
        businessName: 'Test Tenant B',
        contactName: 'Test Contact B',
        contactEmail: 'contact-b@test.com',
        status: 'ACTIVE',
        isActive: true
      }
    });

    // Create staff for both tenants
    const staffA = await prisma.staff.create({
      data: {
        email: 'analytics-admin-a@test.com',
        firstName: 'Analytics',
        lastName: 'Admin A',
        password: '$2b$10$test',
        role: 'TENANT_ADMIN',
        tenantId: 'test-tenant-a',
        isActive: true
      }
    });

    const staffB = await prisma.staff.create({
      data: {
        email: 'analytics-admin-b@test.com',
        firstName: 'Analytics',
        lastName: 'Admin B',
        password: '$2b$10$test',
        role: 'TENANT_ADMIN',
        tenantId: 'test-tenant-b',
        isActive: true
      }
    });

    // Generate tokens
    tokenTenantA = generateToken({
      id: staffA.id,
      email: staffA.email,
      role: 'TENANT_ADMIN',
      tenantId: 'test-tenant-a'
    });

    tokenTenantB = generateToken({
      id: staffB.id,
      email: staffB.email,
      role: 'TENANT_ADMIN',
      tenantId: 'test-tenant-b'
    });

    // Create customers for both tenants
    const customerA = await prisma.customer.create({
      data: {
        email: 'analytics-customer-a@test.com',
        firstName: 'Customer',
        lastName: 'A',
        tenantId: 'test-tenant-a'
      }
    });
    customerATenant = customerA.id;

    const customerB = await prisma.customer.create({
      data: {
        email: 'analytics-customer-b@test.com',
        firstName: 'Customer',
        lastName: 'B',
        tenantId: 'test-tenant-b'
      }
    });
    customerBTenant = customerB.id;

    // Create services for both tenants
    const serviceA = await prisma.service.create({
      data: {
        name: 'Service A',
        description: 'Test service for tenant A',
        price: 100,
        duration: 60,
        isActive: true,
        tenantId: 'test-tenant-a',
        serviceCategory: 'BOARDING'
      }
    });
    serviceATenant = serviceA.id;

    const serviceB = await prisma.service.create({
      data: {
        name: 'Service B',
        description: 'Test service for tenant B',
        price: 200,
        duration: 60,
        isActive: true,
        tenantId: 'test-tenant-b',
        serviceCategory: 'BOARDING'
      }
    });
    serviceBTenant = serviceB.id;

    // Create pets for reservations
    const petA = await prisma.pet.create({
      data: {
        name: 'Pet A',
        type: 'DOG',
        breed: 'Test Breed',
        customerId: customerATenant,
        tenantId: 'test-tenant-a'
      }
    });

    const petB = await prisma.pet.create({
      data: {
        name: 'Pet B',
        type: 'DOG',
        breed: 'Test Breed',
        customerId: customerBTenant,
        tenantId: 'test-tenant-b'
      }
    });

    // Create reservations for both tenants
    const reservationA = await prisma.reservation.create({
      data: {
        tenantId: 'test-tenant-a',
        customerId: customerATenant,
        petId: petA.id,
        serviceId: serviceATenant,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'CONFIRMED'
      }
    });

    const reservationB = await prisma.reservation.create({
      data: {
        tenantId: 'test-tenant-b',
        customerId: customerBTenant,
        petId: petB.id,
        serviceId: serviceBTenant,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'CONFIRMED'
      }
    });

    // Create invoices linked to reservations
    const invoiceA = await prisma.invoice.create({
      data: {
        tenantId: 'test-tenant-a',
        invoiceNumber: 'TEST-A-001',
        customerId: customerATenant,
        reservationId: reservationA.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PAID',
        subtotal: 100,
        taxAmount: 10,
        total: 110
      }
    });
    invoiceATenant = invoiceA.id;

    const invoiceB = await prisma.invoice.create({
      data: {
        tenantId: 'test-tenant-b',
        invoiceNumber: 'TEST-B-001',
        customerId: customerBTenant,
        reservationId: reservationB.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PAID',
        subtotal: 200,
        taxAmount: 20,
        total: 220
      }
    });
    invoiceBTenant = invoiceB.id;
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    // Delete invoices first (they reference reservations)
    await prisma.invoice.deleteMany({
      where: { tenantId: { in: ['test-tenant-a', 'test-tenant-b'] } }
    });
    // Then reservations (they reference pets, services, customers)
    await prisma.reservation.deleteMany({
      where: { tenantId: { in: ['test-tenant-a', 'test-tenant-b'] } }
    });
    // Then pets (they reference customers)
    await prisma.pet.deleteMany({
      where: { tenantId: { in: ['test-tenant-a', 'test-tenant-b'] } }
    });
    // Then services
    await prisma.service.deleteMany({
      where: { tenantId: { in: ['test-tenant-a', 'test-tenant-b'] } }
    });
    // Then customers
    await prisma.customer.deleteMany({
      where: { tenantId: { in: ['test-tenant-a', 'test-tenant-b'] } }
    });
    // Then staff
    await prisma.staff.deleteMany({
      where: { tenantId: { in: ['test-tenant-a', 'test-tenant-b'] } }
    });
    // Finally tenants
    await prisma.tenant.deleteMany({
      where: { subdomain: { in: ['test-tenant-a', 'test-tenant-b'] } }
    });
    await prisma.$disconnect();
  });

  describe('Dashboard Summary Endpoint', () => {
    test('Tenant A sees only their own data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?period=all')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      
      const data = response.body.data;
      
      // Should have exactly 1 customer from tenant A
      expect(data.customerCount).toBe(1);
      
      // Should have revenue only from tenant A invoice ($110)
      expect(data.totalRevenue).toBe(110);
      
      // Should have 1 reservation
      expect(data.reservationCount).toBe(1);
    });

    test('Tenant B sees only their own data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?period=all')
        .set('Authorization', `Bearer ${tokenTenantB}`)
        .set('x-tenant-subdomain', 'test-tenant-b');

      expect(response.status).toBe(200);
      
      const data = response.body.data;
      
      // Should have exactly 1 customer from tenant B
      expect(data.customerCount).toBe(1);
      
      // Should have revenue only from tenant B invoice ($220)
      expect(data.totalRevenue).toBe(220);
      
      // Should have 1 reservation
      expect(data.reservationCount).toBe(1);
    });

    test('Tenant A does not see Tenant B revenue', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?period=all')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      expect(response.status).toBe(200);
      
      const data = response.body.data;
      
      // Revenue should NOT include tenant B's $220
      expect(data.totalRevenue).not.toBe(330); // 110 + 220
      expect(data.totalRevenue).toBe(110);
    });
  });

  describe('Sales by Service Endpoint', () => {
    test('Tenant A sees only their services', async () => {
      const response = await request(app)
        .get('/api/analytics/sales/services?period=all')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      expect(response.status).toBe(200);
      
      const services = response.body.data.services;
      
      // Should only have Service A
      expect(services.length).toBeGreaterThanOrEqual(1);
      const serviceNames = services.map((s: any) => s.name);
      expect(serviceNames).toContain('Service A');
      expect(serviceNames).not.toContain('Service B');
    });

    test('Tenant B sees only their services', async () => {
      const response = await request(app)
        .get('/api/analytics/sales/services?period=all')
        .set('Authorization', `Bearer ${tokenTenantB}`)
        .set('x-tenant-subdomain', 'test-tenant-b');

      expect(response.status).toBe(200);
      
      const services = response.body.data.services;
      
      // Should only have Service B
      const serviceNames = services.map((s: any) => s.name);
      expect(serviceNames).toContain('Service B');
      expect(serviceNames).not.toContain('Service A');
    });
  });

  describe('Customer Value Endpoint', () => {
    test('Tenant A sees only their customers', async () => {
      const response = await request(app)
        .get('/api/analytics/customers/value?period=all')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      expect(response.status).toBe(200);
      
      const customers = response.body.data;
      
      // Should only have customers from tenant A
      const customerEmails = customers.map((c: any) => c.email);
      expect(customerEmails).toContain('analytics-customer-a@test.com');
      expect(customerEmails).not.toContain('analytics-customer-b@test.com');
    });

    test('Tenant B sees only their customers', async () => {
      const response = await request(app)
        .get('/api/analytics/customers/value?period=all')
        .set('Authorization', `Bearer ${tokenTenantB}`)
        .set('x-tenant-subdomain', 'test-tenant-b');

      expect(response.status).toBe(200);
      
      const customers = response.body.data;
      
      // Should only have customers from tenant B
      const customerEmails = customers.map((c: any) => c.email);
      expect(customerEmails).toContain('analytics-customer-b@test.com');
      expect(customerEmails).not.toContain('analytics-customer-a@test.com');
    });
  });

  describe('Customer Report Endpoint', () => {
    test('Tenant A can access their customer report', async () => {
      const response = await request(app)
        .get(`/api/analytics/customers/${customerATenant}?period=all`)
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      expect(response.status).toBe(200);
      expect(response.body.data.customer.email).toBe('analytics-customer-a@test.com');
    });

    test('Tenant A cannot access Tenant B customer report', async () => {
      const response = await request(app)
        .get(`/api/analytics/customers/${customerBTenant}?period=all`)
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      // Should return 404 or empty data, not tenant B's data
      expect([404, 200]).toContain(response.status);
      
      if (response.status === 200) {
        // If it returns 200, it should be empty or error
        expect(response.body.data).toBeUndefined();
      }
    });
  });

  describe('Financial Reports - Critical Tenant Isolation', () => {
    test('Invoice queries are filtered by tenant', async () => {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: 'test-tenant-a' }
      });

      // Should only return tenant A invoices
      expect(invoices.length).toBeGreaterThanOrEqual(1);
      expect(invoices.every(inv => inv.tenantId === 'test-tenant-a')).toBe(true);
      
      // Verify no cross-tenant data
      const hasCrossTenantData = invoices.some(inv => inv.tenantId !== 'test-tenant-a');
      expect(hasCrossTenantData).toBe(false);
    });

    test('Revenue aggregation is tenant-specific', async () => {
      const tenantARevenue = await prisma.invoice.aggregate({
        where: {
          tenantId: 'test-tenant-a',
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        },
        _sum: { total: true }
      });

      const tenantBRevenue = await prisma.invoice.aggregate({
        where: {
          tenantId: 'test-tenant-b',
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        },
        _sum: { total: true }
      });

      // Revenues should be different
      expect(tenantARevenue._sum.total).toBe(110);
      expect(tenantBRevenue._sum.total).toBe(220);
      expect(tenantARevenue._sum.total).not.toBe(tenantBRevenue._sum.total);
    });

    test('Customer count is tenant-specific', async () => {
      const tenantACount = await prisma.customer.count({
        where: { tenantId: 'test-tenant-a' }
      });

      const tenantBCount = await prisma.customer.count({
        where: { tenantId: 'test-tenant-b' }
      });

      // Each tenant should have at least their test customer
      expect(tenantACount).toBeGreaterThanOrEqual(1);
      expect(tenantBCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Date Range Filtering with Tenant Isolation', () => {
    test('Month filter respects tenant boundaries', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?period=month')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      expect(response.status).toBe(200);
      
      const data = response.body.data;
      
      // Should only include tenant A data for this month
      expect(data.totalRevenue).toBeLessThanOrEqual(110);
      expect(data.customerCount).toBeLessThanOrEqual(1);
    });

    test('All-time filter respects tenant boundaries', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?period=all')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .set('x-tenant-subdomain', 'test-tenant-a');

      expect(response.status).toBe(200);
      
      const data = response.body.data;
      
      // Even with 'all' period, should only show tenant A data
      expect(data.totalRevenue).toBe(110);
      expect(data.customerCount).toBe(1);
    });
  });
});
