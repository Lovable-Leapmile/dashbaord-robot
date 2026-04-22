import { getStoredAuthToken } from "@/lib/auth";
import { getApiBaseUrl, getApiName } from "@/lib/apiConfig";

// Dynamic API base URL - retrieved from environment or stored configuration
export const getApiOrigin = (): string => getApiBaseUrl();

export const getRobotManagerBase = (): string => `${getApiOrigin()}/robotmanager`;
export const getNanostoreBase = (): string => `${getApiOrigin()}/nanostore`;
export const getUserBase = (): string => `${getApiOrigin()}/user`;
export const getPubSubBase = (): string => `${getApiOrigin()}/pubsub`;
export const getCameraManagerBase = (): string => `${getApiOrigin()}/cameramanager`;

// Get the admin console URL using the base URL
export const getAdminConsoleUrl = (): string => {
  const origin = getApiOrigin();
  if (!origin) {
    return "";
  }
  return `${origin}/nanostoreapp/home`;
};

// Get the web app URL with port 6500
export const getWebAppUrl = (): string => {
  const origin = getApiOrigin();
  return origin.replace('.leapmile.com', '.leapmile.com:6500');
};

// Legacy exports for backward compatibility - these are now deprecated
// Components should migrate to using the getter functions above
export const API_ORIGIN = ""; // Deprecated - use getApiOrigin()
export const ROBOTMANAGER_BASE = ""; // Deprecated - use getRobotManagerBase()
export const NANOSTORE_BASE = ""; // Deprecated - use getNanostoreBase()

export const withQuery = (url: string, params: Record<string, string | number | null | undefined>) => {
  // Resolve relative paths against the configured API origin
  const fullUrl = url.startsWith("http") ? url : getApiUrl(url);
  const u = new URL(fullUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    u.searchParams.set(k, String(v));
  });
  return u.toString();
};

type ApiFetchOptions = RequestInit & {
  requireAuth?: boolean;
};

export const apiFetch = async (url: string, options: ApiFetchOptions = {}) => {
  const { requireAuth = true, headers, ...rest } = options;

  const h = new Headers(headers);
  h.set("Content-Type", h.get("Content-Type") || "application/json");

  if (requireAuth) {
    const token = getStoredAuthToken();
    if (!token) throw new Error("AUTH_TOKEN_MISSING");
    h.set("Authorization", token);
  }

  // Resolve relative paths against the configured API origin
  const fullUrl = url.startsWith("http") ? url : getApiUrl(url);

  return fetch(fullUrl, {
    ...rest,
    headers: h,
  });
};

export const apiGet = async <T = any>(url: string, options: ApiFetchOptions = {}) => {
  const res = await apiFetch(url, { ...options, method: "GET" });
  const data = (await res.json()) as T;
  return { res, data };
};
/**
 * Construct full API URL from a path
 * @param path - API path starting with /
 * @returns Full URL with origin
 */
export const getApiUrl = (path: string): string => {
  const origin = getApiOrigin();
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${cleanPath}`;
};

/**
 * Enhanced fetch wrapper that automatically injects the active
 * session's authToken from sessionStorage into the Authorization header.
 *
 * @param url - The target API endpoint (full URL or path)
 * @param options - Standard RequestInit options
 * @returns Promise<Response>
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  // Prefer the secureStorage-backed token (set at login via storeAuthToken),
  // fall back to legacy sessionStorage entry for older sessions.
  const storedToken = getStoredAuthToken();
  const legacyToken = sessionStorage.getItem("authToken");
  const authToken = storedToken || legacyToken;

  const headers = new Headers(options.headers || {});
  if (authToken && !headers.has("Authorization")) {
    // getStoredAuthToken already returns a value normalized with the
    // "Bearer " prefix; only add it for the legacy raw token.
    const value = storedToken
      ? storedToken
      : `Bearer ${legacyToken}`;
    headers.set("Authorization", value);
  }

  // If url is just a path (starts with /), prepend the API origin
  const fullUrl = url.startsWith("http") ? url : getApiUrl(url);

  return fetch(fullUrl, {
    ...options,
    headers,
  });
};