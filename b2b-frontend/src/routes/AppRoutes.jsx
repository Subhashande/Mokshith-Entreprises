import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { routes } from "./routeConfig.js";

// Components
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import RoleGuard from "../components/common/RoleGuard.jsx";
import RoleBasedRoute from "../components/common/RoleBasedRoute.jsx";

// Layouts (not lazy loaded as they're frequently used)
import MainLayout from "../components/layout/MainLayout.jsx";
import PublicLayout from "../components/layout/PublicLayout.jsx";
import AdminLayout from "../components/layout/AdminLayout.jsx";
import SuperAdminLayout from "../components/layout/SuperAdminLayout.jsx";
import DeliveryLayout from "../components/layout/DeliveryLayout.jsx";

// Frequently accessed pages (not lazy loaded)
import LandingPage from "../modules/product/pages/LandingPage.jsx";
import LoginPage from "../modules/auth/pages/LoginPage.jsx";
import ProductPage from "../modules/product/pages/ProductPage.jsx";
import Home from "../modules/product/pages/Home.jsx";

// Lazy load less frequently accessed pages
const RegisterPage = lazy(() => import("../modules/auth/pages/Register.jsx"));
const AdminPage = lazy(() => import("../modules/admin/pages/AdminPage.jsx"));
const AdminUsersPage = lazy(() => import("../modules/admin/pages/Users.jsx"));
const AdminProductsPage = lazy(() => import("../modules/admin/pages/Products.jsx"));
const AdminOrdersPage = lazy(() => import("../modules/admin/pages/Orders.jsx"));
const AdminVendorsPage = lazy(() => import("../modules/admin/pages/Vendors.jsx"));
const AdminDeliveryPartnersPage = lazy(() => import("../modules/admin/pages/DeliveryPartners.jsx"));
const AdminApprovalsPage = lazy(() => import("../modules/admin/pages/Approvals.jsx"));
const AdminProfile = lazy(() => import("../modules/admin/pages/AdminProfile.jsx"));
const SuperAdminPage = lazy(() => import("../modules/superAdmin/pages/SuperAdminPage.jsx"));
const DeliveryPage = lazy(() => import("../modules/delivery/pages/DeliveryPage.jsx"));
const CreditPage = lazy(() => import("../modules/credit/pages/CreditPage.jsx"));
const CheckoutPage = lazy(() => import("../modules/order/pages/Checkout.jsx"));
const OrdersPage = lazy(() => import("../modules/order/pages/OrdersPage.jsx"));
const OrderDetails = lazy(() => import("../modules/order/pages/OrderDetails.jsx"));
const CartPage = lazy(() => import("../modules/order/pages/Cart.jsx"));
const PaymentPage = lazy(() => import("../modules/payment/pages/PaymentPage.jsx"));
const ProfilePage = lazy(() => import("../modules/user/pages/Profile.jsx"));
const SecurityPage = lazy(() => import("../modules/user/pages/Security.jsx"));
const HelpPage = lazy(() => import("../modules/user/pages/Help.jsx"));
const ProductDetails = lazy(() => import("../modules/product/pages/ProductDetails.jsx"));
const Dashboard = lazy(() => import("../modules/user/pages/Dashboard.jsx"));
const WishlistPage = lazy(() => import("../modules/wishlist/pages/WishlistPage.jsx"));
const AnalyticsPage = lazy(() => import("../modules/analytics/pages/AnalyticsPage.jsx"));
const CompanyPage = lazy(() => import("../modules/company/pages/CompanyPage.jsx"));
const InventoryPage = lazy(() => import("../modules/inventory/pages/InventoryPage.jsx"));
const LogisticsPage = lazy(() => import("../modules/logistics/pages/LogisticsPage.jsx"));
const WarehousePage = lazy(() => import("../modules/warehouse/pages/WarehousePage.jsx"));
const PromotionPage = lazy(() => import("../modules/promotion/pages/PromotionPage.jsx"));
const SettingsPage = lazy(() => import("../modules/settings/SettingsPage.jsx"));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#64748b' }}>Loading...</div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
      {/* PUBLIC ROUTES */}
        <Route path={routes.LANDING} element={<PublicLayout><LandingPage /></PublicLayout>} />
        <Route path={routes.LOGIN} element={<LoginPage />} />
        <Route path={routes.REGISTER} element={<RegisterPage />} />
        
        <Route path={routes.PRODUCTS} element={<MainLayout><ProductPage /></MainLayout>} />
        <Route path={`${routes.PRODUCTS}/:id`} element={<MainLayout><ProductDetails /></MainLayout>} />

        {/* B2C & B2B HOME */}
        <Route path={routes.HOME} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["B2C_CUSTOMER", "B2B_CUSTOMER"]}>
              <MainLayout><Home /></MainLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

        {/* B2B ROUTES */}
        <Route path={routes.DASHBOARD} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["B2B_CUSTOMER"]}>
              <MainLayout><Dashboard /></MainLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.CREDIT} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["B2B_CUSTOMER"]}>
              <MainLayout><CreditPage /></MainLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

        {/* ADMIN ROUTES */}
        <Route element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route path={routes.ADMIN} element={<AdminPage />} />
          <Route path={routes.ADMIN_USERS} element={<AdminUsersPage />} />
          <Route path={routes.ADMIN_PRODUCTS} element={<AdminProductsPage />} />
          <Route path={routes.ADMIN_ORDERS} element={<AdminOrdersPage />} />
          <Route path={routes.ADMIN_APPROVALS} element={<AdminApprovalsPage />} />
          <Route path={routes.ADMIN_ANALYTICS} element={<AnalyticsPage />} />
          <Route path={routes.ADMIN_INVENTORY} element={<InventoryPage />} />
          <Route path={routes.ADMIN_WAREHOUSE} element={<WarehousePage />} />
          <Route path={routes.ADMIN_PROMOTIONS} element={<PromotionPage />} />
          <Route path={routes.ADMIN_PROFILE} element={<AdminProfile />} />
          <Route path={routes.ADMIN_SETTINGS} element={<SettingsPage />} />
          <Route path={routes.VENDOR_INVENTORY} element={<InventoryPage />} />
          <Route path={routes.VENDOR_COMPANY} element={<CompanyPage />} />
        </Route>

        {/* SUPER ADMIN ROUTES */}
        <Route element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route path={routes.SUPER_ADMIN} element={<SuperAdminPage />} />
          <Route path={routes.SUPER_ADMIN_VENDORS} element={<AdminVendorsPage />} />
          <Route path={routes.SUPER_ADMIN_DELIVERY} element={<AdminDeliveryPartnersPage />} />
        </Route>

        {/* DELIVERY ROUTES */}
        <Route element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["DELIVERY_PARTNER", "SUPER_ADMIN", "ADMIN"]}>
              <DeliveryLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route path={routes.DELIVERY_DASHBOARD} element={<LogisticsPage />} />
          <Route path={routes.DELIVERY_SHIPMENTS} element={<LogisticsPage />} />
          <Route path={routes.DELIVERY_HISTORY} element={<DeliveryPage />} />
        </Route>

        {/* COMMON PRIVATE ROUTES (Mainly for Customers) */}
        <Route path={routes.ORDERS} element={
          <ProtectedRoute>
            <MainLayout><OrdersPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={`${routes.ORDERS}/:id`} element={
          <ProtectedRoute>
            <MainLayout><OrderDetails /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.CART} element={
          <ProtectedRoute>
            <MainLayout><CartPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.PAYMENT} element={
          <ProtectedRoute>
            <MainLayout><PaymentPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.PROFILE} element={
          <ProtectedRoute>
            <MainLayout><ProfilePage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.SECURITY} element={
          <ProtectedRoute>
            <MainLayout><SecurityPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.HELP} element={
          <ProtectedRoute>
            <MainLayout><HelpPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.WISHLIST} element={
          <ProtectedRoute>
            <MainLayout><WishlistPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.CHECKOUT} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["B2B_CUSTOMER", "B2C_CUSTOMER"]}>
              <MainLayout><CheckoutPage /></MainLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

        {/* FALLBACK */}
        <Route path="*" element={<MainLayout><h2>404 Not Found</h2></MainLayout>} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;