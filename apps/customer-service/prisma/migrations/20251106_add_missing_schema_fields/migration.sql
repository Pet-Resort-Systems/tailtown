-- Safe migration to add missing fields to customers, pets, and staff tables
-- Created: 2024-11-06
-- Purpose: Add veterinarianId, groomingSkills, and related fields that exist in schema but not in database
-- Backup created before running this migration

-- Add fields to customers table
DO $$ 
BEGIN
    -- Add veterinarianId column to customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'veterinarianId'
    ) THEN
        ALTER TABLE "customers" ADD COLUMN "veterinarianId" TEXT;
        RAISE NOTICE 'Added veterinarianId column to customers table';
    ELSE
        RAISE NOTICE 'veterinarianId column already exists in customers table';
    END IF;
END $$;

-- Add fields to pets table
DO $$ 
BEGIN
    -- Add veterinarianId column to pets
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pets' AND column_name = 'veterinarianId'
    ) THEN
        ALTER TABLE "pets" ADD COLUMN "veterinarianId" TEXT;
        RAISE NOTICE 'Added veterinarianId column to pets table';
    ELSE
        RAISE NOTICE 'veterinarianId column already exists in pets table';
    END IF;
    
    -- Add vaccineRecordFiles column to pets
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pets' AND column_name = 'vaccineRecordFiles'
    ) THEN
        ALTER TABLE "pets" ADD COLUMN "vaccineRecordFiles" JSONB;
        RAISE NOTICE 'Added vaccineRecordFiles column to pets table';
    ELSE
        RAISE NOTICE 'vaccineRecordFiles column already exists in pets table';
    END IF;
END $$;

-- Add grooming-related fields to staff table
DO $$ 
BEGIN
    -- Add grooming_skills column to staff
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'grooming_skills'
    ) THEN
        ALTER TABLE "staff" ADD COLUMN "grooming_skills" JSONB;
        RAISE NOTICE 'Added grooming_skills column to staff table';
    ELSE
        RAISE NOTICE 'grooming_skills column already exists in staff table';
    END IF;
    
    -- Add max_appointments_per_day column to staff
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'max_appointments_per_day'
    ) THEN
        ALTER TABLE "staff" ADD COLUMN "max_appointments_per_day" INTEGER;
        RAISE NOTICE 'Added max_appointments_per_day column to staff table';
    ELSE
        RAISE NOTICE 'max_appointments_per_day column already exists in staff table';
    END IF;
    
    -- Add average_service_time column to staff
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'average_service_time'
    ) THEN
        ALTER TABLE "staff" ADD COLUMN "average_service_time" INTEGER;
        RAISE NOTICE 'Added average_service_time column to staff table';
    ELSE
        RAISE NOTICE 'average_service_time column already exists in staff table';
    END IF;
END $$;

-- Add index for pets.veterinarianId if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'pets_veterinarian_id_idx'
    ) THEN
        CREATE INDEX "pets_veterinarian_id_idx" ON "pets"("veterinarianId");
        RAISE NOTICE 'Created index pets_veterinarian_id_idx';
    ELSE
        RAISE NOTICE 'Index pets_veterinarian_id_idx already exists';
    END IF;
END $$;

-- Verification queries (commented out - uncomment to verify after migration)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'veterinarianId';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pets' AND column_name IN ('veterinarianId', 'vaccineRecordFiles');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff' AND column_name IN ('grooming_skills', 'max_appointments_per_day', 'average_service_time');
