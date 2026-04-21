import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { routes } from "./routeConfig";

// Components
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleBasedRoute from "../components/common/RoleBasedRoute";

// Layouts
import MainLayout from "../components/layout/MainLayout";
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
import ProductDetails from "../modules/product/pages/ProductDetails";
import Dashboard from "../modules/user/pages/Dashboard";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path={routes.LANDING} element={<LandingPage />} />
        <Route path={routes.LOGIN} element={<LoginPage />} />
        <Route path={routes.REGISTER} element={<RegisterPage />} />
        
        <Route path={routes.PRODUCTS} element={<MainLayout><ProductPage /></MainLayout>} />
        <Route path={`${routes.PRODUCTS}/:id`} element={<MainLayout><ProductDetails /></MainLayout>} />

        {/* B2C ROUTES */}
        <Route path={routes.HOME} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2C_CUSTOMER"]}>
              <MainLayout><ProductPage /></MainLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* B2B ROUTES */}
        <Route path={routes.DASHBOARD} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2B_CUSTOMER"]}>
              <MainLayout><Dashboard /></MainLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.CREDIT} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2B_CUSTOMER"]}>
              <MainLayout><CreditPage /></MainLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* ADMIN ROUTES */}
        <Route path={routes.ADMIN} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout title="Overview"><AdminPage /></AdminLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_USERS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout title="User Management"><AdminUsersPage /></AdminLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_PRODUCTS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout title="Product Inventory"><AdminProductsPage /></AdminLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_ORDERS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout title="Order Fulfillment"><AdminOrdersPage /></AdminLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_VENDORS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout title="Vendor Control"><AdminVendorsPage /></AdminLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_APPROVALS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout title="New Approvals"><AdminApprovalsPage /></AdminLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* SUPER ADMIN ROUTES */}
        <Route path={routes.SUPER_ADMIN} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* DELIVERY ROUTES */}
        <Route path={routes.DELIVERY} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["DELIVERY_PARTNER"]}>
              <DeliveryLayout><DeliveryPage /></DeliveryLayout>
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* COMMON PRIVATE ROUTES (Mainly for Customers) */}
        <Route path={routes.ORDERS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2B_CUSTOMER", "B2C_CUSTOMER"]}>
              <MainLayout><OrdersPage /></MainLayout>
            </RoleBasedRoute>
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