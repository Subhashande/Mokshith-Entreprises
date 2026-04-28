import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { routes } from "./routeConfig";

// Components (keep these eager - small and used frequently)
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleGuard from "../components/common/RoleGuard";
import RoleBasedRoute from "../components/common/RoleBasedRoute";
import Loader from "../components/common/Loader";

// Layouts (keep eager - critical for all routes)
import MainLayout from "../components/layout/MainLayout";
import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";
import SuperAdminLayout from "../components/layout/SuperAdminLayout";
import DeliveryLayout from "../components/layout/DeliveryLayout";

// Lazy-loaded Pages (code-split by route)
const LandingPage = lazy(() => import("../modules/product/pages/LandingPage"));
const LoginPage = lazy(() => import("../modules/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../modules/auth/pages/Register"));
const ProductPage = lazy(() => import("../modules/product/pages/ProductPage"));
const ProductDetails = lazy(() => import("../modules/product/pages/ProductDetails"));

// Admin Pages
const AdminPage = lazy(() => import("../modules/admin/pages/AdminPage"));
const AdminUsersPage = lazy(() => import("../modules/admin/pages/Users"));
const AdminProductsPage = lazy(() => import("../modules/admin/pages/Products"));
const AdminOrdersPage = lazy(() => import("../modules/admin/pages/Orders"));
const AdminVendorsPage = lazy(() => import("../modules/admin/pages/Vendors"));
const AdminApprovalsPage = lazy(() => import("../modules/admin/pages/Approvals"));

// Super Admin & Delivery
const SuperAdminPage = lazy(() => import("../modules/superadmin/pages/SuperAdminPage"));
const DeliveryPage = lazy(() => import("../modules/delivery/pages/DeliveryPage"));

// User & Orders
const Dashboard = lazy(() => import("../modules/user/pages/Dashboard"));
const ProfilePage = lazy(() => import("../modules/user/pages/Profile"));
const SecurityPage = lazy(() => import("../modules/user/pages/Security"));
const HelpPage = lazy(() => import("../modules/user/pages/Help"));
const OrdersPage = lazy(() => import("../modules/order/pages/OrdersPage"));
const OrderDetails = lazy(() => import("../modules/order/pages/OrderDetails"));
const CartPage = lazy(() => import("../modules/order/pages/Cart"));
const CheckoutPage = lazy(() => import("../modules/order/pages/Checkout"));
const PaymentPage = lazy(() => import("../modules/payment/pages/PaymentPage"));

// Additional Modules
const CreditPage = lazy(() => import("../modules/credit/pages/CreditPage"));
const AnalyticsPage = lazy(() => import("../modules/analytics/pages/AnalyticsPage"));
const CompanyPage = lazy(() => import("../modules/company/pages/CompanyPage"));
const InventoryPage = lazy(() => import("../modules/inventory/pages/InventoryPage"));
const LogisticsPage = lazy(() => import("../modules/logistics/pages/LogisticsPage"));
const ShipmentTrackingPage = lazy(() => import("../modules/shipment/pages/ShipmentTrackingPage"));
const WarehousePage = lazy(() => import("../modules/warehouse/pages/WarehousePage"));
const PromotionPage = lazy(() => import("../modules/promotion/pages/PromotionPage"));
const WishlistPage = lazy(() => import("../modules/wishlist/pages/WishlistPage"));
const SettingsPage = lazy(() => import("../modules/settings/SettingsPage"));

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader text="Loading..." />}>
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
                <MainLayout><ProductPage /></MainLayout>
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
        <Route path={routes.ADMIN} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Overview"><AdminPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_USERS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="User Management"><AdminUsersPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_PRODUCTS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Product Inventory"><AdminProductsPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_ORDERS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Order Fulfillment"><AdminOrdersPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_VENDORS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Vendor Control"><AdminVendorsPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_APPROVALS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="New Approvals"><AdminApprovalsPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

        {/* NEW MODULE ROUTES */}
        <Route path={routes.ADMIN_ANALYTICS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Analytics"><AnalyticsPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_INVENTORY} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Inventory Management"><InventoryPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_WAREHOUSE} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Warehouse Management"><WarehousePage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_PROMOTIONS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout title="Promotions"><PromotionPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_SETTINGS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN", "VENDOR"]}>
              <AdminLayout title="Settings"><SettingsPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.VENDOR_INVENTORY} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["VENDOR", "SUPER_ADMIN", "ADMIN"]}>
              <AdminLayout title="My Inventory"><InventoryPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.VENDOR_COMPANY} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["VENDOR", "SUPER_ADMIN", "ADMIN"]}>
              <AdminLayout title="Company Profile"><CompanyPage /></AdminLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.DELIVERY_DASHBOARD} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["DELIVERY_PARTNER", "SUPER_ADMIN", "ADMIN"]}>
              <DeliveryLayout title="Logistics"><LogisticsPage /></DeliveryLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.DELIVERY_SHIPMENTS} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["DELIVERY_PARTNER", "SUPER_ADMIN", "ADMIN"]}>
              <DeliveryLayout title="My Deliveries"><LogisticsPage /></DeliveryLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path={routes.SHIPMENT_TRACKING} element={
          <ProtectedRoute>
            <MainLayout><ShipmentTrackingPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path={routes.WISHLIST} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["B2B_CUSTOMER", "B2C_CUSTOMER", "SUPER_ADMIN", "ADMIN"]}>
              <MainLayout><WishlistPage /></MainLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

        {/* SUPER ADMIN ROUTES */}
        <Route path={routes.SUPER_ADMIN} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminPage />
            </RoleGuard>
          </ProtectedRoute>
        } />

        {/* DELIVERY ROUTES */}
        <Route path={routes.DELIVERY_HISTORY} element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["DELIVERY_PARTNER", "SUPER_ADMIN", "ADMIN"]}>
              <DeliveryLayout><DeliveryPage /></DeliveryLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

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
        <Route path={routes.CHECKOUT} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2B_CUSTOMER", "B2C_CUSTOMER"]}>
              <MainLayout><CheckoutPage /></MainLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* FALLBACK */}
        <Route path="*" element={<MainLayout><h2>404 Not Found</h2></MainLayout>} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;