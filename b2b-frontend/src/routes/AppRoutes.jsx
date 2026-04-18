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
import SuperAdminPage from "../modules/superAdmin/pages/SuperAdminPage";
import DeliveryPage from "../modules/delivery/pages/DeliveryPage";
import CreditPage from "../modules/credit/pages/CreditPage";
import CheckoutPage from "../modules/order/pages/Checkout";
import OrdersPage from "../modules/order/pages/OrdersPage";

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
            <RoleBasedRoute allowedRoles={["USER"]}>
              <ProductPage /> {/* B2C Home */}
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.PRODUCTS} element={
          <ProtectedRoute>
            <ProductPage />
          </ProtectedRoute>
        } />

        {/* B2B ROUTES */}
        <Route path={routes.DASHBOARD} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["VENDOR"]}>
              <ProductPage /> {/* B2B Dashboard */}
            </RoleBasedRoute>
          </ProtectedRoute>
        } />
        <Route path={routes.CREDIT} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["VENDOR"]}>
              <CreditPage />
            </RoleBasedRoute>
          </ProtectedRoute>
        } />

        {/* ADMIN ROUTES */}
        <Route path={routes.ADMIN} element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRoles={["ADMIN"]}>
              <AdminPage />
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
            <RoleBasedRoute allowedRoles={["DELIVERY"]}>
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
