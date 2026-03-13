import { AxiosResponse } from 'axios';
import api from './api';

export interface AddOnService {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  serviceId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    serviceCategory: string;
  };
}

export interface AddOnServiceResponse {
  status: string;
  results?: number;
  data: AddOnService | AddOnService[];
}

const addonService = {
  // Get all add-on services
  getAllAddOns: async (serviceId?: string): Promise<AddOnService[]> => {
    try {
      let url = '/api/addons';
      if (serviceId) {
        url += `?serviceId=${serviceId}`;
      }
      
      const response: AxiosResponse<AddOnServiceResponse> = await api.get(url);
      
      if (Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.warn('Expected array of add-ons but got:', response.data);
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching add-on services:', error);
      throw error;
    }
  },
  
  // Get add-on service by ID
  getAddOnById: async (id: string): Promise<AddOnService | null> => {
    try {
      const response: AxiosResponse<AddOnServiceResponse> = await api.get(`/api/addons/${id}`);
      
      if (!Array.isArray(response.data.data)) {
        return response.data.data as AddOnService;
      } else {
        console.warn('Expected single add-on but got array:', response.data);
        return null;
      }
    } catch (error: any) {
      console.error(`Error fetching add-on service with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Create a new add-on service
  createAddOn: async (addOnData: Partial<AddOnService>): Promise<AddOnService> => {
    try {
      const response: AxiosResponse<AddOnServiceResponse> = await api.post('/api/addons', addOnData);
      
      if (!Array.isArray(response.data.data)) {
        return response.data.data as AddOnService;
      } else {
        throw new Error('Unexpected response format: received array instead of object');
      }
    } catch (error: any) {
      console.error('Error creating add-on service:', error);
      throw error;
    }
  },
  
  // Update an add-on service
  updateAddOn: async (id: string, addOnData: Partial<AddOnService>): Promise<AddOnService> => {
    try {
      const response: AxiosResponse<AddOnServiceResponse> = await api.put(`/api/addons/${id}`, addOnData);
      
      if (!Array.isArray(response.data.data)) {
        return response.data.data as AddOnService;
      } else {
        throw new Error('Unexpected response format: received array instead of object');
      }
    } catch (error: any) {
      console.error(`Error updating add-on service with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Delete an add-on service
  deleteAddOn: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/addons/${id}`);
    } catch (error: any) {
      console.error(`Error deleting add-on service with ID ${id}:`, error);
      throw error;
    }
  }
};

export default addonService;
