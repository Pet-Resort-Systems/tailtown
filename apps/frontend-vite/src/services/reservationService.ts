import { AxiosResponse } from 'axios';
import { reservationApi as api } from './api';
import { PaginatedResponse } from '../types/common';

export interface Reservation {
  id: string;
  orderNumber?: string;
  customerId: string;
  petId: string;
  serviceId: string;
  startDate: string;
  endDate: string;
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'CHECKED_IN'
    | 'CHECKED_OUT'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'NO_SHOW';
  notes?: string;
  staffNotes?: string;
  createdAt?: string; // Optional when creating a new reservation, will be set by the backend
  discount?: number; // Discount amount applied to the reservation
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
  }; // Associated invoice
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  pet?: {
    id: string;
    name: string;
    type: string;
    breed: string;
    petIcons?: string[];
    iconNotes?: { [iconId: string]: string };
  };
  service?: {
    id: string;
    name: string;
    price: number;
    description: string;
  };
  resource?: {
    id: string;
    name: string;
    type: string;
  };
  addOnServices?: Array<{
    id: string;
    reservationId: string;
    addOnId: string;
    price: number;
    quantity?: number;
    name?: string;
    notes?: string;
    addOn?: {
      id: string;
      name: string;
      description?: string;
      price: number;
    };
  }>;
}

export const reservationService = {
  getAllReservations: async (
    page = 1,
    limit = 10,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
    status?: string,
    date?: string,
    checkInDate?: string,
    timezone?: string
  ): Promise<{
    status: string;
    data: Reservation[];
    totalPages: number;
    currentPage: number;
    results: number;
  }> => {
    try {
      const response: AxiosResponse = await api.get('/api/reservations', {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          status,
          date,
          checkInDate,
          timezone,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error in getAllReservations:', error);
      throw error;
    }
  },

  getReservationById: async (id: string): Promise<Reservation> => {
    try {
      const response: AxiosResponse = await api.get(`/api/reservations/${id}`);
      const payload = response?.data;
      const normalized = (payload?.data?.reservation ??
        payload?.data ??
        payload?.reservation ??
        payload) as Reservation;
      return normalized;
    } catch (error: any) {
      console.error('Error in getReservationById:', error);
      throw error;
    }
  },

  createReservation: async (
    reservation: Omit<Reservation, 'id'>
  ): Promise<Reservation> => {
    try {
      const response: AxiosResponse = await api.post(
        '/api/reservations',
        reservation
      );

      // Handle different response formats
      let reservationData;

      if (response.data?.success === true && response.data?.data?.reservation) {
        // Standard success response format
        reservationData = response.data.data.reservation;
      } else if (response.data?.data?.reservation) {
        // Alternative format
        reservationData = response.data.data.reservation;
      } else if (
        response.data?.data?.reservations &&
        Array.isArray(response.data.data.reservations)
      ) {
        // Nested reservations array format (from GET endpoint)
        reservationData = response.data.data.reservations[0];
      } else if (response.data?.data && response.data.data.id) {
        // Data directly in data field
        reservationData = response.data.data;
      } else if (response.data?.id) {
        // Data directly in response
        reservationData = response.data;
      } else if (
        response.data?.results !== undefined &&
        response.data?.totalPages !== undefined
      ) {
        // Got a paginated list response instead of a single reservation
        // This indicates a server-side issue (POST returned GET response)
        console.error(
          'Received paginated list instead of created reservation:',
          response.data
        );
        throw new Error(
          'Failed to create reservation. Please try again or contact support.'
        );
      } else {
        console.error('Unexpected response format:', response.data);
        throw new Error('Failed to create reservation. Please try again.');
      }

      if (!reservationData || !reservationData.id) {
        console.error('No reservation data or ID found:', reservationData);
        throw new Error('No reservation ID returned from server');
      }

      return reservationData;
    } catch (error: any) {
      console.error('Error in createReservation:', error);
      if (error.response?.data) {
        console.error('Server error details:', error.response.data);
      }
      throw error;
    }
  },

  updateReservation: async (
    id: string,
    reservation: Partial<Reservation>
  ): Promise<Reservation> => {
    try {
      const response: AxiosResponse = await api.patch(
        `/api/reservations/${id}`,
        reservation
      );
      const payload = response?.data;
      const normalized = (payload?.data?.reservation ??
        payload?.data ??
        payload?.reservation ??
        payload) as Reservation;
      return normalized;
    } catch (error: any) {
      console.error('Error in updateReservation:', error);
      throw error;
    }
  },

  deleteReservation: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/reservations/${id}`);
    } catch (error: any) {
      console.error('Error in deleteReservation:', error);
      throw error;
    }
  },

  getReservationsByCustomer: async (
    customerId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Reservation>> => {
    try {
      const response: AxiosResponse = await api.get(
        `/api/reservations/customer/${customerId}`,
        {
          params: { page, limit },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error in getReservationsByCustomer:', error);
      throw error;
    }
  },

  getReservationsByPet: async (
    petId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Reservation>> => {
    try {
      const response: AxiosResponse = await api.get(
        `/api/reservations/pet/${petId}`,
        {
          params: { page, limit },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error in getReservationsByPet:', error);
      throw error;
    }
  },

  getTodayRevenue: async (): Promise<{ revenue: number }> => {
    try {
      const response: AxiosResponse = await api.get(
        '/api/reservations/revenue/today'
      );
      return response.data;
    } catch (error: any) {
      console.error('Error in getTodayRevenue:', error);
      throw error;
    }
  },

  // Add add-on services to a reservation
  addAddOnsToReservation: async (
    reservationId: string,
    addOns: Array<{ serviceId: string; quantity: number }>
  ): Promise<any> => {
    try {
      const response: AxiosResponse = await api.post(
        `/api/reservations/${reservationId}/add-ons`,
        { addOns }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error in addAddOnsToReservation:', error);
      throw error;
    }
  },
};
