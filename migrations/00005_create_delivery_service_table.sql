-- +goose Up
-- Create the 'delivery_services' table
CREATE TABLE delivery_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- Unique name for the service
    description TEXT, -- Optional description
    base_cost_cents BIGINT NOT NULL DEFAULT 0, -- Base cost in cents
    estimated_days INTEGER, -- Estimated delivery time in days (optional)
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Whether the service is currently offered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delivery_services_is_active ON delivery_services(is_active); -- Index for filtering active services

-- +goose StatementBegin
COMMENT ON TABLE delivery_services IS 'Stores available delivery service options.';
COMMENT ON COLUMN delivery_services.name IS 'Unique name identifying the delivery service.';
COMMENT ON COLUMN delivery_services.description IS 'Optional description of the delivery service.';
COMMENT ON COLUMN delivery_services.base_cost_cents IS 'Base cost of the delivery service in cents.';
COMMENT ON COLUMN delivery_services.estimated_days IS 'Estimated number of days for delivery.';
COMMENT ON COLUMN delivery_services.is_active IS 'Indicates if the delivery service is currently offered.';
-- +goose StatementEnd

-- +goose Down
DROP TABLE IF EXISTS delivery_services;
