import { secureStorage } from "./secureStorage";

let loggingOut = false;

export const forceLogout = (reason?: string) => {
  if (loggingOut) return;
  loggingOut = true;
  try {
    secureStorage.removeItem("user_id");
    secureStorage.removeItem("user_name");
    secureStorage.removeItem("login_timestamp");
    secureStorage.removeItem("auth_token");
    secureStorage.removeItem("token");
    secureStorage.removeItem("access_token");
    secureStorage.removeItem("Authorization");
    secureStorage.removeItem("authorization");
    sessionStorage.removeItem("authToken");
  } catch {}
  if (reason) {
    try {
      console.warn("[auth] Forced logout:", reason);
    } catch {}
  }
  if (typeof window !== "undefined") {
    const base = (import.meta.env.VITE_APP_BASE || "/").replace(/\/$/, "") || "/";
    const target = base === "/" ? "/" : base + "/";
    if (window.location.pathname !== target && window.location.pathname !== base) {
      window.location.replace(target);
    }
  }
};

/**
 * Inspect a fetch Response (and optional parsed body) and trigger
 * logout if the API indicates an expired/invalid token.
 */
export const handleAuthResponse = async (res: Response): Promise<Response> => {
  if (res.status === 401) {
    let msg = "";
    try {
      const cloned = res.clone();
      const data = await cloned.json();
      msg = data?.message || "";
    } catch {}
    forceLogout(msg || "401 Unauthorized");
  }
  return res;
};
