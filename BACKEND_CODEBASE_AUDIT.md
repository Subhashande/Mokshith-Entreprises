# B2B Backend Codebase - Comprehensive Audit

**Generated:** April 24, 2026  
**Framework:** Express.js + MongoDB + Node.js  
**Key Tech Stack:** Socket.io, BullMQ, Razorpay, Winston Logger

---

## 1. API Routes & Patterns

### Route Structure
- **Main Entry:** [src/routes/index.js](src/routes/index.js) - Root router with versioning
- **Versioned APIs:** 
  - [src/routes/v1.routes.js](src/routes/v1.routes.js) - V1 API routes
  - [src/routes/v2.routes.js](src/routes/v2.routes.js) - V2 API routes (if exists)
- **Health Check:** [src/routes/health.routes.js](src/routes/health.routes.js)

### Route Categories (V1 - 25 modules)

####  Authentication & Users
- **[src/modules/auth/auth.routes.js](src/modules/auth/auth.routes.js)**
  - POST `/api/v1/auth/register` - User registration with schema validation
  - POST `/api/v1/auth/login` - Password login
  - POST `/api/v1/auth/send-otp` - Send OTP for OTP-based login
  - POST `/api/v1/auth/verify-otp` - Verify OTP and get tokens
  - POST `/api/v1/auth/refresh-token` - Refresh access token

- **[src/modules/user/user.routes.js](src/modules/user/user.routes.js)**
  - User profile management endpoints
  - Address management
  - User preferences

####  Organization & Vendor Management
- **[src/modules/company/company.routes.js](src/modules/company/company.routes.js)** - B2B company profiles
- **[src/modules/vendor/vendor.routes.js](src/modules/vendor/vendor.routes.js)** - Vendor management
- **[src/modules/superAdmin/superAdmin.routes.js](src/modules/superAdmin/superAdmin.routes.js)** - Super admin operations

####  Catalog & Products
- **[src/modules/category/category.routes.js](src/modules/category/category.routes.js)** - Category CRUD
- **[src/modules/product/product.routes.js](src/modules/product/product.routes.js)**
  - POST `/api/v1/products` - Create product (Auth + Admin/Vendor/SuperAdmin)
  - GET `/api/v1/products` - List products with pagination
  - GET `/api/v1/products/:id` - Get single product
  - PUT `/api/v1/products/:id` - Update product (Admin/SuperAdmin)
  - DELETE `/api/v1/products/:id` - Delete product (Admin/SuperAdmin)
  - PATCH `/api/v1/products/:id/stock` - Update stock
  - PATCH `/api/v1/products/:id/status` - Toggle product status

- **[src/modules/pricing/pricing.routes.js](src/modules/pricing/pricing.routes.js)** - Dynamic pricing engine
- **[src/modules/promotion/promotion.routes.js](src/modules/promotion/promotion.routes.js)** - Promotions & discounts

####  Buying Flow
- **[src/modules/cart/cart.routes.js](src/modules/cart/cart.routes.js)**
  - POST `/api/v1/cart` - Add to cart
  - GET `/api/v1/cart` - Get cart
  - DELETE `/api/v1/cart/:productId` - Remove from cart

- **[src/modules/wishlist/wishlist.routes.js](src/modules/wishlist/wishlist.routes.js)** - Wishlist management
- **[src/modules/order/order.routes.js](src/modules/order/order.routes.js)**
  - POST `/api/v1/orders` - Create order
  - GET `/api/v1/orders` - Get user's orders
  - GET `/api/v1/orders/:id` - Get order details
  - PATCH `/api/v1/orders/:id/status` - Update order status (Admin/SuperAdmin)

####  Payment & Finance
- **[src/modules/payment/payment.routes.js](src/modules/payment/payment.routes.js)**
  - POST `/api/v1/payments/hybrid` - Hybrid payment (credit + gateway)
  - POST `/api/v1/payments/create-order` - Create Razorpay order
  - POST `/api/v1/payments/verify` - Verify payment
  - POST `/api/v1/payments/webhook` - Razorpay webhook handler
  - POST `/api/v1/payments/:orderId` - Initiate payment

- **[src/modules/invoice/invoice.routes.js](src/modules/invoice/invoice.routes.js)** - Invoice generation & retrieval
- **[src/modules/credit/credit.routes.js](src/modules/credit/credit.routes.js)** - Credit account management

####  Logistics & Shipping
- **[src/modules/warehouse/warehouse.routes.js](src/modules/warehouse/warehouse.routes.js)** - Warehouse management
- **[src/modules/inventory/inventory.routes.js](src/modules/inventory/inventory.routes.js)**
  - POST `/api/v1/inventory/add` - Add stock
  - GET `/api/v1/inventory` - Get inventory
  - GET `/api/v1/inventory/low-stock` - Get low stock items
  - GET `/api/v1/inventory/stats` - Inventory statistics
  - PATCH `/api/v1/inventory/update-stock` - Update stock

- **[src/modules/shipment/shipment.routes.js](src/modules/shipment/shipment.routes.js)** - Shipment tracking
- **[src/modules/logistics/logistics.routes.js](src/modules/logistics/logistics.routes.js)** - Advanced logistics routing

####  Support & Engagement
- **[src/modules/notification/notification.routes.js](src/modules/notification/notification.routes.js)** - Push/Email/SMS notifications
- **[src/modules/analytics/analytics.routes.js](src/modules/analytics/analytics.routes.js)** - Dashboard analytics
- **[src/modules/settings/settings.routes.js](src/modules/settings/settings.routes.js)** - System settings (maintenance mode, etc.)
- **[src/modules/support/support.routes.js](src/modules/support/support.routes.js)** - Support tickets
- **[src/modules/review/review.routes.js](src/modules/review/review.routes.js)** - Product reviews
- **[src/modules/search/search.routes.js](src/modules/search/search.routes.js)** - Global search

