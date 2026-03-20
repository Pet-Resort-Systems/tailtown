/**
 * Advanced Scheduling Service
 * API service for groomer appointments and training classes
 */

import { getApiBaseUrl } from './api';
import {
  GroomerAppointment,
  GroomerBreak,
  AvailableGroomer,
  TrainingClass,
  ClassSession,
  ClassEnrollment,
  ClassWaitlist,
  CreateGroomerAppointmentRequest,
  UpdateGroomerAppointmentRequest,
  ReassignGroomerRequest,
  CreateTrainingClassRequest,
  EnrollInClassRequest,
  GroomerAppointmentFilters,
  TrainingClassFilters,
  AvailableGroomersQuery,
} from '../types/scheduling';
// Helper to get tenant ID from localStorage
const getTenantId = () => {
  return (
    localStorage.getItem('tailtown_tenant_id') ||
    localStorage.getItem('tenantId') ||
    'dev'
  );
};

// Helper to get auth token from localStorage
const getAuthToken = () => {
  return (
    localStorage.getItem('impersonationToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token')
  );
};

// Helper to build headers with auth
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': getTenantId() || 'dev',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Use dynamic API URL based on environment
const API_BASE_URL = getApiBaseUrl();

// ============================================
// GROOMER APPOINTMENT APIs
// ============================================

