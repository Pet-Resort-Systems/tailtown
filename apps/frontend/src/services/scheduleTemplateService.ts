/**
 * Schedule Template Service
 * Handles recurring schedule templates and holiday management
 */

import api from "./api";

export type ScheduleRotationType = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";

export interface ScheduleTemplateEntry {
  id: string;
  templateId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  rotationWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
  role?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleTemplate {
  id: string;
  tenantId: string;
  staffId: string;
  name: string;
  rotationType: ScheduleRotationType;
  rotationWeeks: number;
  currentRotation: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveUntil?: string;
  generateAheadDays: number;
  lastGeneratedDate?: string;
  skipHolidays: boolean;
  notes?: string;
  entries: ScheduleTemplateEntry[];
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHoliday {
  id: string;
  tenantId: string;
  name: string;
  date: string;
  isRecurring: boolean;
  isClosed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResult {
  created: number;
  skipped: number;
  schedules: any[];
  skippedDates: { date: string; reason: string }[];
}

export const scheduleTemplateService = {
  // ============================================
  // TEMPLATES
  // ============================================

  /**
   * Get templates for a staff member
   */
  getStaffTemplates: async (
    staffId: string,
    activeOnly = false
  ): Promise<ScheduleTemplate[]> => {
    const response = await api.get(
      `/api/schedule-templates/staff/${staffId}/templates`,
      {
        params: { activeOnly: activeOnly.toString() },
      }
    );
    return response.data?.data || [];
  },

  /**
   * Get all active templates
   */
  getAllActiveTemplates: async (): Promise<ScheduleTemplate[]> => {
    const response = await api.get("/api/schedule-templates/templates");
    return response.data?.data || [];
  },

  /**
   * Create a template
   */
  createTemplate: async (
    staffId: string,
    data: {
      name: string;
      rotationType?: ScheduleRotationType;
      rotationWeeks?: number;
      effectiveFrom: string;
      effectiveUntil?: string;
      generateAheadDays?: number;
      skipHolidays?: boolean;
      notes?: string;
      entries?: Omit<
        ScheduleTemplateEntry,
        "id" | "templateId" | "createdAt" | "updatedAt"
      >[];
    }
  ): Promise<ScheduleTemplate> => {
    const response = await api.post(
      `/api/schedule-templates/staff/${staffId}/templates`,
      data
    );
    return response.data?.data;
  },

  /**
   * Update a template
   */
  updateTemplate: async (
    templateId: string,
    data: Partial<ScheduleTemplate>
  ): Promise<ScheduleTemplate> => {
    const response = await api.patch(
      `/api/schedule-templates/templates/${templateId}`,
      data
    );
    return response.data?.data;
  },

  /**
   * Delete a template
   */
  deleteTemplate: async (templateId: string): Promise<void> => {
    await api.delete(`/api/schedule-templates/templates/${templateId}`);
  },

  /**
   * Generate schedules from a template
   */
  generateSchedules: async (
    templateId: string,
    startDate?: string,
    endDate?: string
  ): Promise<GenerateResult> => {
    const response = await api.post(
      `/api/schedule-templates/templates/${templateId}/generate`,
      {
        startDate,
        endDate,
      }
    );
    return response.data?.data;
  },

  /**
   * Generate schedules for all active templates
   */
  generateAllSchedules: async (): Promise<{
    templatesProcessed: number;
    results: any[];
  }> => {
    const response = await api.post(
      "/api/schedule-templates/templates/generate-all"
    );
    return response.data?.data;
  },

  // ============================================
  // TEMPLATE ENTRIES
  // ============================================

  /**
   * Add an entry to a template
   */
  addEntry: async (
    templateId: string,
    data: {
      dayOfWeek: number;
      rotationWeek?: number;
      startTime: string;
      endTime: string;
      location?: string;
      role?: string;
      notes?: string;
    }
  ): Promise<ScheduleTemplateEntry> => {
    const response = await api.post(
      `/api/schedule-templates/templates/${templateId}/entries`,
      data
    );
    return response.data?.data;
  },

  /**
   * Update an entry
   */
  updateEntry: async (
    entryId: string,
    data: Partial<ScheduleTemplateEntry>
  ): Promise<ScheduleTemplateEntry> => {
    const response = await api.patch(
      `/api/schedule-templates/entries/${entryId}`,
      data
    );
    return response.data?.data;
  },

  /**
   * Delete an entry
   */
  deleteEntry: async (entryId: string): Promise<void> => {
    await api.delete(`/api/schedule-templates/entries/${entryId}`);
  },

  // ============================================
  // HOLIDAYS
  // ============================================

  /**
   * Get all holidays
   */
  getHolidays: async (year?: number): Promise<BusinessHoliday[]> => {
    const response = await api.get("/api/schedule-templates/holidays", {
      params: year ? { year: year.toString() } : undefined,
    });
    return response.data?.data || [];
  },

  /**
   * Create a holiday
   */
  createHoliday: async (data: {
    name: string;
    date: string;
    isRecurring?: boolean;
    isClosed?: boolean;
    notes?: string;
  }): Promise<BusinessHoliday> => {
    const response = await api.post("/api/schedule-templates/holidays", data);
    return response.data?.data;
  },

  /**
   * Update a holiday
   */
  updateHoliday: async (
    holidayId: string,
    data: Partial<BusinessHoliday>
  ): Promise<BusinessHoliday> => {
    const response = await api.patch(
      `/api/schedule-templates/holidays/${holidayId}`,
      data
    );
    return response.data?.data;
  },

  /**
   * Delete a holiday
   */
  deleteHoliday: async (holidayId: string): Promise<void> => {
    await api.delete(`/api/schedule-templates/holidays/${holidayId}`);
  },

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get day name from day of week number
   */
  getDayName: (dayOfWeek: number): string => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayOfWeek] || "";
  },

  /**
   * Get short day name
   */
  getShortDayName: (dayOfWeek: number): string => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayOfWeek] || "";
  },

  /**
   * Format rotation type for display
   */
  formatRotationType: (type: ScheduleRotationType): string => {
    const labels: Record<ScheduleRotationType, string> = {
      WEEKLY: "Weekly",
      BIWEEKLY: "Bi-Weekly",
      MONTHLY: "Monthly",
      CUSTOM: "Custom",
    };
    return labels[type] || type;
  },
};

export default scheduleTemplateService;