####  Admin
- **[src/modules/admin/admin.routes.js](src/modules/admin/admin.routes.js)**
  - GET `/api/v1/admin/users` - Get all users
  - GET `/api/v1/admin/approvals` - Get pending user approvals
  - PATCH `/api/v1/admin/users/:id/approve` - Approve user
  - PATCH `/api/v1/admin/users/:id/reject` - Reject user
  - GET `/api/v1/admin/stats` - System statistics
  - PATCH `/api/v1/admin/users/:id/status` - Update user status
  - PATCH `/api/v1/admin/users/:id/credit` - Update user credit limit

- **[src/modules/audit/audit.routes.js](src/modules/audit/audit.routes.js)** - Audit logs

---

## 2. Controllers & Methods

### Controller Pattern
All controllers use the `asyncHandler` wrapper for error handling and follow this structure:
```
export const methodName = asyncHandler(async (req, res) => {
  const data = await service.operation(req.user.id, req.body);
  successResponse(res, data, 'Message');
});
```

### Key Controllers

#### Authentication Controller
**File:** [src/modules/auth/auth.controller.js](src/modules/auth/auth.controller.js)
- `register(req, res)` - Register new user
- `login(req, res)` - Login with password
- `sendOTP(req, res)` - Send OTP to email/phone
- `verifyOTP(req, res)` - Verify OTP and issue tokens
- `refreshToken(req, res)` - Refresh access token

#### Order Controller
**File:** [src/modules/order/order.controller.js](src/modules/order/order.controller.js)
- `createOrder(req, res)` - Create new order
- `getOrders(req, res)` - Get user's orders
- `getOrderById(req, res)` - Get order details
- `updateOrderStatus(req, res)` - Update order status (Admin)

#### Payment Controller
**File:** [src/modules/payment/payment.controller.js](src/modules/payment/payment.controller.js)
- `createRazorpayOrder(req, res)` - Create Razorpay payment order
- `hybridPayment(req, res)` - Process hybrid payment (credit + gateway)
- `initiatePayment(req, res)` - Initiate payment for order
- `verifyPayment(req, res)` - Verify and confirm payment
- `razorpayWebhook(req, res)` - Handle Razorpay webhook

#### Product Controller
**File:** [src/modules/product/product.controller.js](src/modules/product/product.controller.js)
- `createProduct(req, res)` - Create product (Vendor/Admin)
- `getProducts(req, res)` - Get products with filters & pagination
- `getProductById(req, res)` - Get product details
- `updateProduct(req, res)` - Update product (Admin)
- `deleteProduct(req, res)` - Delete product (Admin)
- `updateStock(req, res)` - Update product stock
- `updateStatus(req, res)` - Enable/disable product

#### Inventory Controller
**File:** [src/modules/inventory/inventory.controller.js](src/modules/inventory/inventory.controller.js)
- `addStock(req, res)` - Add stock to inventory
- `getInventory(req, res)` - Get all inventory
- `getLowStockItems(req, res)` - Get items below threshold
- `getInventoryStats(req, res)` - Inventory statistics
- `updateStock(req, res)` - Update stock quantity

#### Admin Controller
**File:** [src/modules/admin/admin.controller.js](src/modules/admin/admin.controller.js)
- `getUsers(req, res)` - Get all users
- `getApprovals(req, res)` - Get pending approvals
- `approveUser(req, res)` - Approve user registration
- `rejectUser(req, res)` - Reject user
- `getStats(req, res)` - Get system statistics
- `updateUserStatus(req, res)` - Change user status
- `updateUserCredit(req, res)` - Modify user credit limit

#### Analytics Controller
**File:** [src/modules/analytics/analytics.controller.js](src/modules/analytics/analytics.controller.js)
- `getDashboard(req, res)` - Get dashboard statistics

#### Cart Controller
**File:** [src/modules/cart/cart.controller.js](src/modules/cart/cart.controller.js)
- `addToCart(req, res)` - Add product to cart
- `getCart(req, res)` - Retrieve user's cart
- `removeFromCart(req, res)` - Remove item from cart

#### Notification Controller
**File:** [src/modules/notification/notification.controller.js](src/modules/notification/notification.controller.js)
- `sendNotification(req, res)` - Send notification (queued)
- `getNotifications(req, res)` - Get user notifications
- `markAsRead(req, res)` - Mark notification as read

#### Audit Controller
**File:** [src/modules/audit/audit.controller.js](src/modules/audit/audit.controller.js)
- `getLogs(req, res)` - Get audit logs with filters
- `getLogById(req, res)` - Get specific audit log

#### Other Controllers
- **User:** Profile, addresses, preferences management
- **Credit:** Credit balance, ledger, deductions
- **Company:** Company profile & management
- **Vendor:** Vendor onboarding & management
- **Shipment:** Shipment tracking & status
- **Logistics:** Route optimization & delivery assignment
- **Support:** Ticket creation & management
- **Review:** Product reviews & ratings
- **Search:** Global search across products
- **Settings:** System settings management

---

## 3. Services & Business Logic

### Service Pattern
Services contain business logic, validation, and database operations. They are imported in controllers and called via `asyncHandler`.

### Key Services

#### Auth Service
**File:** [src/modules/auth/auth.service.js](src/modules/auth/auth.service.js)
- `register(data)` - Register user with hashed password + OTP validation
- `loginWithPassword(data)` - Authenticate with email/phone + password
- `sendOTP(identifier)` - Generate & send OTP via email/SMS
- `verifyOTP(data)` - Verify OTP and issue JWT tokens
- `refreshAuthToken(token)` - Refresh access token using refresh token

