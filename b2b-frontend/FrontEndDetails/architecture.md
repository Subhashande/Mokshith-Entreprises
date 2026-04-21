# Front-End System Architecture

## Core Technologies
- **React 18**: Component-based UI library.
- **Redux Toolkit**: Centralized state management for Auth, Cart, Orders, and Products.
- **React Router 6**: Client-side routing with protected and role-based access.
- **Axios**: HTTP client for API communication with centralized interceptors.
- **CSS Variables**: System-wide theming for colors, spacing, and radius.

## Key Modules
1. **Auth**: Handles Login, Registration, and Session management.
2. **Product**: Catalog browsing, search, and detailed product views.
3. **Order**: Cart management, multi-step checkout (Address + Payments), and order tracking.
4. **Credit**: Business credit management, ledger tracking, and limit adjustments.
5. **Admin/SuperAdmin**: Platform management including User, Category, and Product controls.

## Design System
- **Reusable Components**: Located in `src/components/ui`, including Buttons, Modals, Cards, and Inputs.
- **Layouts**: Shared `Navbar` and `Sidebar` for consistent navigation across roles.
- **Theming**: Integrated with `index.css` using modern B2B aesthetics.

## Authentication Flow
1. User logs in via `LoginPage`.
2. JWT is stored and handled by `apiClient` interceptors.
3. `ProtectedRoute` ensures session validity.
4. `RoleBasedRoute` restricts access to Admin/Vendor/Customer panels.
