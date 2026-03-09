// @ts-nocheck
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../index';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

describe('Reservation Tenant Isolation', () => {
  const tenantAId = uuidv4();
  const tenantBId = uuidv4();
  
  let customerAId: string;
  let customerBId: string;
  let petAId: string;
  let petBId: string;
  let serviceAId: string;
  let serviceBId: string;
  let resourceAId: string;
  let resourceBId: string;
  let reservationAId: string;
  let reservationBId: string;

  beforeAll(async () => {
    // Create tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, subdomain: 'tenant-a-res', businessName: 'Tenant A', contactEmail: 'a@test.com', contactName: 'A', isActive: true, status: 'ACTIVE' },
        { id: tenantBId, subdomain: 'tenant-b-res', businessName: 'Tenant B', contactEmail: 'b@test.com', contactName: 'B', isActive: true, status: 'ACTIVE' }
      ],
      skipDuplicates: true
    });

    // Create customers
    const custA = await prisma.customer.create({ data: { email: 'ca@test.com', firstName: 'A', lastName: 'Customer', tenantId: tenantAId } });
    customerAId = custA.id;
    const custB = await prisma.customer.create({ data: { email: 'cb@test.com', firstName: 'B', lastName: 'Customer', tenantId: tenantBId } });
    customerBId = custB.id;

    // Create pets
    const pA = await prisma.pet.create({ data: { name: 'Pet A', type: 'DOG', customerId: customerAId, tenantId: tenantAId } });
    petAId = pA.id;
    const pB = await prisma.pet.create({ data: { name: 'Pet B', type: 'DOG', customerId: customerBId, tenantId: tenantBId } });
    petBId = pB.id;

    // Create services (omit depositRequired - it has a default in schema but column doesn't exist in DB yet)
    const sA = await prisma.service.create({ data: { name: 'Service A', price: 50, duration: 60, serviceCategory: 'BOARDING', tenantId: tenantAId, isActive: true } });
    serviceAId = sA.id;
    const sB = await prisma.service.create({ data: { name: 'Service B', price: 60, duration: 60, serviceCategory: 'BOARDING', tenantId: tenantBId, isActive: true } });
    serviceBId = sB.id;

    // Create resources
    const rA = await prisma.resource.create({ data: { name: 'Resource A', type: 'KENNEL', capacity: 1, tenantId: tenantAId, isActive: true } });
    resourceAId = rA.id;
    const rB = await prisma.resource.create({ data: { name: 'Resource B', type: 'KENNEL', capacity: 1, tenantId: tenantBId, isActive: true } });
    resourceBId = rB.id;

    // Create reservations
    const resA = await prisma.reservation.create({
      data: {
        customerId: customerAId,
        petId: petAId,
        serviceId: serviceAId,
        resourceId: resourceAId,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        status: 'CONFIRMED',
        tenantId: tenantAId
      }
    });
    reservationAId = resA.id;

    const resB = await prisma.reservation.create({
      data: {
        customerId: customerBId,
        petId: petBId,
        serviceId: serviceBId,
        resourceId: resourceBId,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        status: 'CONFIRMED',
        tenantId: tenantBId
      }
    });
    reservationBId = resB.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.resource.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.service.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.pet.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await prisma.$disconnect();
  });

  describe('GET /api/reservations', () => {
    test('Tenant A can view own reservations', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('x-tenant-id', 'tenant-a-res')

      expect(response.status).toBe(200);
      expect(response.body.data.reservations).toBeDefined();
      expect(response.body.data.reservations.length).toBeGreaterThan(0);
      response.body.data.reservations.forEach((res) => {
        expect(res.tenantId).toBe(tenantAId);
      });
    });

    test('Tenant A cannot see Tenant B reservations in list', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('x-tenant-id', 'tenant-a-res')

      expect(response.status).toBe(200);
      const reservationIds = response.body.data.reservations.map((r) => r.id);
      expect(reservationIds).not.toContain(reservationBId);
    });
  });

  describe('GET /api/reservations/:id', () => {
    test('Tenant A cannot view Tenant B reservation by ID', async () => {
      const response = await request(app)
        .get(`/api/reservations/${reservationBId}`)
        .set('x-tenant-id', 'tenant-a-res')

      expect(response.status).toBe(404);
    });

    test('Tenant B can view own reservation', async () => {
      const response = await request(app)
        .get(`/api/reservations/${reservationBId}`)
        .set('x-tenant-id', 'tenant-b-res')

      expect(response.status).toBe(200);
      expect(response.body.data.reservation.id).toBe(reservationBId);
      expect(response.body.data.reservation.tenantId).toBe(tenantBId);
    });
  });

  describe('PATCH /api/reservations/:id', () => {
    test('Tenant A can update own reservation', async () => {
      const response = await request(app)
        .patch(`/api/reservations/${reservationAId}`)
        .set('x-tenant-id', 'tenant-a-res')
        .send({ notes: 'Updated by A' });

      expect(response.status).toBe(200);
    });

    test('Tenant A cannot update Tenant B reservation', async () => {
      const response = await request(app)
        .patch(`/api/reservations/${reservationBId}`)
        .set('x-tenant-id', 'tenant-a-res')
        .send({ notes: 'Hacked' });

      expect(response.status).toBe(404);
    });

    test('Tenant B reservation unchanged after Tenant A attack', async () => {
      const res = await prisma.reservation.findUnique({ where: { id: reservationBId } });
      expect(res.notes).not.toBe('Hacked');
    });
  });

  describe('DELETE /api/reservations/:id', () => {
    test('Tenant A cannot delete Tenant B reservation', async () => {
      const response = await request(app)
        .delete(`/api/reservations/${reservationBId}`)
        .set('x-tenant-id', 'tenant-a-res')

      expect(response.status).toBe(404);
    });

    test('Tenant B reservation still exists after delete attempt', async () => {
      const res = await prisma.reservation.findUnique({ where: { id: reservationBId } });
      expect(res).not.toBeNull();
    });
  });
});
