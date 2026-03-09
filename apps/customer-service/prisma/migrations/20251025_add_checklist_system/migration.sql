-- Add Checklist System tables

BEGIN;

-- Create checklist_templates table
CREATE TABLE IF NOT EXISTS "checklist_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "items" TEXT NOT NULL,
    "requiredForCompletion" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- Create checklist_instances table
CREATE TABLE IF NOT EXISTS "checklist_instances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "templateId" TEXT NOT NULL,
    "reservationId" TEXT,
    "petId" TEXT,
    "resourceId" TEXT,
    "customerId" TEXT,
    "assignedToStaffId" TEXT,
    "assignedToStaffName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "items" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "checklist_instances_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "checklist_template_tenant_area_idx" ON "checklist_templates"("tenantId", "area");
CREATE INDEX IF NOT EXISTS "checklist_instance_tenant_status_idx" ON "checklist_instances"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "checklist_instance_tenant_reservation_idx" ON "checklist_instances"("tenantId", "reservationId");
CREATE INDEX IF NOT EXISTS "checklist_instance_tenant_staff_idx" ON "checklist_instances"("tenantId", "assignedToStaffId");

-- Add foreign key
DO $$ BEGIN
    ALTER TABLE "checklist_instances" 
    ADD CONSTRAINT "checklist_instances_templateId_fkey" 
    FOREIGN KEY ("templateId") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

COMMIT;
