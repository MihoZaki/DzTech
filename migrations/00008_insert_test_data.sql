-- -- +goose Up
-- -- +goose StatementBegin
-- -- Insert random products for each category
-- -- Placeholder images are used for all products

-- -- CPU Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '8c4cfda5-ecc8-4eef-a40d-cb5877351b77', 'Intel Core i9-13900K', 'intel-core-i9-13900k', 79999, 15, 'active', 'Intel', '["https://placehold.co/300x300?text=Intel+Core+i9-13900K"]', '{"cores": 24, "base_clock_ghz": 3.0, "boost_clock_ghz": 5.8}', NOW(), NOW()
-- );

-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '8c4cfda5-ecc8-4eef-a40d-cb5877351b77', 'AMD Ryzen 9 7950X', 'amd-ryzen-9-7950x', 69999, 20, 'active', 'AMD', '["https://placehold.co/300x300?text=AMD+Ryzen+9+7950X"]', '{"cores": 16, "base_clock_ghz": 4.5, "boost_clock_ghz": 5.7}', NOW(), NOW()
-- );

-- -- GPU Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '2d21b8db-9fc4-43c5-8acc-e150e85b2252', 'NVIDIA RTX 4090', 'nvidia-rtx-4090', 199999, 8, 'active', 'NVIDIA', '["https://placehold.co/300x300?text=NVIDIA+RTX+4090"]', '{"cores": 16384, "memory_gb": 24, "boost_clock_ghz": 2.5}', NOW(), NOW()
-- );

-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '2d21b8db-9fc4-43c5-8acc-e150e85b2252', 'AMD Radeon RX 7900 XTX', 'amd-radeon-rx-7900-xtx', 149999, 12, 'active', 'AMD', '["https://placehold.co/300x300?text=AMD+Radeon+RX+7900+XTX"]', '{"cores": 6144, "memory_gb": 24, "boost_clock_ghz": 2.3}', NOW(), NOW()
-- );

-- -- Motherboard Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'b2e74ef7-fb6e-479f-a6ad-8cb84b7d88f9', 'ASUS ROG Strix Z790-E', 'asus-rog-strix-z790-e', 39999, 12, 'active', 'ASUS', '["https://placehold.co/300x300?text=ASUS+ROG+Strix+Z790-E"]', '{"form_factor": "ATX", "memory_slots": 4, "max_memory_gb": 128}', NOW(), NOW()
-- );

-- -- RAM Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '316cab45-abe7-4370-bc31-28be8cc7b114', 'Corsair Vengeance RGB 32GB', 'corsair-vengeance-rgb-32gb', 14999, 20, 'active', 'Corsair', '["https://placehold.co/300x300?text=Corsair+Vengeance+RGB+32GB"]', '{"capacity_gb": 32, "speed_mhz": 3600, "type": "DDR4"}', NOW(), NOW()
-- );

-- -- Storage Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'c3c93459-a7ce-4f62-ac04-483d6b3ed87e', 'Samsung 980 Pro 1TB', 'samsung-980-pro-1tb', 12999, 18, 'active', 'Samsung', '["https://placehold.co/300x300?text=Samsung+980+Pro+1TB"]', '{"capacity_gb": 1000, "interface": "PCIe 4.0", "read_speed_mbps": 7000}', NOW(), NOW()
-- );

-- -- Power Supply Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'ee496395-3373-44e2-9063-1d3df4ce06fa', 'Corsair RM850x', 'corsair-rm850x', 17999, 10, 'active', 'Corsair', '["https://placehold.co/300x300?text=Corsair+RM850x"]', '{"wattage": 850, "efficiency": "80+ Gold", "modular": "Fully"}', NOW(), NOW()
-- );

-- -- Case Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '02f90259-a0e9-4e0a-b2ed-138a6f0cf02e', 'NZXT H5 Flow', 'nzxt-h5-flow', 9999, 14, 'active', 'NZXT', '["https://placehold.co/300x300?text=NZXT+H5+Flow"]', '{"form_factor": "ATX", "material": "Steel/Tempered Glass", "fans_included": 2}', NOW(), NOW()
-- );

-- -- Laptop Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), '8af9d2a7-50bf-41df-913e-3f3423bdfa30', 'MacBook Pro 14-inch', 'macbook-pro-14-inch', 249999, 5, 'active', 'Apple', '["https://placehold.co/300x300?text=MacBook+Pro+14-inch"]', '{"cpu": "M2 Pro", "ram_gb": 16, "storage_gb": 512, "display": "14.2-inch Liquid Retina XDR"}', NOW(), NOW()
-- );

-- -- Accessories Products
-- INSERT INTO products (
--     id, category_id, name, slug, price_cents, stock_quantity, status, brand, image_urls, spec_highlights, created_at, updated_at
-- ) VALUES (
--     gen_random_uuid(), 'cfb1f1da-166e-4d4a-a253-f4e1158dc957', 'Logitech MX Master 3S', 'logitech-mx-master-3s', 11999, 22, 'active', 'Logitech', '["https://placehold.co/300x300?text=Logitech+MX+Master+3S"]', '{"type": "Wireless Mouse", "dpi": 8000, "battery_life_days": 70}', NOW(), NOW()
-- );

-- -- +goose StatementEnd

-- -- +goose Down
-- -- +goose StatementBegin
-- DELETE FROM products WHERE slug IN (
--     'intel-core-i9-13900k',
--     'amd-ryzen-9-7950x',
--     'nvidia-rtx-4090',
--     'amd-radeon-rx-7900-xtx',
--     'asus-rog-strix-z790-e',
--     'corsair-vengeance-rgb-32gb',
--     'samsung-980-pro-1tb',
--     'corsair-rm850x',
--     'nzxt-h5-flow',
--     'macbook-pro-14-inch',
--     'logitech-mx-master-3s'
-- );
-- -- +goose StatementEnd