#### Order Service
**File:** [src/modules/order/order.service.js](src/modules/order/order.service.js)
- `createOrder(userId, orderData)` - Create order with validation
- `getOrders(user)` - Get user's orders (role-based)
- `getOrderById(orderId)` - Get order details
- `updateOrderStatus(orderId, status)` - Update order status with event trigger

#### Payment Service
**File:** [src/modules/payment/payment.service.js](src/modules/payment/payment.service.js)
- `createRazorpayOrder(amount, userId)` - Create Razorpay order (min ₹1)
- `hybridPayment(orderId, userId, useCredit, totalAmount)` - Process hybrid payment
  - Deduct credit first
  - Charge remaining via Razorpay
  - Transaction support (Replica Set required)
- `initiatePayment(orderId, userId)` - Initiate payment flow
- `verifyPayment(payload)` - Verify Razorpay signature & update order
- `reconcilePayments()` - Cron job for payment reconciliation

#### Product Service
**File:** [src/modules/product/product.service.js](src/modules/product/product.service.js)
- `createProduct(data)` - Create product + trigger events
- `getProducts(query)` - Get products with filters, pagination
- `getProductById(id)` - Get product details
- `updateProduct(id, data)` - Update product fields
- `deleteProduct(id)` - Soft/hard delete product
- `updateStock(id, stock)` - Update product stock
- `updateStatus(id, isActive)` - Toggle product visibility

#### Notification Service
**File:** [src/modules/notification/notification.service.js](src/modules/notification/notification.service.js)
- `sendNotification(data)` - Queue notification job
- `getNotifications(userId)` - Retrieve user notifications
- `markAsRead(notificationId)` - Mark as read

#### Inventory Service
**File:** [src/modules/inventory/inventory.service.js](src/modules/inventory/inventory.service.js)
- `addStock(data)` - Add inventory stock
- `getInventory()` - Get all inventory
- `getLowStockItems()` - Get items below threshold
- `getInventoryStats()` - Get inventory analytics
- `updateStock(data)` - Update stock quantity

#### Admin Service
**File:** [src/modules/admin/admin.service.js](src/modules/admin/admin.service.js)
- `getAllUsers()` - Get all users (pagination)
- `getPendingUsers()` - Get users pending approval
- `changeUserStatus(userId, status)` - Change user status (ACTIVE/SUSPENDED/etc)
- `getStats()` - Get system statistics (users, orders, revenue)
- `updateUserCredit(userId, creditLimit)` - Modify user credit limit

#### Analytics Service
**File:** [src/modules/analytics/analytics.service.js](src/modules/analytics/analytics.service.js)
- `getDashboardStats()` - Get dashboard metrics (aggregation pipeline)
- Uses MongoDB aggregation for performance

#### Audit Service
**File:** [src/services/audit.service.js](src/services/audit.service.js)
- Logs all user actions with timestamps & IP addresses
- Used via audit middleware

#### Cache Service
**File:** [src/services/cache.service.js](src/services/cache.service.js)
- Redis caching for product listings, categories
- TTL-based invalidation

#### Email Service
**File:** [src/services/email.service.js](src/services/email.service.js)
- Send emails for notifications, OTP, order confirmations
- Queue-based async processing

#### SMS Service
**File:** [src/services/sms.service.js](src/services/sms.service.js)
- Send SMS for OTP, order updates
- Queue-based async processing

#### Payment Service (Gateway)
**File:** [src/modules/payment/payment.gateway.js](src/modules/payment/payment.gateway.js)
- Razorpay API wrapper
- `createPaymentOrder({ amount, receipt })` - Create Razorpay order
- `verifySignature(payment, signature)` - Verify Razorpay webhook signature

#### File Upload Service
**File:** [src/services/fileUpload.service.js](src/services/fileUpload.service.js)
- Handle image/document uploads
- Store in `/uploads` directory

#### Encryption Service
**File:** [src/services/encryption.service.js](src/services/encryption.service.js)
- Encrypt sensitive data (payment tokens, etc.)

#### PDF Service
**File:** [src/services/pdf.service.js](src/services/pdf.service.js)
- Generate invoices, order PDFs using PDFKit

#### Redis Service
**File:** [src/services/redis.service.js](src/services/redis.service.js)
- Redis operations wrapper
- Session management, caching

#### Scheduler Service
**File:** [src/services/scheduler.service.js](src/services/scheduler.service.js)
- Schedule cron jobs (node-cron)

#### Search Service
**File:** [src/services/search.service.js](src/services/search.service.js)
- Full-text search across products
- Uses MongoDB text index

#### Webhook Service
**File:** [src/services/webhook.service.js](src/services/webhook.service.js)
- Handle third-party webhooks (Razorpay, logistics providers)

#### Feature Flag Service
**File:** [src/services/featureFlag.service.js](src/services/featureFlag.service.js)
- Dynamic feature flags for A/B testing & rollouts

#### Vendor Assignment Service
**File:** [src/services/vendorAssignment.service.js](src/services/vendorAssignment.service.js)
- Assign orders to vendors (logic-based)

#### Delivery Assignment Service
**File:** [src/services/deliveryAssignment.service.js](src/services/deliveryAssignment.service.js)
- Assign shipments to delivery partners

---

## 4. Models & Database Schema

### Database Configuration
**File:** [src/config/db.js](src/config/db.js)
- MongoDB connection with replica set detection
- Transaction support when replica set available
- Connection pooling & error handling
- Auto-reconnection logic

### Models Structure

