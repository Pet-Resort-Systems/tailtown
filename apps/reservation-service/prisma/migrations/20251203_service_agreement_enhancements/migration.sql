-- Service Agreement Enhancements Migration
-- Adds versioning, customer tracking, and acknowledgment features

-- Add new columns to service_agreement_templates
ALTER TABLE "service_agreement_templates" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "service_agreement_templates" ADD COLUMN IF NOT EXISTS "requiresInitials" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "service_agreement_templates" ADD COLUMN IF NOT EXISTS "requiresSignature" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "service_agreement_templates" ADD COLUMN IF NOT EXISTS "effectiveDate" TIMESTAMP(3);
ALTER TABLE "service_agreement_templates" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "service_agreement_templates" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "service_agreement_templates" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

-- Create index for default template lookup
CREATE INDEX IF NOT EXISTS "service_agreement_templates_tenant_default_idx" ON "service_agreement_templates"("tenantId", "isDefault");

-- Create service_agreement_versions table
CREATE TABLE IF NOT EXISTS "service_agreement_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeNotes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_agreement_versions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on template + version
CREATE UNIQUE INDEX IF NOT EXISTS "service_agreement_versions_template_version_unique" ON "service_agreement_versions"("templateId", "version");

-- Create index for tenant + template lookup
CREATE INDEX IF NOT EXISTS "service_agreement_versions_tenant_template_idx" ON "service_agreement_versions"("tenantId", "templateId");

-- Add foreign key to service_agreement_templates
ALTER TABLE "service_agreement_versions" 
ADD CONSTRAINT "service_agreement_versions_templateId_fkey" 
FOREIGN KEY ("templateId") REFERENCES "service_agreement_templates"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Modify service_agreements table
-- Make checkInId optional
ALTER TABLE "service_agreements" ALTER COLUMN "checkInId" DROP NOT NULL;

-- Add new columns to service_agreements
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "petId" TEXT;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "templateVersion" INTEGER;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "isValid" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "invalidatedAt" TIMESTAMP(3);
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "invalidatedBy" TEXT;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "invalidReason" TEXT;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "service_agreements" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for service_agreements
CREATE INDEX IF NOT EXISTS "service_agreements_tenant_customer_idx" ON "service_agreements"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "service_agreements_tenant_customer_signed_idx" ON "service_agreements"("tenantId", "customerId", "signedAt");
CREATE INDEX IF NOT EXISTS "service_agreements_tenant_valid_idx" ON "service_agreements"("tenantId", "isValid");

-- Add foreign key to service_agreement_templates
ALTER TABLE "service_agreements" 
ADD CONSTRAINT "service_agreements_templateId_fkey" 
FOREIGN KEY ("templateId") REFERENCES "service_agreement_templates"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing agreements to have customerId from check-in if possible
-- This is a data migration that should be run after the schema changes
UPDATE "service_agreements" sa
SET "customerId" = ci."customerId"
FROM "check_ins" ci
WHERE sa."checkInId" = ci."id" 
AND sa."customerId" IS NULL
AND ci."customerId" IS NOT NULL;

-- For any remaining agreements without customerId, we'll need to handle them manually
-- or set a default value based on business requirements
