import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTrustedTypes } from "./lib/trustedTypes";
import { applyTheme } from "./lib/theme";
import { forceLogout, shouldForceLogoutForAuthMessage } from "./lib/authLogout";

// Initialize Trusted Types policy before rendering to handle CSP requirements
initTrustedTypes();

// Apply the theme based on VITE_DEPLOYMENT_CSS_SKIN environment variable
applyTheme();

// Global fetch interceptor: any 401 response forces logout
const originalFetch = window.fetch.bind(window);
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const res = await originalFetch(...args);
  if (res.status === 401) {
    try {
      const cloned = res.clone();
      const data = await cloned.json().catch(() => null);
      const msg = data?.message || "401 Unauthorized";
      if (shouldForceLogoutForAuthMessage(msg)) {
        forceLogout(msg);
      }
    } catch {
      forceLogout("401 Unauthorized");
    }
  }
  return res;
};

createRoot(document.getElementById("root")!).render(<App />);
