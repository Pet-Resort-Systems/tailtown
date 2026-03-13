/**
 * Report Card Service
 * 
 * Frontend service for pet report card operations
 */

import api from './api';

export interface ReportCard {
  id: string;
  tenantId: string;
  petId: string;
  customerId: string;
  reservationId?: string;
  createdByStaffId: string;
  reportDate: string;
  serviceType: 'BOARDING' | 'DAYCARE' | 'GROOMING' | 'TRAINING' | 'GENERAL';
  templateType?: 'DAYCARE_DAILY' | 'BOARDING_DAILY' | 'BOARDING_CHECKOUT' | 'GROOMING_COMPLETE' | 'TRAINING_SESSION' | 'CUSTOM';
  title?: string;
  summary?: string;
  moodRating?: number;
  energyRating?: number;
  appetiteRating?: number;
  socialRating?: number;
  activities: string[];
  mealsEaten: string[];
  bathroomBreaks?: number;
  medicationGiven: boolean;
  medicationNotes?: string;
  behaviorNotes?: string;
  highlights: string[];
  concerns: string[];
  photos: ReportCardPhoto[];
  photoCount: number;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'SENT' | 'VIEWED' | 'ARCHIVED';
  sentAt?: string;
  sentViaEmail: boolean;
  sentViaSMS: boolean;
  emailDeliveredAt?: string;
  smsDeliveredAt?: string;
  viewedAt?: string;
  viewCount: number;
  isTemplate: boolean;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  pet?: {
    id: string;
    name: string;
    type: string;
    breed?: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  createdByStaff?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ReportCardPhoto {
  id: string;
  reportCardId: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
  uploadedByStaffId?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  createdAt: string;
  uploadedByStaff?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateReportCardRequest {
  petId: string;
  customerId: string;
  reservationId?: string;
  serviceType: 'BOARDING' | 'DAYCARE' | 'GROOMING' | 'TRAINING' | 'GENERAL';
  templateType?: string;
  title?: string;
  summary?: string;
  moodRating?: number;
  energyRating?: number;
  appetiteRating?: number;
  socialRating?: number;
  activities?: string[];
  mealsEaten?: string[];
  bathroomBreaks?: number;
  medicationGiven?: boolean;
  medicationNotes?: string;
  behaviorNotes?: string;
  highlights?: string[];
  concerns?: string[];
  tags?: string[];
  notes?: string;
}

export interface UploadPhotoRequest {
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order?: number;
  fileSize?: number;
  width?: number;
  height?: number;
  mimeType?: string;
}

class ReportCardService {
  /**
   * Create a new report card
   */
  async createReportCard(data: CreateReportCardRequest): Promise<ReportCard> {
    const response = await api.post('/api/report-cards', data);
    return response.data.data;
  }

  /**
   * Get all report cards with filters
   */
  async listReportCards(filters?: {
    petId?: string;
    customerId?: string;
    reservationId?: string;
    serviceType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    reportCards: ReportCard[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const response = await api.get('/api/report-cards', { params: filters });
    return response.data.data;
  }

  /**
   * Get single report card
   */
  async getReportCard(id: string): Promise<ReportCard> {
    const response = await api.get(`/api/report-cards/${id}`);
    return response.data.data;
  }

  /**
   * Update report card
   */
  async updateReportCard(id: string, data: Partial<CreateReportCardRequest>): Promise<ReportCard> {
    const response = await api.patch(`/api/report-cards/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete report card
   */
  async deleteReportCard(id: string): Promise<void> {
    await api.delete(`/api/report-cards/${id}`);
  }

  /**
   * Upload photo to report card
   */
  async uploadPhoto(reportCardId: string, data: UploadPhotoRequest): Promise<ReportCardPhoto> {
    const response = await api.post(`/api/report-cards/${reportCardId}/photos`, data);
    return response.data.data;
  }

  /**
   * Delete photo from report card
   */
  async deletePhoto(reportCardId: string, photoId: string): Promise<void> {
    await api.delete(`/api/report-cards/${reportCardId}/photos/${photoId}`);
  }

  /**
   * Update photo (caption, order)
   */
  async updatePhoto(reportCardId: string, photoId: string, data: { caption?: string; order?: number }): Promise<ReportCardPhoto> {
    const response = await api.patch(`/api/report-cards/${reportCardId}/photos/${photoId}`, data);
    return response.data.data;
  }

  /**
   * Send report card via email/SMS
   */
  async sendReportCard(id: string, options?: { sendEmail?: boolean; sendSMS?: boolean }): Promise<ReportCard> {
    const response = await api.post(`/api/report-cards/${id}/send`, options);
    return response.data.data;
  }

  /**
   * Bulk create report cards
   */
  async bulkCreateReportCards(reportCards: CreateReportCardRequest[]): Promise<{
    created: number;
    reportCards: ReportCard[];
  }> {
    const response = await api.post('/api/report-cards/bulk', { reportCards });
    return response.data.data;
  }

  /**
   * Bulk send report cards
   */
  async bulkSendReportCards(reportCardIds: string[], options?: { sendEmail?: boolean; sendSMS?: boolean }): Promise<{
    sent: number;
  }> {
    const response = await api.post('/api/report-cards/bulk/send', { reportCardIds, ...options });
    return response.data.data;
  }

  /**
   * Get customer's report cards
   */
  async getCustomerReportCards(customerId: string): Promise<ReportCard[]> {
    const response = await api.get(`/api/report-cards/customers/${customerId}`);
    return response.data.data;
  }

  /**
   * Get pet's report cards
   */
  async getPetReportCards(petId: string): Promise<ReportCard[]> {
    const response = await api.get(`/api/report-cards/pets/${petId}`);
    return response.data.data;
  }

  /**
   * Get reservation's report cards
   */
  async getReservationReportCards(reservationId: string): Promise<ReportCard[]> {
    const response = await api.get(`/api/report-cards/reservations/${reservationId}`);
    return response.data.data;
  }

  /**
   * Format service type for display
   */
  formatServiceType(serviceType: string): string {
    const map: Record<string, string> = {
      BOARDING: 'Boarding',
      DAYCARE: 'Daycare',
      GROOMING: 'Grooming',
      TRAINING: 'Training',
      GENERAL: 'General'
    };
    return map[serviceType] || serviceType;
  }

  /**
   * Format status for display
   */
  formatStatus(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Draft',
      PENDING_REVIEW: 'Pending Review',
      APPROVED: 'Approved',
      SENT: 'Sent',
      VIEWED: 'Viewed',
      ARCHIVED: 'Archived'
    };
    return map[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      DRAFT: 'default',
      PENDING_REVIEW: 'warning',
      APPROVED: 'info',
      SENT: 'success',
      VIEWED: 'success',
      ARCHIVED: 'default'
    };
    return map[status] || 'default';
  }

  /**
   * Get rating emoji
   */
  getRatingEmoji(rating: number): string {
    const emojis = ['😢', '😕', '😐', '😊', '😄'];
    return emojis[rating - 1] || '😐';
  }

  /**
   * Get rating stars
   */
  getRatingStars(rating: number): string {
    return '⭐'.repeat(rating);
  }

  /**
   * Upload file to storage (placeholder - implement with actual storage)
   */
  async uploadFile(file: File): Promise<{ url: string; thumbnailUrl?: string }> {
    // TODO: Implement actual file upload to S3/CloudStorage
    // For now, return a placeholder
    const formData = new FormData();
    formData.append('file', file);
    
    // This would be your actual upload endpoint
    // const response = await api.post('/api/upload', formData);
    // return response.data;
    
    // Placeholder
    return {
      url: URL.createObjectURL(file),
      thumbnailUrl: URL.createObjectURL(file)
    };
  }

  /**
   * Compress image before upload
   */
  async compressImage(file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }
}

export const reportCardService = new ReportCardService();
export default reportCardService;
