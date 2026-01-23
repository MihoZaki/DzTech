
## Admin Dashboard API Endpoints

### 1. Products Management
*   **Prefix:** `/api/v1/products`
*   `GET /` - List products (pagination, sorting, filtering)
*   `POST /` - Create product
*   `GET /{id}` - Get product details
*   `PUT /{id}` - Update product
*   `DELETE /{id}` - Delete product

### 2. Orders Management
*   **Prefix:** `/api/v1/orders`
*   `GET /` - List orders (pagination, sorting, filtering)
*   `GET /{id}` - Get order details
*   `PUT /{id}/status` - Update order status
*   `PUT /{id}` - Update order details (optional)

### 3. Customers Management
*   **Prefix:** `/api/v1/customers`
*   `GET /` - List customers (pagination, sorting, filtering)
*   `GET /{id}` - Get customer details
*   `PUT /{id}` - Update customer profile
*   `DELETE /{id}` - Delete customer

### 4. Categories Management
*   **Prefix:** `/api/v1/categories`
*   `GET /` - List categories (pagination, sorting)
*   `POST /` - Create category
*   `GET /{id}` - Get category details
*   `PUT /{id}` - Update category
*   `DELETE /{id}` - Delete category

### 5. Delivery Services Management
*   **Prefix:** `/api/v1/delivery-services`
*   `GET /` - List delivery services
*   `POST /` - Create delivery service
*   `GET /{id}` - Get delivery service details
*   `PUT /{id}` - Update delivery service
*   `DELETE /{id}` - Delete delivery service

### 6. Authentication (Implied)
*   **Prefix:** `/api/v1/auth`
*   `POST /login` - Admin login
*   `POST /logout` - Admin logout
*   **Middleware:** Require valid token for all other endpoints.
