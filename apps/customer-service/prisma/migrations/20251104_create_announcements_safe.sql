-- Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'dev',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    type TEXT NOT NULL DEFAULT 'INFO',
    start_date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP(3),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create announcement_dismissals table if it doesn't exist
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'dev',
    announcement_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    dismissed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT announcement_dismissals_announcement_id_user_id_key UNIQUE (announcement_id, user_id)
);

-- Add foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'announcement_dismissals_announcement_id_fkey'
    ) THEN
        ALTER TABLE announcement_dismissals
        ADD CONSTRAINT announcement_dismissals_announcement_id_fkey
        FOREIGN KEY (announcement_id) REFERENCES announcements(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS announcements_tenant_id_idx ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS announcements_is_active_idx ON announcements(is_active);
CREATE INDEX IF NOT EXISTS announcements_start_date_idx ON announcements(start_date);
CREATE INDEX IF NOT EXISTS announcements_end_date_idx ON announcements(end_date);
CREATE INDEX IF NOT EXISTS announcement_dismissals_tenant_id_idx ON announcement_dismissals(tenant_id);
CREATE INDEX IF NOT EXISTS announcement_dismissals_user_id_idx ON announcement_dismissals(user_id);
