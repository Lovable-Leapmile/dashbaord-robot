import { Navigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";
import backgroundImage from "@/assets/dashboard_login_bg.png";
import { isSessionValid } from "@/hooks/useAuthSession";
import { getStoredAuthToken, isTokenExpired } from "@/lib/auth";

const Index = () => {
  const hasToken = getStoredAuthToken() || sessionStorage.getItem("authToken");
  if (hasToken && isSessionValid() && !isTokenExpired()) {
    return <Navigate to="/home" replace />;
  }
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 w-full h-screen bg-cover bg-center bg-no-repeat login-bg-image"
      />

      {/* Semi-transparent Overlay */}
      <div className="absolute inset-0 w-full h-full bg-primary/15" />

      {/* Login Form Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen py-8 animate-fade-in">
        <LoginForm />
      </div>
    </div>
  );
};

export default Index;
