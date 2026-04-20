import { Navigate, Outlet } from "react-router-dom";
import { getStoredAuthToken } from "@/lib/auth";

const ProtectedRoute = () => {
  const authToken = getStoredAuthToken() || sessionStorage.getItem("authToken");
  if (!authToken) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
