
### **Comprehensive API Endpoints**

---

## **Authentication (`/api/v1/auth`)**

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
          "success": true,
          "data": {
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

*   **Description:** Authenticate a user and obtain access token.
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
    *   **Body:** `application/json`
        ```json
        {
          "success": true,
          "data": {
            "access_token": "<jwt_access_token>",
            "user": {
              "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
              "email": "user@example.com",
              "full_name": "Jane Smith",
              "is_admin": false
            }
          }
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors.
    *   `401 Unauthorized`: If the email or password is incorrect.
    *   `500 Internal Server Error`: If there's a server-side failure during authentication.

---

### `POST /api/v1/auth/refresh`

*   **Description:** Obtain a new access token using a valid refresh token. *(Note: Refresh token implementation details might vary based on code specifics not fully visible)*
*   **Method:** `POST`
*   **Headers:** `Cookie: refresh_token=<refresh_token_value>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Headers:** `Set-Cookie: refresh_token=<new_refresh_token_value>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` (if rotated)
    *   **Body:** `application/json`
        ```json
        {
          "success": true,
          "data": {
            "access_token": "<new_jwt_access_token>"
          }
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON.
    *   `401 Unauthorized`: If the refresh token is invalid, expired, revoked, or not found in the cookie.
    *   `500 Internal Server Error`: If there's a server-side failure during token refresh.

---

### `POST /api/v1/auth/logout`

*   **Description:** Revoke the current user's refresh token. *(Note: Implementation details might vary)*
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

## **Public Products (`/api/v1/products`)**

### `GET /api/v1/products`

*   **Description:** List all products with pagination. Includes discount information.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Query Parameters:**
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "data": [
            {
              "id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
              "name": "Laptop",
              "slug": "laptop-model-xyz",
              "description": "High-performance laptop",
              "short_description": "Powerful laptop",
              "price_cents": 150000,
              "stock_quantity": 10,
              "status": "active",
              "brand": "TechBrand",
              "image_urls": ["https://example.com/images/laptop1.jpg", "https://example.com/images/laptop2.jpg"],
              "spec_highlights": {"processor": "Intel i7", "ram": "16GB"},
              "created_at": "2024-01-01T12:00:00Z",
              "updated_at": "2024-01-01T12:00:00Z",
              "avg_rating": 4.5,
              "num_ratings": 120,
              "discounted_price_cents": 140000,
              "has_active_discount": true,
              "effective_discount_percentage": 6.7,
              "total_calculated_fixed_discount_cents": 0,
              "calculated_combined_percentage_factor": 0.933,
              "category_name": "Electronics" // Added from joined query
            }
            // ... more products ...
          ],
          "page": 1,
          "limit": 20,
          "total": 150,
          "total_pages": 8
        }
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product list.

---

### `GET /api/v1/products/{id}`

*   **Description:** Get details of a specific product by ID. Includes discount information.
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
          "category_id": "c1d2e3f4-g5h6-7890-ijkl-mnopqrstuvwx",
          "name": "Laptop",
          "slug": "laptop-model-xyz",
          "description": "High-performance laptop",
          "short_description": "Powerful laptop",
          "price_cents": 150000,
          "stock_quantity": 10,
          "status": "active",
          "brand": "TechBrand",
          "image_urls": ["https://example.com/images/laptop1.jpg", "https://example.com/images/laptop2.jpg"],
          "spec_highlights": {"processor": "Intel i7", "ram": "16GB"},
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-01T12:00:00Z",
          "avg_rating": 4.5,
          "num_ratings": 120,
          "discounted_price_cents": 140000,
          "has_active_discount": true,
          "effective_discount_percentage": 6.7,
          "total_calculated_fixed_discount_cents": 0,
          "calculated_combined_percentage_factor": 0.933,
          "category_name": "Electronics" 
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `404 Not Found`: If no product exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the product details.

---

### `GET /api/v1/products/search`

*   **Description:** Search for products by name, category, price range, stock status, discounts, etc. Includes discount information.
*   **Method:** `GET`
*   **Headers:** None required.
*   **Query Parameters:**
    *   `query` (Optional, `string`): Search term for name/description.
    *   `category_id` (Optional, `string`): Filter by category UUID.
    *   `brand` (Optional, `string`): Filter by brand name.
    *   `min_price` (Optional, `integer`): Minimum price in cents.
    *   `max_price` (Optional, `integer`): Maximum price in cents.
    *   `in_stock_only` (Optional, `boolean`): Filter for in-stock items only (e.g., `true`/`false`).
    *   `include_discounted_only` (Optional, `boolean`): Filter for items with active discounts only (e.g., `true`/`false`).
    *   `page` (Optional, `integer`): Page number for pagination (1-indexed). Defaults to `1`.
    *   `limit` (Optional, `integer`): Number of products per page. Defaults to `20`.
    *   `spec_filter` (Optional, `string`): Key-value pair for specific spec filter (format might vary, check handler).
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json` (Same structure as `GET /api/v1/products` list response)
*   **Errors:**
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
            "slug": "electronics",
            "type": "category-type",
            "parent_id": null, // or "uuid" if it has a parent
            "created_at": "2024-01-01T12:00:00Z"
          },
          // ... more categories ...
        ]
        ```
*   **Errors:**
    *   `500 Internal Server Error`: If there's a server-side failure fetching the category list.

---

### `GET /api/v1/products/categories/{id}`

*   **Description:** Get details of a specific category by ID.
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
          "slug": "electronics",
          "type": "category-type",
          "parent_id": null, // or "uuid" if it has a parent
          "created_at": "2024-01-01T12:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `id` path parameter is not a valid UUID.
    *   `404 Not Found`: If no category exists with the given `id`.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the category details.

---

## **User Cart (`/api/v1/cart`)**

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `GET /api/v1/cart`

*   **Description:** Get the current user's cart contents. Includes discount information for items.
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "id": "uuid", // Cart ID
          "user_id": "uuid", // Present if authenticated, null for guest
          "items": [
            {
              "id": "uuid", // Cart Item ID
              "product_id": "uuid",
              "product_name": "Laptop",
              "product_slug": "laptop-model-xyz",
              "quantity": 2,
              "unit_price_original_cents": 150000,
              "unit_price_discounted_cents": 140000,
              "total_price_original_cents": 300000,
              "total_price_discounted_cents": 280000,
              "has_active_discount": true,
              "image_urls": ["https://example.com/images/laptop1.jpg"]
            }
          ],
          "total_original_value_cents": 300000,
          "total_discounted_value_cents": 280000,
          "total_savings_cents": 20000,
          "created_at": "2024-02-10T15:30:00Z",
          "updated_at": "2024-02-10T16:00:00Z"
        }
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the cart.

---

### `POST /api/v1/cart/items`

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
    *   **Code:** `201 Created` (or `200 OK` if item already existed and quantity was updated)
    *   **Body:** `application/json` (Same structure as an item in `GET /api/v1/cart` response)
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid product ID, quantity <= 0).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `product_id` does not exist.
    *   `409 Conflict`: If the requested quantity exceeds the available stock.
    *   `500 Internal Server Error`: If there's a server-side failure adding the item.

---

### `PUT /api/v1/cart/items/{item_id}`

*   **Description:** Update the quantity of an item in the current user's cart.
*   **Method:** `PUT`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Path Parameters:**
    *   `item_id` (Required, `string`): The UUID of the cart item.
*   **Request Body:** `application/json`
    ```json
    {
      "quantity": 3
    }
    ```
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json` (Same structure as an item in `GET /api/v1/cart` response)
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON or contains validation errors (e.g., invalid quantity <= 0).
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `item_id` does not exist in the current user's cart.
    *   `409 Conflict`: If the requested quantity exceeds the available stock.
    *   `500 Internal Server Error`: If there's a server-side failure updating the item.

