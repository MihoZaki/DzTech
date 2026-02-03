### Comprehensive API Endpoints

---

## Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`

*   **Description:** Register a new user account.
*   **Method:** `POST`
*   **Headers:** None required.
*   **Request Body:** `application/json`
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123",
      "full_name": "Jane Smith"
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "access_token": "<jwt_access_token>",
          "user": {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "email": "user@example.com",
            "full_name": "Jane Smith",
            "is_admin": false,
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          }
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid email format, weak password).
    *   `409 Conflict`: If a user with the provided email already exists.
    *   `500 Internal Server Error`: If there's a server-side failure during registration.

---

### `POST /api/v1/auth/login`

*   **Description:** Authenticate a user and obtain access and refresh tokens.
*   **Method:** `POST`
*   **Headers:** None required.
*   **Request Body:** `application/json`
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123"
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Headers:** `Set-Cookie: refresh_token=<refresh_token_value>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
    *   **Body:** `application/json`
        ```json
        {
          "access_token": "<jwt_access_token>",
          "user": {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "email": "user@example.com",
            "full_name": "Jane Smith",
            "is_admin": false,
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          }
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the email or password is incorrect.
    *   `500 Internal Server Error`: If there's a server-side failure during authentication.

---

### `POST /api/v1/auth/refresh`

*   **Description:** Obtain a new access token using a valid refresh token.
*   **Method:** `POST`
*   **Headers:** `Cookie: refresh_token=<refresh_token_value>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Headers:** `Set-Cookie: refresh_token=<new_refresh_token_value>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` (if rotated)
    *   **Body:** `application/json`
        ```json
        {
          "access_token": "<new_jwt_access_token>"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON.
    *   `401 Unauthorized`: If the refresh token is invalid, expired, revoked, or not found in the cookie.
    *   `500 Internal Server Error`: If there's a server-side failure during token refresh.

---

### `POST /api/v1/auth/logout`

*   **Description:** Revoke the current user's refresh token.
*   **Method:** `POST`
*   **Headers:** `Cookie: refresh_token=<refresh_token_value>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `204 No Content`
    *   **Headers:** `Set-Cookie: refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=-1; Expires=Thu, 01 Jan 1970 00:00:00 GMT` (Clears cookie)
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON.
    *   `500 Internal Server Error`: If there's a server-side failure during logout.

---

## Public Products (`/api/v1/products`)

### `GET /api/v1/products`

*   **Description:** List all products with pagination.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
            "name": "Laptop",
            "description": "High-performance laptop",
            "price_cents": 150000,
            "stock_quantity": 10,
            "image_url": "https://example.com/images/laptop.jpg",
            "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more products ...
        ]
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product list.

---

### `GET /api/v1/products/{id}`

*   **Description:** Get details of a specific product.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
          "name": "Laptop",
          "description": "High-performance laptop",
          "price_cents": 150000,
          "stock_quantity": 10,
          "image_url": "https://example.com/images/laptop.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product details.

---

### `GET /api/v1/products/search`

*   **Description:** Search for products by name or description.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Query Parameters:**
    *   `q` (Required, `string`): The search query term.
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
            "name": "Laptop",
            "description": "High-performance laptop",
            "price_cents": 150000,
            "stock_quantity": 10,
            "image_url": "https://example.com/images/laptop.jpg",
            "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more matching products ...
        ]
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `q` query parameter is missing.
    *   `500 Internal Server Error`: If there's a server-side failure during the search.

---

### `GET /api/v1/products/categories`

*   **Description:** List all product categories.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
            "name": "Electronics",
            "description": "Electronic devices and accessories",
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more categories ...
        ]
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If there's a server-side failure fetching the category list.

---

### `GET /api/v1/products/categories/{id}`

*   **Description:** Get details of a specific category.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the category.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "name": "Electronics",
          "description": "Electronic devices and accessories",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `404 Not Found`: If no category exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the category details.

---

## User Cart (`/api/v1/cart`)

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/cart`

*   **Description:** Get the current user's cart contents.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            {
              "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "name": "Laptop",
              "price_cents": 150000,
              "quantity": 2,
              "subtotal_cents": 300000
            }
            // ... more items ...
          ],
          "total_price_cents": 300000
        }
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the cart.

