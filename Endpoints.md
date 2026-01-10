# 🛠️ Tech Store API

**Backend for PC Parts, Laptops & Custom Build E-Commerce**\
_Version: 1.0 (MVP)_

> ✅ **Status**: Ready for frontend integration\
> 🚀 **Stack**: Go (Chi), PostgreSQL, JWT\
> 📅 **Last Updated**: Jan 7, 2026

---

## 🔐 Authentication

- **Anonymous access**: Allowed for `GET /products`, `GET /products/:id`,
  `GET /builds/:id` (public), etc.
- **User auth**: Bearer JWT via `Authorization: Bearer <token>`
- **Admin auth**: Same token; `is_admin: true` in JWT claims

### Token Flow

```http
POST /auth/login
→ 200 { "token": "xxx", "user": { "id": "uuid", "email": "...", "is_admin": false } }

POST /auth/register
→ 201 { "token": "xxx", "user": { ... } }
```

> 💡 Tokens are **short-lived (15m)** + **refresh tokens (7d, HTTP-only
> cookie)**.\
> Admin-only endpoints enforce `user.is_admin == true`.

---

## 📦 Product Discovery

| Method | Endpoint        | Description                           | Auth         | Rate Limit  |
| ------ | --------------- | ------------------------------------- | ------------ | ----------- |
| `GET`  | `/products`     | List products (paginated, filtered)   | ✅ Anonymous | 100 req/min |
| `GET`  | `/products/:id` | Get product details + specs + reviews | ✅ Anonymous | 200 req/min |
| `GET`  | `/categories`   | List all categories (tree-ready)      | ✅ Anonymous | —           |
| `GET`  | `/search`       | Full-text search + spec filters       | ✅ Anonymous | 60 req/min  |

### Query Params (`/products`)

```ts
{
  category?: string;    // slug (e.g., "gpu")
  brand?: string[];
  price_min?: number;   // in cents
  price_max?: number;
  in_stock?: boolean;
  spec?: Record<string, string>; // e.g., { "cpu_socket": "AM5", "cores": "8" }
  page?: number;        // default: 1
  per_page?: number;    // max: 50
}
```

### Response (`/products/:id`)

```json
{
  "id": "uuid",
  "name": "AMD Ryzen 7 7800X3D",
  "price_cents": 44900,
  "stock_quantity": 23,
  "brand": "AMD",
  "image_urls": ["https://..."],
  "specs": {
    "cpu_socket": "AM5",
    "cores": 8,
    "base_clock_ghz": 4.2,
    "tdp_watts": 120
  },
  "reviews": [
    {
      "rating": 5,
      "title": "Gaming Beast",
      "comment": "...",
      "is_verified_purchase": true,
      "created_at": "2026-01-01T12:00:00Z"
    }
  ],
  "compatibility_notes": "Requires AM5 motherboard. BIOS update may be needed for early B650 boards."
}
```

---

## 🛒 Cart & Checkout

| Method   | Endpoint             | Description                  | Auth         |
| -------- | -------------------- | ---------------------------- | ------------ |
| `GET`    | `/cart`              | Get current user’s cart      | ✅ User      |
| `POST`   | `/cart/items`        | Add item to cart             | ✅ User      |
| `PATCH`  | `/cart/items/:id`    | Update item qty              | ✅ User      |
| `DELETE` | `/cart/items/:id`    | Remove item                  | ✅ User      |
| `GET`    | `/delivery-services` | List active delivery options | ✅ Anonymous |
| `POST`   | `/checkout`          | Create order (final step)    | ✅ User      |

### `POST /cart/items`

```json
{ "product_id": "uuid", "quantity": 1 }
→ 201 { "cart_item": { "id": "...", "quantity": 1, "price_at_add_cents": 44900 } }
```

> ⚠️ **Cart sync**: Frontend merges localStorage cart on login via
> `PATCH /cart/merge` _(V2)_

### `POST /checkout`

```json
{
  "delivery_service_id": "uuid",
  "delivery_address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US"
  },
  "build_id": "uuid?"   // Optional: if ordering a saved build
}
→ 201 { "order": { "id": "...", "status": "pending", "total_cents": 125000 } }
→ 303 See Other → `Location: /checkout/stripe?session_id=cs_xxx`
```

> 🔁 **Idempotency**: Clients must send `Idempotency-Key: <uuid>` header for
> `POST /checkout`.

---

## ✍️ Reviews

| Method   | Endpoint                     | Description           | Auth                       |
| -------- | ---------------------------- | --------------------- | -------------------------- |
| `GET`    | `/products/:id/reviews`      | List approved reviews | ✅ Anonymous               |
| `POST`   | `/products/:id/reviews`      | Submit review         | ✅ User (must own product) |
| `PATCH`  | `/reviews/:id`               | Update review (user)  | ✅ Owner                   |
| `PATCH`  | `/admin/reviews/:id/approve` | Approve review        | ✅ Admin                   |
| `DELETE` | `/admin/reviews/:id`         | Delete review         | ✅ Admin                   |

### `POST /products/:id/reviews`

```json
{ "rating": 5, "title": "Fast & Cool", "comment": "Amazing for gaming..." }
→ 201 { "review": { "id": "...", "approved_at": null } } // pending
```

> ✅ **Verified purchase**: Backend auto-sets `is_verified_purchase = true` if
> user has order with this product.

---

## 🖥️ Custom Builds (MVP Core)

