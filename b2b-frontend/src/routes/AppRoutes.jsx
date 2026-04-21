import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { routes } from "./routeConfig";

// Components
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleBasedRoute from "../components/common/RoleBasedRoute";

// Pages
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

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Navigate to={routes.LOGIN} />} />
        <Route path={routes.LOGIN} element={<LoginPage />} />
        <Route path={routes.REGISTER} element={<RegisterPage />} />

        {/* B2C ROUTES */}
        <Route path={routes.HOME} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2C_CUSTOMER"]}>
              <ProductPage /> {/* B2C Home */}
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.PRODUCTS} element={
          <ProtectedRoute>
            <ProductPage />
          </ProtectedRoute>
        } />
        <Route path={`${routes.PRODUCTS}/:id`} element={
          <ProtectedRoute>
            <ProductDetails />
          </ProtectedRoute>
        } />

        {/* B2B ROUTES */}
        <Route path={routes.DASHBOARD} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2B_CUSTOMER"]}>
              <ProductPage /> {/* B2B Dashboard */}
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.CREDIT} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["B2B_CUSTOMER"]}>
              <CreditPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* ADMIN ROUTES */}
        <Route path={routes.ADMIN} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_USERS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminUsersPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_PRODUCTS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminProductsPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_ORDERS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminOrdersPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_VENDORS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminVendorsPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.ADMIN_APPROVALS} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminApprovalsPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* SUPER ADMIN ROUTES */}
        <Route path={routes.SUPER_ADMIN} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <SuperAdminPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* DELIVERY ROUTES */}
        <Route path={routes.DELIVERY} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["DELIVERY_PARTNER"]}>
              <DeliveryPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* COMMON PRIVATE ROUTES */}
        <Route path={routes.ORDERS} element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path={routes.CHECKOUT} element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />

        {/* FALLBACK */}
        <Route path="*" element={<h2>404 Not Found</h2>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
