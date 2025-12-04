-- Recurring Schedule Templates System
-- For automated repeating staff schedules

-- Create ScheduleRotationType enum
CREATE TYPE "ScheduleRotationType" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- Create schedule_templates table
CREATE TABLE "schedule_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "staffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rotationType" "ScheduleRotationType" NOT NULL DEFAULT 'WEEKLY',
    "rotationWeeks" INTEGER NOT NULL DEFAULT 1,
    "currentRotation" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "generateAheadDays" INTEGER NOT NULL DEFAULT 14,
    "lastGeneratedDate" TIMESTAMP(3),
    "skipHolidays" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- Create schedule_template_entries table
CREATE TABLE "schedule_template_entries" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "rotationWeek" INTEGER NOT NULL DEFAULT 0,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_template_entries_pkey" PRIMARY KEY ("id")
);

-- Create business_holidays table
CREATE TABLE "business_holidays" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_holidays_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_staffId_fkey" 
    FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_template_entries" ADD CONSTRAINT "schedule_template_entries_templateId_fkey" 
    FOREIGN KEY ("templateId") REFERENCES "schedule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "schedule_templates_tenant_staff_active_idx" ON "schedule_templates"("tenantId", "staffId", "isActive");
CREATE INDEX "schedule_template_entries_template_day_idx" ON "schedule_template_entries"("templateId", "dayOfWeek");
CREATE UNIQUE INDEX "business_holidays_tenant_date_unique" ON "business_holidays"("tenantId", "date");
CREATE INDEX "business_holidays_tenant_date_idx" ON "business_holidays"("tenantId", "date");
