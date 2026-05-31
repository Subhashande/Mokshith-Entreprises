import express from 'express';

// Core Modules
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import companyRoutes from '../modules/company/company.routes.js';
import vendorRoutes from '../modules/vendor/vendor.routes.js';

// Catalog
import categoryRoutes from '../modules/category/category.routes.js';
import productRoutes from '../modules/product/product.routes.js';
import pricingRoutes from '../modules/pricing/pricing.routes.js';
import promotionRoutes from '../modules/promotion/promotion.routes.js';

// Buying Flow
import cartRoutes from '../modules/cart/cart.routes.js';
import orderRoutes from '../modules/order/order.routes.js';

// Payment & Finance
import paymentRoutes from '../modules/payment/payment.routes.js';
import invoiceRoutes from '../modules/invoice/invoice.routes.js';
import creditRoutes from '../modules/credit/credit.routes.js';

// Logistics
import warehouseRoutes from '../modules/warehouse/warehouse.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import shipmentRoutes from '../modules/shipment/shipment.routes.js';
import logisticsRoutes from '../modules/logistics/logistics.routes.js';

// Support
import notificationRoutes from '../modules/notification/notification.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import supportRoutes from '../modules/support/support.routes.js';

// Engagement
import wishlistRoutes from '../modules/wishlist/wishlist.routes.js';
import reviewRoutes from '../modules/review/review.routes.js';
import searchRoutes from '../modules/search/search.routes.js';

// Admin
import adminRoutes from '../modules/admin/admin.routes.js';
import superAdminRoutes from '../modules/superAdmin/superAdmin.routes.js';

import { authenticate } from '../middlewares/auth.middleware.js';
import { injectCsrfToken } from '../middlewares/csrf.middleware.js';

const router = express.Router();

// 🔐 Auth & Users
router.use('/auth', authRoutes);
router.use('/users', authenticate, injectCsrfToken, userRoutes);

// 🏢 Organization
router.use('/companies', authenticate, injectCsrfToken, companyRoutes);
router.use('/vendors', authenticate, injectCsrfToken, vendorRoutes);

// 🛍️ Catalog
router.use('/categories', categoryRoutes); // Category browsing is public; mutations are protected per-route
router.use('/products', productRoutes); // Products list is public
router.use('/pricing', pricingRoutes);
router.use('/promotions', authenticate, injectCsrfToken, promotionRoutes);

// 🛒 Buying
router.use('/cart', authenticate, injectCsrfToken, cartRoutes);
router.use('/wishlist', authenticate, injectCsrfToken, wishlistRoutes);
router.use('/orders', authenticate, injectCsrfToken, orderRoutes);

// 💳 Finance
router.use('/payments', paymentRoutes); // Payments has its own internal protection logic
router.use('/invoices', authenticate, injectCsrfToken, invoiceRoutes);
router.use('/credit', authenticate, injectCsrfToken, creditRoutes);

// 🚚 Logistics
router.use('/warehouses', authenticate, injectCsrfToken, warehouseRoutes);
router.use('/inventory', authenticate, injectCsrfToken, inventoryRoutes);
router.use('/shipments', authenticate, injectCsrfToken, shipmentRoutes);
router.use('/logistics', authenticate, injectCsrfToken, logisticsRoutes);

// 🔔 Support
router.use('/notifications', authenticate, injectCsrfToken, notificationRoutes);
router.use('/analytics', authenticate, injectCsrfToken, analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/support', authenticate, injectCsrfToken, supportRoutes);

// 🔍 Engagement
router.use('/reviews', reviewRoutes);
router.use('/search', searchRoutes);

// 🛡️ Admin
router.use('/admin', authenticate, injectCsrfToken, adminRoutes);
router.use('/super-admin', authenticate, injectCsrfToken, superAdminRoutes);
router.use('/superadmin', authenticate, injectCsrfToken, superAdminRoutes);

export default router;