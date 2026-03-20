-- Advanced Scheduling Features Migration
-- Adds support for groomer-specific scheduling and multi-week training classes

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GROOMER-SPECIFIC SCHEDULING
-- ============================================

-- Add grooming-specific fields to Staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS grooming_skills JSONB,
ADD COLUMN IF NOT EXISTS max_appointments_per_day INTEGER,
ADD COLUMN IF NOT EXISTS average_service_time INTEGER;

-- Groomer Appointments
CREATE TABLE IF NOT EXISTS groomer_appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  reservation_id TEXT NOT NULL,
  groomer_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  scheduled_time VARCHAR(10) NOT NULL,
  duration INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_groomer_appointment_groomer FOREIGN KEY (groomer_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT fk_groomer_appointment_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_groomer_appointment_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  CONSTRAINT fk_groomer_appointment_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_groomer_appointments_groomer_date ON groomer_appointments(groomer_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_groomer_appointments_tenant_groomer_status ON groomer_appointments(tenant_id, groomer_id, status);
CREATE INDEX IF NOT EXISTS idx_groomer_appointments_reservation ON groomer_appointments(reservation_id);

-- Groomer Preferences
CREATE TABLE IF NOT EXISTS groomer_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  customer_id TEXT NOT NULL,
  groomer_id TEXT NOT NULL,
  pet_id TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_groomer_preference_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_groomer_preference_groomer FOREIGN KEY (groomer_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT fk_groomer_preference_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  CONSTRAINT uq_groomer_preference UNIQUE (tenant_id, customer_id, groomer_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_groomer_preferences_customer ON groomer_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_groomer_preferences_groomer ON groomer_preferences(groomer_id);

-- Groomer Breaks
CREATE TABLE IF NOT EXISTS groomer_breaks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  groomer_id TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  type VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_groomer_break_groomer FOREIGN KEY (groomer_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_groomer_breaks_groomer_date ON groomer_breaks(groomer_id, date);

-- ============================================
-- MULTI-WEEK TRAINING CLASSES
-- ============================================

-- Training Classes
CREATE TABLE IF NOT EXISTS training_classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  instructor_id TEXT NOT NULL,
  max_capacity INTEGER NOT NULL,
  current_enrolled INTEGER NOT NULL DEFAULT 0,
  
  -- Schedule
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  total_weeks INTEGER NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  duration INTEGER NOT NULL,
  
  -- Pricing
  price_per_series DECIMAL(10,2) NOT NULL,
  price_per_session DECIMAL(10,2),
  deposit_required DECIMAL(10,2),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Requirements
  min_age INTEGER,
  max_age INTEGER,
  prerequisites TEXT[],
  
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_training_class_instructor FOREIGN KEY (instructor_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_classes_tenant_status ON training_classes(tenant_id, status, is_active);
CREATE INDEX IF NOT EXISTS idx_training_classes_dates ON training_classes(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_training_classes_instructor ON training_classes(instructor_id);

-- Class Sessions
CREATE TABLE IF NOT EXISTS class_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  class_id TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  scheduled_time VARCHAR(10) NOT NULL,
  duration INTEGER NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  
  -- Content
  topic VARCHAR(255),
  objectives TEXT[],
  materials TEXT[],
  homework TEXT,
  
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_class_session_class FOREIGN KEY (class_id) REFERENCES training_classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_class_number ON class_sessions(class_id, session_number);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date_status ON class_sessions(scheduled_date, status);

-- Class Enrollments
CREATE TABLE IF NOT EXISTS class_enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  class_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  
  -- Enrollment
  enrollment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'ENROLLED',
  
  -- Payment
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_due DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  
  -- Progress
  sessions_attended INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL,
  completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Certificate
  certificate_issued BOOLEAN NOT NULL DEFAULT false,
  certificate_date TIMESTAMP,
  
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_class_enrollment_class FOREIGN KEY (class_id) REFERENCES training_classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_enrollment_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_enrollment_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT uq_class_enrollment UNIQUE (class_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_tenant_status ON class_enrollments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_customer ON class_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_pet ON class_enrollments(pet_id);

-- Session Attendance
CREATE TABLE IF NOT EXISTS session_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  session_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  
  -- Attendance
  status VARCHAR(50) NOT NULL,
  arrival_time TIMESTAMP,
  departure_time TIMESTAMP,
  
  -- Performance
  participation_level VARCHAR(50),
  behavior_rating INTEGER,
  progress_notes TEXT,
  
  -- Homework
  homework_completed BOOLEAN NOT NULL DEFAULT false,
  homework_notes TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_session_attendance_session FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_attendance_enrollment FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_attendance_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  CONSTRAINT uq_session_attendance UNIQUE (session_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_session_attendance_session_status ON session_attendance(session_id, status);
CREATE INDEX IF NOT EXISTS idx_session_attendance_enrollment ON session_attendance(enrollment_id);

-- Class Waitlist
CREATE TABLE IF NOT EXISTS class_waitlist (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  class_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_date TIMESTAMP NOT NULL DEFAULT NOW(),
  notified BOOLEAN NOT NULL DEFAULT false,
  notified_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
  
  CONSTRAINT fk_class_waitlist_class FOREIGN KEY (class_id) REFERENCES training_classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_waitlist_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_waitlist_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT uq_class_waitlist UNIQUE (class_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_class_waitlist_class_position ON class_waitlist(class_id, position);
CREATE INDEX IF NOT EXISTS idx_class_waitlist_customer ON class_waitlist(customer_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE groomer_appointments IS 'Tracks individual grooming appointments assigned to specific groomers';
COMMENT ON TABLE groomer_preferences IS 'Stores customer preferences for specific groomers';
COMMENT ON TABLE groomer_breaks IS 'Manages groomer break times and unavailability';
COMMENT ON TABLE training_classes IS 'Multi-week training class series';
COMMENT ON TABLE class_sessions IS 'Individual sessions within a training class series';
COMMENT ON TABLE class_enrollments IS 'Pet enrollments in training classes';
COMMENT ON TABLE session_attendance IS 'Attendance records for each class session';
COMMENT ON TABLE class_waitlist IS 'Waitlist for full training classes';