#### User Model
**File:** [src/modules/user/user.model.js](src/modules/user/user.model.js)
```
Schema Fields:
- name (String, required, indexed)
- email (String, unique, required, indexed)
- mobile (String, unique, required, indexed)
- password (String, required, not selected by default)
- role (Enum: SUPER_ADMIN, ADMIN, VENDOR, B2B_CUSTOMER, B2C_CUSTOMER, DELIVERY_PARTNER)
- companyId (ObjectId, ref: Company)
- status (Enum: PENDING, ACTIVE, SUSPENDED, INACTIVE, indexed)
- isDeleted (Boolean, indexed, soft delete)
- isVerified (Boolean)
- otp (Object: { code, expiresAt })
- refreshToken (String, not selected by default)
- addresses (Array: { name, phone, ... })
```

#### Product Model
**File:** [src/modules/product/product.model.js](src/modules/product/product.model.js)
```
Schema Fields:
- name (String, required, indexed)
- description (String)
- sku (String, unique)
- price (Number, required)
- cost (Number)
- stock (Number, default: 0)
- categoryId (ObjectId, ref: Category)
- vendorId (ObjectId, ref: Vendor)
- companyId (ObjectId, ref: Company)
- images (Array: URLs)
- isActive (Boolean, default: true, indexed)
- createdAt, updatedAt (Timestamps)
```

#### Order Model
**File:** [src/modules/order/order.model.js](src/modules/order/order.model.js)
```
Schema Fields:
- userId (ObjectId, ref: User, indexed)
- items (Array: { productId, quantity, price })
- totalAmount (Number)
- paymentStatus (Enum: PENDING, PAID, FAILED)
- orderStatus (Enum: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, indexed)
- shippingAddress (Object)
- trackingNumber (String)
- paymentMethod (String: RAZORPAY, CREDIT, etc.)
- notes (String)
- createdAt, updatedAt (Timestamps)
```

#### Payment Model
**File:** [src/modules/payment/payment.model.js](src/modules/payment/payment.model.js)
```
Schema Fields:
- orderId (ObjectId, ref: Order)
- userId (ObjectId, ref: User)
- amount (Number)
- paymentStatus (Enum: PENDING, SUCCESS, FAILED)
- razorpayOrderId (String)
- razorpayPaymentId (String)
- razorpaySignature (String)
- createdAt, updatedAt (Timestamps)
```

#### Notification Model
**File:** [src/modules/notification/notification.model.js](src/modules/notification/notification.model.js)
```
Schema Fields:
- userId (ObjectId, ref: User)
- title (String)
- message (String)
- type (Enum: EMAIL, SMS, PUSH)
- isRead (Boolean, default: false)
- createdAt (Timestamp, indexed)
```

#### Inventory Model
**File:** [src/modules/inventory/inventory.model.js](src/modules/inventory/inventory.model.js)
```
Schema Fields:
- productId (ObjectId, ref: Product, indexed)
- warehouseId (ObjectId, ref: Warehouse)
- quantity (Number)
- reserved (Number)
- reorderLevel (Number)
- lastUpdated (Timestamp)
```

#### Credit Model
**File:** [src/modules/credit/credit.model.js](src/modules/credit/credit.model.js)
```
Schema Fields:
- userId (ObjectId, ref: User, unique)
- availableCredit (Number)
- usedCredit (Number)
- totalCredit (Number)
- status (Enum: ACTIVE, BLOCKED)
- expiryDate (Date)
- createdAt, updatedAt (Timestamps)
```

#### Shipment Model
**File:** [src/modules/shipment/shipment.model.js](src/modules/shipment/shipment.model.js)
```
Schema Fields:
- orderId (ObjectId, ref: Order)
- trackingNumber (String, unique)
- status (Enum: PENDING, IN_TRANSIT, DELIVERED, RETURNED)
- carrierName (String)
- estimatedDelivery (Date)
- actualDelivery (Date)
- warehouseId (ObjectId, ref: Warehouse)
```

#### Warehouse Model
**File:** [src/modules/warehouse/warehouse.model.js](src/modules/warehouse/warehouse.model.js)
```
Schema Fields:
- name (String, required, indexed)
- location (Object: { city, state, country, lat, long })
- capacity (Number)
- currentStock (Number)
- isActive (Boolean)
```

#### Settings Model
**File:** [src/modules/settings/settings.model.js](src/modules/settings/settings.model.js)
```
Schema Fields:
- key (String, unique: maintenanceMode, etc.)
- value (Mixed: Boolean, String, Object)
- description (String)
- updatedAt (Timestamp)
```

#### Audit Model
**File:** [src/modules/audit/audit.model.js](src/modules/audit/audit.model.js)
```
Schema Fields:
- userId (ObjectId, ref: User)
- action (String)
- resource (String)
- details (Object)
- ipAddress (String)
- userAgent (String)
- createdAt (Timestamp, TTL: 90 days)
```

#### Other Models
- **Category:** name, description, isActive
- **Company:** name, registrationNumber, status
- **Vendor:** name, companyId, status
- **Cart:** userId, items, expiresAt
- **Wishlist:** userId, productIds
- **Review:** userId, productId, rating, comment
- **Support Ticket:** userId, title, status, priority
- **Invoice:** orderId, details, status
- **Logistics:** orderId, pickupLocation, deliveryLocation

---

## 5. Authentication & Authorization

### Authentication Middleware
**File:** [src/middlewares/auth.middleware.js](src/middlewares/auth.middleware.js)

**Function:** `protect(req, res, next)`
- Extracts JWT from `Authorization: Bearer <token>` header
- Verifies JWT signature using `process.env.JWT_SECRET`
- Fetches user from database to check:
  - User still exists (not deleted)
  - Maintenance mode status (SuperAdmin bypass)
  - User status (ACTIVE/PENDING/SUSPENDED/INACTIVE)
