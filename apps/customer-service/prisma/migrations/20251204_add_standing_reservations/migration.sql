-- Standing Reservations System
-- Allows creating recurring reservation templates (weekly daycare, bi-weekly grooming, etc.)

-- Create RecurrenceFrequency enum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- Create standing_reservations table
CREATE TABLE "standing_reservations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "customerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "resourceId" TEXT,
    "staffAssignedId" TEXT,
    "name" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "daysOfWeek" INTEGER[],
    "dayOfMonth" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT false,
    "generateAheadDays" INTEGER NOT NULL DEFAULT 30,
    "lastGeneratedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standing_reservations_pkey" PRIMARY KEY ("id")
);

-- Create standing_reservation_instances table
CREATE TABLE "standing_reservation_instances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "standingReservationId" TEXT NOT NULL,
    "reservationId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standing_reservation_instances_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "standing_reservations" ADD CONSTRAINT "standing_reservations_customerId_fkey" 
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "standing_reservations" ADD CONSTRAINT "standing_reservations_petId_fkey" 
    FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "standing_reservations" ADD CONSTRAINT "standing_reservations_serviceId_fkey" 
    FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "standing_reservations" ADD CONSTRAINT "standing_reservations_resourceId_fkey" 
    FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "standing_reservations" ADD CONSTRAINT "standing_reservations_staffAssignedId_fkey" 
    FOREIGN KEY ("staffAssignedId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "standing_reservation_instances" ADD CONSTRAINT "standing_reservation_instances_standingReservationId_fkey" 
    FOREIGN KEY ("standingReservationId") REFERENCES "standing_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "standing_reservations_tenant_customer_idx" ON "standing_reservations"("tenantId", "customerId");
CREATE INDEX "standing_reservations_tenant_active_idx" ON "standing_reservations"("tenantId", "isActive");
CREATE INDEX "standing_reservations_tenant_dates_idx" ON "standing_reservations"("tenantId", "effectiveFrom", "effectiveUntil");
CREATE UNIQUE INDEX "standing_instance_unique" ON "standing_reservation_instances"("standingReservationId", "scheduledDate");
CREATE INDEX "standing_instances_tenant_date_idx" ON "standing_reservation_instances"("tenantId", "scheduledDate");
