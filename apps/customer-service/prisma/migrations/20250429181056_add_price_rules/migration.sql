/*
  Warnings:

  - Made the column `serviceCategory` on table `services` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PriceRuleType" AS ENUM ('DAY_OF_WEEK', 'MULTI_DAY', 'MULTI_PET', 'SEASONAL', 'PROMOTIONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "capacityLimit" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "serviceCategory" SET NOT NULL;

-- CreateTable
CREATE TABLE "price_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "PriceRuleType" NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "daysOfWeek" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_rule_service_categories" (
    "id" TEXT NOT NULL,
    "priceRuleId" TEXT NOT NULL,
    "serviceCategory" "ServiceCategory" NOT NULL,

    CONSTRAINT "price_rule_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_rule_services" (
    "id" TEXT NOT NULL,
    "priceRuleId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "price_rule_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_rules_type_active_idx" ON "price_rules"("ruleType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "price_rule_service_categories_priceRuleId_serviceCategory_key" ON "price_rule_service_categories"("priceRuleId", "serviceCategory");

-- CreateIndex
CREATE UNIQUE INDEX "price_rule_services_priceRuleId_serviceId_key" ON "price_rule_services"("priceRuleId", "serviceId");

-- AddForeignKey
ALTER TABLE "price_rule_service_categories" ADD CONSTRAINT "price_rule_service_categories_priceRuleId_fkey" FOREIGN KEY ("priceRuleId") REFERENCES "price_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rule_services" ADD CONSTRAINT "price_rule_services_priceRuleId_fkey" FOREIGN KEY ("priceRuleId") REFERENCES "price_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rule_services" ADD CONSTRAINT "price_rule_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
