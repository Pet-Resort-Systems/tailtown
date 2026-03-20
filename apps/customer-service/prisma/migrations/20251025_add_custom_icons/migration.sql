-- Add custom icons table for user-uploaded icons
-- Allows admins to upload custom icon images for customers and pets

-- CreateTable
CREATE TABLE IF NOT EXISTS "custom_icons" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'dev',
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "image_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_icons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "custom_icon_unique" ON "custom_icons"("tenant_id", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "custom_icons_tenant_active_idx" ON "custom_icons"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "custom_icons_category_idx" ON "custom_icons"("category");

-- Add comments for documentation
COMMENT ON TABLE "custom_icons" IS 'User-uploaded custom icons for customers and pets';
COMMENT ON COLUMN "custom_icons"."name" IS 'Unique identifier (e.g., custom_vip)';
COMMENT ON COLUMN "custom_icons"."label" IS 'Display name shown in UI';
COMMENT ON COLUMN "custom_icons"."description" IS 'Tooltip text';
COMMENT ON COLUMN "custom_icons"."category" IS 'Icon category: status, payment, communication, service, flag, custom';
COMMENT ON COLUMN "custom_icons"."image_url" IS 'URL or path to uploaded image file';
COMMENT ON COLUMN "custom_icons"."file_name" IS 'Original filename';
COMMENT ON COLUMN "custom_icons"."file_size" IS 'File size in bytes';
COMMENT ON COLUMN "custom_icons"."mime_type" IS 'MIME type: image/png, image/jpeg, image/svg+xml';
