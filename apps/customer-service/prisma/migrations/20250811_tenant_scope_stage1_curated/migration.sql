-- Stage 1: Add tenantId columns with default 'dev' and introduce tenant-scoped uniques and indexes
-- Non-destructive: no table drops, no enum changes. Safe to run on existing data.
-- IMPORTANT: Ensure there are no duplicates that would violate the new tenant-scoped uniques before applying.
-- Recommended pre-checks are documented in the migration plan.

BEGIN;

-- 1) Drop legacy global unique indexes (if they exist)
DROP INDEX IF EXISTS "customers_email_key";
DROP INDEX IF EXISTS "reservations_orderNumber_key";
DROP INDEX IF EXISTS "invoices_invoiceNumber_key";
DROP INDEX IF EXISTS "invoices_reservationId_key";
DROP INDEX IF EXISTS "staff_email_key";
DROP INDEX IF EXISTS "notification_preferences_customerId_key";

-- 2) Add tenantId columns with a default of 'dev' to backfill existing rows
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "addon_services" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "invoice_line_items" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "price_rule_service_categories" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "price_rule_services" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "price_rules" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "reservation_addons" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "resource_availability" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "staff_availability" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "staff_schedules" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';
ALTER TABLE "staff_time_off" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'dev';

-- 3) Create tenant-scoped unique constraints and supporting indexes
-- Customers
CREATE INDEX IF NOT EXISTS "customers_tenant_name_idx" ON "customers"("tenantId", "lastName", "firstName");
CREATE INDEX IF NOT EXISTS "customers_tenant_email_idx" ON "customers"("tenantId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_email_unique" ON "customers"("tenantId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_id_unique" ON "customers"("tenantId", "id");

-- Reservations
CREATE INDEX IF NOT EXISTS "reservations_tenant_date_range_idx" ON "reservations"("tenantId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "reservations_tenant_status_date_idx" ON "reservations"("tenantId", "status", "startDate");
CREATE INDEX IF NOT EXISTS "reservations_tenant_customer_status_idx" ON "reservations"("tenantId", "customerId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "reservations_tenant_order_unique" ON "reservations"("tenantId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "reservations_tenant_id_unique" ON "reservations"("tenantId", "id");

-- Invoices
CREATE INDEX IF NOT EXISTS "invoices_tenant_customer_issue_idx" ON "invoices"("tenantId", "customerId", "issueDate");
CREATE INDEX IF NOT EXISTS "invoices_tenant_status_issue_idx" ON "invoices"("tenantId", "status", "issueDate");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_number_unique" ON "invoices"("tenantId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_reservation_unique" ON "invoices"("tenantId", "reservationId");

-- Notification Preferences
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_tenant_customer_unique" ON "notification_preferences"("tenantId", "customerId");

-- Pets
CREATE INDEX IF NOT EXISTS "pets_tenant_customer_idx" ON "pets"("tenantId", "customerId");

-- Activities
CREATE INDEX IF NOT EXISTS "activities_tenant_checkin_time_idx" ON "activities"("tenantId", "checkInId", "timestamp");

-- Documents
CREATE INDEX IF NOT EXISTS "documents_tenant_customer_idx" ON "documents"("tenantId", "customerId");

-- Invoice Line Items
CREATE INDEX IF NOT EXISTS "invoice_line_items_tenant_invoice_idx" ON "invoice_line_items"("tenantId", "invoiceId");

-- Medical Records
CREATE INDEX IF NOT EXISTS "medical_records_tenant_pet_type_idx" ON "medical_records"("tenantId", "petId", "recordType");

-- Payments
CREATE INDEX IF NOT EXISTS "payments_tenant_customer_date_idx" ON "payments"("tenantId", "customerId", "paymentDate");
CREATE INDEX IF NOT EXISTS "payments_tenant_status_date_idx" ON "payments"("tenantId", "status", "paymentDate");

-- Price Rules
CREATE INDEX IF NOT EXISTS "price_rules_tenant_type_active_idx" ON "price_rules"("tenantId", "ruleType", "isActive");
CREATE INDEX IF NOT EXISTS "price_rule_services_tenant_idx" ON "price_rule_services"("tenantId", "priceRuleId", "serviceId");
CREATE INDEX IF NOT EXISTS "price_rule_svc_cat_tenant_idx" ON "price_rule_service_categories"("tenantId", "priceRuleId", "serviceCategory");

-- Reservation AddOns
CREATE INDEX IF NOT EXISTS "reservation_addons_tenant_reservation_idx" ON "reservation_addons"("tenantId", "reservationId");

-- Resource Availability
CREATE INDEX IF NOT EXISTS "resource_availability_tenant_range_idx" ON "resource_availability"("tenantId", "resourceId", "startTime", "endTime");

-- Resources
CREATE INDEX IF NOT EXISTS "resources_tenant_type_active_idx" ON "resources"("tenantId", "type", "isActive");
CREATE INDEX IF NOT EXISTS "resources_tenant_name_idx" ON "resources"("tenantId", "name");

-- Services
CREATE INDEX IF NOT EXISTS "services_tenant_active_idx" ON "services"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "services_tenant_name_idx" ON "services"("tenantId", "name");

-- Staff
CREATE INDEX IF NOT EXISTS "staff_tenant_active_idx" ON "staff"("tenantId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "staff_tenant_email_unique" ON "staff"("tenantId", "email");

-- Staff Availability
CREATE INDEX IF NOT EXISTS "staff_availability_tenant_staff_day_idx" ON "staff_availability"("tenantId", "staffId", "dayOfWeek");

-- Staff Schedules
CREATE INDEX IF NOT EXISTS "staff_schedules_tenant_staff_date_idx" ON "staff_schedules"("tenantId", "staffId", "date");

-- Staff Time Off
CREATE INDEX IF NOT EXISTS "staff_time_off_tenant_staff_status_idx" ON "staff_time_off"("tenantId", "staffId", "status");

-- 4) Update foreign keys that become tenant-scoped
-- Drop existing single-key FKs (if present)
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_reservationId_fkey";
ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "notification_preferences_customerId_fkey";

-- Add composite FKs using tenantId
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_tenantId_reservationId_fkey"
  FOREIGN KEY ("tenantId", "reservationId")
  REFERENCES "reservations"("tenantId", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_tenantId_customerId_fkey"
  FOREIGN KEY ("tenantId", "customerId")
  REFERENCES "customers"("tenantId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

COMMIT;
