/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber]` on the table `reservations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "orderNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reservations_orderNumber_key" ON "reservations"("orderNumber");
