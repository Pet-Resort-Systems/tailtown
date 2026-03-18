import axios from 'axios';
import checkInService from '../checkInService';

import { reservationApi } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the reservationApi
jest.mock('../api', () => ({
  reservationApi: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));
const mockedReservationApi = reservationApi as jest.Mocked<
  typeof reservationApi
>;

describe('checkInService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Endpoint URLs', () => {
    it('should call check-in template endpoint with correct /api prefix', async () => {
      const mockTemplate = {
        status: 'success',
        data: {
          id: 'template-1',
          name: 'Standard Boarding Check-In',
          sections: [],
        },
      };

      mockedReservationApi.get.mockResolvedValue({ data: mockTemplate });

      await checkInService.getDefaultTemplate();

      // Verify the endpoint includes /api prefix
      expect(mockedReservationApi.get).toHaveBeenCalledWith(
        '/api/check-in-templates/default'
      );
      expect(mockedReservationApi.get).toHaveBeenCalledTimes(1);
    });

    it('should call service agreement template endpoint with correct /api prefix', async () => {
      const mockAgreement = {
        status: 'success',
        data: {
          id: 'agreement-1',
          name: 'Standard Boarding Agreement',
          content: 'Agreement text...',
        },
      };

      mockedReservationApi.get.mockResolvedValue({ data: mockAgreement });

      await checkInService.getDefaultAgreementTemplate();

      // Verify the endpoint includes /api prefix
      expect(mockedReservationApi.get).toHaveBeenCalledWith(
        '/api/service-agreement-templates/default'
      );
      expect(mockedReservationApi.get).toHaveBeenCalledTimes(1);
    });

    it('should NOT call endpoints without /api prefix', async () => {
      mockedReservationApi.get.mockResolvedValue({
        data: { status: 'success', data: {} },
      });

      await checkInService.getDefaultTemplate();
      await checkInService.getDefaultAgreementTemplate();

      // Verify no calls were made without /api prefix
      const calls = mockedReservationApi.get.mock.calls;
      calls.forEach((call) => {
        const url = call[0] as string;
        expect(url).toMatch(/^\/api\//);
        expect(url).not.toMatch(/^\/check-in-templates/);
        expect(url).not.toMatch(/^\/service-agreement-templates/);
      });
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return template data on success', async () => {
      const mockTemplate = {
        status: 'success',
        data: {
          id: 'template-1',
          name: 'Standard Boarding Check-In',
          sections: [
            {
              id: 'section-1',
              title: 'Contact Information',
              questions: [],
            },
          ],
        },
      };

      mockedReservationApi.get.mockResolvedValue({ data: mockTemplate });

      const result = await checkInService.getDefaultTemplate();

      expect(result).toEqual(mockTemplate);
      expect(mockedReservationApi.get).toHaveBeenCalledWith(
        '/api/check-in-templates/default'
      );
    });

    it('should handle errors when template not found', async () => {
      const mockError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: 'Template not found',
            },
          },
        },
      };

      mockedReservationApi.get.mockRejectedValue(mockError);

      await expect(checkInService.getDefaultTemplate()).rejects.toEqual(
        mockError
      );
    });
  });

  describe('getDefaultAgreementTemplate', () => {
    it('should return agreement template data on success', async () => {
      const mockAgreement = {
        status: 'success',
        data: {
          id: 'agreement-1',
          name: 'Standard Boarding Agreement',
          content: 'BOARDING SERVICE AGREEMENT\n\nThis agreement...',
          isDefault: true,
        },
      };

      mockedReservationApi.get.mockResolvedValue({ data: mockAgreement });

      const result = await checkInService.getDefaultAgreementTemplate();

      expect(result).toEqual(mockAgreement);
      expect(mockedReservationApi.get).toHaveBeenCalledWith(
        '/api/service-agreement-templates/default'
      );
    });

    it('should handle errors when agreement template not found', async () => {
      const mockError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: 'Agreement template not found',
            },
          },
        },
      };

      mockedReservationApi.get.mockRejectedValue(mockError);

      await expect(
        checkInService.getDefaultAgreementTemplate()
      ).rejects.toEqual(mockError);
    });
  });

  describe('createCheckIn', () => {
    it('should create check-in with correct data and /api prefix', async () => {
      const checkInData = {
        reservationId: 'res-123',
        checkInDate: new Date('2025-10-23'),
        responses: {},
        medications: [],
        belongings: [],
      };

      const mockResponse = {
        status: 'success',
        data: {
          id: 'checkin-1',
          ...checkInData,
        },
      };

      mockedReservationApi.post.mockResolvedValue({ data: mockResponse });

      const result = await checkInService.createCheckIn(checkInData as any);

      expect(result).toEqual(mockResponse);
      expect(mockedReservationApi.post).toHaveBeenCalledWith(
        '/api/check-ins',
        checkInData
      );
    });
  });

  describe('getCheckInById', () => {
    it('should retrieve check-in by ID with /api prefix', async () => {
      const checkInId = 'checkin-123';
      const mockCheckIn = {
        status: 'success',
        data: {
          id: checkInId,
          reservationId: 'res-123',
          checkInDate: '2025-10-23',
          responses: {},
          medications: [],
          belongings: [],
        },
      };

      mockedReservationApi.get.mockResolvedValue({ data: mockCheckIn });

      const result = await checkInService.getCheckInById(checkInId);

      expect(result).toEqual(mockCheckIn);
      expect(mockedReservationApi.get).toHaveBeenCalledWith(
        `/api/check-ins/${checkInId}`
      );
    });
  });

  describe('addMedication', () => {
    it('should add medication to check-in', async () => {
      const checkInId = 'checkin-123';
      const medication = {
        name: 'Heartgard',
        dosage: '1 tablet',
        frequency: 'Monthly',
        administrationMethod: 'Oral',
      };

      const mockResponse = {
        status: 'success',
        data: {
          id: 'med-1',
          ...medication,
        },
      };

      mockedReservationApi.post.mockResolvedValue({ data: mockResponse });

      const result = await checkInService.addMedication(
        checkInId,
        medication as any
      );

      expect(result).toEqual(mockResponse);
      expect(mockedReservationApi.post).toHaveBeenCalledWith(
        `/api/check-ins/${checkInId}/medications`,
        medication
      );
    });
  });

  describe('returnBelonging', () => {
    it('should mark belonging as returned', async () => {
      const checkInId = 'checkin-123';
      const belongingId = 'belonging-1';
      const returnedBy = 'Staff Member';

      const mockResponse = {
        status: 'success',
        data: {
          id: belongingId,
          returned: true,
          returnedBy,
          returnedAt: new Date().toISOString(),
        },
      };

      mockedReservationApi.put.mockResolvedValue({ data: mockResponse });

      const result = await checkInService.returnBelonging(
        checkInId,
        belongingId,
        returnedBy
      );

      expect(result).toEqual(mockResponse);
      expect(mockedReservationApi.put).toHaveBeenCalledWith(
        `/api/check-ins/${checkInId}/belongings/${belongingId}/return`,
        { returnedBy }
      );
    });
  });

  describe('createServiceAgreement', () => {
    it('should create service agreement', async () => {
      const agreement = {
        checkInId: 'checkin-123',
        templateId: 'template-1',
        content: 'Agreement content...',
        signature: 'data:image/png;base64,...',
        signedBy: 'John Doe',
        ipAddress: '192.168.1.1',
      };

      const mockResponse = {
        status: 'success',
        data: {
          id: 'agreement-1',
          ...agreement,
          signedAt: new Date().toISOString(),
        },
      };

      mockedReservationApi.post.mockResolvedValue({ data: mockResponse });

      const result = await checkInService.createServiceAgreement(
        agreement as any
      );

      expect(result).toEqual(mockResponse);
      expect(mockedReservationApi.post).toHaveBeenCalledWith(
        '/api/service-agreements',
        agreement
      );
    });
  });
});
