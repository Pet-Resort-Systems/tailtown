-- Migration: Add comprehensive pet compatibility tracking system
-- Created: 2025-12-15
-- Purpose: Capture playgroup sizes, health requirements, behavioral traits, and special handling from Gingr

-- Add new enum for playgroup compatibility
CREATE TYPE "PlaygroupCompatibility" AS ENUM (
  'LARGE_DOG',
  'MEDIUM_DOG', 
  'SMALL_DOG',
  'NON_COMPATIBLE',
  'SENIOR_STAFF_REQUIRED',
  'UNKNOWN'
);

-- Add new enum for special requirements
CREATE TYPE "SpecialRequirement" AS ENUM (
  -- Health
  'HAS_MEDICATION',
  'MEDICAL_MONITORING',
  'ALLERGIES',
  'HEAT_SENSITIVE',
  'NO_POOL',
  'NO_LEASH_ON_NECK',
  'BLIND',
  'DEAF',
  'SPECIAL_NEEDS',
  'SEIZURE_WATCH',
  'HEART_ISSUE',
  'CONTROLLED_SUBSTANCE',
  'NEEDS_EXTRA_BEDDING',
  
  -- Behavior
  'SEPARATE_FEEDING',
  'POOP_EATER',
  'STRONG_PULLER',
  'CHEWER',
  'NO_BEDDING',
  'EXCESSIVE_MOUNTER',
  'LOVES_POOL',
  'RUNNER',
  'NO_COT',
  'EXCESSIVE_DRINKER',
  
  -- Aggression
  'TOY_AGGRESSIVE',
  'LEASH_AGGRESSIVE',
  'BITER',
  'USE_CAUTION',
  'FENCE_FIGHTER',
  'ROOM_AGGRESSIVE',
  'MALE_AGGRESSIVE',
  'GENERAL_AGGRESSION',
  
  -- Grooming
  'PREFERRED_GROOMER',
  'GROOMING_NOTES',
  'SENSITIVE_SKIN',
  
  -- Customer Info
  'PERMANENT_RUN_CARD',
  'SENIOR_DISCOUNT',
  'DO_NOT_BOOK'
);

-- Add compatibility fields to pets table
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "playgroupCompatibility" "PlaygroupCompatibility";
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "specialRequirements" "SpecialRequirement"[] DEFAULT '{}';
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "compatibilityNotes" TEXT;
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "healthFlags" JSONB DEFAULT '[]';
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "behaviorFlags" JSONB DEFAULT '[]';
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "aggressionFlags" JSONB DEFAULT '[]';
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "groomingPreferences" JSONB DEFAULT '{}';
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "staffRequirements" JSONB DEFAULT '{}';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "pets_playgroup_compatibility_idx" ON "pets"("playgroupCompatibility");
CREATE INDEX IF NOT EXISTS "pets_special_requirements_idx" ON "pets" USING GIN("specialRequirements");
CREATE INDEX IF NOT EXISTS "pets_health_flags_idx" ON "pets" USING GIN("healthFlags");
CREATE INDEX IF NOT EXISTS "pets_behavior_flags_idx" ON "pets" USING GIN("behaviorFlags");

-- Add comment explaining the JSONB structure
COMMENT ON COLUMN "pets"."healthFlags" IS 'Array of health flag objects: [{icon, color, title, content, category}]';
COMMENT ON COLUMN "pets"."behaviorFlags" IS 'Array of behavior flag objects: [{icon, color, title, content, category}]';
COMMENT ON COLUMN "pets"."aggressionFlags" IS 'Array of aggression flag objects: [{icon, color, title, content, category}]';
COMMENT ON COLUMN "pets"."groomingPreferences" IS 'Grooming preferences object: {preferredGroomer, notes, sensitiveSkin}';
COMMENT ON COLUMN "pets"."staffRequirements" IS 'Staff requirements object: {seniorStaffRequired, specialHandling, notes}';