---

### `DELETE /api/v1/cart/items/{item_id}`

*   **Description:** Remove an item from the current user's cart.
*   **Method:** `DELETE`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Path Parameters:**
    *   `item_id` (Required, `string`): The UUID of the cart item.
*   **Response:**
    *   **Code:** `204 No Content`
*   **Errors:**
    *   `400 Bad Request`: If the `item_id` path parameter is not a valid UUID.
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `404 Not Found`: If the specified `item_id` does not exist in the current user's cart.
    *   `500 Internal Server Error`: If there's a server-side failure removing the item.

---

### `DELETE /api/v1/cart`

*   **Description:** Remove all items from the current user's cart.
*   **Method:** `DELETE`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** None.
*   **Response:**
    *   **Code:** `204 No Content`
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure clearing the cart.

---

## **User Orders (`/api/v1/orders`)**

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/orders`

*   **Description:** Create a new order from the current user's cart.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
      "shipping_address": {
        "full_name": "John Doe",
        "province": "Lagos",
        "city": "Victoria Island",
        "phone_number_1": "+2348087654321",
        "phone_number_2": "+2348098765432" // Optional
      },
      "notes": "Call before delivery" // Optional
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "e1f2g3h4-i5j6-7890-klmn-opqrstuvwxy1",
          "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "user_full_name": "John Doe",
          "status": "pending",
          "total_amount_cents": 150000,
          "payment_method": "Cash on Delivery",
          "province": "Lagos",
          "city": "Victoria Island",
          "phone_number_1": "+2348087654321",
          "phone_number_2": "+2348098765432", // Optional
          "notes": "Call before delivery",
          "delivery_service_id": "d1e2f3g4-h5i6-7890-jklm-nopqrstuvwx",
          "created_at": "2024-02-01T10:00:00Z",
          "updated_at": "2024-02-01T10:00:00Z",
          "order_items": [
            {
              "id": "f1g2h3i4-j5k6-7890-lmno-pqrstuvwxyza",
              "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
              "product_name": "Laptop",
              "quantity": 1,
              "unit_price_cents": 150000,
              "total_price_cents": 150000
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
    *   **Body:** `application/json` (Same structure as an item in `POST /api/v1/orders` response)
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
        {
          "data": [
            // ... order objects ...
          ],
          "page": 1,
          "limit": 20,
          "total": 5,
          "total_pages": 1
        }
        ```
