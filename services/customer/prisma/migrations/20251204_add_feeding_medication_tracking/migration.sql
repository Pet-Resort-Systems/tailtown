-- Feeding and Medication Tracking System
-- For picky eater reporting and medication administration logging

-- Add isPickyEater flag to pets table
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "isPickyEater" BOOLEAN NOT NULL DEFAULT false;

-- Create MealTime enum
CREATE TYPE "MealTime" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- Create feeding_logs table
CREATE TABLE "feeding_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "petId" TEXT NOT NULL,
    "reservationId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "mealTime" "MealTime" NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "foodType" TEXT,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeding_logs_pkey" PRIMARY KEY ("id")
);

-- Create pet_medications table (medication schedule)
CREATE TABLE "pet_medications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "petId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "administrationMethod" TEXT NOT NULL,
    "timeOfDay" TEXT[],
    "withFood" BOOLEAN NOT NULL DEFAULT false,
    "specialInstructions" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "prescribingVet" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_medications_pkey" PRIMARY KEY ("id")
);

-- Create medication_logs table (administration log)
CREATE TABLE "medication_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "petId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "reservationId" TEXT,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "administeredAt" TIMESTAMP(3),
    "wasAdministered" BOOLEAN NOT NULL DEFAULT false,
    "staffId" TEXT NOT NULL,
    "notes" TEXT,
    "skippedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "feeding_logs" ADD CONSTRAINT "feeding_logs_petId_fkey" 
    FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feeding_logs" ADD CONSTRAINT "feeding_logs_staffId_fkey" 
    FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pet_medications" ADD CONSTRAINT "pet_medications_petId_fkey" 
    FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_petId_fkey" 
    FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medicationId_fkey" 
    FOREIGN KEY ("medicationId") REFERENCES "pet_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_staffId_fkey" 
    FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
CREATE UNIQUE INDEX "feeding_log_unique" ON "feeding_logs"("petId", "date", "mealTime");
CREATE INDEX "feeding_logs_tenant_date_idx" ON "feeding_logs"("tenantId", "date");
CREATE INDEX "feeding_logs_tenant_pet_date_idx" ON "feeding_logs"("tenantId", "petId", "date");
CREATE INDEX "feeding_logs_staff_idx" ON "feeding_logs"("staffId");

CREATE INDEX "pet_medications_tenant_pet_active_idx" ON "pet_medications"("tenantId", "petId", "isActive");

CREATE INDEX "medication_logs_tenant_time_idx" ON "medication_logs"("tenantId", "scheduledTime");
CREATE INDEX "medication_logs_tenant_pet_time_idx" ON "medication_logs"("tenantId", "petId", "scheduledTime");
CREATE INDEX "medication_logs_staff_idx" ON "medication_logs"("staffId");
CREATE INDEX "medication_logs_medication_idx" ON "medication_logs"("medicationId");