| Method  | Endpoint                 | Description                            | Auth                             |
| ------- | ------------------------ | -------------------------------------- | -------------------------------- |
| `POST`  | `/builds`                | Create new build                       | ✅ User / Anonymous*             |
| `GET`   | `/builds/:id`            | Get build (public or owned)            | ✅ Anonymous (if public) / Owner |
| `PATCH` | `/builds/:id`            | Update build name/description          | ✅ Owner                         |
| `PUT`   | `/builds/:id/components` | Set component in slot                  | ✅ Owner                         |
| `GET`   | `/builds/:id/validate`   | Check compatibility                    | ✅ Owner / Anonymous (if public) |
| `GET`   | `/user/builds`           | List user’s saved builds               | ✅ User                          |
| `POST`  | `/builds/:id/share`      | Make build public + get shareable link | ✅ Owner                         |

> \* Anonymous builds are stored in DB with `user_id = NULL` and
> `is_public = false`; saved via localStorage link token.

### `PUT /builds/:id/components`

```json
{ "slot": "cpu", "product_id": "uuid" }
→ 200 { "build": { "id": "...", "components": { "cpu": { ... }, "motherboard": null, ... } } }
```

### `GET /builds/:id/validate`

```json
→ 200 {
  "is_valid": false,
  "errors": [
    {
      "slot_a": "cpu",
      "slot_b": "motherboard",
      "rule": "CPU-MB Socket Match",
      "message": "CPU socket (AM5) ≠ Motherboard socket (AM4)"
    }
  ]
}
```

> 🧠 **Validation is real-time** — called after each component change in
> frontend.

---

## 📦 Orders & History

| Method | Endpoint              | Description           | Auth     |
| ------ | --------------------- | --------------------- | -------- |
| `GET`  | `/orders`             | List user’s orders    | ✅ User  |
| `GET`  | `/orders/:id`         | Get order details     | ✅ Owner |
| `POST` | `/orders/:id/reorder` | Add all items to cart | ✅ Owner |

### Response (`/orders/:id`)

```json
{
  "id": "uuid",
  "status": "shipped",
  "total_cents": 125000,
  "items": [
    { "product_id": "...", "name": "RTX 4080", "quantity": 1, "price_cents": 99900 }
  ],
  "delivery_service": { "name": "Express (2-day)", "price_cents": 1500 },
  "delivery_address": { ... },
  "created_at": "2026-01-01T12:00:00Z"
}
```

---

## 👨‍💼 Admin Endpoints (`/admin/*`)

| Method   | Endpoint                         | Description                  |
| -------- | -------------------------------- | ---------------------------- |
| `POST`   | `/admin/products`                | Create product               |
| `PUT`    | `/admin/products/:id`            | Update product (incl. specs) |
| `DELETE` | `/admin/products/:id`            | Soft-delete product          |
| `POST`   | `/admin/delivery-services`       | Create delivery service      |
| `PUT`    | `/admin/delivery-services/:id`   | Update delivery service      |
| `GET`    | `/admin/reviews`                 | List pending reviews         |
| `PATCH`  | `/admin/reviews/:id/approve`     | Approve review               |
| `DELETE` | `/admin/reviews/:id`             | Delete review                |
| `POST`   | `/admin/compatibility-rules`     | Create rule                  |
| `PUT`    | `/admin/compatibility-rules/:id` | Update rule                  |

### Product Creation (`POST /admin/products`)

```json
{
  "category_id": "uuid",
  "name": "ASUS ROG Strix B650E-F",
  "brand": "ASUS",
  "price_cents": 24900,
  "stock_quantity": 15,
  "spec_highlights": { "form_factor": "ATX", "wifi": true },
  "specs": [
    { "key": "motherboard_socket", "value": "AM5" },
    { "key": "ram_type", "value": "DDR5" },
    { "key": "pci_e_slots", "value": 2 }
  ]
}
```

> 📝 **Specs**: `key` must exist in `spec_definitions`.

---

## 📊 Error Handling

All errors follow RFC 7807 (`application/problem+json`):

```json
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://techstore.dev/errors/invalid-cart-item",
  "title": "Invalid Cart Item",
  "status": 400,
  "detail": "Product is out of stock",
  "instance": "/cart/items/abc-123",
  "invalid_params": [
    { "name": "product_id", "reason": "stock_quantity=0" }
  ]
}
```

| Status | Use Case                                            |
| ------ | --------------------------------------------------- |
| `400`  | Validation error (e.g., invalid spec, out of stock) |
| `401`  | Missing/invalid token                               |
| `403`  | Forbidden (e.g., non-admin accessing `/admin`)      |
| `404`  | Resource not found (soft-deleted included)          |
| `409`  | Conflict (e.g., build component incompatible)       |
| `422`  | Semantic errors (e.g., review on unowned product)   |
| `429`  | Rate limit exceeded                                 |
| `500`  | Server error (logged + alert)                       |

## 📈 Metrics & Observability

The API emits metrics for:

- Request rate / latency (per endpoint)
- Error rates (by status + type)
- Conversion funnel:\
  `product_view → add_to_cart → checkout_start → order_created`

Via Prometheus (`/metrics`) and structured JSON logs (with `request_id`
tracing).

---

## 🧪 Local Development

```bash
# Start DB
docker-compose up -d db

# Run migrations
make migrate

# Seed categories & spec definitions
make seed-core

# Run server
go run cmd/server/main.go
→ Listening on :8080
```

**Test accounts**:

- `user@example.com` / `password` (customer)
- `admin@example.com` / `password` (admin)

---

## 📦 Roadmap: Post-MVP Endpoints

| Version | Feature                    | New Endpoints                            |
| ------- | -------------------------- | ---------------------------------------- |
| **V2**  | Wishlist                   | `POST /wishlist`, `GET /wishlist`        |
| **V2**  | Offline Cart Sync          | `PATCH /cart/merge`                      |
| **V3**  | Build Performance Estimate | `GET /builds/:id/estimate`               |
| **V3**  | B2B Pricing                | `GET /products?customer_tier=enterprise` |
