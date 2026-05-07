import { Navigate, Outlet } from "react-router-dom";
import { getStoredAuthToken, isTokenExpired } from "@/lib/auth";
import { isSessionValid } from "@/hooks/useAuthSession";
import { secureStorage } from "@/lib/secureStorage";

const ProtectedRoute = () => {
  const authToken = getStoredAuthToken() || sessionStorage.getItem("authToken");
  const valid = isSessionValid() && !isTokenExpired();

  if (!authToken || !valid) {
    secureStorage.removeItem("user_id");
    secureStorage.removeItem("user_name");
    secureStorage.removeItem("login_timestamp");
    secureStorage.removeItem("auth_token");
    sessionStorage.removeItem("authToken");
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
