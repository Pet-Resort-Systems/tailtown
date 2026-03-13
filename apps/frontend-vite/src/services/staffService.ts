import api from './api';

export interface Staff {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: string;
  department: string;
  position: string;
  isActive?: boolean; // This maps to 'status' in the UI
  hireDate?: string; // This is not in the Prisma model but used in the UI
  status?: string; // UI field that maps to isActive
  specialties?: string[];
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  availability?: StaffAvailability[];
  timeOff?: StaffTimeOff[];
}

export interface StaffAvailability {
  id?: string;
  staffId: string;
  dayOfWeek: number; // 0-6 for Sunday-Saturday
  startTime: string; // Format: HH:MM in 24-hour format
  endTime: string; // Format: HH:MM in 24-hour format
  isRecurring?: boolean;
  effectiveFrom?: string | null; // ISO date string
  effectiveUntil?: string | null; // ISO date string
  isAvailable: boolean; // If false, this is a recurring unavailability
  // Removed notes field as it's not supported in the backend schema
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffTimeOff {
  id?: string;
  staffId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  type: TimeOffType;
  status: TimeOffStatus;
  reason?: string | null;
  notes?: string | null;
  approvedById?: string | null;
  // Removed approvedBy as it's not in the Prisma schema
  approvedDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export enum TimeOffType {
  VACATION = 'VACATION',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  BEREAVEMENT = 'BEREAVEMENT',
  JURY_DUTY = 'JURY_DUTY',
  OTHER = 'OTHER'
}

export enum TimeOffStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  CANCELLED = 'CANCELLED'
}

export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export interface StaffSchedule {
  id?: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  notes?: string;
  location?: string;
  startingLocation?: string; // Added starting location field
  role?: string;
  createdById?: string;
  updatedById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffResponse {
  status: string;
  data: Staff | Staff[];
  results?: number;
  totalPages?: number;
  currentPage?: number;
}

export interface StaffTimeOffResponse {
  status: string;
  data: StaffTimeOff | StaffTimeOff[];
}

export interface StaffScheduleResponse {
  status: string;
  data: StaffSchedule | StaffSchedule[];
  results?: number;
  totalPages?: number;
  currentPage?: number;
}

const staffService = {
  getAllStaff: async (): Promise<Staff[]> => {
    try {
      // Fetch all staff with a large limit to get everyone
      const response = await api.get('/api/staff?limit=100');
      if (response.data && response.data.status === 'success') {
        // Transform the backend data to match the frontend interface
        const staffList = Array.isArray(response.data.data) ? response.data.data : [];
        return staffList.map((staff: any) => ({
          ...staff,
          status: staff.isActive ? 'Active' : 'Inactive', // Convert isActive to status string
          hireDate: staff.createdAt ? new Date(staff.createdAt).toISOString().split('T')[0] : ''
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  },

  getStaffById: async (id: string): Promise<Staff | null> => {
    try {
      const response = await api.get(`/api/staff/${id}`);
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching staff with ID ${id}:`, error);
      throw error;
    }
  },

  createStaff: async (staffData: Staff): Promise<Staff | null> => {
    try {
      // Format the data to match the backend model
      const formattedData = {
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        email: staffData.email,
        password: staffData.password || 'TempPass@2024!', // Strong default password meeting all requirements
        role: staffData.role,
        department: staffData.department,
        position: staffData.position,
        isActive: staffData.status === 'Active', // Convert status to isActive boolean
        phone: staffData.phone || '',
        address: staffData.address || '',
        city: staffData.city || '',
        state: staffData.state || '',
        zipCode: staffData.zipCode || '',
        specialties: staffData.specialties || []
      };

      const response = await api.post('/api/staff', formattedData);
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  },

  updateStaff: async (id: string, staffData: Partial<Staff>): Promise<Staff | null> => {
    try {
      // Format the data to match the backend model
      const formattedData: any = {};
      
      if (staffData.firstName) formattedData.firstName = staffData.firstName;
      if (staffData.lastName) formattedData.lastName = staffData.lastName;
      if (staffData.email) formattedData.email = staffData.email;
      if (staffData.password) formattedData.password = staffData.password;
      if (staffData.role) formattedData.role = staffData.role;
      if (staffData.department) formattedData.department = staffData.department;
      if (staffData.position) formattedData.position = staffData.position;
      if (staffData.phone) formattedData.phone = staffData.phone;
      if (staffData.address) formattedData.address = staffData.address;
      if (staffData.city) formattedData.city = staffData.city;
      if (staffData.state) formattedData.state = staffData.state;
      if (staffData.zipCode) formattedData.zipCode = staffData.zipCode;
      if (staffData.specialties) formattedData.specialties = staffData.specialties;
      
      // Convert status to isActive if present
      if (staffData.status) {
        formattedData.isActive = staffData.status === 'Active';
      }

      const response = await api.put(`/api/staff/${id}`, formattedData);
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error updating staff with ID ${id}:`, error);
      throw error;
    }
  },

  deleteStaff: async (id: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/api/staff/${id}`);
      return response.data && response.data.status === 'success';
    } catch (error) {
      console.error(`Error deleting staff with ID ${id}:`, error);
      throw error;
    }
  },

  // Staff Availability Management
  getStaffAvailability: async (staffId: string): Promise<StaffAvailability[]> => {
    try {
      const response = await api.get(`/api/staff/${staffId}/availability`);
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error(`Error fetching availability for staff ID ${staffId}:`, error);
      throw error;
    }
  },

  createStaffAvailability: async (staffId: string, availability: Partial<StaffAvailability>): Promise<StaffAvailability | null> => {
    try {
      const response = await api.post(`/api/staff/${staffId}/availability`, {
        ...availability,
        staffId
      });
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating staff availability:', error);
      throw error;
    }
  },

  updateStaffAvailability: async (id: string, availability: Partial<StaffAvailability>): Promise<StaffAvailability | null> => {
    try {
      const response = await api.put(`/api/staff/availability/${id}`, availability);
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error updating staff availability with ID ${id}:`, error);
      throw error;
    }
  },

  deleteStaffAvailability: async (id: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/api/staff/availability/${id}`);
      return response.data && response.data.status === 'success';
    } catch (error) {
      console.error(`Error deleting staff availability with ID ${id}:`, error);
      throw error;
    }
  },

  // Staff Time Off Management
  getStaffTimeOff: async (staffId: string, params?: { status?: TimeOffStatus }): Promise<StaffTimeOff[]> => {
    try {
      const response = await api.get(`/api/staff/${staffId}/time-off`, { params });
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error(`Error fetching time off for staff ID ${staffId}:`, error);
      throw error;
    }
  },

  createStaffTimeOff: async (staffId: string, timeOff: Partial<StaffTimeOff>): Promise<StaffTimeOff | null> => {
    try {
      const response = await api.post(`/api/staff/${staffId}/time-off`, {
        ...timeOff,
        staffId,
        type: timeOff.type || TimeOffType.VACATION,
        status: timeOff.status || TimeOffStatus.PENDING
      });
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating staff time off:', error);
      throw error;
    }
  },

  updateStaffTimeOff: async (id: string, timeOff: Partial<StaffTimeOff>): Promise<StaffTimeOff | null> => {
    try {
      const response = await api.put(`/api/staff/time-off/${id}`, timeOff);
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error updating staff time off with ID ${id}:`, error);
      throw error;
    }
  },

  deleteStaffTimeOff: async (id: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/api/staff/time-off/${id}`);
      return response.data && response.data.status === 'success';
    } catch (error) {
      console.error(`Error deleting staff time off with ID ${id}:`, error);
      throw error;
    }
  },

  // Staff Scheduling
  getAvailableStaff: async (params: { date: string, startTime: string, endTime: string, specialties?: string[] }): Promise<Staff[]> => {
    try {
      const response = await api.get('/api/staff/available', { params });
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching available staff:', error);
      throw error;
    }
  },

  // Staff Schedule methods
  getStaffSchedules: async (staffId: string, startDate?: string, endDate?: string): Promise<StaffSchedule[]> => {
    try {
      let url = `/api/schedules/staff/${staffId}`;
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const response = await api.get(url);
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error(`Error fetching schedules for staff ${staffId}:`, error);
      throw error;
    }
  },

  getAllSchedules: async (startDate?: string, endDate?: string): Promise<StaffSchedule[]> => {
    try {
      let url = '/api/schedules';
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const response = await api.get(url);
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching all schedules:', error);
      throw error;
    }
  },

  createStaffSchedule: async (staffId: string, scheduleData: Partial<StaffSchedule>): Promise<StaffSchedule | null> => {
    try {
      const response = await api.post(`/api/schedules/staff/${staffId}`, scheduleData);
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error creating schedule for staff ${staffId}:`, error);
      throw error;
    }
  },

  updateStaffSchedule: async (scheduleId: string, scheduleData: Partial<StaffSchedule>): Promise<StaffSchedule | null> => {
    try {
      const response = await api.put(`/api/schedules/${scheduleId}`, scheduleData);
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error updating schedule with ID ${scheduleId}:`, error);
      throw error;
    }
  },

  deleteStaffSchedule: async (scheduleId: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/api/schedules/${scheduleId}`);
      return response.data && response.data.status === 'success';
    } catch (error) {
      console.error(`Error deleting schedule with ID ${scheduleId}:`, error);
      throw error;
    }
  },
  
  bulkCreateSchedules: async (scheduleData: Partial<StaffSchedule>[]): Promise<StaffSchedule[]> => {
    try {
      const response = await api.post('/api/schedules/bulk', { schedules: scheduleData });
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error creating bulk schedules:', error);
      throw error;
    }
  }
};

export default staffService;
