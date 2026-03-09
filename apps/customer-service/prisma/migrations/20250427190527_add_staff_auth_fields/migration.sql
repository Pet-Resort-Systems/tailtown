/*
  Warnings:

  - You are about to drop the column `capacityLimit` on the `services` table. All the data in the column will be lost.
  - Added the required column `password` to the `staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "services" DROP COLUMN "capacityLimit";

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "department" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
