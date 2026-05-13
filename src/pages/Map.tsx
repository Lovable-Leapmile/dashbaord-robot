import AppHeader from "@/components/AppHeader";
import { MapPin } from "lucide-react";

const Map = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <AppHeader selectedTab="" />

      <main className="flex flex-col items-center justify-center p-8" style={{ minHeight: "calc(100vh - 110px)" }}>
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          {/* Animated Map Icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="relative bg-primary/10 rounded-full p-8 animate-pulse" style={{ animationDuration: "1.5s" }}>
              <MapPin className="w-16 h-16 text-primary animate-bounce" style={{ animationDuration: "2s" }} />
            </div>
          </div>

          {/* Coming Soon Text */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground animate-fade-in">
              Map View
            </h1>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-lg text-muted-foreground font-medium">
                Work in Progress
              </p>
            </div>
            <p className="text-sm text-muted-foreground max-w-md animate-fade-in" style={{ animationDelay: "0.2s" }}>
              We're building something amazing! The Map feature will be available soon.
            </p>
          </div>

          {/* Animated Progress Indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Map;
