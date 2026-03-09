-- Add pet icons fields to pets table
-- This migration only adds the new fields, doesn't recreate tables

-- Add petIcons and iconNotes columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'pets'
    ) THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pets' AND column_name = 'petIcons'
    ) THEN
        ALTER TABLE "pets" ADD COLUMN "petIcons" JSONB;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pets' AND column_name = 'iconNotes'
    ) THEN
        ALTER TABLE "pets" ADD COLUMN "iconNotes" JSONB;
    END IF;
END $$;
