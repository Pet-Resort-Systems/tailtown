/**
 * Capacity Service
 * 
 * Handles capacity checking and statistics
 */

import api from './api';

export interface CapacityCheckRequest {
  serviceType: string;
  startDate: string;
  endDate?: string;
  numberOfPets?: number;
}

export interface CapacityCheckResponse {
  available: boolean;
  totalCapacity: number;
  availableSpots: number;
  occupiedSpots: number;
  waitlistRecommended: boolean;
  reason: string;
}

export interface CapacityStats {
  serviceType: string;
  totalCapacity: number;
  occupied: number;
  available: number;
  utilizationRate: number;
  waitlistCount: number;
}

export interface CapacityStatsResponse {
  dateRange: {
    start: string;
    end: string;
  };
  stats: CapacityStats[];
}

/**
 * Check if a service has available capacity
 */
export const checkCapacity = async (
  request: CapacityCheckRequest
): Promise<CapacityCheckResponse> => {
  const response = await api.post('/api/capacity/check', request);
  return response.data.data;
};

/**
 * Get capacity statistics for a date range
 */
export const getCapacityStats = async (
  startDate: string,
  endDate: string,
  serviceType?: string
): Promise<CapacityStatsResponse> => {
  const params: any = { startDate, endDate };
  if (serviceType) {
    params.serviceType = serviceType;
  }
  
  const response = await api.get('/api/capacity/stats', { params });
  return response.data.data;
};
