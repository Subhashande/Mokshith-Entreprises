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

// Health & Monitoring
import healthRoutes from '../modules/health/health.routes.js';

const router = express.Router();

// Health checks (before other routes, no auth)
router.use('/health', healthRoutes);

// Auth & Users
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Organization
router.use('/companies', companyRoutes);
router.use('/vendors', vendorRoutes);

// Catalog
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/pricing', pricingRoutes);
router.use('/promotions', promotionRoutes);

// Buying
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);

// Finance
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/credit', creditRoutes);

// Logistics
router.use('/warehouses', warehouseRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/logistics', logisticsRoutes);

// Support
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/support', supportRoutes);

// Engagement
router.use('/reviews', reviewRoutes);
router.use('/search', searchRoutes);

// Admin
router.use('/admin', adminRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/superadmin', superAdminRoutes); // Alias for frontend

export default router;