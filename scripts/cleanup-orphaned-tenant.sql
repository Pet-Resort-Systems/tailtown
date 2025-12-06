-- Cleanup script for orphaned 'tailtown' tenant data
-- This tenant has 11,843 customers but no pets or reservations
-- The real production tenant is UUID: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05

-- First, verify what we're about to delete
SELECT 'BEFORE CLEANUP' as status;
SELECT 'customers' as table_name, COUNT(*) as count FROM customers WHERE "tenantId" = 'tailtown'
UNION ALL
SELECT 'pets', COUNT(*) FROM pets WHERE "tenantId" = 'tailtown'
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations WHERE "tenantId" = 'tailtown'
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE "tenantId" = 'tailtown';

-- Check for any related data that might have foreign key constraints
SELECT 'invoice_line_items' as table_name, COUNT(*) as count 
FROM invoice_line_items ili 
JOIN invoices i ON ili."invoiceId" = i.id 
WHERE i."tenantId" = 'tailtown';

-- BEGIN CLEANUP (uncomment to execute)
-- Delete in order to respect foreign key constraints

-- 1. Delete invoice line items first
-- DELETE FROM invoice_line_items WHERE "invoiceId" IN (SELECT id FROM invoices WHERE "tenantId" = 'tailtown');

-- 2. Delete invoices
-- DELETE FROM invoices WHERE "tenantId" = 'tailtown';

-- 3. Delete reservation-related data
-- DELETE FROM reservation_pets WHERE "reservationId" IN (SELECT id FROM reservations WHERE "tenantId" = 'tailtown');
-- DELETE FROM reservations WHERE "tenantId" = 'tailtown';

-- 4. Delete pets
-- DELETE FROM pets WHERE "tenantId" = 'tailtown';

-- 5. Delete customers
-- DELETE FROM customers WHERE "tenantId" = 'tailtown';

-- Verify cleanup
-- SELECT 'AFTER CLEANUP' as status;
-- SELECT 'customers' as table_name, COUNT(*) as count FROM customers WHERE "tenantId" = 'tailtown'
-- UNION ALL
-- SELECT 'pets', COUNT(*) FROM pets WHERE "tenantId" = 'tailtown'
-- UNION ALL
-- SELECT 'reservations', COUNT(*) FROM reservations WHERE "tenantId" = 'tailtown';
