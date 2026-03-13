/**
 * Audit Log Service
 *
 * Frontend service for querying audit logs.
 */

import api from "./api";

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: string;
  category: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  metadata?: any;
  severity: string;
  createdAt: string;
}

export interface AuditLogQueryParams {
  action?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ActivitySummary {
  action: string;
  category: string;
  count: number;
}

export const auditLogService = {
  /**
   * Query audit logs with filters
   */
  async getAuditLogs(
    params: AuditLogQueryParams = {}
  ): Promise<AuditLogResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get(`/audit-logs?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; data: AuditLog[] }> {
    const response = await api.get(
      `/audit-logs/entity/${entityType}/${entityId}`
    );
    return response.data;
  },

  /**
   * Get activity for a specific user
   */
  async getUserActivity(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data: AuditLog[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await api.get(
      `/audit-logs/user/${userId}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get activity summary
   */
  async getActivitySummary(
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; data: ActivitySummary[] }> {
    const response = await api.get(
      `/audit-logs/summary?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  /**
   * Get critical events
   */
  async getCriticalEvents(
    limit: number = 50
  ): Promise<{ success: boolean; data: AuditLog[] }> {
    const response = await api.get(`/audit-logs/critical?limit=${limit}`);
    return response.data;
  },

  /**
   * Get failed login attempts
   */
  async getFailedLogins(
    since?: string
  ): Promise<{ success: boolean; data: AuditLog[] }> {
    const params = since ? `?since=${since}` : "";
    const response = await api.get(`/audit-logs/failed-logins${params}`);
    return response.data;
  },
};

export default auditLogService;
