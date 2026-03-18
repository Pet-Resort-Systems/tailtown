-- CreateEnum for TenantStatus
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'DELETED', 'PENDING');

-- CreateEnum for UserRole
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STAFF');

-- CreateTable: tenants
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "planType" TEXT NOT NULL DEFAULT 'STARTER',
    "billingEmail" TEXT,
    "maxEmployees" INTEGER NOT NULL DEFAULT 50,
    "maxLocations" INTEGER NOT NULL DEFAULT 1,
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionStartDate" TIMESTAMP(3),
    "subscriptionEndDate" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '12h',
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "reservationCount" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMB" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant_users
CREATE TABLE "tenant_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_contactEmail_key" ON "tenants"("contactEmail");

-- CreateIndex
CREATE INDEX "tenants_subdomain_idx" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "tenants_status_isActive_idx" ON "tenants"("status", "isActive");

-- CreateIndex
CREATE INDEX "tenants_contactEmail_idx" ON "tenants"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenantId_email_key" ON "tenant_users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "tenant_users_tenantId_role_idx" ON "tenant_users"("tenantId", "role");

-- CreateIndex
CREATE INDEX "tenant_users_email_idx" ON "tenant_users"("email");

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default "dev" tenant for existing data
INSERT INTO "tenants" (
    "id",
    "businessName",
    "subdomain",
    "contactName",
    "contactEmail",
    "status",
    "isActive",
    "planType",
    "createdAt",
    "updatedAt"
) VALUES (
    'dev',
    'Development Tenant',
    'dev',
    'Developer',
    'dev@tailtown.local',
    'ACTIVE',
    true,
    'ENTERPRISE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
