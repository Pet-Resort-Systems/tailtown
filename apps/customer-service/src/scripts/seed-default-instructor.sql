-- Seed Default Instructor for Training Classes
-- This creates a default instructor that can be used for training class assignments

INSERT INTO staff (
  id, 
  "tenantId", 
  "firstName", 
  "lastName", 
  email, 
  password, 
  role, 
  "isActive", 
  specialties, 
  "createdAt", 
  "updatedAt"
) VALUES (
  'default-instructor', 
  'dev', 
  'Default', 
  'Instructor', 
  'instructor@tailtown.com', 
  'password123', 
  'Instructor', 
  true, 
  ARRAY['TRAINING']::text[], 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify the instructor was created
SELECT id, "firstName", "lastName", email, specialties, "isActive"
FROM staff 
WHERE id = 'default-instructor';
