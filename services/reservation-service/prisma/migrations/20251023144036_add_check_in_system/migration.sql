-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'NUMBER', 'YES_NO', 'MULTIPLE_CHOICE', 'TIME', 'LONG_TEXT', 'DATE');

-- CreateEnum
CREATE TYPE "MedicationMethod" AS ENUM ('ORAL_PILL', 'ORAL_LIQUID', 'TOPICAL', 'INJECTION', 'EYE_DROPS', 'EAR_DROPS', 'INHALER', 'TRANSDERMAL_PATCH', 'OTHER');

-- Ensure base table exists on fresh databases, then add new columns.
-- Prisma migrations normally run once, but CI may start from an empty DB.
CREATE TABLE IF NOT EXISTS "check_ins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "petId" TEXT NOT NULL,
    "reservationId" TEXT,
    "templateId" TEXT,
    "customerId" TEXT,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutTime" TIMESTAMP(3),
    "checkInNotes" TEXT,
    "checkOutNotes" TEXT,
    "checkInBy" TEXT,
    "checkOutBy" TEXT,
    "belongingsChecklist" JSONB,
    "foodProvided" BOOLEAN NOT NULL DEFAULT false,
    "medicationGiven" BOOLEAN NOT NULL DEFAULT false,
    "medicationNotes" TEXT,
    "behaviorDuringStay" TEXT,
    "photosTaken" BOOLEAN NOT NULL DEFAULT false,
    "photosShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "templateId" TEXT;

-- CreateTable
CREATE TABLE "check_in_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_in_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "check_in_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_questions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,

    CONSTRAINT "check_in_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_responses" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB NOT NULL,

    CONSTRAINT "check_in_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_belongings" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "color" TEXT,
    "brand" TEXT,
    "notes" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnedBy" TEXT,

    CONSTRAINT "check_in_belongings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_medications" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "administrationMethod" "MedicationMethod" NOT NULL,
    "timeOfDay" TEXT,
    "withFood" BOOLEAN NOT NULL DEFAULT false,
    "specialInstructions" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "prescribingVet" TEXT,
    "notes" TEXT,

    CONSTRAINT "check_in_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_agreement_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_agreement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_agreements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "checkInId" TEXT NOT NULL,
    "agreementText" TEXT NOT NULL,
    "initials" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "signedBy" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,

    CONSTRAINT "service_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_in_templates_tenant_active_idx" ON "check_in_templates"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "check_in_templates_tenant_name_unique" ON "check_in_templates"("tenantId", "name");

-- CreateIndex
CREATE INDEX "check_in_sections_template_order_idx" ON "check_in_sections"("templateId", "order");

-- CreateIndex
CREATE INDEX "check_in_questions_section_order_idx" ON "check_in_questions"("sectionId", "order");

-- CreateIndex
CREATE INDEX "check_in_responses_check_in_idx" ON "check_in_responses"("checkInId");

-- CreateIndex
CREATE INDEX "check_in_belongings_check_in_idx" ON "check_in_belongings"("checkInId");

-- CreateIndex
CREATE INDEX "check_in_medications_check_in_idx" ON "check_in_medications"("checkInId");

-- CreateIndex
CREATE INDEX "service_agreement_templates_tenant_active_idx" ON "service_agreement_templates"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "service_agreement_templates_tenant_name_unique" ON "service_agreement_templates"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "service_agreements_checkInId_key" ON "service_agreements"("checkInId");

-- CreateIndex
CREATE INDEX "service_agreements_tenant_idx" ON "service_agreements"("tenantId");

-- CreateIndex
CREATE INDEX "check_ins_tenant_reservation_idx" ON "check_ins"("tenantId", "reservationId");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "check_in_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_sections" ADD CONSTRAINT "check_in_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "check_in_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_questions" ADD CONSTRAINT "check_in_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "check_in_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_responses" ADD CONSTRAINT "check_in_responses_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_responses" ADD CONSTRAINT "check_in_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "check_in_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_belongings" ADD CONSTRAINT "check_in_belongings_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_medications" ADD CONSTRAINT "check_in_medications_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_agreements" ADD CONSTRAINT "service_agreements_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
