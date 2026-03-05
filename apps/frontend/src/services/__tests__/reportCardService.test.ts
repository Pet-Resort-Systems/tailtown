/**
 * Report Card Service Tests
 * 
 * Tests for frontend report card service
 */

import { reportCardService } from '../reportCardService';
import api from '../api';

jest.mock('../api');

const mockedApi = api as jest.Mocked<typeof api>;

describe('ReportCardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReportCard', () => {
    it('should create a report card', async () => {
      const mockReportCard = {
        id: 'report-123',
        petId: 'pet-123',
        customerId: 'customer-123',
        serviceType: 'DAYCARE' as const,
        moodRating: 5,
        energyRating: 4,
        status: 'DRAFT' as const
      };

      mockedApi.post.mockResolvedValue({
        data: { data: mockReportCard }
      } as any);

      const result = await reportCardService.createReportCard({
        petId: 'pet-123',
        customerId: 'customer-123',
        serviceType: 'DAYCARE',
        moodRating: 5,
        energyRating: 4
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/report-cards', {
        petId: 'pet-123',
        customerId: 'customer-123',
        serviceType: 'DAYCARE',
        moodRating: 5,
        energyRating: 4
      });

      expect(result).toEqual(mockReportCard);
    });
  });

  describe('listReportCards', () => {
    it('should list report cards with filters', async () => {
      const mockResponse = {
        reportCards: [
          { id: 'report-1', petId: 'pet-123' },
          { id: 'report-2', petId: 'pet-456' }
        ],
        total: 2,
        limit: 50,
        offset: 0
      };

      mockedApi.get.mockResolvedValue({
        data: { data: mockResponse }
      } as any);

      const result = await reportCardService.listReportCards({
        petId: 'pet-123',
        status: 'SENT',
        limit: 50
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/report-cards', {
        params: {
          petId: 'pet-123',
          status: 'SENT',
          limit: 50
        }
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload a photo to report card', async () => {
      const mockPhoto = {
        id: 'photo-123',
        reportCardId: 'report-123',
        url: 'https://example.com/photo.jpg',
        order: 0
      };

      mockedApi.post.mockResolvedValue({
        data: { data: mockPhoto }
      } as any);

      const result = await reportCardService.uploadPhoto('report-123', {
        url: 'https://example.com/photo.jpg',
        caption: 'Playing fetch!',
        order: 0
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/report-cards/report-123/photos',
        {
          url: 'https://example.com/photo.jpg',
          caption: 'Playing fetch!',
          order: 0
        }
      );

      expect(result).toEqual(mockPhoto);
    });
  });

  describe('sendReportCard', () => {
    it('should send report card via email and SMS', async () => {
      const mockReportCard = {
        id: 'report-123',
        status: 'SENT' as const,
        sentViaEmail: true,
        sentViaSMS: true
      };

      mockedApi.post.mockResolvedValue({
        data: { data: mockReportCard }
      } as any);

      const result = await reportCardService.sendReportCard('report-123', {
        sendEmail: true,
        sendSMS: true
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/report-cards/report-123/send',
        {
          sendEmail: true,
          sendSMS: true
        }
      );

      expect(result).toEqual(mockReportCard);
    });
  });

  describe('bulkCreateReportCards', () => {
    it('should create multiple report cards', async () => {
      const mockResponse = {
        created: 2,
        reportCards: [
          { id: 'report-1', petId: 'pet-1' },
          { id: 'report-2', petId: 'pet-2' }
        ]
      };

      mockedApi.post.mockResolvedValue({
        data: { data: mockResponse }
      } as any);

      const result = await reportCardService.bulkCreateReportCards([
        { petId: 'pet-1', customerId: 'customer-1', serviceType: 'DAYCARE' },
        { petId: 'pet-2', customerId: 'customer-2', serviceType: 'DAYCARE' }
      ]);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/report-cards/bulk', {
        reportCards: [
          { petId: 'pet-1', customerId: 'customer-1', serviceType: 'DAYCARE' },
          { petId: 'pet-2', customerId: 'customer-2', serviceType: 'DAYCARE' }
        ]
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Helper Methods', () => {
    it('should format service type correctly', () => {
      expect(reportCardService.formatServiceType('DAYCARE')).toBe('Daycare');
      expect(reportCardService.formatServiceType('BOARDING')).toBe('Boarding');
      expect(reportCardService.formatServiceType('GROOMING')).toBe('Grooming');
      expect(reportCardService.formatServiceType('TRAINING')).toBe('Training');
    });

    it('should format status correctly', () => {
      expect(reportCardService.formatStatus('DRAFT')).toBe('Draft');
      expect(reportCardService.formatStatus('SENT')).toBe('Sent');
      expect(reportCardService.formatStatus('VIEWED')).toBe('Viewed');
    });

    it('should get correct status color', () => {
      expect(reportCardService.getStatusColor('DRAFT')).toBe('default');
      expect(reportCardService.getStatusColor('PENDING_REVIEW')).toBe('warning');
      expect(reportCardService.getStatusColor('SENT')).toBe('success');
      expect(reportCardService.getStatusColor('VIEWED')).toBe('success');
    });

    it('should get rating emoji', () => {
      expect(reportCardService.getRatingEmoji(1)).toBe('😢');
      expect(reportCardService.getRatingEmoji(3)).toBe('😐');
      expect(reportCardService.getRatingEmoji(5)).toBe('😄');
    });

    it('should get rating stars', () => {
      expect(reportCardService.getRatingStars(1)).toBe('⭐');
      expect(reportCardService.getRatingStars(3)).toBe('⭐⭐⭐');
      expect(reportCardService.getRatingStars(5)).toBe('⭐⭐⭐⭐⭐');
    });
  });

  describe('Image Compression', () => {
    it('should compress image', async () => {
      // Create a mock file
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock canvas and image
      const mockCanvas = document.createElement('canvas');
      const mockContext = {
        drawImage: jest.fn()
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any);
      jest.spyOn(mockCanvas, 'toBlob').mockImplementation((callback: any) => {
        const blob = new Blob(['compressed'], { type: 'image/jpeg' });
        callback(blob);
      });

      const result = await reportCardService.compressImage(mockFile, 800, 800, 0.8);

      expect(result).toBeInstanceOf(File);
      expect(result.type).toBe('image/jpeg');
    });
  });
});
