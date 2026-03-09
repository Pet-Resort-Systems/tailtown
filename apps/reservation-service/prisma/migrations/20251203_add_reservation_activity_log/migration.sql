-- CreateEnum
CREATE TYPE "ReservationActivityType" AS ENUM (
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'CONFIRMED',
  'PAYMENT_RECEIVED',
  'NOTE_ADDED',
  'RESOURCE_ASSIGNED',
  'STAFF_ASSIGNED',
  'ADDON_ADDED',
  'ADDON_REMOVED'
);

-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM (
  'CUSTOMER',
  'EMPLOYEE',
  'SYSTEM'
);

-- CreateTable
CREATE TABLE "reservation_activity_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'dev',
  "reservationId" TEXT NOT NULL,
  "activityType" "ReservationActivityType" NOT NULL,
  "actorType" "ActivityActorType" NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "description" TEXT NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reservation_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservation_activity_log_reservation_idx" ON "reservation_activity_logs"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_activity_log_tenant_reservation_idx" ON "reservation_activity_logs"("tenantId", "reservationId");

-- CreateIndex
CREATE INDEX "reservation_activity_log_tenant_created_idx" ON "reservation_activity_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "reservation_activity_log_actor_idx" ON "reservation_activity_logs"("actorType", "actorId");

-- AddForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'reservations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'reservation_activity_logs_reservationId_fkey'
    ) THEN
      ALTER TABLE "reservation_activity_logs" ADD CONSTRAINT "reservation_activity_logs_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
