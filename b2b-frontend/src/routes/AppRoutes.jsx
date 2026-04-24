import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { routes } from "./routeConfig";

// Components
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleGuard from "../components/common/RoleGuard";
import RoleBasedRoute from "../components/common/RoleBasedRoute";

// Layouts
import MainLayout from "../components/layout/MainLayout";
import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";
import SuperAdminLayout from "../components/layout/SuperAdminLayout";
import DeliveryLayout from "../components/layout/DeliveryLayout";

// Pages
import LandingPage from "../modules/product/pages/LandingPage";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/Register";
import ProductPage from "../modules/product/pages/ProductPage";
import AdminPage from "../modules/admin/pages/AdminPage";
import AdminUsersPage from "../modules/admin/pages/Users";
import AdminProductsPage from "../modules/admin/pages/Products";
import AdminOrdersPage from "../modules/admin/pages/Orders";
import AdminVendorsPage from "../modules/admin/pages/Vendors";
import AdminApprovalsPage from "../modules/admin/pages/Approvals";
import SuperAdminPage from "../modules/superadmin/pages/SuperAdminPage";
import DeliveryPage from "../modules/delivery/pages/DeliveryPage";
import CreditPage from "../modules/credit/pages/CreditPage";
import CheckoutPage from "../modules/order/pages/Checkout";
import OrdersPage from "../modules/order/pages/OrdersPage";
import PaymentPage from "../modules/payment/pages/PaymentPage";
import ProfilePage from "../modules/user/pages/Profile";
import SecurityPage from "../modules/user/pages/Security";
import HelpPage from "../modules/user/pages/Help";
import ProductDetails from "../modules/product/pages/ProductDetails";
import Dashboard from "../modules/user/pages/Dashboard";

// New Module Pages
import AnalyticsPage from "../modules/analytics/pages/AnalyticsPage";
import CompanyPage from "../modules/company/pages/CompanyPage";
import InventoryPage from "../modules/inventory/pages/InventoryPage";
import LogisticsPage from "../modules/logistics/pages/LogisticsPage";
import ShipmentTrackingPage from "../modules/shipment/pages/ShipmentTrackingPage";
import WarehousePage from "../modules/warehouse/pages/WarehousePage";
import PromotionPage from "../modules/promotion/pages/PromotionPage";
import WishlistPage from "../modules/wishlist/pages/WishlistPage";
import SettingsPage from "../modules/settings/SettingsPage";

const AppRoutes = () => {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default AppRoutes;