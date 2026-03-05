-- CreateTable
CREATE TABLE IF NOT EXISTS "super_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "require_2fa" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_super_admins_email" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_super_admins_active" ON "super_admins"("is_active");