---

### `POST /api/v1/cart/add`

*   **Description:** Add an item to the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
      "quantity": 1
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            // ... updated cart items ...
          ],
          "total_price_cents": 150000
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid product ID, quantity <= 0).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `product_id` does not exist.
    *   `409 Conflict`: If the requested quantity exceeds the available stock.
    *   `500 Internal Server Error`: If there's a server-side failure adding the item.

---

### `POST /api/v1/cart/remove`

*   **Description:** Remove an item from the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1"
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            // ... updated cart items (item removed) ...
          ],
          "total_price_cents": 0
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid product ID).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `product_id` is not in the current user's cart.
    *   `500 Internal Server Error`: If there's a server-side failure removing the item.

---

### `POST /api/v1/cart/update`

*   **Description:** Update the quantity of an item in the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
      "quantity": 3
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [
            // ... updated cart items (quantity changed) ...
          ],
          "total_price_cents": 450000
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid product ID, quantity <= 0).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `product_id` is not in the current user's cart.
    *   `409 Conflict`: If the requested quantity exceeds the available stock.
    *   `500 Internal Server Error`: If there's a server-side failure updating the item.

---

### `POST /api/v1/cart/clear`

*   **Description:** Remove all items from the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "items": [],
          "total_price_cents": 0
        }
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure clearing the cart.

---

## User Orders (`/api/v1/orders`)

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/orders`

*   **Description:** Create a new order from the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "shipping_address": {
        "street": "123 Main St",
        "city": "Anytown",
        "zip": "12345"
      },
      "billing_address": {
        "street": "123 Main St",
        "city": "Anytown",
        "zip": "12345"
      },
      "notes": "Leave at door",
      "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx"
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "e1f2g3h4-i5j6-7890-klmn-opqrstuvwxy1",
          "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "status": "pending",
          "total_amount_cents": 150000,
          "payment_method": "Cash on Delivery",
          "shipping_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "billing_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "notes": "Leave at door",
          "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "created_at": "2024-02-01T10:00:00Z",
          "updated_at": "2024-02-01T10:00:00Z",
          "items": [
            {
              "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "name": "Laptop",
              "price_per_unit_cents": 150000,
              "quantity": 1,
              "subtotal_cents": 150000
            }
          ]
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `409 Conflict`: If the cart is empty, or if stock levels changed during order processing.
    *   `500 Internal Server Error`: If there's a server-side failure creating the order.

---

### `GET /api/v1/orders/{id}`

*   **Description:** Get details of a specific order belonging to the current user.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "e1f2g3h4-i5j6-7890-klmn-opqrstuvwxy1",
          "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "status": "pending",
          "total_amount_cents": 150000,
          "payment_method": "Cash on Delivery",
          "shipping_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "billing_address": {
            "street": "123 Main St",
            "city": "Anytown",
            "zip": "12345"
          },
          "notes": "Leave at door",
          "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "created_at": "2024-02-01T10:00:00Z",
          "updated_at": "2024-02-01T10:00:00Z",
          "items": [
            {
              "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "name": "Laptop",
              "price_per_unit_cents": 150000,
              "quantity": 1,
              "subtotal_cents": 150000
            }
          ]
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the order does not belong to the current user.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order details.

---

### `GET /api/v1/orders`

*   **Description:** List orders for the current user with pagination.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of orders per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "e1f2g3h4-i5j6-7890-klmn-opqrstuvwxy1",
            "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "status": "pending",
            "total_amount_cents": 150000,
            "payment_method": "Cash on Delivery",
            "shipping_address": {
              "street": "123 Main St",
              "city": "Anytown",
              "zip": "12345"
            },
            "billing_address": {
              "street": "123 Main St",
              "city": "Anytown",
              "zip": "12345"
            },
            "notes": "Leave at door",
            "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
            "created_at": "2024-02-01T10:00:00Z",
            "updated_at": "2024-02-01T10:00:00Z",
            "items": [
              // ... items array ...
            ]
          },
          // ... more orders ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order list.

---

## Delivery Options (`/api/v1/delivery-options`)

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/delivery-options`