*   **Errors:**
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `500 Internal Server Error`: If there's a server-side failure fetching the order list.

---

## **Delivery Options (`/api/v1/delivery-options`)**

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

## **Reviews (`/api/v1/reviews`)**

*   **Access:** Requires a valid JWT token in the `Authorization: Bearer <token>` header.

### `POST /api/v1/reviews`

*   **Description:** Submit a review for a product.
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <user_access_token>`
*   **Request Body:** `application/json`
    ```json
    {
      "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
      "rating": 5 // Integer between 1 and 5
    }
    ```
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "id": "f1g2h3i4-j5k6-7890-lmno-pqrstuvwxyza",
          "user_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
          "product_id": "b1c2d3e4-f5g6-7890-hijk-lmnopqrstuv1",
          "rating": 5,
          "created_at": "2024-02-11T10:00:00Z",
          "updated_at": "2024-02-11T10:00:00Z"
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body is invalid JSON, rating is out of range, or missing required fields.
    *   `401 Unauthorized`: If the access token is missing or invalid.
    *   `409 Conflict`: If the user has already reviewed the product.
    *   `500 Internal Server Error`: If there's a server-side failure creating the review.

---


---

## **Guest Checkout**

### `POST /api/v1/checkout/guest`

*   **Description:** Allows an unauthenticated user (guest) to place an order using items from their frontend-managed cart session.
*   **Method:** `POST`
*   **Headers:**
    *   `Content-Type: application/json`
    *   `X-Session-ID: <session_identifier>` (A unique identifier for the guest's cart session, managed by the frontend, e.g., using `localStorage` or `sessionStorage`).
*   **Request Body:**
    ```json
    {
      "shipping_address": {
        "full_name": "John Doe",
        "phone_number_1": "+1234567890",
        "phone_number_2": "+0987654321",
        "province": "Lagos",
        "city": "Ikeja",
        "address": "123 Main Street"
      },
      "delivery_service_id": "delivery-service-uuid-string",
      "payment_method": "Cash on Delivery", // Or other supported methods
      "notes": "Leave at front desk if not home."
    }
    ```
    *   `shipping_address`: An object containing the guest's delivery information.
        *   `full_name` (string, required): The name of the person receiving the order.
        *   `phone_number_1` (string, required): Primary contact number.
        *   `phone_number_2` (string, optional): Secondary contact number.
        *   `province` (string, required): The province/state for delivery.
        *   `city` (string, required): The city/town for delivery.
        *   `address` (string, required): The full delivery address.
    *   `delivery_service_id` (string, required): The UUID of the selected delivery service option.
    *   `payment_method` (string, required): The chosen payment method (e.g., "Cash on Delivery").
    *   `notes` (string, optional): Any additional notes for the delivery.
*   **Response:**
    *   **Code:** `201 Created`
    *   **Body:** `application/json`
        ```json
        {
          "order": {
            "id": "order-uuid-string",
            "user_id": null, // Will be null for guest orders
            "user_full_name": "John Doe",
            "status": "pending",
            "total_amount_cents": 150000,
            "payment_method": "Cash on Delivery",
            "province": "Lagos",
            "city": "Ikeja",
            "phone_number_1": "+1234567890",
            "phone_number_2": "+0987654321",
            "delivery_service_id": "delivery-service-uuid-string",
            "notes": "Leave at front desk if not home.",
            "created_at": "2026-02-15T18:30:00Z",
            "updated_at": "2026-02-15T18:30:00Z"
          },
          "items": [
            {
              "id": "order-item-uuid-string",
              "order_id": "order-uuid-string",
              "product_id": "product-uuid-string",
              "product_name": "RTX 4080 Super",
              "price_cents": 100000,
              "quantity": 1,
              "subtotal_cents": 100000,
              "created_at": "2026-02-15T18:30:00Z",
              "updated_at": "2026-02-15T18:30:00Z"
            },
            // ... more items
          ]
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the `X-Session-ID` header is missing, the request body contains invalid JSON, or required fields in the request body are missing or invalid.
    *   `409 Conflict`: If stock availability changes between the time the cart was viewed and the order creation attempt, leading to insufficient stock for one or more items.
    *   `500 Internal Server Error`: If there's a general server-side failure during the order creation process (e.g., database transaction failure).

---

## **Cart Bulk Add Items**

### `POST /api/v1/cart/bulk-add`

*   **Description:** Adds multiple items to the authenticated user's cart in a single request. If an item already exists in the cart, its quantity will be increased by the specified amount.
*   **Method:** `POST`
*   **Headers:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <access_token>` (A valid JWT access token obtained after login/register).
*   **Request Body:**
    ```json
    {
      "items": [
        {
          "product_id": "product-uuid-string",
          "quantity": 2
        },
        {
          "product_id": "another-product-uuid-string",
          "quantity": 1
        }
        // ... more items
      ]
    }
    ```
    *   `items`: An array of objects, each representing an item to add.
        *   `product_id` (string, required): The UUID of the product to add.
        *   `quantity` (integer, required): The number of units of the product to add. Must be greater than 0.
*   **Response:**
    *   **Code:** `200 OK`
    *   **Body:** `application/json`
        ```json
        {
          "message": "Cart updated successfully",
          "cart_summary": {
            "id": "cart-uuid-string",
            "user_id": "user-uuid-string",
            "items": [
              {
                "id": "cart-item-uuid-string",
                "cart_id": "cart-uuid-string",
                "product_id": "product-uuid-string",
                "quantity": 5, // Quantity after adding 2 to existing 3
                "product_name": "RTX 4080 Super",
                "product_price_cents": 100000,
                "final_price_cents": 95000, // Price after discount if applicable
                "discount_percentage": 5,
                "subtotal_cents": 475000,
                "created_at": "2026-02-15T18:00:00Z",
                "updated_at": "2026-02-15T18:30:00Z"
              },
              {
                "id": "another-cart-item-uuid-string",
                "cart_id": "cart-uuid-string",
                "product_id": "another-product-uuid-string",
                "quantity": 1, // Quantity added
                "product_name": "Intel Core i9-14900K",
                "product_price_cents": 50000,
                "final_price_cents": 50000, // No discount
                "discount_percentage": 0,
                "subtotal_cents": 50000,
                "created_at": "2026-02-15T18:30:00Z",
                "updated_at": "2026-02-15T18:30:00Z"
              }
              // ... other items in the cart
            ],
            "total_items": 2,
            "total_value_cents": 525000,
            "total_discounted_value_cents": 525000
          }
        }
        ```
*   **Errors:**
    *   `400 Bad Request`: If the request body contains invalid JSON, required fields are missing, or the specified `quantity` is less than or equal to 0.
    *   `401 Unauthorized`: If the `Authorization` header is missing or the provided JWT token is invalid or expired.
    *   `404 Not Found`: If one or more of the specified `product_id`s do not exist in the database.
    *   `409 Conflict`: If adding the items would exceed the available stock for one or more of the products.
    *   `500 Internal Server Error`: If there's a general server-side failure during the cart update process.


## **Health Check**

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

