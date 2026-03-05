-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ResourceType" ADD VALUE 'DOG_KENNEL';
ALTER TYPE "ResourceType" ADD VALUE 'CAT_CONDO';
ALTER TYPE "ResourceType" ADD VALUE 'LUXURY_SUITE';
ALTER TYPE "ResourceType" ADD VALUE 'INDOOR_PLAY_YARD';
ALTER TYPE "ResourceType" ADD VALUE 'OUTDOOR_PLAY_YARD';
ALTER TYPE "ResourceType" ADD VALUE 'PRIVATE_PLAY_AREA';
ALTER TYPE "ResourceType" ADD VALUE 'BATHING_STATION';
ALTER TYPE "ResourceType" ADD VALUE 'DRYING_STATION';
ALTER TYPE "ResourceType" ADD VALUE 'TRAINING_ROOM';
ALTER TYPE "ResourceType" ADD VALUE 'AGILITY_COURSE';
ALTER TYPE "ResourceType" ADD VALUE 'GROOMER';
ALTER TYPE "ResourceType" ADD VALUE 'TRAINER';
ALTER TYPE "ResourceType" ADD VALUE 'ATTENDANT';
ALTER TYPE "ResourceType" ADD VALUE 'BATHER';

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "availability" JSONB,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "maintenanceSchedule" JSONB;

-- CreateTable
CREATE TABLE "resource_availability" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_availability_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "resource_availability" ADD CONSTRAINT "resource_availability_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
