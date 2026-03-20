-- Safe migration to add refresh_tokens table for secure token rotation
-- Created: 2024-11-07
-- Purpose: Implement refresh token system for improved security and user experience
-- Allows long-lived sessions without keeping access tokens valid for extended periods

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'refresh_tokens_token_key'
    ) THEN
        CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
        RAISE NOTICE 'Created unique index refresh_tokens_token_key';
    ELSE
        RAISE NOTICE 'Index refresh_tokens_token_key already exists';
    END IF;
END $$;

-- Create index on staffId for efficient lookups
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'refresh_tokens_staff_id_idx'
    ) THEN
        CREATE INDEX "refresh_tokens_staff_id_idx" ON "refresh_tokens"("staffId");
        RAISE NOTICE 'Created index refresh_tokens_staff_id_idx';
    ELSE
        RAISE NOTICE 'Index refresh_tokens_staff_id_idx already exists';
    END IF;
END $$;

-- Create index on token for efficient lookups
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'refresh_tokens_token_idx'
    ) THEN
        CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");
        RAISE NOTICE 'Created index refresh_tokens_token_idx';
    ELSE
        RAISE NOTICE 'Index refresh_tokens_token_idx already exists';
    END IF;
END $$;

-- Create index on expiresAt for cleanup queries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'refresh_tokens_expires_at_idx'
    ) THEN
        CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expiresAt");
        RAISE NOTICE 'Created index refresh_tokens_expires_at_idx';
    ELSE
        RAISE NOTICE 'Index refresh_tokens_expires_at_idx already exists';
    END IF;
END $$;

-- Add foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'refresh_tokens_staffId_fkey'
    ) THEN
        ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint refresh_tokens_staffId_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint refresh_tokens_staffId_fkey already exists';
    END IF;
END $$;

-- Verification queries (commented out - uncomment to verify after migration)
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'refresh_tokens';
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'refresh_tokens';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'refresh_tokens';
