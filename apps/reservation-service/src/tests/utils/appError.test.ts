// @ts-nocheck
/**
 * Tests for appError.ts
 *
 * Tests the AppError class and its factory methods for creating
 * standardized error responses.
 */

import { AppError, ErrorType } from '../../utils/appError';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.status).toBe('error');
      expect(error.isOperational).toBe(true);
      expect(error.type).toBe(ErrorType.SERVER_ERROR);
      expect(error.details).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it('should create an error with custom values', () => {
      const error = new AppError(
        'Custom error',
        400,
        ErrorType.VALIDATION_ERROR,
        true,
        { field: 'email' },
        { userId: '123' }
      );

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.context).toEqual({ userId: '123' });
    });

    it("should set status to 'fail' for 4xx errors", () => {
      const error400 = new AppError('Bad request', 400);
      const error404 = new AppError('Not found', 404);
      const error409 = new AppError('Conflict', 409);

      expect(error400.status).toBe('fail');
      expect(error404.status).toBe('fail');
      expect(error409.status).toBe('fail');
    });

    it("should set status to 'error' for 5xx errors", () => {
      const error500 = new AppError('Server error', 500);
      const error502 = new AppError('Bad gateway', 502);
      const error503 = new AppError('Service unavailable', 503);

      expect(error500.status).toBe('error');
      expect(error502.status).toBe('error');
      expect(error503.status).toBe('error');
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should have a stack trace', () => {
      const error = new AppError('Test');

      expect(error.stack).toBeDefined();
      // Stack trace should contain the error message or test file reference
      expect(error.stack).toContain('Test');
    });
  });

  describe('validationError', () => {
    it('should create a validation error with correct defaults', () => {
      const error = AppError.validationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.isOperational).toBe(true);
    });

    it('should include validation details', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const error = AppError.validationError('Validation failed', details);

      expect(error.details).toEqual(details);
    });

    it('should include context', () => {
      const context = { requestId: 'abc123' };
      const error = AppError.validationError('Invalid', undefined, context);

      expect(error.context).toEqual(context);
    });
  });

  describe('authenticationError', () => {
    it('should create an authentication error with default message', () => {
      const error = AppError.authenticationError();

      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    });

    it('should create an authentication error with custom message', () => {
      const error = AppError.authenticationError('Token expired');

      expect(error.message).toBe('Token expired');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('authorizationError', () => {
    it('should create an authorization error with default message', () => {
      const error = AppError.authorizationError();

      expect(error.message).toBe('Not authorized');
      expect(error.statusCode).toBe(403);
      expect(error.type).toBe(ErrorType.AUTHORIZATION_ERROR);
    });

    it('should create an authorization error with custom message', () => {
      const error = AppError.authorizationError('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('notFoundError', () => {
    it('should create a not found error without ID', () => {
      const error = AppError.notFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.type).toBe(ErrorType.RESOURCE_NOT_FOUND);
      expect(error.details).toEqual({ resource: 'User', id: undefined });
    });

    it('should create a not found error with string ID', () => {
      const error = AppError.notFoundError('Reservation', 'abc123');

      expect(error.message).toBe('Reservation with ID abc123 not found');
      expect(error.details).toEqual({ resource: 'Reservation', id: 'abc123' });
    });

    it('should create a not found error with numeric ID', () => {
      const error = AppError.notFoundError('Invoice', 42);

      expect(error.message).toBe('Invoice with ID 42 not found');
      expect(error.details).toEqual({ resource: 'Invoice', id: 42 });
    });
  });

  describe('conflictError', () => {
    it('should create a conflict error', () => {
      const error = AppError.conflictError('Resource already exists');

      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.type).toBe(ErrorType.RESOURCE_CONFLICT);
    });

    it('should include conflict details', () => {
      const details = { existingId: '123', conflictingField: 'email' };
      const error = AppError.conflictError('Duplicate entry', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('databaseError', () => {
    it('should create a database error', () => {
      const error = AppError.databaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.type).toBe(ErrorType.DATABASE_ERROR);
      expect(error.isOperational).toBe(true);
    });

    it('should allow non-operational database errors', () => {
      const error = AppError.databaseError(
        'Critical failure',
        { code: 'P2002' },
        false
      );

      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ code: 'P2002' });
    });
  });

  describe('schemaAlignmentError', () => {
    it('should create a schema alignment error', () => {
      const error = AppError.schemaAlignmentError('Column not found');

      expect(error.message).toBe('Column not found');
      expect(error.statusCode).toBe(500);
      expect(error.type).toBe(ErrorType.SCHEMA_ALIGNMENT_ERROR);
      expect(error.isOperational).toBe(true);
    });

    it('should include schema details', () => {
      const details = { table: 'users', column: 'legacy_field' };
      const error = AppError.schemaAlignmentError('Missing column', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('serverError', () => {
    it('should create a server error with default message', () => {
      const error = AppError.serverError();

      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
      expect(error.type).toBe(ErrorType.SERVER_ERROR);
      expect(error.isOperational).toBe(false);
    });

    it('should create a server error with custom message', () => {
      const error = AppError.serverError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ErrorType enum', () => {
    it('should have all expected error types', () => {
      expect(ErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorType.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(ErrorType.AUTHORIZATION_ERROR).toBe('AUTHORIZATION_ERROR');
      expect(ErrorType.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
      expect(ErrorType.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
      expect(ErrorType.BAD_REQUEST).toBe('BAD_REQUEST');
      expect(ErrorType.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ErrorType.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(ErrorType.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorType.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
      expect(ErrorType.SCHEMA_ERROR).toBe('SCHEMA_ERROR');
      expect(ErrorType.SCHEMA_ALIGNMENT_ERROR).toBe('SCHEMA_ALIGNMENT_ERROR');
      expect(ErrorType.MULTI_TENANT_ERROR).toBe('MULTI_TENANT_ERROR');
    });
  });
});
