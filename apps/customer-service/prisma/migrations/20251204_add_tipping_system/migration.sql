-- CreateEnum
CREATE TYPE "TipType" AS ENUM ('GROOMER', 'GENERAL');

-- CreateEnum
CREATE TYPE "TipCollectionMethod" AS ENUM ('ONLINE', 'TERMINAL', 'CASH');

-- CreateTable
CREATE TABLE "tips" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "type" "TipType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "percentage" INTEGER,
    "collectionMethod" "TipCollectionMethod" NOT NULL,
    "customerId" TEXT NOT NULL,
    "reservationId" TEXT,
    "invoiceId" TEXT,
    "groomerId" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tips_tenant_idx" ON "tips"("tenantId");

-- CreateIndex
CREATE INDEX "tips_tenant_customer_idx" ON "tips"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "tips_tenant_groomer_idx" ON "tips"("tenantId", "groomerId");

-- CreateIndex
CREATE INDEX "tips_tenant_type_idx" ON "tips"("tenantId", "type");

-- CreateIndex
CREATE INDEX "tips_tenant_created_idx" ON "tips"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "tips_tenant_reservation_idx" ON "tips"("tenantId", "reservationId");

-- CreateIndex
CREATE INDEX "tips_tenant_invoice_idx" ON "tips"("tenantId", "invoiceId");

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_groomerId_fkey" FOREIGN KEY ("groomerId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
