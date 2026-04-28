import AppRoutes from "./routes/AppRoutes";
import { useCartInitializer } from "./hooks/useCartInitializer";

const App = () => {
  // Load cart from backend when user is authenticated
  useCartInitializer();

  return <AppRoutes />;
};

export default App;