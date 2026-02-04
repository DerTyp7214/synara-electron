import { scopedDebugLog } from "$lib/utils/logger";
import { apiLogScope } from "$lib/api/utils";

interface TokenPayload {
  exp: number;
  aud: string;
  iss: string;
  username: string;
  ses: string;
}

export function decodeJwt(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payloadBase64 = parts[1];

    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );

    return JSON.parse(jsonPayload) as TokenPayload;
  } catch (error) {
    scopedDebugLog("error", apiLogScope, "JWT decoding failed:", error);
    return null;
  }
}

export function isJwtValid(
  token?: string | null,
  cushionSeconds: number = 60,
): boolean {
  if (!token) return false;

  const payload = decodeJwt(token);

  if (!payload || !payload.exp) return false;

  const expirationTimeMs = payload.exp * 1000;
  const currentTimeMs = Date.now();
  const cushionTimeMs = cushionSeconds * 1000;

  return expirationTimeMs > currentTimeMs + cushionTimeMs;
}
