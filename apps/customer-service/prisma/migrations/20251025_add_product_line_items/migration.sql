-- Add Product Support to Invoice Line Items
-- Allows invoices to include retail products alongside services

-- Create enum for line item types
CREATE TYPE "InvoiceLineItemType" AS ENUM ('SERVICE', 'ADD_ON', 'PRODUCT');

-- Add new columns to invoice_line_items
ALTER TABLE "invoice_line_items" 
  ADD COLUMN "type" "InvoiceLineItemType" NOT NULL DEFAULT 'SERVICE',
  ADD COLUMN "serviceId" TEXT,
  ADD COLUMN "productId" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "invoice_line_items"."type" IS 'Type of line item: SERVICE, ADD_ON, or PRODUCT';
COMMENT ON COLUMN "invoice_line_items"."serviceId" IS 'Reference to service if type is SERVICE or ADD_ON';
COMMENT ON COLUMN "invoice_line_items"."productId" IS 'Reference to product if type is PRODUCT';