- Returns 401 if no token or invalid token
- Returns 403 if user suspended/inactive
- Returns 503 if system maintenance mode (non-SuperAdmin)
- Sets `req.user` object on success

### Authorization Middleware
**File:** [src/middlewares/role.middleware.js](src/middlewares/role.middleware.js)

**Function:** `authorize(...roles)`
```javascript
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403));
    }
    next();
  };
};
```
- Used in routes: `authorize('ADMIN', 'SUPER_ADMIN', 'VENDOR')`

### Permission Middleware
**File:** [src/middlewares/permission.middleware.js](src/middlewares/permission.middleware.js)

**Function:** `checkPermission(...permissions)`
- Checks granular permissions (not just roles)
- Complements role-based authorization

### Token Generation
**File:** [src/modules/auth/auth.token.js](src/modules/auth/auth.token.js)
- `generateAccessToken(user)` - Short-lived JWT (usually 15min-1hr)
- `generateRefreshToken(user)` - Long-lived JWT (usually 7-30 days)
- `verifyToken(token, type)` - Verify & decode token

### Password Security
**File:** [src/utils/hashPassword.js](src/utils/hashPassword.js)
- Uses `bcryptjs` with salt rounds (default: 10)

**File:** [src/utils/comparePassword.js](src/utils/comparePassword.js)
- Compares plaintext with bcrypt hash

### OTP Generation
**File:** [src/utils/otpGenerator.js](src/utils/otpGenerator.js)
- Generates 6-digit numeric OTP
- Expiry time: 10-15 minutes (configurable)

### Roles Defined
**File:** [src/constants/roles.js](src/constants/roles.js)
```javascript
SUPER_ADMIN - Full system access
ADMIN - Admin panel access
VENDOR - Can create/manage products
B2B_CUSTOMER - Business customer
B2C_CUSTOMER - Consumer customer
DELIVERY_PARTNER - Can accept/complete deliveries
```

### User Status
**File:** [src/constants/userStatus.js](src/constants/userStatus.js)
```
PENDING - Awaiting admin approval
ACTIVE - Fully active
SUSPENDED - Temporarily blocked
INACTIVE - Disabled account
```

---

## 6. Middleware Chain Configuration

### Middleware Stack (Order Matters)
**File:** [src/app.js](src/app.js)

```
1. Static File Server
   ├─ app.use('/uploads', express.static(...))

2. Trust Proxy (for rate limiting behind reverse proxy)
   ├─ app.set('trust proxy', 1)

3. Security Layer
   ├─ Helmet (XSS, CSRF protection)
   ├─ CORS configuration
   ├─ Rate limiting on /api

4. Body Parsers
   ├─ express.json() with raw body capture for webhooks
   └─ express.urlencoded()

5. Logging & Audit
   ├─ Morgan HTTP request logger
   └─ requestLogger middleware

6. Idempotency (Safe Retries)
   ├─ idempotencyMiddleware

7. Routes
   ├─ /health
   └─ /api (all versioned routes)

8. Not Found Handler
   └─ 404 middleware

9. Error Handler (MUST BE LAST)
   └─ Global error handler
```

### Security Middleware
**File:** [src/config/security.js](src/config/security.js)
```javascript
export const securityMiddleware = (app) => {
  app.use(helmet());           // Security headers
  app.use(corsConfig);          // CORS restrictions
  app.use('/api', apiLimiter);  // Rate limiting
};
```

### CORS Configuration
**File:** [src/config/cors.js](src/config/cors.js)
- Allowed origins: `localhost:5173`, `localhost:5174`, `127.0.0.1:5173`, `127.0.0.1:5174`
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Credentials: true (cookies allowed)
- Custom headers supported

### Rate Limiting
**File:** [src/config/rateLimiter.js](src/config/rateLimiter.js)
- **API Limiter:** 5000 requests per 15 minutes (general)
- **Payment Limiter:** 10 requests per 15 minutes (payment-specific)

### Validation Middleware
**File:** [src/middlewares/validate.middleware.js](src/middlewares/validate.middleware.js)
```javascript
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(
    { body: req.body, query: req.query, params: req.params },
    { abortEarly: false, allowUnknown: true }
  );
  // Returns 400 with validation errors if failed
};
```

### Request Logger Middleware
**File:** [src/middlewares/requestLogger.middleware.js](src/middlewares/requestLogger.middleware.js)
- Logs HTTP method, URL, response status, duration

### Audit Middleware
**File:** [src/middlewares/audit.middleware.js](src/middlewares/audit.middleware.js)
- Logs user actions to audit collection
- Captures: userId, action, resource, IP, userAgent

### Idempotency Middleware
**File:** [src/middlewares/idempotency.middleware.js](src/middlewares/idempotency.middleware.js)
- Handles duplicate requests with Idempotency-Key header
- Prevents double-charging on payment retries

### Upload Middleware
**File:** [src/middlewares/upload.middleware.js](src/middlewares/upload.middleware.js)
- Multer configuration for file uploads
- Validates file types & sizes

### Sanitization Middleware
**File:** [src/middlewares/sanitize.middleware.js](src/middlewares/sanitize.middleware.js)
- XSS protection via express-mongo-sanitize
- Removes $ and . from object keys (prevent NoSQL injection)

### Timeout Middleware
**File:** [src/middlewares/timeout.middleware.js](src/middlewares/timeout.middleware.js)
- Prevents hanging requests
- Configurable timeout (default: 30s)

### Not Found Middleware
**File:** [src/middlewares/notFound.middleware.js](src/middlewares/notFound.middleware.js)
- Returns 404 for undefined routes

