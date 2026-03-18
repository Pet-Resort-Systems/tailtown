-- Retail POS System Migration
-- Adds product catalog, inventory management, and package deals

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PRODUCT CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT product_category_unique UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_active 
  ON product_categories(tenant_id, is_active);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  
  -- Basic Info
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id TEXT,
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  taxable BOOLEAN NOT NULL DEFAULT true,
  
  -- Inventory
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  current_stock INTEGER NOT NULL DEFAULT 0,
  low_stock_alert INTEGER,
  reorder_point INTEGER,
  reorder_quantity INTEGER,
  
  -- Product Type
  is_service BOOLEAN NOT NULL DEFAULT false,
  is_package BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  image_url TEXT,
  barcode VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT product_sku_unique UNIQUE (tenant_id, sku),
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_active ON products(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(current_stock);

-- ============================================
-- PACKAGE ITEMS (Bundle/Package Deals)
-- ============================================

CREATE TABLE IF NOT EXISTS package_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  package_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT package_item_unique UNIQUE (package_id, product_id),
  CONSTRAINT fk_package_item_package FOREIGN KEY (package_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_package_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- INVENTORY LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  product_id TEXT NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  reference VARCHAR(255),
  performed_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_inventory_log_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_tenant_product ON inventory_logs(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(created_at);

-- ============================================
-- DEFAULT CATEGORIES
-- ============================================

INSERT INTO product_categories (tenant_id, name, description, display_order)
VALUES 
  ('dev', 'Food & Treats', 'Pet food, treats, and nutritional supplements', 1),
  ('dev', 'Toys', 'Pet toys and entertainment products', 2),
  ('dev', 'Grooming Supplies', 'Shampoos, brushes, and grooming tools', 3),
  ('dev', 'Accessories', 'Collars, leashes, beds, and other accessories', 4),
  ('dev', 'Health & Wellness', 'Medications, supplements, and health products', 5),
  ('dev', 'Services', 'Service-based products (grooming, training, etc.)', 6)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE product_categories IS 'Product categories for organizing retail items';
COMMENT ON TABLE products IS 'Retail products and services catalog';
COMMENT ON TABLE package_items IS 'Package/bundle deal contents';
COMMENT ON TABLE inventory_logs IS 'Inventory change tracking and audit log';

COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - unique product identifier';
COMMENT ON COLUMN products.track_inventory IS 'Whether to track inventory levels for this product';
COMMENT ON COLUMN products.is_service IS 'True for services (no physical inventory)';
COMMENT ON COLUMN products.is_package IS 'True for bundle/package deals';
COMMENT ON COLUMN inventory_logs.change_type IS 'PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE, RESTOCK';
