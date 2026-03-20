-- Migration script to create critical tables for the reservation service
-- This addresses the missing tables identified by our schema validation

-- Create Customer table
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zipCode" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,

  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- Create Pet table
CREATE TABLE IF NOT EXISTS "Pet" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "breed" TEXT,
  "size" TEXT,
  "weight" DOUBLE PRECISION,
  "birthDate" TIMESTAMP(3),
  "notes" TEXT,
  "customerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,

  CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- Create Resource table
CREATE TABLE IF NOT EXISTS "Resource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,

  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- Create Reservation table
CREATE TABLE IF NOT EXISTS "Reservation" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT,
  "customerId" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "resourceId" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "suiteType" TEXT NOT NULL,
  "price" DOUBLE PRECISION,
  "deposit" DOUBLE PRECISION,
  "balance" DOUBLE PRECISION,
  "notes" TEXT,
  "staffNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,

  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- Create ReservationAddOn table
CREATE TABLE IF NOT EXISTS "ReservationAddOn" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "addOnId" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,

  CONSTRAINT "ReservationAddOn_pkey" PRIMARY KEY ("id")
);

-- Create AddOnService table
CREATE TABLE IF NOT EXISTS "AddOnService" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "duration" INTEGER,
  "serviceId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,

  CONSTRAINT "AddOnService_pkey" PRIMARY KEY ("id")
);

-- Create Service table
CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "duration" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,

  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReservationAddOn" ADD CONSTRAINT "ReservationAddOn_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationAddOn" ADD CONSTRAINT "ReservationAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOnService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes for multi-tenant isolation and common query patterns
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE INDEX "Customer_organizationId_email_idx" ON "Customer"("organizationId", "email");
CREATE INDEX "Customer_organizationId_lastName_firstName_idx" ON "Customer"("organizationId", "lastName", "firstName");

CREATE INDEX "Pet_organizationId_idx" ON "Pet"("organizationId");
CREATE INDEX "Pet_customerId_idx" ON "Pet"("customerId");
CREATE INDEX "Pet_organizationId_customerId_idx" ON "Pet"("organizationId", "customerId");

CREATE INDEX "Resource_organizationId_idx" ON "Resource"("organizationId");
CREATE INDEX "Resource_organizationId_type_idx" ON "Resource"("organizationId", "type");
CREATE INDEX "Resource_organizationId_isActive_idx" ON "Resource"("organizationId", "isActive");

CREATE INDEX "Reservation_organizationId_idx" ON "Reservation"("organizationId");
CREATE INDEX "Reservation_organizationId_startDate_endDate_idx" ON "Reservation"("organizationId", "startDate", "endDate");
CREATE INDEX "Reservation_organizationId_status_idx" ON "Reservation"("organizationId", "status");
CREATE INDEX "Reservation_customerId_idx" ON "Reservation"("customerId");
CREATE INDEX "Reservation_petId_idx" ON "Reservation"("petId");
CREATE INDEX "Reservation_resourceId_idx" ON "Reservation"("resourceId");
CREATE INDEX "Reservation_organizationId_customerId_idx" ON "Reservation"("organizationId", "customerId");
CREATE INDEX "Reservation_orderNumber_idx" ON "Reservation"("orderNumber");

CREATE INDEX "ReservationAddOn_organizationId_idx" ON "ReservationAddOn"("organizationId");
CREATE INDEX "ReservationAddOn_reservationId_idx" ON "ReservationAddOn"("reservationId");
CREATE INDEX "ReservationAddOn_addOnId_idx" ON "ReservationAddOn"("addOnId");

CREATE INDEX "AddOnService_organizationId_idx" ON "AddOnService"("organizationId");
CREATE INDEX "AddOnService_organizationId_isActive_idx" ON "AddOnService"("organizationId", "isActive");
CREATE INDEX "AddOnService_serviceId_idx" ON "AddOnService"("serviceId");

CREATE INDEX "Service_organizationId_idx" ON "Service"("organizationId");
CREATE INDEX "Service_organizationId_isActive_idx" ON "Service"("organizationId", "isActive");

-- Create unique constraint for order numbers within a tenant
CREATE UNIQUE INDEX "Reservation_orderNumber_organizationId_key" ON "Reservation"("orderNumber", "organizationId");