### Error Handler Middleware
**File:** [src/middlewares/error.middleware.js](src/middlewares/error.middleware.js)
- Catches all errors from previous middleware/routes
- Handles:
  - CastError (invalid MongoDB ObjectId)
  - ValidationError (Mongoose validation)
  - Duplicate key errors (11000)
  - Custom AppError instances
- Logs errors with Winston logger
- Returns 500 for unhandled errors

---

## 7. Queue & Job Setup

### Queue System
**Technology:** BullMQ + Redis  
**Redis Connection:** [src/config/redis.js](src/config/redis.js)

### Queues Available

#### Notification Queue
**File:** [src/queues/notification.queue.js](src/queues/notification.queue.js)
```javascript
const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection: redis });
// Used by: sendNotification() service
```

#### Email Queue
**File:** [src/queues/email.queue.js](src/queues/email.queue.js)
```javascript
// Async email sending
```

#### Payment Queue
**File:** [src/queues/payment.queue.js](src/queues/payment.queue.js)
```javascript
// Payment processing & webhook handling
```

#### Webhook Queue
**File:** [src/queues/webhook.queue.js](src/queues/webhook.queue.js)
```javascript
// Third-party webhook processing
```

#### Inventory Queue
**File:** [src/queues/inventory.queue.js](src/queues/inventory.queue.js)
```javascript
// Inventory sync & updates
```

#### Audit Queue
**File:** [src/queues/audit.queue.js](src/queues/audit.queue.js)
```javascript
// Audit log processing
```

### Queue Names
**File:** [src/constants/queueNames.js](src/constants/queueNames.js)
```javascript
NOTIFICATION = 'NOTIFICATION'
EMAIL = 'EMAIL'
PAYMENT = 'PAYMENT'
WEBHOOK = 'WEBHOOK'
INVENTORY = 'INVENTORY'
AUDIT = 'AUDIT'
```

### Workers (Job Processors)

#### Notification Worker
**File:** [src/jobs/notification.job.js](src/jobs/notification.job.js)
- Processes notification queue
- Sends emails via Email service
- Sends SMS via SMS service
- Logs job completion/failure

### Cron Jobs
**File:** [src/jobs/cron.js](src/jobs/cron.js)
- Currently empty (to be populated)

### Background Jobs

#### Analytics Job
**File:** [src/jobs/analytics.job.js](src/jobs/analytics.job.js)
- Generate analytics reports

#### Cleanup Job
**File:** [src/jobs/cleanup.job.js](src/jobs/cleanup.job.js)
- Clean old data (sessions, temp files)
- TTL-based deletion

#### Credit Reminder Job
**File:** [src/jobs/creditReminder.job.js](src/jobs/creditReminder.job.js)
- Remind users about expiring credit
- Send notifications

#### Inventory Sync Job
**File:** [src/jobs/inventorySync.job.js](src/jobs/inventorySync.job.js)
- Sync inventory across warehouses
- Update stock levels

#### Order Cleanup Job
**File:** [src/jobs/orderCleanup.job.js](src/jobs/orderCleanup.job.js)
- Archive old orders
- Clean abandoned carts

#### Payment Reconciliation Job
**File:** [src/jobs/paymentReconcile.job.js](src/jobs/paymentReconcile.job.js)
```javascript
export const reconcilePayments = async () => {
  // Reconcile payments with Razorpay
}
```

### Job Scheduling with node-cron
- Scheduled via Scheduler service
- Typical patterns:
  - `0 0 * * *` - Daily at midnight
  - `0 */6 * * *` - Every 6 hours
  - `*/5 * * * *` - Every 5 minutes

---

## 8. Payment Integration - Razorpay

### Configuration
**File:** [src/config/razorpay.js](src/config/razorpay.js)
```javascript
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});
```

### Payment Gateway
**File:** [src/modules/payment/payment.gateway.js](src/modules/payment/payment.gateway.js)
- `createPaymentOrder({ amount, receipt })` - Create Razorpay order
- `verifySignature(payment, signature)` - Verify webhook signature
- Minimum amount: ₹1 (100 paise)

### Payment Service
**File:** [src/modules/payment/payment.service.js](src/modules/payment/payment.service.js)

**Key Functions:**
1. **createRazorpayOrder(amount, userId)**
   - Creates Razorpay order
   - Returns order details (id, amount, currency)

2. **hybridPayment(orderId, userId, useCredit, totalAmount)**
   - Deducts available credit from user account
   - Charges remaining amount via Razorpay
   - Transaction support if MongoDB replica set available
   - Flow:
     ```
     Total Amount = ₹1000
     Available Credit = ₹600
     
     Step 1: Deduct ₹600 from credit account
     Step 2: Create Razorpay order for ₹400
     Step 3: After payment, mark order as PAID
     ```

3. **verifyPayment(payload)**
   - Verify Razorpay signature
   - Update payment & order status
   - Generate invoice
   - Send confirmation notification

4. **razorpayWebhook(req, res)**
   - Handle webhooks from Razorpay
   - Verify raw body signature
   - Update payment status

### Payment Model Fields
```
orderId - Reference to order
userId - Who paid
amount - Payment amount in paise
paymentStatus - PENDING | SUCCESS | FAILED
razorpayOrderId - Razorpay order ID
razorpayPaymentId - Razorpay payment ID
razorpaySignature - Webhook signature
```

### Payment Status Flow
```
Order → PENDING
  ↓
Payment API called → Create Razorpay Order
  ↓
User completes on Razorpay → Webhook received
  ↓
Signature verified → Update Payment to SUCCESS
  ↓
Update Order status → PAID
  ↓
Generate Invoice → Send confirmation
```

