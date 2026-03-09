-- CreateTable: super_admins (must be created first for foreign keys)
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for super_admins
CREATE UNIQUE INDEX IF NOT EXISTS "super_admins_email_key" ON "super_admins"("email");
CREATE INDEX IF NOT EXISTS "idx_super_admins_email" ON "super_admins"("email");
CREATE INDEX IF NOT EXISTS "idx_super_admins_active" ON "super_admins"("is_active");
CREATE INDEX IF NOT EXISTS "idx_super_admins_role" ON "super_admins"("role");

-- CreateTable: audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "super_admin_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "tenant_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: impersonation_sessions
CREATE TABLE IF NOT EXISTS "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "super_admin_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_audit_logs_admin" ON "audit_logs"("super_admin_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant" ON "audit_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_impersonation_super_admin" ON "impersonation_sessions"("super_admin_id");
CREATE INDEX IF NOT EXISTS "idx_impersonation_tenant" ON "impersonation_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_impersonation_active" ON "impersonation_sessions"("is_active", "expires_at");

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_super_admin_id_fkey'
    ) THEN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_super_admin_id_fkey" 
        FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_super_admin_id_fkey'
    ) THEN
        ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_super_admin_id_fkey" 
        FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
