import { PrismaClient, Tenant, TenantStatus, TenantUser, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export interface CreateTenantDto {
  businessName: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  planType?: string;
  maxEmployees?: number;
  timezone?: string;
  
  // Admin user for the tenant
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateTenantDto {
  businessName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  planType?: string;
  maxEmployees?: number;
  maxLocations?: number;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
}

export class TenantService {
  
  /**
   * Get all tenants with optional filtering
   */
  async getAllTenants(filters?: {
    status?: TenantStatus;
    isActive?: boolean;
    isPaused?: boolean;
  }): Promise<any[]> {
    const tenants = await prisma.tenant.findMany({
      where: {
        ...filters,
        deletedAt: null, // Don't show deleted tenants
      },
      include: {
        users: {
          where: { role: 'TENANT_ADMIN' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add aggregated counts for each tenant
    const tenantsWithCounts = await Promise.all(
      tenants.map(async (tenant) => {
        // Count customers
        const customerCount = await prisma.customer.count({
          where: { tenantId: tenant.id },
        });

        // Count staff/employees
        const employeeCount = await prisma.staff.count({
          where: { tenantId: tenant.id },
        });

        // Count reservations
        const reservationCount = await prisma.reservation.count({
          where: { tenantId: tenant.id },
        });

        return {
          ...tenant,
          customerCount,
          employeeCount,
          reservationCount,
        };
      })
    );

    return tenantsWithCounts;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { subdomain },
    });
  }

  /**
   * Create a new tenant with admin user
   */
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    // Check if subdomain is available
    const existing = await this.getTenantBySubdomain(data.subdomain);
    if (existing) {
      throw new Error(`Subdomain "${data.subdomain}" is already taken`);
    }

    // Check if contact email is available
    const existingEmail = await prisma.tenant.findUnique({
      where: { contactEmail: data.contactEmail },
    });
    if (existingEmail) {
      throw new Error(`Contact email "${data.contactEmail}" is already registered`);
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    // Calculate trial end date (30 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Create tenant with admin user in a transaction
    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          businessName: data.businessName,
          subdomain: data.subdomain,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country || 'US',
          planType: data.planType || 'STARTER',
          maxEmployees: data.maxEmployees || 50,
          timezone: data.timezone || 'America/New_York',
          status: 'TRIAL',
          trialEndsAt,
        },
      });

      // Create admin user
      await tx.tenantUser.create({
        data: {
          tenantId: newTenant.id,
          email: data.adminEmail,
          password: hashedPassword,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          role: 'TENANT_ADMIN',
        },
      });

      // Initialize default data for tenant
      await this.initializeDefaultData(newTenant.id, tx);

      return newTenant;
    });

    return tenant;
  }

  /**
   * Update tenant information
   */
  async updateTenant(id: string, data: UpdateTenantDto): Promise<Tenant> {
    return prisma.tenant.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Pause a tenant (temporarily suspend)
   */
  async pauseTenant(id: string): Promise<Tenant> {
    return prisma.$transaction(async (tx) => {
      // Update tenant
      const tenant = await tx.tenant.update({
        where: { id },
        data: {
          isPaused: true,
          pausedAt: new Date(),
          status: 'PAUSED',
        },
      });

      // Disable all tenant users
      await tx.tenantUser.updateMany({
        where: { tenantId: id },
        data: { isActive: false },
      });

      return tenant;
    });
  }

  /**
   * Reactivate a paused tenant
   */
  async reactivateTenant(id: string): Promise<Tenant> {
    return prisma.$transaction(async (tx) => {
      // Update tenant
      const tenant = await tx.tenant.update({
        where: { id },
        data: {
          isPaused: false,
          pausedAt: null,
          status: 'ACTIVE',
        },
      });

      // Re-enable all tenant users
      await tx.tenantUser.updateMany({
        where: { tenantId: id },
        data: { isActive: true },
      });

      return tenant;
    });
  }

  /**
   * Soft delete a tenant
   */
  async deleteTenant(id: string): Promise<Tenant> {
    return prisma.$transaction(async (tx) => {
      // Soft delete tenant
      const tenant = await tx.tenant.update({
        where: { id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          isActive: false,
        },
      });

      // Disable all tenant users
      await tx.tenantUser.updateMany({
        where: { tenantId: id },
        data: { isActive: false },
      });

      return tenant;
    });
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId: string) {
    const [customerCount, reservationCount, employeeCount] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.reservation.count({ where: { tenantId } }),
      prisma.tenantUser.count({ where: { tenantId, isActive: true } }),
    ]);

    // Update tenant usage stats
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customerCount,
        reservationCount,
        employeeCount,
      },
    });

    return {
      customerCount,
      reservationCount,
      employeeCount,
    };
  }

  /**
   * Initialize default data for a new tenant
   */
  private async initializeDefaultData(tenantId: string, tx: any) {
    // Create default services
    await tx.service.createMany({
      data: [
        {
          tenantId,
          name: 'Daycare',
          description: 'Daily pet daycare service',
          serviceCategory: 'DAYCARE',
          price: 30.00,
          duration: 480, // 8 hours
          isActive: true,
        },
        {
          tenantId,
          name: 'Overnight Boarding',
          description: 'Overnight pet boarding',
          serviceCategory: 'BOARDING',
          price: 50.00,
          duration: 1440, // 24 hours
          isActive: true,
        },
        {
          tenantId,
          name: 'Bath & Brush',
          description: 'Basic grooming service',
          serviceCategory: 'GROOMING',
          price: 60.00,
          duration: 90, // 1.5 hours
          isActive: true,
        },
      ],
    });

    // Note: Add-on services require a serviceId, so they should be created
    // after services are set up through the UI

    // Create sample resources (kennels)
    const resourceTypes = ['STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE'];
    const resources = [];
    
    for (let i = 1; i <= 10; i++) {
      resources.push({
        tenantId,
        name: `Kennel ${i}`,
        type: resourceTypes[i % 3],
        capacity: 1,
        isActive: true,
      });
    }
    
    await tx.resource.createMany({ data: resources });
  }
}

export const tenantService = new TenantService();
