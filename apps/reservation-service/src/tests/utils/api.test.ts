// @ts-nocheck
/**
 * Tests for api.ts
 *
 * Tests the API utility functions for standardized responses and validation.
 */

import { Request } from 'express';
import { z } from 'zod';
import {
  createValidationError,
  createNotFoundError,
  createSuccessResponse,
  validateRequest,
} from '../../utils/api';

describe('API utilities', () => {
  describe('createValidationError', () => {
    it('should create a validation error with message', () => {
      const error = createValidationError('Invalid input');

      expect(error.type).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toBeUndefined();
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const error = createValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
    });

    it('should handle complex details object', () => {
      const details = {
        errors: [
          { field: 'email', message: 'Required' },
          { field: 'name', message: 'Too short' },
        ],
      };
      const error = createValidationError('Multiple errors', details);

      expect(error.details.errors).toHaveLength(2);
    });
  });

  describe('createNotFoundError', () => {
    it('should create a not found error with resource and id', () => {
      const error = createNotFoundError('User', '123');

      expect(error.type).toBe('NOT_FOUND_ERROR');
      expect(error.message).toBe('User with id 123 not found');
      expect(error.details).toEqual({ resource: 'User', id: '123' });
    });

    it('should include context when provided', () => {
      const error = createNotFoundError('Reservation', '456', 'for tenant abc');

      expect(error.message).toBe(
        'Reservation with id 456 not found for tenant abc'
      );
    });

    it('should handle different resource types', () => {
      const customerError = createNotFoundError('Customer', 'cust-1');
      const petError = createNotFoundError('Pet', 'pet-1');
      const resourceError = createNotFoundError('Resource', 'res-1');

      expect(customerError.details.resource).toBe('Customer');
      expect(petError.details.resource).toBe('Pet');
      expect(resourceError.details.resource).toBe('Resource');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Operation successful');
    });

    it('should include custom message when provided', () => {
      const response = createSuccessResponse(
        { id: '1' },
        'Created successfully'
      );

      expect(response.message).toBe('Created successfully');
    });

    it('should handle array data', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = createSuccessResponse(data);

      expect(response.data).toHaveLength(2);
    });

    it('should handle null data', () => {
      const response = createSuccessResponse(null);

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });
  });

  describe('validateRequest', () => {
    const createMockRequest = (overrides: any = {}): Request => {
      return {
        body: {},
        params: {},
        query: {},
        ...overrides,
      } as Request;
    };

    describe('body validation', () => {
      it('should validate request body against schema', () => {
        const schema = {
          body: z.object({
            name: z.string(),
            email: z.string().email(),
          }),
        };

        const req = createMockRequest({
          body: { name: 'John', email: 'john@example.com' },
        });

        const result = validateRequest(req, schema);

        expect(result.body).toEqual({
          name: 'John',
          email: 'john@example.com',
        });
      });

      it('should throw validation error for invalid body', () => {
        const schema = {
          body: z.object({
            email: z.string().email(),
          }),
        };

        const req = createMockRequest({
          body: { email: 'invalid-email' },
        });

        expect(() => validateRequest(req, schema)).toThrow();
      });
    });

    describe('params validation', () => {
      it('should validate request params against schema', () => {
        const schema = {
          params: z.object({
            id: z.string().uuid(),
          }),
        };

        const req = createMockRequest({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        });

        const result = validateRequest(req, schema);

        expect(result.params.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      });

      it('should throw validation error for invalid params', () => {
        const schema = {
          params: z.object({
            id: z.string().uuid(),
          }),
        };

        const req = createMockRequest({
          params: { id: 'not-a-uuid' },
        });

        expect(() => validateRequest(req, schema)).toThrow();
      });
    });

    describe('query validation', () => {
      it('should validate query parameters against schema', () => {
        const schema = {
          query: z.object({
            page: z.string().optional(),
            limit: z.string().optional(),
          }),
        };

        const req = createMockRequest({
          query: { page: '1', limit: '10' },
        });

        const result = validateRequest(req, schema);

        expect(result.query).toEqual({ page: '1', limit: '10' });
      });

      it('should throw validation error for invalid query', () => {
        const schema = {
          query: z.object({
            page: z.string().regex(/^\d+$/),
          }),
        };

        const req = createMockRequest({
          query: { page: 'abc' },
        });

        expect(() => validateRequest(req, schema)).toThrow();
      });
    });

    describe('combined validation', () => {
      it('should validate body, params, and query together', () => {
        const schema = {
          body: z.object({ name: z.string() }),
          params: z.object({ id: z.string() }),
          query: z.object({ include: z.string().optional() }),
        };

        const req = createMockRequest({
          body: { name: 'Test' },
          params: { id: '123' },
          query: { include: 'pets' },
        });

        const result = validateRequest(req, schema);

        expect(result.body.name).toBe('Test');
        expect(result.params.id).toBe('123');
        expect(result.query.include).toBe('pets');
      });

      it('should only validate provided schemas', () => {
        const schema = {
          body: z.object({ name: z.string() }),
        };

        const req = createMockRequest({
          body: { name: 'Test' },
          params: { id: '123' },
          query: { page: '1' },
        });

        const result = validateRequest(req, schema);

        expect(result.body).toBeDefined();
        expect(result.params).toBeUndefined();
        expect(result.query).toBeUndefined();
      });
    });

    describe('error messages', () => {
      it("should include 'Invalid request body' for body errors", () => {
        const schema = {
          body: z.object({ name: z.string() }),
        };

        const req = createMockRequest({ body: {} });

        try {
          validateRequest(req, schema);
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.message).toBe('Invalid request body');
        }
      });

      it("should include 'Invalid request parameters' for params errors", () => {
        const schema = {
          params: z.object({ id: z.string() }),
        };

        const req = createMockRequest({ params: {} });

        try {
          validateRequest(req, schema);
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.message).toBe('Invalid request parameters');
        }
      });

      it("should include 'Invalid query parameters' for query errors", () => {
        const schema = {
          query: z.object({ page: z.string() }),
        };

        const req = createMockRequest({ query: {} });

        try {
          validateRequest(req, schema);
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.message).toBe('Invalid query parameters');
        }
      });
    });
  });
});