*   **Description:** Get the list of active delivery services available for checkout.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
            "name": "Standard Delivery",
            "description": "Delivered within 5-7 business days",
            "base_cost_cents": 500,
            "estimated_days": 7,
            "is_active": true,
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z"
          },
          // ... more active delivery services ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the delivery options.

---

## Admin Products (`/api/v1/admin/products`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/admin/products`

*   **Description:** Create a new product.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Smartphone",
      "description": "Latest model smartphone",
      "price_cents": 80000,
      "stock_quantity": 50,
      "image_url": "https://example.com/images/smartphone.jpg",
      "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx"
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "f1g2h3i4-j5k6-7890-lmno-pqrstuvwxyza",
          "name": "Smartphone",
          "description": "Latest model smartphone",
          "price_cents": 80000,
          "stock_quantity": 50,
          "image_url": "https://example.com/images/smartphone.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-02-01T11:00:00Z",
          "updated_at": "2024-02-01T11:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure creating the product.

---

### `GET /api/v1/admin/products/{id}`

*   **Description:** Get details of a specific product.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
          "name": "Laptop",
          "description": "High-performance laptop",
          "price_cents": 150000,
          "stock_quantity": 10,
          "image_url": "https://example.com/images/laptop.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product details.

---

### `PATCH /api/v1/admin/products/{id}`

*   **Description:** Update an existing product.
*   **Method:** `PATCH`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Request Body:** `application/json` (partial update allowed)
    ```json
    {
      "price_cents": 145000,
      "stock_quantity": 8
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
          "name": "Laptop",
          "description": "High-performance laptop",
          "price_cents": 145000,
          "stock_quantity": 8,
          "image_url": "https://example.com/images/laptop.jpg",
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-02-01T11:30:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure updating the product.

---

### `DELETE /api/v1/admin/products/{id}`

*   **Description:** Delete a specific product.
*   **Method:** `DELETE`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the product.
*   **Response:**
    *   **Code:** `204 No Content`
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure deleting the product.

---

### `GET /api/v1/admin/products`

*   **Description:** List all products (admin view).
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          // ... same product objects as GET /api/v1/products ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product list.

---

## Admin Orders (`/api/v1/admin/orders`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/admin/orders/all`

*   **Description:** List all orders across all users with optional pagination.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of orders per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          // ... order objects ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order list.

---

### `GET /api/v1/admin/orders/{id}`

*   **Description:** Get details of *any* specific order.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        // ... full order object ...
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order details.

---

### `PUT /api/v1/admin/orders/{id}/status`

*   **Description:** Update the status of *any* specific order.
*   **Method:** `PUT`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Request Body:** `application/json`
    ```json
    {
      "status": "shipped" // Valid values: pending, confirmed, shipped, delivered, cancelled
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        // ... updated order object ...
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON, contains validation errors, or specifies an invalid status.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure updating the order status.

---

### `PUT /api/v1/admin/orders/{id}/cancel`

*   **Description:** Cancel *any* specific order.
*   **Method:** `PUT`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the order.
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        // ... updated order object with status "cancelled" ...
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no order exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure cancelling the order.

---

## Admin Delivery Services (`/api/v1/admin/delivery-services`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/admin/delivery-services`

*   **Description:** Create a new delivery service.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Express Delivery",
      "description": "Delivered within 2-3 business days",
      "base_cost_cents": 1500,
      "estimated_days": 3,
      "is_active": true
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "g1h2i3j4-k5l6-7890-mnop-qrstuvwxyzab",
          "name": "Express Delivery",
          "description": "Delivered within 2-3 business days",
          "base_cost_cents": 1500,
          "estimated_days": 3,
          "is_active": true,
          "created_at": "2024-02-01T11:15:00Z",
          "updated_at": "2024-02-01T11:15:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure creating the delivery service.

