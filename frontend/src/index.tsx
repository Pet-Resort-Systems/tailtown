import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./services/initTenant"; // Ensure tenant ID is set before any API calls
import { initSentry } from "./utils/sentry";

// Initialize Sentry error tracking
initSentry();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
