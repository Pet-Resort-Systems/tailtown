-- AlterTable
ALTER TABLE "pets" ADD COLUMN     "iconNotes" JSONB,
ADD COLUMN     "petIcons" JSONB;

-- CreateIndex
CREATE INDEX "addon_services_tenant_service_active_idx" ON "addon_services"("tenantId", "serviceId", "isActive");

-- CreateIndex
CREATE INDEX "check_ins_tenant_pet_time_idx" ON "check_ins"("tenantId", "petId", "checkInTime");
