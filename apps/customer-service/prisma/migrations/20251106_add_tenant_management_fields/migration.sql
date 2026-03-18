-- Add tenant management fields if they don't exist
DO $$ 
BEGIN
    -- Add is_production column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'is_production'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "is_production" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add is_template column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'is_template'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add gingr_sync_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'gingr_sync_enabled'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "gingr_sync_enabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add last_gingr_sync_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'last_gingr_sync_at'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "last_gingr_sync_at" TIMESTAMP(3);
    END IF;
    
    -- Add cloned_from_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'cloned_from_id'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "cloned_from_id" TEXT;
    END IF;
    
    -- Add suspended_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'suspended_at'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "suspended_at" TIMESTAMP(3);
    END IF;
    
    -- Add suspended_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'suspended_reason'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "suspended_reason" TEXT;
    END IF;
    
    -- Add suspended_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'suspended_by'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "suspended_by" TEXT;
    END IF;
    
    -- Add deleted_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'deleted_by'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "deleted_by" TEXT;
    END IF;
    
    -- Add logo_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE "tenants" ADD COLUMN "logo_url" TEXT;
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tenants_suspended_by_fkey'
    ) THEN
        ALTER TABLE "tenants" ADD CONSTRAINT "tenants_suspended_by_fkey" 
        FOREIGN KEY ("suspended_by") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tenants_deleted_by_fkey'
    ) THEN
        ALTER TABLE "tenants" ADD CONSTRAINT "tenants_deleted_by_fkey" 
        FOREIGN KEY ("deleted_by") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
