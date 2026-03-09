-- Migration: Add Report Card System
-- Created: 2025-11-15
-- Description: Adds pet report card functionality with photo support

-- Create enums
DO $$ BEGIN
  CREATE TYPE "ReportCardServiceType" AS ENUM ('BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING', 'GENERAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportCardTemplate" AS ENUM ('DAYCARE_DAILY', 'BOARDING_DAILY', 'BOARDING_CHECKOUT', 'GROOMING_COMPLETE', 'TRAINING_SESSION', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportCardStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'VIEWED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create report_cards table
CREATE TABLE IF NOT EXISTS report_cards (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"            TEXT NOT NULL,
  
  -- Relationships
  "petId"               TEXT NOT NULL,
  "customerId"          TEXT NOT NULL,
  "reservationId"       TEXT,
  "createdByStaffId"    TEXT NOT NULL,
  
  -- Report Details
  "reportDate"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "serviceType"         "ReportCardServiceType" NOT NULL,
  "templateType"        "ReportCardTemplate",
  
  -- Content
  title                 TEXT,
  summary               TEXT,
  
  -- Activity Ratings (1-5 scale)
  "moodRating"          INTEGER,
  "energyRating"        INTEGER,
  "appetiteRating"      INTEGER,
  "socialRating"        INTEGER,
  
  -- Activity Details
  activities            TEXT[] DEFAULT ARRAY[]::TEXT[],
  "mealsEaten"          TEXT[] DEFAULT ARRAY[]::TEXT[],
  "bathroomBreaks"      INTEGER,
  "medicationGiven"     BOOLEAN NOT NULL DEFAULT false,
  "medicationNotes"     TEXT,
  
  -- Behavioral Notes
  "behaviorNotes"       TEXT,
  highlights            TEXT[] DEFAULT ARRAY[]::TEXT[],
  concerns              TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Photos
  "photoCount"          INTEGER NOT NULL DEFAULT 0,
  
  -- Delivery
  status                "ReportCardStatus" NOT NULL DEFAULT 'DRAFT',
  "sentAt"              TIMESTAMP(3),
  "sentViaEmail"        BOOLEAN NOT NULL DEFAULT false,
  "sentViaSMS"          BOOLEAN NOT NULL DEFAULT false,
  "emailDeliveredAt"    TIMESTAMP(3),
  "smsDeliveredAt"      TIMESTAMP(3),
  "viewedAt"            TIMESTAMP(3),
  "viewCount"           INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  "isTemplate"          BOOLEAN NOT NULL DEFAULT false,
  tags                  TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes                 TEXT,
  
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_report_cards_pet FOREIGN KEY ("petId") REFERENCES pets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_report_cards_customer FOREIGN KEY ("customerId") REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_report_cards_reservation FOREIGN KEY ("reservationId") REFERENCES reservations(id) ON DELETE SET NULL,
  CONSTRAINT fk_report_cards_staff FOREIGN KEY ("createdByStaffId") REFERENCES staff(id) ON DELETE RESTRICT
);

-- Create report_card_photos table
CREATE TABLE IF NOT EXISTS report_card_photos (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportCardId"        TEXT NOT NULL,
  
  -- Photo Details
  url                   TEXT NOT NULL,
  "thumbnailUrl"        TEXT,
  caption               TEXT,
  "order"               INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  "uploadedByStaffId"   TEXT,
  "fileSize"            INTEGER,
  width                 INTEGER,
  height                INTEGER,
  "mimeType"            TEXT,
  
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_report_card_photos_report_card FOREIGN KEY ("reportCardId") REFERENCES report_cards(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_card_photos_staff FOREIGN KEY ("uploadedByStaffId") REFERENCES staff(id) ON DELETE SET NULL
);

-- Create indexes for report_cards
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_report_cards_tenant_date ON report_cards("tenantId", "reportDate");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_report_cards_pet_date ON report_cards("petId", "reportDate");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_report_cards_customer_date ON report_cards("customerId", "reportDate");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_report_cards_reservation ON report_cards("reservationId");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_report_cards_status ON report_cards(status);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_report_cards_staff ON report_cards("createdByStaffId");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Create indexes for report_card_photos
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_report_card_photos_report_order ON report_card_photos("reportCardId", "order");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Add trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_report_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trigger_update_report_cards_updated_at
    BEFORE UPDATE ON report_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_report_cards_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add trigger to update photoCount when photos are added/removed
CREATE OR REPLACE FUNCTION update_report_card_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE report_cards 
    SET "photoCount" = "photoCount" + 1 
    WHERE id = NEW."reportCardId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE report_cards 
    SET "photoCount" = "photoCount" - 1 
    WHERE id = OLD."reportCardId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trigger_update_photo_count_insert
    AFTER INSERT ON report_card_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_report_card_photo_count();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_update_photo_count_delete
    AFTER DELETE ON report_card_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_report_card_photo_count();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add comments for documentation
COMMENT ON TABLE report_cards IS 'Pet report cards with photos and activity tracking';
COMMENT ON TABLE report_card_photos IS 'Photos attached to report cards';
COMMENT ON COLUMN report_cards."moodRating" IS 'Pet mood rating 1-5';
COMMENT ON COLUMN report_cards."energyRating" IS 'Pet energy level 1-5';
COMMENT ON COLUMN report_cards."appetiteRating" IS 'Pet appetite rating 1-5';
COMMENT ON COLUMN report_cards."socialRating" IS 'Pet social behavior rating 1-5';
COMMENT ON COLUMN report_cards."photoCount" IS 'Cached count of photos (updated by trigger)';
