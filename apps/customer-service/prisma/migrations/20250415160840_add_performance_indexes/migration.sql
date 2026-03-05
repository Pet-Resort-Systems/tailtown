-- Add indexes for better query performance
CREATE INDEX "pets_customerid_idx" ON "pets"("customerId");
CREATE INDEX "pets_active_type_idx" ON "pets"("isActive", "type");
CREATE INDEX "pets_last_checkin_idx" ON "pets"("lastCheckIn");

CREATE INDEX "reservations_date_range_idx" ON "reservations"("startDate", "endDate");
CREATE INDEX "reservations_status_date_idx" ON "reservations"("status", "startDate");
CREATE INDEX "reservations_customer_status_idx" ON "reservations"("customerId", "status");

CREATE INDEX "check_ins_time_idx" ON "check_ins"("checkInTime");
CREATE INDEX "check_ins_pet_time_idx" ON "check_ins"("petId", "checkInTime");

CREATE INDEX "payments_customer_date_idx" ON "payments"("customerId", "paymentDate");
CREATE INDEX "payments_status_date_idx" ON "payments"("status", "paymentDate");

-- Add indexes for common search patterns
CREATE INDEX "customers_name_search_idx" ON "customers"("firstName", "lastName");
CREATE INDEX "customers_email_search_idx" ON "customers"("email");
CREATE INDEX "customers_phone_search_idx" ON "customers"("phone");
