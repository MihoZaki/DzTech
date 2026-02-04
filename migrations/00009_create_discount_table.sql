-- +goose Up
-- Create discounts table
CREATE TABLE discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value BIGINT NOT NULL CHECK (discount_value >= 0),
    min_order_value_cents BIGINT DEFAULT 0 CHECK (min_order_value_cents >= 0),
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create product_discounts table
CREATE TABLE product_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, discount_id)
);

-- Create category_discounts table
CREATE TABLE category_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category_id, discount_id)
);

-- Indexes for discounts table
CREATE INDEX idx_discounts_code ON discounts(code);
CREATE INDEX idx_discounts_is_active ON discounts(is_active);
CREATE INDEX idx_discounts_valid_from ON discounts(valid_from);
CREATE INDEX idx_discounts_valid_until ON discounts(valid_until);
CREATE INDEX idx_discounts_active_period ON discounts(is_active, valid_from, valid_until);

-- Indexes for product_discounts table
CREATE INDEX idx_product_discounts_product_id ON product_discounts(product_id);
CREATE INDEX idx_product_discounts_discount_id ON product_discounts(discount_id);

-- Indexes for category_discounts table
CREATE INDEX idx_category_discounts_category_id ON category_discounts(category_id);
CREATE INDEX idx_category_discounts_discount_id ON category_discounts(discount_id);
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS discounts;
-- +goose StatementEnd
