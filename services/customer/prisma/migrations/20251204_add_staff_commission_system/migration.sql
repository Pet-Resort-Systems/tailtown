-- Staff Commission System
-- Allows configuring commission rates (percentage or flat amount) for staff members
-- tied to specific services (e.g., groomers, trainers)

-- Create CommissionType enum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FLAT_AMOUNT');

-- Create staff_commissions table
CREATE TABLE "staff_commissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "staffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_commissions_pkey" PRIMARY KEY ("id")
);

-- Create staff_commission_services junction table
CREATE TABLE "staff_commission_services" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "commissionId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_commission_services_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "staff_commissions" ADD CONSTRAINT "staff_commissions_staffId_fkey" 
    FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_commission_services" ADD CONSTRAINT "staff_commission_services_commissionId_fkey" 
    FOREIGN KEY ("commissionId") REFERENCES "staff_commissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "staff_commissions_tenant_staff_idx" ON "staff_commissions"("tenantId", "staffId");
CREATE INDEX "staff_commissions_tenant_active_idx" ON "staff_commissions"("tenantId", "isActive");
CREATE UNIQUE INDEX "staff_commission_service_unique" ON "staff_commission_services"("commissionId", "serviceId");
CREATE INDEX "staff_commission_service_tenant_service_idx" ON "staff_commission_services"("tenantId", "serviceId");
