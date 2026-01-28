-- name: GetDeliveryServiceByID :one
-- Retrieves a delivery service by its ID, regardless of its active status.
-- Suitable for admin operations.
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE id = sqlc.arg(id);

-- name: GetActiveDeliveryServices :many
-- Retrieves all delivery services that are currently active.
-- Suitable for user-facing contexts like checkout.
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE is_active = TRUE
ORDER BY name ASC;

-- name: ListAllDeliveryServices :many
-- Retrieves delivery services, optionally filtered by active status.
-- Suitable for admin operations.
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE is_active = sqlc.arg(active_filter) -- Filter by active status
ORDER BY name ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateDeliveryService :one
INSERT INTO delivery_services (
    name, description, base_cost_cents, estimated_days, is_active
) VALUES (
    sqlc.arg(name), sqlc.arg(description), sqlc.arg(base_cost_cents), sqlc.arg(estimated_days), sqlc.arg(is_active)
)
RETURNING id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at;

-- name: GetDeliveryService :one
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE id = sqlc.arg(id) AND is_active = sqlc.arg(active_filter); -- Allow filtering by active status

-- name: GetDeliveryServiceByName :one
SELECT id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at
FROM delivery_services
WHERE name = sqlc.arg(name) AND is_active = sqlc.arg(active_filter); -- Allow filtering by active status

-- name: UpdateDeliveryService :one
UPDATE delivery_services
SET
    name = COALESCE(sqlc.narg(name), name),
    description = COALESCE(sqlc.narg(description), description),
    base_cost_cents = COALESCE(sqlc.narg(base_cost_cents), base_cost_cents),
    estimated_days = COALESCE(sqlc.narg(estimated_days), estimated_days),
    is_active = COALESCE(sqlc.narg(is_active), is_active),
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING id, name, description, base_cost_cents, estimated_days, is_active, created_at, updated_at;

-- name: DeleteDeliveryService :exec
-- Soft delete could be achieved by updating is_active to FALSE
-- For hard delete:
DELETE FROM delivery_services WHERE id = sqlc.arg(id);
