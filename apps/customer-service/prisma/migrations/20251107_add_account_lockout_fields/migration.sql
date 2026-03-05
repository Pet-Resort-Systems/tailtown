-- Safe migration to add account lockout security fields to staff table
-- Created: 2024-11-07
-- Purpose: Add failedLoginAttempts, lockedUntil, and lastFailedLogin fields for account lockout security
-- This prevents brute force attacks by locking accounts after 5 failed login attempts

-- Add account lockout fields to staff table
DO $$ 
BEGIN
    -- Add failedLoginAttempts column to staff
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'failedLoginAttempts'
    ) THEN
        ALTER TABLE "staff" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added failedLoginAttempts column to staff table';
    ELSE
        RAISE NOTICE 'failedLoginAttempts column already exists in staff table';
    END IF;
    
    -- Add lockedUntil column to staff
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'lockedUntil'
    ) THEN
        ALTER TABLE "staff" ADD COLUMN "lockedUntil" TIMESTAMP(3);
        RAISE NOTICE 'Added lockedUntil column to staff table';
    ELSE
        RAISE NOTICE 'lockedUntil column already exists in staff table';
    END IF;
    
    -- Add lastFailedLogin column to staff
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'lastFailedLogin'
    ) THEN
        ALTER TABLE "staff" ADD COLUMN "lastFailedLogin" TIMESTAMP(3);
        RAISE NOTICE 'Added lastFailedLogin column to staff table';
    ELSE
        RAISE NOTICE 'lastFailedLogin column already exists in staff table';
    END IF;
END $$;

-- Add index for lockedUntil to efficiently query locked accounts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'staff_locked_until_idx'
    ) THEN
        CREATE INDEX "staff_locked_until_idx" ON "staff"("lockedUntil") WHERE "lockedUntil" IS NOT NULL;
        RAISE NOTICE 'Created index staff_locked_until_idx';
    ELSE
        RAISE NOTICE 'Index staff_locked_until_idx already exists';
    END IF;
END $$;

-- Verification queries (commented out - uncomment to verify after migration)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'staff' 
-- AND column_name IN ('failedLoginAttempts', 'lockedUntil', 'lastFailedLogin');
