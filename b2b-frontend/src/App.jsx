import AppRoutes from "./routes/AppRoutes";
import { useCartInitializer } from "./hooks/useCartInitializer";
import ErrorBoundary from "./components/common/ErrorBoundary";

const App = () => {
  // Load cart from backend when user is authenticated
  useCartInitializer();

  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
};

export default App;