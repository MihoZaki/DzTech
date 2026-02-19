-- +goose Up
-- Insert the initial admin user only if it doesn't exist
INSERT INTO users (email, password_hash, full_name, is_admin)
SELECT 'admin@example.com', -- Replace with your desired admin email
       '$2a$10$ex6VtC5ZoHSmJHZbwun/4.MsKJ2OW0Ji2DIwqzOYK2SYGhB1Ku3nK', -- Replace with the actual bcrypt hash
       'Admin User', -- Replace with the desired admin full name
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@example.com' -- Match on email or another unique field
);

-- +goose Down
-- Optionally, remove the admin user when rolling back this specific migration
DELETE FROM users WHERE email = 'admin@example.com' AND is_admin = TRUE;
