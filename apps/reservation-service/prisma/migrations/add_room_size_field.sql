-- Add room size field to resources table
-- Migration: add_room_size_to_resources
-- Date: 2025-11-20

-- Create RoomSize enum type
CREATE TYPE "RoomSize" AS ENUM ('JUNIOR', 'QUEEN', 'KING', 'VIP', 'CAT', 'OVERFLOW');

-- Add size column to resources table (nullable for non-kennel resources)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS "size" "RoomSize";

-- Add index for size filtering
CREATE INDEX IF NOT EXISTS "resources_tenant_size_idx" ON resources("tenantId", "size");

-- Note: The actual data migration (parsing kennel names and setting sizes) 
-- will be done in a separate Tailtown-specific script to avoid affecting 
-- other tenants or future deployments.
