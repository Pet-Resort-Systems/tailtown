/**
 * Report Card Integration Tests
 * 
 * End-to-end tests for report card API
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:3001';

describe('Report Card API Integration Tests', () => {
  let authToken: string;
  let testPetId: string;
  let testCustomerId: string;
  let testReportCardId: string;

  beforeAll(async () => {
    // Setup: Get auth token (mock for now)
    authToken = 'test-token';
    
    // Create test data
    testCustomerId = 'test-customer-123';
    testPetId = 'test-pet-123';
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testReportCardId) {
      await prisma.reportCard.deleteMany({
        where: { id: testReportCardId }
      });
    }
    
    await prisma.$disconnect();
  });

  describe('POST /api/report-cards', () => {
    it('should create a new report card', async () => {
      const reportData = {
        petId: testPetId,
        customerId: testCustomerId,
        serviceType: 'DAYCARE',
        moodRating: 5,
        energyRating: 4,
        appetiteRating: 5,
        socialRating: 4,
        activities: ['Playtime', 'Nap time'],
        highlights: ['Had a great day!'],
        summary: 'Max had an amazing day at daycare!'
      };

      const response = await request(API_URL)
        .post('/api/report-cards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.serviceType).toBe('DAYCARE');
      expect(response.body.data.moodRating).toBe(5);

      testReportCardId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(API_URL)
        .post('/api/report-cards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing petId, customerId, serviceType
          moodRating: 5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/report-cards', () => {
    it('should list report cards', async () => {
      const response = await request(API_URL)
        .get('/api/report-cards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportCards');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.reportCards)).toBe(true);
    });

    it('should filter by pet ID', async () => {
      const response = await request(API_URL)
        .get('/api/report-cards')
        .query({ petId: testPetId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.reportCards.forEach((report: any) => {
        expect(report.petId).toBe(testPetId);
      });
    });
  });

  describe('GET /api/report-cards/:id', () => {
    it('should get a single report card', async () => {
      const response = await request(API_URL)
        .get(`/api/report-cards/${testReportCardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReportCardId);
      expect(response.body.data).toHaveProperty('pet');
      expect(response.body.data).toHaveProperty('customer');
    });

    it('should return 404 for non-existent report card', async () => {
      const response = await request(API_URL)
        .get('/api/report-cards/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/report-cards/:id', () => {
    it('should update a report card', async () => {
      const updateData = {
        summary: 'Updated summary - Max had an even better day!',
        moodRating: 5,
        highlights: ['Made new friends', 'Learned a new trick']
      };

      const response = await request(API_URL)
        .patch(`/api/report-cards/${testReportCardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe(updateData.summary);
      expect(response.body.data.highlights).toEqual(updateData.highlights);
    });
  });

  describe('POST /api/report-cards/:id/photos', () => {
    it('should upload a photo to report card', async () => {
      const photoData = {
        url: 'https://example.com/photos/max-playing.jpg',
        thumbnailUrl: 'https://example.com/photos/max-playing-thumb.jpg',
        caption: 'Max playing fetch!',
        order: 0
      };

      const response = await request(API_URL)
        .post(`/api/report-cards/${testReportCardId}/photos`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(photoData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe(photoData.url);
      expect(response.body.data.caption).toBe(photoData.caption);
    });
  });

  describe('POST /api/report-cards/:id/send', () => {
    it('should send report card', async () => {
      const response = await request(API_URL)
        .post(`/api/report-cards/${testReportCardId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sendEmail: true,
          sendSMS: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('SENT');
      expect(response.body.data.sentViaEmail).toBe(true);
      expect(response.body.data.sentViaSMS).toBe(true);
    });
  });

  describe('POST /api/report-cards/bulk', () => {
    it('should create multiple report cards', async () => {
      const bulkData = {
        reportCards: [
          {
            petId: 'pet-1',
            customerId: 'customer-1',
            serviceType: 'DAYCARE',
            moodRating: 5
          },
          {
            petId: 'pet-2',
            customerId: 'customer-2',
            serviceType: 'DAYCARE',
            moodRating: 4
          }
        ]
      };

      const response = await request(API_URL)
        .post('/api/report-cards/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(2);
      expect(response.body.data.reportCards).toHaveLength(2);
    });
  });

  describe('DELETE /api/report-cards/:id', () => {
    it('should delete a report card', async () => {
      const response = await request(API_URL)
        .delete(`/api/report-cards/${testReportCardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify it's deleted
      await request(API_URL)
        .get(`/api/report-cards/${testReportCardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
