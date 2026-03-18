import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getAdminConsoleUrl } from "@/lib/api";
import { Settings } from "lucide-react";

const AdminConsole = () => {
  useAuthSession();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [adminUrl, setAdminUrl] = useState("");
  const [hasError, setHasError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserName = localStorage.getItem("user_name");
    const storedUserId = localStorage.getItem("user_id");

    if (!storedUserName || !storedUserId) {
      navigate("/");
      return;
    }

    setUserName(storedUserName);
    
    try {
      const url = getAdminConsoleUrl();
      if (!url) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setAdminUrl(url);
    } catch (error) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Timeout to detect if iframe fails to load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <AppHeader selectedTab="Admin Console" />

      <main className="p-2 sm:p-4">
        {hasError || !adminUrl ? (
          <div className="flex items-center justify-center animate-fade-in" style={{ height: "calc(100vh - 130px)" }}>
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              {/* Animated Settings Icon */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="relative bg-primary/10 rounded-full p-8 animate-pulse" style={{ animationDuration: "1.5s" }}>
                  <Settings className="w-16 h-16 text-primary animate-spin" style={{ animationDuration: "8s" }} />
                </div>
              </div>

              {/* Coming Soon Text */}
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-foreground animate-fade-in">
                  Admin Console
                </h1>
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-lg text-muted-foreground font-medium">
                    Work in Progress
                  </p>
                </div>
                <p className="text-sm text-muted-foreground max-w-md animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  We're actively working on it and will roll out the update soon.
                </p>
              </div>

              {/* Animated Progress Indicator */}
              <div className="flex items-center gap-2 mt-4">
                <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: "calc(100vh - 130px)", minHeight: "400px" }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading Admin Console...</p>
                </div>
              </div>
            )}
            <iframe
              src={adminUrl}
              className="w-full h-full border-0 rounded-lg"
              title="Admin Console"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminConsole;
