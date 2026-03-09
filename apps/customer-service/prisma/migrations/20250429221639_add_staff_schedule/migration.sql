-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "location" TEXT,
    "role" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_schedules_staff_date_idx" ON "staff_schedules"("staffId", "date");

-- CreateIndex
CREATE INDEX "staff_schedules_date_status_idx" ON "staff_schedules"("date", "status");

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
