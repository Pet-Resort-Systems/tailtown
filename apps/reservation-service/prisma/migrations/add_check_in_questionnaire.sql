-- Add comprehensive check-in questionnaire system
-- This migration adds support for customizable check-in templates and service agreements

-- Check-in template tables
CREATE TABLE "check_in_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL DEFAULT 'dev',
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "check_in_templates_tenant_name_unique" UNIQUE ("tenant_id", "name")
);

CREATE INDEX "check_in_templates_tenant_active_idx" ON "check_in_templates"("tenant_id", "is_active");

CREATE TABLE "check_in_sections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "template_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  CONSTRAINT "check_in_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "check_in_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "check_in_sections_template_order_idx" ON "check_in_sections"("template_id", "order");

CREATE TABLE "check_in_questions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "section_id" TEXT NOT NULL,
  "question_text" TEXT NOT NULL,
  "question_type" TEXT NOT NULL,
  "options" JSONB,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  "placeholder" TEXT,
  "help_text" TEXT,
  CONSTRAINT "check_in_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "check_in_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "check_in_questions_section_order_idx" ON "check_in_questions"("section_id", "order");

-- Add template_id to existing check_ins table
ALTER TABLE "check_ins" ADD COLUMN "template_id" TEXT;
ALTER TABLE "check_ins" ADD COLUMN "customer_id" TEXT;

-- Check-in responses table
CREATE TABLE "check_in_responses" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "check_in_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  CONSTRAINT "check_in_responses_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "check_in_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "check_in_questions"("id") ON UPDATE CASCADE
);

CREATE INDEX "check_in_responses_check_in_idx" ON "check_in_responses"("check_in_id");

-- Belongings tracking table
CREATE TABLE "check_in_belongings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "check_in_id" TEXT NOT NULL,
  "item_type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "color" TEXT,
  "brand" TEXT,
  "notes" TEXT,
  "returned_at" TIMESTAMP(3),
  "returned_by" TEXT,
  CONSTRAINT "check_in_belongings_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "check_in_belongings_check_in_idx" ON "check_in_belongings"("check_in_id");

-- Service agreement tables
CREATE TABLE "service_agreement_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL DEFAULT 'dev',
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_agreement_templates_tenant_name_unique" UNIQUE ("tenant_id", "name")
);

CREATE INDEX "service_agreement_templates_tenant_active_idx" ON "service_agreement_templates"("tenant_id", "is_active");

CREATE TABLE "service_agreements" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL DEFAULT 'dev',
  "check_in_id" TEXT NOT NULL UNIQUE,
  "agreement_text" TEXT NOT NULL,
  "initials" JSONB NOT NULL,
  "signature" TEXT NOT NULL,
  "signed_by" TEXT NOT NULL,
  "signed_at" TIMESTAMP(3) NOT NULL,
  "ip_address" TEXT,
  CONSTRAINT "service_agreements_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "service_agreements_tenant_idx" ON "service_agreements"("tenant_id");
