import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppProvider from "./app/AppProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./assets/styles/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AppProvider>
  </React.StrictMode>
);