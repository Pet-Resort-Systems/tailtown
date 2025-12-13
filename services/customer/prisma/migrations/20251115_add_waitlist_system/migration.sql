-- Safe migration to add waitlist system
-- Created: 2024-11-15
-- Purpose: Add waitlist functionality for fully booked services
-- SAFE: Uses CREATE TYPE/TABLE IF NOT EXISTS, checks before adding constraints
-- NO DATA LOSS: Only adds new tables and enums, does not modify existing data

-- Create enums for waitlist system
DO $$ BEGIN
    CREATE TYPE "WaitlistServiceType" AS ENUM ('BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WaitlistStatus" AS ENUM ('ACTIVE', 'NOTIFIED', 'CONVERTED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WaitlistNotificationType" AS ENUM ('SPOT_AVAILABLE', 'POSITION_UPDATE', 'EXPIRING_SOON', 'CONVERTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WaitlistRecipientType" AS ENUM ('STAFF', 'CUSTOMER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'PUSH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WaitlistAction" AS ENUM ('BOOKED', 'DECLINED', 'EXPIRED', 'NO_RESPONSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create waitlist_entries table
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "customerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "serviceType" "WaitlistServiceType" NOT NULL,
    
    -- Date/Time
    "requestedStartDate" TIMESTAMP(3) NOT NULL,
    "requestedEndDate" TIMESTAMP(3),
    "requestedTime" TEXT,
    "flexibleDates" BOOLEAN NOT NULL DEFAULT false,
    "dateFlexibilityDays" INTEGER,
    
    -- Service Details
    "serviceId" TEXT,
    "resourceId" TEXT,
    "groomerId" TEXT,
    "classId" TEXT,
    
    -- Preferences
    "preferences" TEXT NOT NULL DEFAULT '{}',
    
    -- Status & Priority
    "status" "WaitlistStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    
    -- Metadata
    "notes" TEXT,
    "customerNotes" TEXT,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "lastNotifiedAt" TIMESTAMP(3),
    
    -- Conversion
    "convertedToReservationId" TEXT,
    "convertedAt" TIMESTAMP(3),
    
    -- Expiration
    "expiresAt" TIMESTAMP(3),
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- Create waitlist_notifications table
CREATE TABLE IF NOT EXISTS "waitlist_notifications" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT NOT NULL,
    "notificationType" "WaitlistNotificationType" NOT NULL,
    "recipientType" "WaitlistRecipientType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    
    -- Message
    "subject" TEXT,
    "message" TEXT NOT NULL,
    
    -- Metadata
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "actionTaken" "WaitlistAction",
    "actionTakenAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    
    -- Expiration
    "expiresAt" TIMESTAMP(3),
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_notifications_pkey" PRIMARY KEY ("id")
);

-- Create waitlist_config table
CREATE TABLE IF NOT EXISTS "waitlist_config" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    
    -- Feature flags
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "boardingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "daycareEnabled" BOOLEAN NOT NULL DEFAULT true,
    "groomingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trainingEnabled" BOOLEAN NOT NULL DEFAULT true,
    
    -- Expiration settings
    "entryExpirationDays" INTEGER NOT NULL DEFAULT 30,
    "notificationExpirationHours" INTEGER NOT NULL DEFAULT 24,
    
    -- Notification settings
    "maxNotificationsPerAvailability" INTEGER NOT NULL DEFAULT 3,
    "autoNotifyOnCancellation" BOOLEAN NOT NULL DEFAULT true,
    "customerNotificationChannels" TEXT[] DEFAULT ARRAY['SMS', 'EMAIL']::TEXT[],
    "staffNotificationChannels" TEXT[] DEFAULT ARRAY['IN_APP', 'EMAIL']::TEXT[],
    
    -- Flexible dates
    "flexibleDatesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxFlexibilityDays" INTEGER NOT NULL DEFAULT 7,
    
    -- Priority algorithm
    "useLoyaltyBonus" BOOLEAN NOT NULL DEFAULT false,
    "useFlexibilityBonus" BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_config_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on waitlist_config.tenantId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_config_tenantId_key'
    ) THEN
        ALTER TABLE "waitlist_config" ADD CONSTRAINT "waitlist_config_tenantId_key" 
        UNIQUE ("tenantId");
        RAISE NOTICE 'Added unique constraint waitlist_config_tenantId_key';
    END IF;
END $$;

-- Create indexes for waitlist_entries
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_tenant_status') THEN
        CREATE INDEX "idx_waitlist_tenant_status" ON "waitlist_entries"("tenantId", "status");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_service_status') THEN
        CREATE INDEX "idx_waitlist_service_status" ON "waitlist_entries"("tenantId", "serviceType", "status");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_start_date') THEN
        CREATE INDEX "idx_waitlist_start_date" ON "waitlist_entries"("tenantId", "requestedStartDate");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_priority') THEN
        CREATE INDEX "idx_waitlist_priority" ON "waitlist_entries"("priority");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_position') THEN
        CREATE INDEX "idx_waitlist_position" ON "waitlist_entries"("position");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_expires') THEN
        CREATE INDEX "idx_waitlist_expires" ON "waitlist_entries"("expiresAt");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_customer') THEN
        CREATE INDEX "idx_waitlist_customer" ON "waitlist_entries"("customerId");
    END IF;
END $$;

-- Create indexes for waitlist_notifications
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_notif_entry') THEN
        CREATE INDEX "idx_waitlist_notif_entry" ON "waitlist_notifications"("waitlistEntryId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_notif_recipient') THEN
        CREATE INDEX "idx_waitlist_notif_recipient" ON "waitlist_notifications"("recipientId", "status");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_notif_status') THEN
        CREATE INDEX "idx_waitlist_notif_status" ON "waitlist_notifications"("status", "sentAt");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_notif_expires') THEN
        CREATE INDEX "idx_waitlist_notif_expires" ON "waitlist_notifications"("expiresAt");
    END IF;
END $$;

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_entries_customerId_fkey'
    ) THEN
        ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_entries_petId_fkey'
    ) THEN
        ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_petId_fkey" 
        FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_entries_serviceId_fkey'
    ) THEN
        ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_serviceId_fkey" 
        FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_entries_resourceId_fkey'
    ) THEN
        ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_resourceId_fkey" 
        FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_entries_groomerId_fkey'
    ) THEN
        ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_groomerId_fkey" 
        FOREIGN KEY ("groomerId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_entries_classId_fkey'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'training_classes'
        ) THEN
            ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_classId_fkey" 
            FOREIGN KEY ("classId") REFERENCES "training_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_entries_convertedToReservationId_fkey'
    ) THEN
        ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_convertedToReservationId_fkey" 
        FOREIGN KEY ("convertedToReservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waitlist_notifications_waitlistEntryId_fkey'
    ) THEN
        ALTER TABLE "waitlist_notifications" ADD CONSTRAINT "waitlist_notifications_waitlistEntryId_fkey" 
        FOREIGN KEY ("waitlistEntryId") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Waitlist system tables created successfully!';
    RAISE NOTICE 'Tables: waitlist_entries, waitlist_notifications, waitlist_config';
    RAISE NOTICE 'Enums: WaitlistServiceType, WaitlistStatus, WaitlistNotificationType, etc.';
    RAISE NOTICE 'All foreign keys and indexes created.';
    RAISE NOTICE 'SAFE: No existing data was modified or deleted.';
END $$;
