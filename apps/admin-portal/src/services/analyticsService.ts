import { tenantService } from './tenantService';

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  pausedTenants: number;
  totalCustomers: number;
  totalReservations: number;
  totalEmployees: number;
  averageCustomersPerTenant: number;
  averageReservationsPerTenant: number;
}

export interface TenantGrowth {
  date: string;
  total: number;
  active: number;
  trial: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface PlanDistribution {
  name: string;
  value: number;
  color: string;
}

class AnalyticsService {
  /**
   * Get platform-wide metrics
   */
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const tenants = await tenantService.getAllTenants();

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
    const trialTenants = tenants.filter((t) => t.status === 'TRIAL').length;
    const pausedTenants = tenants.filter((t) => t.isPaused).length;

    const totalCustomers = tenants.reduce((sum, t) => sum + t.customerCount, 0);
    const totalReservations = tenants.reduce((sum, t) => sum + t.reservationCount, 0);
    const totalEmployees = tenants.reduce((sum, t) => sum + t.employeeCount, 0);

    const averageCustomersPerTenant = totalTenants > 0 ? totalCustomers / totalTenants : 0;
    const averageReservationsPerTenant = totalTenants > 0 ? totalReservations / totalTenants : 0;

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      pausedTenants,
      totalCustomers,
      totalReservations,
      totalEmployees,
      averageCustomersPerTenant: Math.round(averageCustomersPerTenant * 10) / 10,
      averageReservationsPerTenant: Math.round(averageReservationsPerTenant * 10) / 10,
    };
  }

  /**
   * Get tenant growth over time
   * Simulated data for now - in production, this would come from database
   */
  async getTenantGrowth(): Promise<TenantGrowth[]> {
    const tenants = await tenantService.getAllTenants();
    
    // Group tenants by creation month
    const growthMap = new Map<string, { total: number; active: number; trial: number }>();
    
    tenants.forEach((tenant) => {
      const date = new Date(tenant.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!growthMap.has(monthKey)) {
        growthMap.set(monthKey, { total: 0, active: 0, trial: 0 });
      }
      
      const data = growthMap.get(monthKey)!;
      data.total++;
      if (tenant.status === 'ACTIVE') data.active++;
      if (tenant.status === 'TRIAL') data.trial++;
    });
    
    // Convert to array and sort by date
    const growth = Array.from(growthMap.entries())
      .map(([date, counts]) => ({
        date,
        ...counts,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate cumulative totals
    let cumulativeTotal = 0;
    let cumulativeActive = 0;
    let cumulativeTrial = 0;
    
    return growth.map((item) => {
      cumulativeTotal += item.total;
      cumulativeActive += item.active;
      cumulativeTrial += item.trial;
      
      return {
        date: item.date,
        total: cumulativeTotal,
        active: cumulativeActive,
        trial: cumulativeTrial,
      };
    });
  }

  /**
   * Get status distribution
   */
  async getStatusDistribution(): Promise<StatusDistribution[]> {
    const tenants = await tenantService.getAllTenants();
    
    const statusCounts = tenants.reduce((acc, tenant) => {
      acc[tenant.status] = (acc[tenant.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const colorMap: Record<string, string> = {
      ACTIVE: '#4caf50',
      TRIAL: '#2196f3',
      PAUSED: '#ff9800',
      CANCELLED: '#f44336',
      DELETED: '#9e9e9e',
      PENDING: '#ffeb3b',
    };
    
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      color: colorMap[name] || '#9e9e9e',
    }));
  }

  /**
   * Get plan distribution
   */
  async getPlanDistribution(): Promise<PlanDistribution[]> {
    const tenants = await tenantService.getAllTenants();
    
    const planCounts = tenants.reduce((acc, tenant) => {
      acc[tenant.planType] = (acc[tenant.planType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const colorMap: Record<string, string> = {
      STARTER: '#03a9f4',
      PROFESSIONAL: '#8bc34a',
      ENTERPRISE: '#ff9800',
    };
    
    return Object.entries(planCounts).map(([name, value]) => ({
      name,
      value,
      color: colorMap[name] || '#9e9e9e',
    }));
  }

  /**
   * Get top tenants by customers
   */
  async getTopTenantsByCustomers(limit: number = 5) {
    const tenants = await tenantService.getAllTenants();
    
    return tenants
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, limit)
      .map((t) => ({
        name: t.businessName,
        customers: t.customerCount,
        reservations: t.reservationCount,
      }));
  }

  /**
   * Get top tenants by reservations
   */
  async getTopTenantsByReservations(limit: number = 5) {
    const tenants = await tenantService.getAllTenants();
    
    return tenants
      .sort((a, b) => b.reservationCount - a.reservationCount)
      .slice(0, limit)
      .map((t) => ({
        name: t.businessName,
        customers: t.customerCount,
        reservations: t.reservationCount,
      }));
  }
}

export const analyticsService = new AnalyticsService();
