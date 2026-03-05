import api from './api';

export interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: 'SMS' | 'EMAIL';
  category: 'APPOINTMENT_REMINDER' | 'MARKETING' | 'CONFIRMATION' | 'FOLLOW_UP' | 'PROMOTIONAL';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  name: string;
  type: 'SMS' | 'EMAIL';
  category: 'APPOINTMENT_REMINDER' | 'MARKETING' | 'CONFIRMATION' | 'FOLLOW_UP' | 'PROMOTIONAL';
  subject?: string;
  body: string;
  variables?: string[];
}

export interface UpdateTemplateData {
  name?: string;
  type?: 'SMS' | 'EMAIL';
  category?: 'APPOINTMENT_REMINDER' | 'MARKETING' | 'CONFIRMATION' | 'FOLLOW_UP' | 'PROMOTIONAL';
  subject?: string;
  body?: string;
  variables?: string[];
  isActive?: boolean;
}

class MessageTemplateService {
  /**
   * Get all message templates
   */
  async getAllTemplates(filters?: {
    type?: 'SMS' | 'EMAIL';
    category?: string;
    isActive?: boolean;
  }): Promise<MessageTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

      const response = await api.get(`/api/message-templates?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching message templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<MessageTemplate> {
    try {
      const response = await api.get(`/api/message-templates/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }

  /**
   * Create new template
   */
  async createTemplate(data: CreateTemplateData): Promise<MessageTemplate> {
    try {
      const response = await api.post('/api/message-templates', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: UpdateTemplateData): Promise<MessageTemplate> {
    try {
      const response = await api.put(`/api/message-templates/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      await api.delete(`/api/message-templates/${id}`);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(id: string): Promise<MessageTemplate> {
    try {
      const response = await api.post(`/api/message-templates/${id}/duplicate`);
      return response.data.data;
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }
}

export const messageTemplateService = new MessageTemplateService();
export default messageTemplateService;
