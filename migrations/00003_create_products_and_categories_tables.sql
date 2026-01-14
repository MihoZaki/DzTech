-- +goose Up
-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'component', 'laptop', 'accessory'
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(255),
    price_cents BIGINT NOT NULL CHECK (price_cents >= 0), -- e.g., $199.99 → 19999
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'discontinued')),
    brand VARCHAR(100) NOT NULL,
    image_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
    spec_highlights JSONB NOT NULL DEFAULT '{}'::JSONB, -- { "cores": 16, "base_clock_ghz": 4.5 }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_category_created ON products(category_id, created_at);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(short_description, ''))
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_price ON products(price_cents);
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- Insert default categories
INSERT INTO categories (name, slug, type) VALUES
('CPU', 'cpu', 'component'),
('GPU', 'gpu', 'component'),
('Motherboard', 'motherboard', 'component'),
('RAM', 'ram', 'component'),
('Storage', 'storage', 'component'),
('Power Supply', 'psu', 'component'),
('Case', 'case', 'component'),
('Laptop', 'laptop', 'laptop'),
('Accessories', 'accessories', 'accessory');

-- +goose Down
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
