-- Add training class tables (Prisma migration)

-- CreateTable
CREATE TABLE IF NOT EXISTS "training_classes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'dev',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "max_capacity" INTEGER NOT NULL,
    "current_enrolled" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "total_weeks" INTEGER NOT NULL,
    "days_of_week" INTEGER[] NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price_per_series" DOUBLE PRECISION NOT NULL,
    "price_per_session" DOUBLE PRECISION,
    "deposit_required" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "prerequisites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "class_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'dev',
    "class_id" TEXT NOT NULL,
    "session_number" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "topic" TEXT,
    "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "homework" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "class_enrollments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'dev',
    "class_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "enrollment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount_due" DOUBLE PRECISION NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "sessions_attended" INTEGER NOT NULL DEFAULT 0,
    "total_sessions" INTEGER NOT NULL,
    "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "certificate_issued" BOOLEAN NOT NULL DEFAULT false,
    "certificate_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "session_attendance" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'dev',
    "session_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "arrival_time" TIMESTAMP(3),
    "departure_time" TIMESTAMP(3),
    "participation_level" TEXT,
    "behavior_rating" INTEGER,
    "progress_notes" TEXT,
    "homework_completed" BOOLEAN NOT NULL DEFAULT false,
    "homework_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "class_waitlist" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'dev',
    "class_id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notified_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'WAITING',

    CONSTRAINT "class_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "training_class_tenant_start_idx" ON "training_classes"("tenant_id", "start_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "training_classes_dates_idx" ON "training_classes"("start_date", "end_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "training_classes_instructor_idx" ON "training_classes"("instructor_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_sessions_class_number_idx" ON "class_sessions"("class_id", "session_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_sessions_date_status_idx" ON "class_sessions"("scheduled_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "class_enrollment_unique" ON "class_enrollments"("class_id", "pet_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_enrollments_tenant_status_idx" ON "class_enrollments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_enrollments_class_idx" ON "class_enrollments"("class_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_enrollments_customer_idx" ON "class_enrollments"("customer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_enrollments_pet_idx" ON "class_enrollments"("pet_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "session_attendance_unique" ON "session_attendance"("session_id", "enrollment_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "session_attendance_session_status_idx" ON "session_attendance"("session_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "session_attendance_enrollment_idx" ON "session_attendance"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "class_waitlist_unique" ON "class_waitlist"("class_id", "pet_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_waitlist_class_position_idx" ON "class_waitlist"("class_id", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_waitlist_customer_idx" ON "class_waitlist"("customer_id");

-- AddForeignKey
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'staff'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'training_classes_instructor_id_fkey'
        ) THEN
            ALTER TABLE "training_classes" ADD CONSTRAINT "training_classes_instructor_id_fkey"
            FOREIGN KEY ("instructor_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_sessions_class_id_fkey'
    ) THEN
        ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_id_fkey"
        FOREIGN KEY ("class_id") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_enrollments_class_id_fkey'
    ) THEN
        ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_fkey"
        FOREIGN KEY ("class_id") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'pets'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_enrollments_pet_id_fkey'
        ) THEN
            ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_pet_id_fkey"
            FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'customers'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_enrollments_customer_id_fkey'
        ) THEN
            ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'session_attendance_session_id_fkey'
    ) THEN
        ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'session_attendance_enrollment_id_fkey'
    ) THEN
        ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_enrollment_id_fkey"
        FOREIGN KEY ("enrollment_id") REFERENCES "class_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'pets'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'session_attendance_pet_id_fkey'
        ) THEN
            ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_pet_id_fkey"
            FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_waitlist_class_id_fkey'
    ) THEN
        ALTER TABLE "class_waitlist" ADD CONSTRAINT "class_waitlist_class_id_fkey"
        FOREIGN KEY ("class_id") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'pets'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_waitlist_pet_id_fkey'
        ) THEN
            ALTER TABLE "class_waitlist" ADD CONSTRAINT "class_waitlist_pet_id_fkey"
            FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'customers'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_waitlist_customer_id_fkey'
        ) THEN
            ALTER TABLE "class_waitlist" ADD CONSTRAINT "class_waitlist_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