---

### `GET /api/v1/admin/delivery-services/{id}`

*   **Description:** Get details of a specific delivery service.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the delivery service.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "name": "Standard Delivery",
          "description": "Delivered within 5-7 business days",
          "base_cost_cents": 500,
          "estimated_days": 7,
          "is_active": true,
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no delivery service exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the delivery service details.

---

### `GET /api/v1/admin/delivery-services`

*   **Description:** List delivery services with optional filtering by active status.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `active_only` (Optional, `string`): If `"true"`, only returns active services. Defaults to `"false"` (returns all).
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of services per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          // ... delivery service objects ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the delivery service list.

---

### `PATCH /api/v1/admin/delivery-services/{id}`

*   **Description:** Update an existing delivery service.
*   **Method:** `PATCH`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the delivery service.
*   **Request Body:** `application/json` (partial update allowed)
    ```json
    {
      "is_active": false
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "name": "Standard Delivery",
          "description": "Delivered within 5-7 business days",
          "base_cost_cents": 500,
          "estimated_days": 7,
          "is_active": false,
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-02-01T11:45:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no delivery service exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure updating the delivery service.

---

### `DELETE /api/v1/admin/delivery-services/{id}`

*   **Description:** Delete a specific delivery service.
*   **Method:** `DELETE`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the delivery service.
*   **Response:**
    *   **Code:** `204 No Content`
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no delivery service exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure deleting the delivery service.

---

## Admin User Management (`/api/v1/admin/users`)

*   **Access:** Requires a valid admin JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/admin/users`

*   **Description:** List users with optional filtering and pagination.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Query Parameters:**
    *   `active_only` (Optional, `string`): If `"true"`, only returns users who are not soft-deleted. Defaults to `"false"` (returns all users).
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of users per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        [
          {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
            "name": "John Doe", // Full name if available, otherwise email
            "email": "john.doe@example.com",
            "registration_date": "2024-01-01T12:00:00Z",
            "last_order_date": "2024-02-15T10:30:00Z", // Omitted if no orders
            "order_count": 5,
            "activity_status": "Active" // "Active" or "Inactive"
          },
          // ... more users ...
        ]
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the user list.

---

### `GET /api/v1/admin/users/{id}`

*   **Description:** Retrieve detailed information for a specific user.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the user.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "name": "John Doe", // Full name if available, otherwise email
          "email": "john.doe@example.com",
          "registration_date": "2024-01-01T12:00:00Z",
          "last_order_date": "2024-02-15T10:30:00Z", // Omitted if no orders
          "order_count": 5,
          "activity_status": "Active" // "Active" or "Inactive"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `404 Not Found`: If no user exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the user details.

---

### `POST /api/v1/admin/users/{id}/activate`

*   **Description:** Reactivate a previously deactivated (soft-deleted) user account.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the user to activate.
*   **Request Body:** None (Empty body).
*   **Response:**
    *   **Code:** `204 No Content`
    *   **Body:** None
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure activating the user.

---

### `POST /api/v1/admin/users/{id}/deactivate`

*   **Description:** Deactivate a user account by soft-deleting it.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <admin_access_token>`
*   **Path Parameters:**
    *   `id` (Required, `string`): The UUID of the user to deactivate.
*   **Request Body:** None (Empty body).
*   **Response:**
    *   **Code:** `204 No Content`
    *   **Body:** None
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid, or if the user is not an admin.
    *   `500 Internal Server Error`: If there's a server-side failure deactivating the user.

---

## Health Check

### `GET /health`

*   **Description:** Check the health of the service.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "status": "ok",
          "timestamp": "2026-02-03T10:00:00Z"
        }
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If the service is unhealthy (e.g., database connection down).

---
