import { Request, Response } from 'express';
import { PrismaClient, ServiceCategory } from '@prisma/client';
import * as serviceController from '../../controllers/service.controller';

/**
 * Validation tests for the Service API endpoints
 * These tests focus specifically on input validation and error handling
 */
describe('Service Controller Validation Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('createService validation', () => {
    it('should validate required fields', async () => {
      // Missing required fields
      mockReq.body = {
        // Missing name
        description: 'Test service',
        // Missing duration
        price: 50.0,
        // Missing serviceCategory
      };

      await serviceController.createService(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // The controller should pass the error to next()
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeDefined();
    });

    it('should validate price is a positive number', async () => {
      mockReq.body = {
        name: 'Test Service',
        description: 'Description',
        duration: 60,
        price: -50.0, // Negative price
        serviceCategory: ServiceCategory.DAYCARE
      };

      await serviceController.createService(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate service category is valid', async () => {
      mockReq.body = {
        name: 'Test Service',
        description: 'Description',
        duration: 60,
        price: 50.0,
        serviceCategory: 'INVALID_CATEGORY' // Invalid enum value
      };

      await serviceController.createService(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('updateService validation', () => {
    it('should validate service exists before update', async () => {
      mockReq.params = { id: 'non-existent-id' };
      mockReq.body = {
        name: 'Updated Service'
      };

      // Mock PrismaClient to return null, indicating service doesn't exist
      jest.spyOn(PrismaClient.prototype, 'service').mockImplementation(() => ({
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn()
      } as any));

      await serviceController.updateService(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('not found')
        })
      );
    });
  });

  describe('deleteService validation', () => {
    it('should prevent deletion of service with active reservations', async () => {
      mockReq.params = { id: 'service-with-reservations' };

      // Mock service exists
      jest.spyOn(PrismaClient.prototype, 'service').mockImplementation(() => ({
        findUnique: jest.fn().mockResolvedValue({ id: 'service-with-reservations' }),
        delete: jest.fn()
      } as any));

      // Mock reservation count to be > 0
      jest.spyOn(PrismaClient.prototype, 'reservation').mockImplementation(() => ({
        count: jest.fn().mockResolvedValue(5) // 5 active reservations
      } as any));

      await serviceController.deleteService(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('active reservations')
        })
      );
    });
  });

  describe('getServiceAddOns validation', () => {
    it('should validate service exists before fetching add-ons', async () => {
      mockReq.params = { id: 'non-existent-id' };

      // Mock service doesn't exist
      jest.spyOn(PrismaClient.prototype, 'service').mockImplementation(() => ({
        findUnique: jest.fn().mockResolvedValue(null)
      } as any));

      await serviceController.getServiceAddOns(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('not found')
        })
      );
    });
  });
});