### Payment Routes
**File:** [src/modules/payment/payment.routes.js](src/modules/payment/payment.routes.js)
- `POST /api/v1/payments/hybrid` - Hybrid payment (credit + Razorpay)
- `POST /api/v1/payments/create-order` - Create Razorpay order
- `POST /api/v1/payments/verify` - Verify payment with signature
- `POST /api/v1/payments/webhook` - Razorpay webhook endpoint
- `POST /api/v1/payments/:orderId` - Initiate payment

### Credit System Integration
- User gets ₹50,000 credit on registration (default)
- Credit is deducted first during hybrid payment
- Remaining amount charged via Razorpay
- Credit ledger tracks all transactions
- Credit can expire (configurable via settings)

---

## 9. Socket.io Setup

### Configuration
**File:** [server.js](server.js) (Lines 15-40)

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store globally
global.io = io;
app.set('io', io);
```

### Socket Connection Handler
- Logs new connections: `🔌 New socket connection: {socketId}`
- Logs disconnections: `🔌 Socket disconnected: {socketId}`

### Socket Events
**Not yet fully implemented, but setup for:**
- Real-time order updates
- Live delivery tracking
- Instant notifications
- Chat/support conversations

### Global IO Access
- Available via `global.io` in services/controllers
- Can emit events to specific users or broadcast

### Socket Transports
- **websocket** - Primary (low latency)
- **polling** - Fallback (compatibility)

---

## 10. Error Handling Patterns

### Error Classes

#### Base AppError
**File:** [src/errors/AppError.js](src/errors/AppError.js)
```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```
- All custom errors should extend this
- Catches operational (predictable) errors

#### Payment Error
**File:** [src/errors/PaymentError.js](src/errors/PaymentError.js)
- Specific payment failure handling

#### Auth Error
**File:** [src/errors/AuthError.js](src/errors/AuthError.js)
- Authentication/token failures

#### Validation Error
**File:** [src/errors/ValidationError.js](src/errors/ValidationError.js)
- Schema validation failures

#### Permission Error
**File:** [src/errors/PermissionError.js](src/errors/PermissionError.js)
- Authorization failures

#### Not Found Error
**File:** [src/errors/NotFoundError.js](src/errors/NotFoundError.js)
- 404 errors

#### Rate Limit Error
**File:** [src/errors/RateLimitError.js](src/errors/RateLimitError.js)
- Rate limit exceeded

### Error Handling Flow

1. **Try-Catch in Controller**
   ```javascript
   export const createOrder = asyncHandler(async (req, res) => {
     try {
       const order = await service.createOrder(req.user.id, req.body);
       successResponse(res, order, 'Order created');
     } catch (err) {
       throw new AppError(err.message, 400);
     }
   });
   ```

2. **AsyncHandler Catches & Passes to Next**
   ```javascript
   export const asyncHandler = (fn) => (req, res, next) =>
     Promise.resolve(fn(req, res, next)).catch(next);
   ```

3. **Error Middleware Processes**
   ```javascript
   export const errorHandler = (err, req, res, next) => {
     logger.error({
       message: err.message,
       statusCode: err.statusCode || 500,
       path: req.originalUrl,
       stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
     });
     
     res.status(statusCode).json({
       success: false,
       message: error.message || 'Server Error'
     });
   };
   ```

### Common Error Scenarios

- **Validation Error:** Return 400 with field-level errors
- **Authentication Error:** Return 401 (no token/expired)
- **Authorization Error:** Return 403 (permission denied)
- **Not Found:** Return 404 (resource doesn't exist)
- **Duplicate:** Return 400 (duplicate field entry)
- **Rate Limit:** Return 429 (too many requests)
- **Server Error:** Return 500 with generic message
- **Maintenance Mode:** Return 503 (service unavailable)

### Error Logging
- Winston logger with timestamp
- Logs method, URL, status code
- Stack trace only in development
- Indexed by error status

---

## 11. Validation Patterns

### Joi Schema Validation
All validation uses **Joi** for schema validation with consistent patterns.

### Auth Validation
**File:** [src/modules/auth/auth.validation.js](src/modules/auth/auth.validation.js)
```javascript
export const registerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    mobile: Joi.string().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().enum(...Object.values(ROLES)).optional(),
  })
});

export const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  })
});

export const otpSchema = Joi.object({
  body: Joi.object({
    identifier: Joi.string().required(), // email or phone
  })
});

export const verifyOtpSchema = Joi.object({
  body: Joi.object({
    identifier: Joi.string().required(),
    otp: Joi.string().length(6).required(),
  })
});
```

### Product Validation
**File:** [src/modules/product/product.validation.js](src/modules/product/product.validation.js)
```javascript
export const createProductSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().positive().required(),
    categoryId: Joi.string().required(),
    stock: Joi.number().min(0).required(),
  })
});
```

### Payment Validation
**File:** [src/modules/payment/payment.validation.js](src/modules/payment/payment.validation.js)
```javascript
export const verifyPaymentSchema = Joi.object({
  body: Joi.object({
    razorpayOrderId: Joi.string().required(),
    razorpayPaymentId: Joi.string().required(),
    razorpaySignature: Joi.string().required(),
  })
});

export const hybridPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
    totalAmount: Joi.number().required(),
    useCredit: Joi.boolean().optional(),
  })
});
```

### Order Validation
**File:** [src/modules/order/order.validation.js](src/modules/order/order.validation.js)
```javascript
export const createOrderSchema = Joi.object({
  body: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().positive().required(),
      })
    ).required(),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
    }).required(),
  })
});

