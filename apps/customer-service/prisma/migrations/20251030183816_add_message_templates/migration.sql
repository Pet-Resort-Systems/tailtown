-- Add Message Templates Migration
-- Safe migration that won't delete existing data

-- Create message_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'dev',
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- SMS, EMAIL
  category TEXT NOT NULL, -- APPOINTMENT_REMINDER, MARKETING, CONFIRMATION, FOLLOW_UP, PROMOTIONAL
  subject TEXT, -- For email only
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS message_templates_tenant_active_idx ON message_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS message_templates_type_idx ON message_templates(type);
CREATE INDEX IF NOT EXISTS message_templates_category_idx ON message_templates(category);

-- Insert starter templates (only if they don't exist)
INSERT INTO message_templates (id, tenant_id, name, type, category, body, variables, is_active)
VALUES
  (
    'template-appt-reminder-24h',
    'dev',
    'Appointment Reminder - 24 Hours',
    'SMS',
    'APPOINTMENT_REMINDER',
    'Hi {{customerName}}! This is a reminder that {{petName}} has an appointment tomorrow at {{appointmentTime}}. Reply YES to confirm or call us at {{businessPhone}}.',
    ARRAY['customerName', 'petName', 'appointmentTime', 'businessPhone'],
    true
  ),
  (
    'template-appt-confirmation',
    'dev',
    'Appointment Confirmation',
    'EMAIL',
    'CONFIRMATION',
    E'Dear {{customerName}},\n\nYour appointment has been confirmed!\n\nPet: {{petName}}\nService: {{serviceName}}\nDate: {{appointmentDate}}\nTime: {{appointmentTime}}\nLocation: {{businessAddress}}\n\nIf you need to reschedule, please call us at {{businessPhone}} or reply to this email.\n\nThank you for choosing {{businessName}}!',
    ARRAY['customerName', 'petName', 'serviceName', 'appointmentDate', 'appointmentTime', 'businessAddress', 'businessPhone', 'businessName'],
    true
  ),
  (
    'template-checkin-reminder',
    'dev',
    'Check-In Reminder',
    'SMS',
    'APPOINTMENT_REMINDER',
    'Hi {{customerName}}! {{petName}} is scheduled for check-in today at {{checkInTime}}. See you soon! - {{businessName}}',
    ARRAY['customerName', 'petName', 'checkInTime', 'businessName'],
    true
  ),
  (
    'template-monthly-special',
    'dev',
    'Monthly Special Offer',
    'EMAIL',
    'PROMOTIONAL',
    E'Hi {{customerName}},\n\nWe have a special offer just for {{petName}}!\n\n{{offerDetails}}\n\nThis offer is valid until {{expirationDate}}.\n\nBook now by calling {{businessPhone}} or visiting our website.\n\nBest regards,\n{{businessName}}',
    ARRAY['customerName', 'petName', 'offerDetails', 'expirationDate', 'businessPhone', 'businessName'],
    true
  ),
  (
    'template-birthday-greeting',
    'dev',
    'Birthday Greeting',
    'EMAIL',
    'MARKETING',
    E'Dear {{customerName}},\n\nHappy Birthday to {{petName}}! 🎉🎂\n\nWe hope {{petName}} has a wonderful day filled with treats and belly rubs!\n\nAs a birthday gift, enjoy {{birthdayOffer}} on your next visit.\n\nCelebrate with us!\n{{businessName}}',
    ARRAY['customerName', 'petName', 'birthdayOffer', 'businessName'],
    true
  ),
  (
    'template-checkout-ready',
    'dev',
    'Check-Out Ready',
    'SMS',
    'CONFIRMATION',
    'Hi {{customerName}}! {{petName}} is ready for pickup. We had a great time! Please come by when convenient. - {{businessName}}',
    ARRAY['customerName', 'petName', 'businessName'],
    true
  ),
  (
    'template-followup-visit',
    'dev',
    'Follow-Up After Visit',
    'EMAIL',
    'FOLLOW_UP',
    E'Hi {{customerName}},\n\nWe hope {{petName}} enjoyed their recent visit with us!\n\nWe''d love to hear about your experience. Your feedback helps us provide the best care possible.\n\n[Leave a Review Button]\n\nThank you for trusting us with {{petName}}''s care.\n\nWarm regards,\n{{businessName}}',
    ARRAY['customerName', 'petName', 'businessName'],
    true
  ),
  (
    'template-vaccination-reminder',
    'dev',
    'Vaccination Reminder',
    'EMAIL',
    'APPOINTMENT_REMINDER',
    E'Dear {{customerName}},\n\nThis is a friendly reminder that {{petName}}''s {{vaccinationType}} vaccination is due on {{dueDate}}.\n\nKeeping vaccinations up to date is important for {{petName}}''s health and safety.\n\nPlease call us at {{businessPhone}} to schedule an appointment.\n\nThank you,\n{{businessName}}',
    ARRAY['customerName', 'petName', 'vaccinationType', 'dueDate', 'businessPhone', 'businessName'],
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Add subject field to email templates
UPDATE message_templates 
SET subject = 'Appointment Confirmed - ' || '{{petName}}'
WHERE id = 'template-appt-confirmation' AND subject IS NULL;

UPDATE message_templates 
SET subject = '🎉 Special Offer for ' || '{{petName}}' || '!'
WHERE id = 'template-monthly-special' AND subject IS NULL;

UPDATE message_templates 
SET subject = '🎂 Happy Birthday ' || '{{petName}}' || '!'
WHERE id = 'template-birthday-greeting' AND subject IS NULL;

UPDATE message_templates 
SET subject = 'How was ' || '{{petName}}' || '''s visit?'
WHERE id = 'template-followup-visit' AND subject IS NULL;

UPDATE message_templates 
SET subject = 'Vaccination Reminder for ' || '{{petName}}'
WHERE id = 'template-vaccination-reminder' AND subject IS NULL;
