/**
 * Report Card Controller Tests
 *
 * Tests for report card API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as reportCardController from '../reportCard';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    reportCard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    reportCardPhoto: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pet: {
      findFirst: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

const prisma = new PrismaClient();

describe('ReportCard Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'staff-123',
        email: 'staff@test.com',
        role: 'STAFF',
        tenantId: 'tenant-1',
      },
      tenantId: 'tenant-1',
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createReportCard', () => {
    it('should create a report card successfully', async () => {
      const mockPet = {
        id: 'pet-123',
        name: 'Max',
        customerId: 'customer-123',
        tenantId: 'tenant-1',
      };

      const mockReportCard = {
        id: 'report-123',
        tenantId: 'tenant-1',
        petId: 'pet-123',
        customerId: 'customer-123',
        createdByStaffId: 'staff-123',
        serviceType: 'DAYCARE',
        moodRating: 5,
        energyRating: 4,
        appetiteRating: 5,
        socialRating: 4,
        activities: ['Playtime', 'Nap'],
        highlights: ['Great day!'],
        photoCount: 0,
        status: 'DRAFT',
        pet: mockPet,
        customer: { id: 'customer-123', firstName: 'John', lastName: 'Doe' },
        createdByStaff: {
          id: 'staff-123',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        photos: [],
      };

      (prisma.pet.findFirst as jest.Mock).mockResolvedValue(mockPet);
      (prisma.reportCard.create as jest.Mock).mockResolvedValue(mockReportCard);

      mockRequest.body = {
        petId: 'pet-123',
        customerId: 'customer-123',
        serviceType: 'DAYCARE',
        moodRating: 5,
        energyRating: 4,
        appetiteRating: 5,
        socialRating: 4,
        activities: ['Playtime', 'Nap'],
        highlights: ['Great day!'],
      };

      await reportCardController.createReportCard(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.pet.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'pet-123',
          customerId: 'customer-123',
          tenantId: 'tenant-1',
        },
      });

      expect(prisma.reportCard.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReportCard,
      });
    });

    it('should return error if pet not found', async () => {
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue(null);

      mockRequest.body = {
        petId: 'invalid-pet',
        customerId: 'customer-123',
        serviceType: 'DAYCARE',
      };

      await reportCardController.createReportCard(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pet not found or does not belong to customer',
          statusCode: 404,
        })
      );
    });

    it('should return error if required fields missing', async () => {
      mockRequest.body = {
        // Missing petId, customerId, serviceType
      };

      await reportCardController.createReportCard(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pet ID, Customer ID, and Service Type are required',
          statusCode: 400,
        })
      );
    });
  });

  describe('listReportCards', () => {
    it('should list report cards with filters', async () => {
      const mockReportCards = [
        {
          id: 'report-1',
          petId: 'pet-123',
          serviceType: 'DAYCARE',
          status: 'SENT',
          pet: { id: 'pet-123', name: 'Max' },
          customer: { id: 'customer-123', firstName: 'John' },
          createdByStaff: { id: 'staff-123', firstName: 'Jane' },
          photos: [],
        },
      ];

      (prisma.reportCard.findMany as jest.Mock).mockResolvedValue(
        mockReportCards
      );
      (prisma.reportCard.count as jest.Mock).mockResolvedValue(1);

      mockRequest.query = {
        petId: 'pet-123',
        status: 'SENT',
        limit: '10',
        offset: '0',
      };

      await reportCardController.listReportCards(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.reportCard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            petId: 'pet-123',
            status: 'SENT',
          }),
          take: 10,
          skip: 0,
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          reportCards: mockReportCards,
          total: 1,
          limit: 10,
          offset: 0,
        },
      });
    });
  });

  describe('getReportCard', () => {
    it('should get a single report card and track view', async () => {
      const mockReportCard = {
        id: 'report-123',
        petId: 'pet-123',
        pet: { id: 'pet-123', name: 'Max' },
        customer: { id: 'customer-123', firstName: 'John' },
        photos: [],
        viewCount: 0,
      };

      (prisma.reportCard.findFirst as jest.Mock).mockResolvedValue(
        mockReportCard
      );
      (prisma.reportCard.update as jest.Mock).mockResolvedValue({
        ...mockReportCard,
        viewCount: 1,
      });

      mockRequest.params = { id: 'report-123' };

      await reportCardController.getReportCard(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.reportCard.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: {
          viewCount: { increment: 1 },
          viewedAt: expect.any(Date),
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReportCard,
      });
    });

    it('should return 404 if report card not found', async () => {
      (prisma.reportCard.findFirst as jest.Mock).mockResolvedValue(null);

      mockRequest.params = { id: 'invalid-id' };

      await reportCardController.getReportCard(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Report card not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo to report card', async () => {
      const mockReportCard = {
        id: 'report-123',
        tenantId: 'tenant-1',
      };

      const mockPhoto = {
        id: 'photo-123',
        reportCardId: 'report-123',
        url: 'https://example.com/photo.jpg',
        order: 0,
      };

      (prisma.reportCard.findFirst as jest.Mock).mockResolvedValue(
        mockReportCard
      );
      (prisma.reportCardPhoto.create as jest.Mock).mockResolvedValue(mockPhoto);

      mockRequest.params = { id: 'report-123' };
      mockRequest.body = {
        url: 'https://example.com/photo.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Playing fetch!',
        order: 0,
      };

      await reportCardController.uploadPhoto(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.reportCardPhoto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportCardId: 'report-123',
            url: 'https://example.com/photo.jpg',
            caption: 'Playing fetch!',
          }),
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPhoto,
      });
    });

    it('should return error if URL missing', async () => {
      mockRequest.params = { id: 'report-123' };
      mockRequest.body = {
        // Missing url
        caption: 'Test',
      };

      await reportCardController.uploadPhoto(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Photo URL is required',
          statusCode: 400,
        })
      );
    });
  });

  describe('bulkCreateReportCards', () => {
    it('should create multiple report cards', async () => {
      const mockReportCards = [
        { id: 'report-1', petId: 'pet-1', pet: { name: 'Max' } },
        { id: 'report-2', petId: 'pet-2', pet: { name: 'Bella' } },
      ];

      (prisma.reportCard.create as jest.Mock)
        .mockResolvedValueOnce(mockReportCards[0])
        .mockResolvedValueOnce(mockReportCards[1]);

      mockRequest.body = {
        reportCards: [
          { petId: 'pet-1', customerId: 'customer-1', serviceType: 'DAYCARE' },
          { petId: 'pet-2', customerId: 'customer-2', serviceType: 'DAYCARE' },
        ],
      };

      await reportCardController.bulkCreateReportCards(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.reportCard.create).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          created: 2,
          reportCards: mockReportCards,
        },
      });
    });

    it('should return error if reportCards array empty', async () => {
      mockRequest.body = {
        reportCards: [],
      };

      await reportCardController.bulkCreateReportCards(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Report cards array is required',
          statusCode: 400,
        })
      );
    });
  });

  describe('sendReportCard', () => {
    it('should send report card and update status', async () => {
      const mockReportCard = {
        id: 'report-123',
        tenantId: 'tenant-1',
        customer: {
          email: 'customer@test.com',
          phone: '+1234567890',
        },
        pet: { name: 'Max' },
        photos: [],
      };

      const mockUpdated = {
        ...mockReportCard,
        status: 'SENT',
        sentAt: new Date(),
        sentViaEmail: true,
        sentViaSMS: true,
      };

      (prisma.reportCard.findFirst as jest.Mock).mockResolvedValue(
        mockReportCard
      );
      (prisma.reportCard.update as jest.Mock).mockResolvedValue(mockUpdated);

      mockRequest.params = { id: 'report-123' };
      mockRequest.body = {
        sendEmail: true,
        sendSMS: true,
      };

      await reportCardController.sendReportCard(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.reportCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'report-123' },
          data: expect.objectContaining({
            status: 'SENT',
            sentViaEmail: true,
            sentViaSMS: true,
          }),
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdated,
        message: 'Report card sent successfully',
      });
    });
  });

  describe('deleteReportCard', () => {
    it('should delete report card', async () => {
      const mockReportCard = {
        id: 'report-123',
        tenantId: 'tenant-1',
      };

      (prisma.reportCard.findFirst as jest.Mock).mockResolvedValue(
        mockReportCard
      );
      (prisma.reportCard.delete as jest.Mock).mockResolvedValue(mockReportCard);

      mockRequest.params = { id: 'report-123' };

      await reportCardController.deleteReportCard(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.reportCard.delete).toHaveBeenCalledWith({
        where: { id: 'report-123' },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Report card deleted successfully',
      });
    });
  });
});