export const updateOrderStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().enum(...Object.values(ORDER_STATUS)).required(),
  })
});
```

### Validation Middleware Application
```javascript
router.post(
  '/',
  protect,                           // Auth check
  authorize('ADMIN', 'VENDOR'),      // Role check
  validate(createProductSchema),     // Schema validation
  controller.createProduct           // Controller
);
```

### Response on Validation Failure
```json
{
  "success": false,
  "message": [
    "\"email\" must be a valid email",
    "\"password\" length must be at least 8 characters long"
  ]
}
```

### Validation Files
**Directory:** [src/validations/](src/validations/)
- `common.validation.js` - Shared validators
- `file.validation.js` - File upload validation
- `objectId.validation.js` - MongoDB ObjectId validation
- `pagination.validation.js` - Pagination params
- `query.validation.js` - Query string validation

### Validation Strategy
1. **Input Validation** - Joi schemas in route handlers
2. **Business Logic Validation** - In services (domain rules)
3. **Database Validation** - Mongoose schemas
4. **Output Validation** - Success/error response format

---

## Additional Configuration Files

### Logger Configuration
**File:** [src/config/logger.js](src/config/logger.js)
- Winston logger with timestamp
- Console transport (file logging optional)
- Log levels: error, warn, info, debug

### Environment Configuration
**File:** [src/config/env.js](src/config/env.js)
- Loads from `.env` file
- Validates required variables

### Feature Flags
**File:** [src/config/featureFlags.js](src/config/featureFlags.js)
- Runtime feature toggles
- A/B testing support
- Dynamic enable/disable

### Queue Configuration
**File:** [src/config/queue.js](src/config/queue.js)
- BullMQ default options
- Redis retry logic

---

## Database Indices

### Indexed Fields (Performance Optimization)
```
User: { email, mobile, status, role, isDeleted }
Product: { name, status, categoryId, vendorId }
Order: { userId, status, createdAt }
Payment: { orderId, userId, status }
Notification: { userId, createdAt, isRead }
Inventory: { productId, warehouseId }
Audit: { userId, createdAt } + TTL (90 days)
```

---

## Testing Structure
**Directory:** [tests/](tests/)
- `setup.js` - Test environment setup
- `e2e/` - End-to-end tests
- `integration/` - Integration tests
- `unit/` - Unit tests

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Total API Modules** | 25 |
| **Routes** | 40+ endpoints across v1 |
| **Controllers** | 25+ (one per module) |
| **Services** | 25 module services + 15 shared services |
| **Models** | 15+ Mongoose schemas |
| **Queues** | 6 (notification, email, payment, webhook, inventory, audit) |
| **Middleware** | 13 (auth, role, validation, etc.) |
| **Error Classes** | 7 custom error types |
| **Cron Jobs** | 7 background jobs |
| **Security Layers** | Helmet, CORS, Rate Limiting, XSS Protection |

---

## Project Structure Overview
```
src/
├── app.js                          # Express app setup
├── config/                         # Configuration files
│   ├── cors.js                    # CORS settings
│   ├── db.js                      # MongoDB connection
│   ├── env.js                     # Environment variables
│   ├── featureFlags.js            # Feature toggles
│   ├── logger.js                  # Winston logger
│   ├── queue.js                   # BullMQ config
│   ├── rateLimiter.js             # Rate limiting
│   ├── razorpay.js                # Razorpay SDK
│   ├── redis.js                   # Redis client
│   └── security.js                # Security middleware
├── constants/                      # Application constants
│   ├── cacheKeys.js
│   ├── creditStatus.js
│   ├── deliveryStatus.js
│   ├── errorMessages.js
│   ├── featureFlags.js
│   ├── fileTypes.js
│   ├── httpStatus.js
│   ├── notificationTypes.js
│   ├── orderStatus.js
│   ├── paymentStatus.js
│   ├── permissions.js
│   ├── queueNames.js
│   ├── roles.js
│   ├── userStatus.js
│   └── vendorStatus.js
├── docs/                           # API documentation
├── errors/                         # Custom error classes
├── jobs/                           # Background jobs & cron
├── middlewares/                    # Express middlewares
├── modules/                        # Feature modules
│   ├── admin/
│   ├── analytics/
│   ├── audit/
│   ├── auth/
│   ├── cart/
│   ├── category/
│   ├── company/
│   ├── credit/
│   ├── inventory/
│   ├── invoice/
│   ├── logistics/
│   ├── notification/
│   ├── order/
│   ├── payment/
│   ├── pricing/
│   ├── product/
│   ├── promotion/
│   ├── review/
│   ├── search/
│   ├── settings/
│   ├── shipment/
│   ├── superAdmin/
│   ├── support/
│   ├── user/
│   ├── vendor/
│   ├── warehouse/
│   └── wishlist/
├── queues/                        # Job queues
├── routes/                        # Route definitions
├── services/                      # Shared services
├── uploads/                       # File storage
├── utils/                         # Helper functions
├── validations/                   # Validation schemas
└── server.js                      # Server entry point
```

---

## Key Takeaways

1. **Modular Architecture:** Each feature is self-contained with controller, service, repository, model, routes, validation
2. **Multi-tenant Support:** B2B and B2C customers handled separately
3. **Comprehensive Security:** JWT auth, role-based authorization, permission checks, rate limiting
4. **Payment Integration:** Complete Razorpay integration with credit system
5. **Job Queue System:** BullMQ for async processing (notifications, emails, payments)
6. **Real-time Communication:** Socket.io setup for live updates
7. **Audit & Logging:** Complete audit trail with Winston logging
8. **Error Handling:** Centralized error handling with custom error classes
9. **Validation:** Joi schemas for all inputs
10. **Database Transactions:** Support for transactions when replica set available

---

**Document Generated:** April 24, 2026  
**Framework Version:** Express 4.21+ | MongoDB 8.10+ | Node.js 18+
