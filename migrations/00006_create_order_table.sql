-- +goose Up
-- Create the 'orders' table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
    user_full_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')), -- Enum-like constraint
    total_amount_cents BIGINT NOT NULL DEFAULT 0, -- Total amount in cents
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery', -- Fixed for COD system
    -- payment_status VARCHAR(20) DEFAULT 'pending', -- Could add if needed later
    province VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL, 
    phone_number_1 VARCHAR(255) NOT NULL,
    phone_number_2 VARCHAR(255),
    notes TEXT, -- Optional notes
    delivery_service_id UUID NOT NULL REFERENCES delivery_services(id), -- Link to delivery_services table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE, -- When status becomes 'delivered' or 'cancelled' (was nullable)
    cancelled_at TIMESTAMP WITH TIME ZONE  -- When status is explicitly set to 'cancelled' (nullable)
);
 
-- Create the 'order_items' table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- Link to orders table
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- Link to products table, prevent deletion if ordered
    product_name VARCHAR(255) NOT NULL, -- Denormalized product name for historical accuracy
    price_cents BIGINT NOT NULL, -- Price at time of order
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0), -- Quantity ordered
    subtotal_cents BIGINT GENERATED ALWAYS AS (price_cents * quantity) STORED, -- Computed subtotal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_delivery_service_id ON orders(delivery_service_id); -- Add index for delivery service

-- +goose Down
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
