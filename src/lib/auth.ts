import { secureStorage } from "./secureStorage";

export const AUTH_TOKEN_STORAGE_KEY = "auth_token";

const candidateKeys = [
  AUTH_TOKEN_STORAGE_KEY,
  "token",
  "access_token",
  "Authorization",
  "authorization",
] as const;

export const getStoredAuthToken = (): string | null => {
  for (const key of candidateKeys) {
    const v = secureStorage.getItem(key) || sessionStorage.getItem(key);
    if (v && v.trim()) return v.trim();
  }
  return null;
};

export const storeAuthToken = (rawToken: unknown) => {
  if (typeof rawToken !== "string") return;
  const t = rawToken.trim();
  if (!t) return;

  // Store raw token without "Bearer " prefix; the server rejects prefixed tokens.
  const raw = t.toLowerCase().startsWith("bearer ") ? t.slice(7).trim() : t;
  secureStorage.setItem(AUTH_TOKEN_STORAGE_KEY, raw);
};

/**
 * Decode JWT payload (no verification) and return its `exp` in ms.
 * Returns null if token is not a JWT or has no exp.
 */
export const getTokenExpiryMs = (): number | null => {
  const raw = getStoredAuthToken();
  if (!raw) return null;
  const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (typeof payload.exp === "number") return payload.exp * 1000;
    return null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (): boolean => {
  const exp = getTokenExpiryMs();
  if (exp === null) return false; // unknown -> let session timestamp govern
  return Date.now() >= exp;
};