export const groomerAppointmentService = {
  /**
   * Get all groomer appointments with optional filters
   */
  async getAll(
    filters?: GroomerAppointmentFilters
  ): Promise<GroomerAppointment[]> {
    const params = new URLSearchParams();
    if (filters?.groomerId) params.append('groomerId', filters.groomerId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments?${params.toString()}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch groomer appointments');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get a single groomer appointment by ID
   */
  async getById(id: string): Promise<GroomerAppointment> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments/${id}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch groomer appointment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Create a new groomer appointment
   */
  async create(
    appointment: CreateGroomerAppointmentRequest
  ): Promise<GroomerAppointment> {
    const response = await fetch(`${API_BASE_URL}/api/groomer-appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(appointment),
    });

    if (!response.ok) throw new Error('Failed to create groomer appointment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Update a groomer appointment
   */
  async update(
    id: string,
    updates: UpdateGroomerAppointmentRequest
  ): Promise<GroomerAppointment> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments/${id}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) throw new Error('Failed to update groomer appointment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Reassign appointment to a different groomer
   */
  async reassign(
    id: string,
    request: ReassignGroomerRequest
  ): Promise<GroomerAppointment> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments/${id}/reassign`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) throw new Error('Failed to reassign groomer appointment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Start an appointment (mark as in progress)
   */
  async start(id: string): Promise<GroomerAppointment> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments/${id}/start`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to start groomer appointment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Complete an appointment
   */
  async complete(id: string, notes?: string): Promise<GroomerAppointment> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments/${id}/complete`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notes }),
      }
    );

    if (!response.ok) throw new Error('Failed to complete groomer appointment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Cancel an appointment
   */
  async cancel(id: string, reason?: string): Promise<GroomerAppointment> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments/${id}/cancel`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) throw new Error('Failed to cancel groomer appointment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Delete an appointment
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomer-appointments/${id}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to delete groomer appointment');
  },

  /**
   * Get groomer's schedule for a date range
   */
  async getGroomerSchedule(
    groomerId: string,
    startDate: string,
    endDate: string
  ): Promise<{ appointments: GroomerAppointment[]; breaks: GroomerBreak[] }> {
    const response = await fetch(
      `${API_BASE_URL}/api/groomers/${groomerId}/schedule?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch groomer schedule');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get available groomers for a specific date/time
   */
  async getAvailableGroomers(
    query: AvailableGroomersQuery
  ): Promise<AvailableGroomer[]> {
    const params = new URLSearchParams();
    params.append('date', query.date);
    params.append('time', query.time);
    if (query.duration) params.append('duration', query.duration.toString());
    if (query.serviceId) params.append('serviceId', query.serviceId);

    const response = await fetch(
      `${API_BASE_URL}/api/groomers/available?${params.toString()}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch available groomers');
    const data = await response.json();
    return data.data;
  },
};

// ============================================
// TRAINING CLASS APIs
// ============================================

export const trainingClassService = {
  /**
   * Get all training classes with optional filters
   */
  async getAll(filters?: TrainingClassFilters): Promise<TrainingClass[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.instructorId)
      params.append('instructorId', filters.instructorId);
    if (filters?.isActive !== undefined)
      params.append('isActive', filters.isActive.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/training-classes?${params.toString()}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch training classes');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get a single training class by ID
   */
  async getById(id: string): Promise<TrainingClass> {
    const response = await fetch(`${API_BASE_URL}/api/training-classes/${id}`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch training class');
    const data = await response.json();
    return data.data;
  },

  /**
   * Create a new training class
   */
  async create(classData: CreateTrainingClassRequest): Promise<TrainingClass> {
    const response = await fetch(`${API_BASE_URL}/api/training-classes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(classData),
    });

    if (!response.ok) throw new Error('Failed to create training class');
    const data = await response.json();
    return data.data;
  },

  /**
   * Update a training class
   */
  async update(
    id: string,
    updates: Partial<TrainingClass>
  ): Promise<TrainingClass> {
    const response = await fetch(`${API_BASE_URL}/api/training-classes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Failed to update training class');
    const data = await response.json();
    return data.data;
  },

  /**
   * Delete a training class
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/training-classes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete training class');
  },

  /**
   * Duplicate a training class for the next session
   */
  async duplicate(id: string, startDate: string): Promise<TrainingClass> {
    const response = await fetch(
      `${API_BASE_URL}/api/training-classes/${id}/duplicate`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ startDate }),
      }
    );

    if (!response.ok) throw new Error('Failed to duplicate training class');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get sessions for a training class
   */
  async getSessions(classId: string): Promise<ClassSession[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/training-classes/${classId}/sessions`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch class sessions');
    const data = await response.json();
    return data.data;
  },

  /**
   * Update a class session
   */
  async updateSession(
    id: string,
    updates: Partial<ClassSession>
  ): Promise<ClassSession> {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Failed to update session');
    const data = await response.json();
    return data.data;
  },

  /**
   * Start a class session
   */
  async startSession(id: string): Promise<ClassSession> {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}/start`, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to start session');
    const data = await response.json();
    return data.data;
  },

  /**
   * Complete a class session
   */
  async completeSession(id: string, notes?: string): Promise<ClassSession> {
    const response = await fetch(
      `${API_BASE_URL}/api/sessions/${id}/complete`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notes }),
      }
    );

    if (!response.ok) throw new Error('Failed to complete session');
    const data = await response.json();
    return data.data;
  },
};

// ============================================
// ENROLLMENT APIs
// ============================================

export const enrollmentService = {
  /**
   * Enroll a pet in a training class
   */
  async enroll(
    classId: string,
    enrollment: EnrollInClassRequest
  ): Promise<ClassEnrollment> {
    const response = await fetch(
      `${API_BASE_URL}/api/training-classes/${classId}/enroll`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(enrollment),
      }
    );

    if (!response.ok) throw new Error('Failed to enroll in class');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get enrollment by ID
   */
  async getById(id: string): Promise<ClassEnrollment> {
    const response = await fetch(`${API_BASE_URL}/api/enrollments/${id}`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch enrollment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Update an enrollment
   */
  async update(
    id: string,
    updates: Partial<ClassEnrollment>
  ): Promise<ClassEnrollment> {
    const response = await fetch(`${API_BASE_URL}/api/enrollments/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Failed to update enrollment');
    const data = await response.json();
    return data.data;
  },

  /**
   * Drop from a class
   */
  async drop(id: string, reason?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/enrollments/${id}/drop`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) throw new Error('Failed to drop from class');
  },

  /**
   * Get customer's enrollments
   */
  async getByCustomer(
    customerId: string,
    status?: string
  ): Promise<ClassEnrollment[]> {
    const params = status ? `?status=${status}` : '';
    const response = await fetch(
      `${API_BASE_URL}/api/customers/${customerId}/enrollments${params}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch customer enrollments');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get pet's enrollment history
   */
  async getByPet(petId: string): Promise<ClassEnrollment[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/pets/${petId}/enrollments`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch pet enrollments');
    const data = await response.json();
    return data.data;
  },

  /**
   * Issue a certificate
   */
  async issueCertificate(id: string): Promise<ClassEnrollment> {
    const response = await fetch(
      `${API_BASE_URL}/api/enrollments/${id}/certificate`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to issue certificate');
    const data = await response.json();
    return data.data;
  },

  /**
   * Add to waitlist
   */
  async addToWaitlist(
    classId: string,
    petId: string,
    customerId: string
  ): Promise<ClassWaitlist> {
    const response = await fetch(
      `${API_BASE_URL}/api/training-classes/${classId}/waitlist`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ petId, customerId }),
      }
    );

    if (!response.ok) throw new Error('Failed to add to waitlist');
    const data = await response.json();
    return data.data;
  },

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/waitlist/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to remove from waitlist');
  },

  /**
   * Get class waitlist
   */
  async getWaitlist(classId: string): Promise<ClassWaitlist[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/training-classes/${classId}/waitlist`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch waitlist');
    const data = await response.json();
    return data.data;
  },
};

export default {
  groomerAppointments: groomerAppointmentService,
  trainingClasses: trainingClassService,
  enrollments: enrollmentService,
};
