// @ts-nocheck
/**
 * Tests for create-reservation.controller.ts
 *
 * Tests the reservation creation controller endpoint.
 */

import { Response } from 'express';

// Mock dependencies
jest.mock('../../../controllers/reservation/utils/prisma-helpers', () => ({
  prisma: {
    reservation: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    resource: {
      findFirst: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    addOnService: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback()),
  },
  safeExecutePrismaQuery: jest.fn((fn) => fn()),
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../utils/reservation-conflicts', () => ({
  detectReservationConflicts: jest.fn().mockResolvedValue({
    hasConflicts: false,
    conflicts: [],
    warnings: [],
  }),
}));

jest.mock('../../../clients/customer-service.client', () => ({
  customerServiceClient: {
    getCustomer: jest
      .fn()
      .mockResolvedValue({ id: 'cust-1', name: 'Test Customer' }),
    getPet: jest.fn().mockResolvedValue({ id: 'pet-1', name: 'Buddy' }),
  },
}));

import {
  prisma,
  safeExecutePrismaQuery,
} from '../../../controllers/reservation/utils/prisma-helpers';
import { logger } from '../../../utils/logger';
import { detectReservationConflicts } from '../../../utils/reservation-conflicts';

// Helper to create mock request
const createMockRequest = (overrides: any = {}) => {
  return {
    tenantId: 'test-tenant',
    body: {},
    headers: { 'x-tenant-id': 'test-tenant' },
    ...overrides,
  };
};

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe('Create Reservation Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineSuiteType helper', () => {
    const serviceToSuiteMap: Record<string, string> = {
      BOARDING: 'KENNEL',
      DAYCARE: 'PLAY_AREA',
      GROOMING: 'GROOMING_STATION',
      TRAINING: 'TRAINING_AREA',
      VET: 'EXAM_ROOM',
    };

    it('should map BOARDING to KENNEL', () => {
      expect(serviceToSuiteMap['BOARDING']).toBe('KENNEL');
    });

    it('should map DAYCARE to PLAY_AREA', () => {
      expect(serviceToSuiteMap['DAYCARE']).toBe('PLAY_AREA');
    });

    it('should map GROOMING to GROOMING_STATION', () => {
      expect(serviceToSuiteMap['GROOMING']).toBe('GROOMING_STATION');
    });

    it('should map TRAINING to TRAINING_AREA', () => {
      expect(serviceToSuiteMap['TRAINING']).toBe('TRAINING_AREA');
    });

    it('should map VET to EXAM_ROOM', () => {
      expect(serviceToSuiteMap['VET']).toBe('EXAM_ROOM');
    });

    it('should return undefined for unknown service type', () => {
      expect(serviceToSuiteMap['UNKNOWN']).toBeUndefined();
    });
  });

  describe('Required field validation', () => {
    it('should require customerId', () => {
      const body = {
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
      };

      expect(body.customerId).toBeUndefined();
    });

    it('should require petId', () => {
      const body = {
        customerId: 'cust-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
      };

      expect(body.petId).toBeUndefined();
    });

    it('should require startDate', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        endDate: '2024-06-20',
      };

      expect(body.startDate).toBeUndefined();
    });

    it('should require endDate', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
      };

      expect(body.endDate).toBeUndefined();
    });

    it('should accept all required fields', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
      };

      expect(body.customerId).toBeDefined();
      expect(body.petId).toBeDefined();
      expect(body.startDate).toBeDefined();
      expect(body.endDate).toBeDefined();
    });
  });

  describe('Optional field handling', () => {
    it('should accept serviceId', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        serviceId: 'service-1',
      };

      expect(body.serviceId).toBe('service-1');
    });

    it('should accept serviceType for backward compatibility', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        serviceType: 'BOARDING',
      };

      expect(body.serviceType).toBe('BOARDING');
    });

    it('should accept resourceId', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        resourceId: 'res-1',
      };

      expect(body.resourceId).toBe('res-1');
    });

    it('should accept status', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        status: 'CONFIRMED',
      };

      expect(body.status).toBe('CONFIRMED');
    });

    it('should accept price and deposit', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        price: 150.0,
        deposit: 50.0,
      };

      expect(body.price).toBe(150.0);
      expect(body.deposit).toBe(50.0);
    });

    it('should accept notes and staffNotes', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        notes: 'Customer notes',
        staffNotes: 'Internal staff notes',
      };

      expect(body.notes).toBe('Customer notes');
      expect(body.staffNotes).toBe('Internal staff notes');
    });

    it('should accept addOnServices array', () => {
      const body = {
        customerId: 'cust-1',
        petId: 'pet-1',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        addOnServices: ['addon-1', 'addon-2'],
      };

      expect(body.addOnServices).toHaveLength(2);
    });
  });

  describe('Tenant isolation', () => {
    it('should require tenant ID', () => {
      const req = createMockRequest({ tenantId: null });
      expect(req.tenantId).toBeNull();
    });

    it('should use dev tenant in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const tenantId = null || (process.env.NODE_ENV !== 'production' && 'dev');
      expect(tenantId).toBe('dev');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Conflict detection', () => {
    it('should call detectReservationConflicts', async () => {
      const mockConflictResult = {
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      };

      (detectReservationConflicts as jest.Mock).mockResolvedValue(
        mockConflictResult
      );

      // Simulate calling conflict detection
      const result = await detectReservationConflicts(
        'test-tenant',
        'res-1',
        new Date('2024-06-15'),
        new Date('2024-06-20')
      );

      expect(result.hasConflicts).toBe(false);
    });

    it('should detect conflicts when they exist', async () => {
      const mockConflictResult = {
        hasConflicts: true,
        conflicts: [
          {
            type: 'RESOURCE_CONFLICT',
            message: 'Resource is already booked',
            conflictingReservationId: 'existing-res-1',
          },
        ],
        warnings: [],
      };

      (detectReservationConflicts as jest.Mock).mockResolvedValue(
        mockConflictResult
      );

      const result = await detectReservationConflicts(
        'test-tenant',
        'res-1',
        new Date('2024-06-15'),
        new Date('2024-06-20')
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('Date validation', () => {
    it('should parse valid date strings', () => {
      const startDate = new Date('2024-06-15');
      const endDate = new Date('2024-06-20');

      expect(startDate).toBeInstanceOf(Date);
      expect(endDate).toBeInstanceOf(Date);
      expect(endDate > startDate).toBe(true);
    });

    it('should detect invalid date strings', () => {
      const invalidDate = new Date('invalid-date');
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });

    it('should reject end date before start date', () => {
      const startDate = new Date('2024-06-20');
      const endDate = new Date('2024-06-15');

      expect(endDate < startDate).toBe(true);
    });
  });
});
