/*
  Warnings:

  - The values [ROOM,PLAYPEN,TRAINING_AREA,DOG_KENNEL,CAT_CONDO,LUXURY_SUITE,INDOOR_PLAY_YARD] on the enum `ResourceType` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `capacity` on table `resources` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ResourceType_new" AS ENUM ('KENNEL', 'RUN', 'SUITE', 'STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE', 'PLAY_AREA', 'OUTDOOR_PLAY_YARD', 'PRIVATE_PLAY_AREA', 'GROOMING_TABLE', 'BATHING_STATION', 'DRYING_STATION', 'TRAINING_ROOM', 'AGILITY_COURSE', 'GROOMER', 'TRAINER', 'ATTENDANT', 'BATHER', 'OTHER');
ALTER TABLE "resources" ALTER COLUMN "type" TYPE "ResourceType_new" USING ("type"::text::"ResourceType_new");
ALTER TYPE "ResourceType" RENAME TO "ResourceType_old";
ALTER TYPE "ResourceType_new" RENAME TO "ResourceType";
DROP TYPE "ResourceType_old";
COMMIT;

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "lastCleanedAt" TIMESTAMP(3),
ADD COLUMN     "maintenanceStatus" TEXT,
ADD COLUMN     "suiteNumber" INTEGER,
ALTER COLUMN "capacity" SET NOT NULL,
ALTER COLUMN "capacity" SET DEFAULT 1,
ALTER COLUMN "availability" SET DATA TYPE TEXT,
ALTER COLUMN "maintenanceSchedule" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "resources_suite_number_idx" ON "resources"("suiteNumber");
