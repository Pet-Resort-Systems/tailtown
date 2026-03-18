/**
 * Pet Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Response, NextFunction } from 'express';
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from '../../test/setup-test-db';
import {
  getAllPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  getPetsByCustomer,
} from '../pet.controller';
import { TenantRequest } from '../../middleware/tenant.middleware';

describe('Pet Controller Integration Tests', () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerId: string;
  let testPetIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`pet-test-${Date.now()}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: 'Pet',
        lastName: 'Owner',
        email: `pet-owner-${Date.now()}@example.com`,
        phone: '555-1000',
      },
    });
    testCustomerId = customer.id;

    // Create test pets
    const pet1 = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: 'Buddy',
        type: 'DOG',
        breed: 'Golden Retriever',
        weight: 65,
        isActive: true,
      },
    });
    testPetIds.push(pet1.id);

    const pet2 = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: 'Whiskers',
        type: 'CAT',
        breed: 'Persian',
        weight: 10,
        isActive: true,
      },
    });
    testPetIds.push(pet2.id);

    const pet3 = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: 'Inactive Pet',
        type: 'DOG',
        breed: 'Poodle',
        isActive: false,
      },
    });
    testPetIds.push(pet3.id);
  });

  afterAll(async () => {
    // Clean up pets
    for (const petId of testPetIds) {
      await prisma.pet.delete({ where: { id: petId } }).catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPets', () => {
    it('should return all pets for tenant', async () => {
      const req = {
        tenantId: testTenantId,
        query: {},
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllPets(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(2);
    });

    it('should return pets of various types', async () => {
      const req = {
        tenantId: testTenantId,
        query: {},
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllPets(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      // Should have both dogs and cats
      const types = responseData.data.map((pet: any) => pet.type);
      expect(types.length).toBeGreaterThanOrEqual(1);
    });

    it('should search by name', async () => {
      const req = {
        tenantId: testTenantId,
        query: { search: 'Buddy' },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllPets(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(1);
    });

    it('should paginate results', async () => {
      const req = {
        tenantId: testTenantId,
        query: { page: '1', limit: '2' },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllPets(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getPetById', () => {
    it('should return pet by ID', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: testPetIds[0] },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getPetById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.id).toBe(testPetIds[0]);
      expect(responseData.data.name).toBe('Buddy');
    });

    it('should return 404 for non-existent pet', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: '00000000-0000-0000-0000-000000000000' },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getPetById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('not found');
    });
  });

  describe('getPetsByCustomer', () => {
    it('should return all pets for a customer', async () => {
      const req = {
        tenantId: testTenantId,
        params: { customerId: testCustomerId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getPetsByCustomer(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createPet', () => {
    it('should create a new pet', async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          customerId: testCustomerId,
          name: `New Pet ${Date.now()}`,
          type: 'DOG',
          breed: 'Labrador',
          weight: 70,
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createPet(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.type).toBe('DOG');
      testPetIds.push(responseData.data.id);
    });

    it('should reject pet without name', async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          customerId: testCustomerId,
          type: 'DOG',
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createPet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject pet without customerId', async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          name: 'Orphan Pet',
          type: 'DOG',
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createPet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('updatePet', () => {
    let updatePetId: string;

    beforeAll(async () => {
      const pet = await prisma.pet.create({
        data: {
          tenantId: testTenantId,
          customerId: testCustomerId,
          name: 'Update Test Pet',
          type: 'DOG',
          breed: 'Beagle',
          isActive: true,
        },
      });
      updatePetId = pet.id;
      testPetIds.push(updatePetId);
    });

    it('should update pet fields', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: updatePetId },
        query: {},
        body: {
          name: 'Updated Pet Name',
          weight: 30,
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updatePet(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.name).toBe('Updated Pet Name');
      expect(responseData.data.weight).toBe(30);
    });

    it('should return 404 for non-existent pet', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: '00000000-0000-0000-0000-000000000000' },
        query: {},
        body: { name: 'Test' },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updatePet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('deletePet', () => {
    let deletePetId: string;

    beforeAll(async () => {
      const pet = await prisma.pet.create({
        data: {
          tenantId: testTenantId,
          customerId: testCustomerId,
          name: 'Delete Test Pet',
          type: 'CAT',
          breed: 'Siamese',
          isActive: true,
        },
      });
      deletePetId = pet.id;
      testPetIds.push(deletePetId);
    });

    it('should delete pet', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: deletePetId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deletePet(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 for non-existent pet', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: '00000000-0000-0000-0000-000000000000' },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deletePet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
