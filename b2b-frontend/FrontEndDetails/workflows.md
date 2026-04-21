# Front-End Workflows & User Journeys

## B2B Customer Workflow
1. **Registration**: Fills out `RegisterPage`. Status set to `PENDING` for Admin review.
2. **Browsing**: Explores `ProductPage` with category filtering and search.
3. **Cart & Checkout**: Adds items to cart, proceeds to `CheckoutPage`.
4. **Order Placement**:
   - Provide full Business Shipping Details.
   - Choose payment (COD, Credit, Razorpay, UPI, Card).
   - Validation for credit balance (Credit Limit: ₹50,000 default).
5. **Post-Order**: Tracks order history and credit ledger in `OrdersPage` and `CreditPage`.

## Admin Workflow
1. **Admin Console Dashboard**: Real-time overview of Users, Orders, and Approvals.
2. **User Management**:
   - Approve/Reject new registrations.
   - Monitor and Adjust Credit Limits for customers.
3. **Product & Category Control**:
   - Add/Edit/Delete products.
   - Manage stock and inventory.
   - Create/Disable product categories.
4. **Quick Actions**: Export sales reports, System logs, and Platform settings.

## Super Admin Workflow
1. **Global Management**: Root control over all system configurations.
2. **Maintenance Mode**: Toggle system-wide maintenance to block non-admin access and orders.
3. **Admin Management**: Create/Delete regional administrators.
4. **Feature Flags**: Toggle platform features like Dynamic Pricing, Reviews, and Notifications.
5. **System Audit Trail**: Export full audit logs for security and compliance.
